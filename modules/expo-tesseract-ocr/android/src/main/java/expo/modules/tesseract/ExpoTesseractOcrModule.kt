package expo.modules.tesseract

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.googlecode.tesseract.android.TessBaseAPI
import android.graphics.BitmapFactory
import java.io.File

class ExpoTesseractOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTesseractOcr")

    AsyncFunction("recognizeText") { tessDataPath: String, lang: String, imagePath: String, psm: Int? ->
      val cleanDataPath = tessDataPath.removePrefix("file://")
      val cleanImagePath = imagePath.removePrefix("file://")

      var dataPath = cleanDataPath
      if (dataPath.endsWith("/tessdata/")) {
        dataPath = dataPath.substring(0, dataPath.length - 10)
      } else if (dataPath.endsWith("/tessdata")) {
        dataPath = dataPath.substring(0, dataPath.length - 9)
      }
      if (!dataPath.endsWith("/")) {
        dataPath += "/"
      }

      val dataPathUsed = dataPath
      val imagePathUsed = cleanImagePath

      var initOk = false
      var ckbExists = false
      var ckbSize = 0L
      var engExists = false
      var engSize = 0L
      var bitmapNull = true
      var bitmapWidth = 0
      var bitmapHeight = 0
      var text = ""
      var confidence = 0
      var languagesLoaded = ""
      var tessVersion = ""
      var errorMessage = ""
      val linesList = mutableListOf<Map<String, Any>>()

      var tessApi: TessBaseAPI? = null

      try {
        val ckbFile = File(dataPathUsed + "tessdata/ckb.traineddata")
        ckbExists = ckbFile.exists()
        ckbSize = if (ckbExists) ckbFile.length() else 0L

        val engFile = File(dataPathUsed + "tessdata/eng.traineddata")
        engExists = engFile.exists()
        engSize = if (engExists) engFile.length() else 0L

        tessApi = TessBaseAPI()
        tessVersion = try { tessApi.version ?: "" } catch (e: Throwable) { "" }

        println("[ExpoTesseractOcr Native] Initializing Tesseract at dataPath: '$dataPathUsed', lang: '$lang'...")
        initOk = tessApi.init(dataPathUsed, lang, TessBaseAPI.OEM_LSTM_ONLY)
        println("[ExpoTesseractOcr Native] tess.init return value: $initOk")

        if (initOk) {
          languagesLoaded = try { tessApi.initLanguagesAsString ?: "" } catch (e: Throwable) { "" }

          val psmMode = psm ?: TessBaseAPI.PageSegMode.PSM_SINGLE_BLOCK
          tessApi.pageSegMode = psmMode

          val imgFile = File(imagePathUsed)
          println("[ExpoTesseractOcr Native] Checking image file: ${imgFile.absolutePath} -> exists: ${imgFile.exists()}")

          val bitmap = BitmapFactory.decodeFile(imagePathUsed)
          if (bitmap != null) {
            bitmapNull = false
            bitmapWidth = bitmap.width
            bitmapHeight = bitmap.height

            println("[ExpoTesseractOcr Native] Bitmap decoded successfully: width=$bitmapWidth, height=$bitmapHeight")

            tessApi.setImage(bitmap)
            text = tessApi.utF8Text ?: ""
            confidence = tessApi.meanConfidence()

            // Extract line-by-line and word-level bounding boxes and confidence using RIL_WORD and RIL_TEXTLINE
            try {
              val it = tessApi.resultIterator
              if (it != null) {
                it.begin()
                var currentLineWords = mutableListOf<Map<String, Any>>()
                var currentLineText = StringBuilder()
                var currentLineConf = 0
                var currentLineBox = mapOf("left" to 0, "top" to 0, "right" to 0, "bottom" to 0)

                do {
                  val isLineStart = try { it.isAtBeginningOf(TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE) } catch (e: Throwable) { true }
                  if (isLineStart && currentLineWords.isNotEmpty()) {
                    linesList.add(mapOf(
                      "text" to currentLineText.toString().trim(),
                      "confidence" to currentLineConf,
                      "box" to currentLineBox,
                      "words" to currentLineWords
                    ))
                    currentLineWords = mutableListOf()
                    currentLineText = StringBuilder()
                  }

                  if (isLineStart) {
                    currentLineConf = try { it.confidence(TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE).toInt() } catch (e: Throwable) { 0 }
                    val rect = try { it.getBoundingRect(TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE) } catch (e: Throwable) { null }
                    currentLineBox = if (rect != null) {
                      mapOf("left" to rect.left, "top" to rect.top, "right" to rect.right, "bottom" to rect.bottom)
                    } else {
                      val boxArr = try { it.getBoundingBox(TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE) } catch (e: Throwable) { null }
                      if (boxArr != null && boxArr.size >= 4) {
                        mapOf("left" to boxArr[0], "top" to boxArr[1], "right" to boxArr[2], "bottom" to boxArr[3])
                      } else {
                        mapOf("left" to 0, "top" to 0, "right" to 0, "bottom" to 0)
                      }
                    }
                  }

                  val wordText = try { it.getUTF8Text(TessBaseAPI.PageIteratorLevel.RIL_WORD) } catch (e: Throwable) { null }
                  if (!wordText.isNullOrBlank()) {
                    val wordConf = try { it.confidence(TessBaseAPI.PageIteratorLevel.RIL_WORD).toInt() } catch (e: Throwable) { 0 }
                    val wordRect = try { it.getBoundingRect(TessBaseAPI.PageIteratorLevel.RIL_WORD) } catch (e: Throwable) { null }
                    val wordBox = if (wordRect != null) {
                      mapOf("left" to wordRect.left, "top" to wordRect.top, "right" to wordRect.right, "bottom" to wordRect.bottom)
                    } else {
                      val boxArr = try { it.getBoundingBox(TessBaseAPI.PageIteratorLevel.RIL_WORD) } catch (e: Throwable) { null }
                      if (boxArr != null && boxArr.size >= 4) {
                        mapOf("left" to boxArr[0], "top" to boxArr[1], "right" to boxArr[2], "bottom" to boxArr[3])
                      } else {
                        mapOf("left" to 0, "top" to 0, "right" to 0, "bottom" to 0)
                      }
                    }

                    currentLineWords.add(mapOf(
                      "text" to wordText,
                      "confidence" to wordConf,
                      "box" to wordBox
                    ))
                    if (currentLineText.isNotEmpty()) currentLineText.append(" ")
                    currentLineText.append(wordText)
                  }

                } while (try { it.next(TessBaseAPI.PageIteratorLevel.RIL_WORD) } catch (e: Throwable) { false })

                if (currentLineWords.isNotEmpty()) {
                  linesList.add(mapOf(
                    "text" to currentLineText.toString().trim(),
                    "confidence" to currentLineConf,
                    "box" to currentLineBox,
                    "words" to currentLineWords
                  ))
                }

                try { it.delete() } catch (e: Throwable) {}
              }
            } catch (iterErr: Throwable) {
              println("[ExpoTesseractOcr Native] Iterator error: ${iterErr.message}")
            }

            println("[ExpoTesseractOcr Native] Recognition complete! Text length: ${text.length}, Mean confidence: $confidence, Lines count: ${linesList.size}")

            bitmap.recycle()
          } else {
            bitmapNull = true
            errorMessage = "BitmapFactory.decodeFile returned null for path: $imagePathUsed"
            println("[ExpoTesseractOcr Native Error] $errorMessage")
          }
        } else {
          errorMessage = "Tesseract init failed for path '$dataPathUsed' lang '$lang'"
          println("[ExpoTesseractOcr Native Error] $errorMessage")
        }
      } catch (e: Throwable) {
        val sb = StringBuilder()
        sb.append(e.toString()).append("\n")
        val trace = e.stackTrace
        for (i in 0 until minOf(5, trace.size)) {
          sb.append("  at ").append(trace[i].toString()).append("\n")
        }
        errorMessage = sb.toString().trimEnd()
        println("[ExpoTesseractOcr Native Throwable] $errorMessage")
      } finally {
        try {
          tessApi?.recycle()
        } catch (e: Throwable) {
          // ignore
        }
      }

      return@AsyncFunction mapOf(
        "text" to text,
        "confidence" to confidence,
        "lines" to linesList,
        "initOk" to initOk,
        "dataPathUsed" to dataPathUsed,
        "imagePathUsed" to imagePathUsed,
        "ckbExists" to ckbExists,
        "ckbSize" to ckbSize,
        "engExists" to engExists,
        "engSize" to engSize,
        "bitmapNull" to bitmapNull,
        "bitmapWidth" to bitmapWidth,
        "bitmapHeight" to bitmapHeight,
        "languagesLoaded" to languagesLoaded,
        "tessVersion" to tessVersion,
        "error" to errorMessage
      )
    }
  }
}
