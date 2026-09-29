package expo.modules.tesseract

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.googlecode.tesseract.android.TessBaseAPI
import android.graphics.BitmapFactory
import java.io.File

class ExpoTesseractOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTesseractOcr")

    AsyncFunction("recognizeText") { tessDataPath: String, lang: String, imagePath: String ->
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
          tessApi.pageSegMode = TessBaseAPI.PageSegMode.PSM_AUTO

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

            println("[ExpoTesseractOcr Native] Recognition complete! Text length: ${text.length}, Mean confidence: $confidence")

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
