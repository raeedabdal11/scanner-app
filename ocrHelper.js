import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { toByteArray, fromByteArray } from 'base64-js';
import UPNG from 'upng-js';
import { recognizeText } from './modules/expo-tesseract-ocr';

const TESSDATA_DIR = `${FileSystem.documentDirectory}tessdata/`;

const LOCAL_ASSET_MODULES = {
  ckb: require('./assets/tessdata/ckb.traineddata'),
  ara: require('./assets/tessdata/ara.traineddata'),
  eng: require('./assets/tessdata/eng.traineddata'),
};

export async function ensureTessData(langKey = 'ckb', onProgress) {
  try {
    const dirInfo = await FileSystem.getInfoAsync(TESSDATA_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(TESSDATA_DIR, { intermediates: true });
    }

    const requiredLangs = ['ckb', 'ara', 'eng'];

    for (const l of requiredLangs) {
      const fileUri = `${TESSDATA_DIR}${l}.traineddata`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists || fileInfo.size < 1000) {
        if (onProgress) onProgress(`ئامادەکردنی فایلی زمانی ${l.toUpperCase()}...`);
        console.log(`[OCR] Copying local asset for ${l}.traineddata...`);

        const asset = Asset.fromModule(LOCAL_ASSET_MODULES[l]);
        await asset.downloadAsync();

        if (asset.localUri) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: fileUri,
          });
        }

        const checkInfo = await FileSystem.getInfoAsync(fileUri);
        console.log(`[OCR] File ${l}.traineddata status -> exists: ${checkInfo.exists}, size: ${checkInfo.size} bytes`);

        if (!checkInfo.exists || checkInfo.size < 1000) {
          throw new Error(`نەتوانرا فایلی زمانی ${l} لە پڕۆژەکەوە کۆپی بپڕێدرێت`);
        }
      } else {
        console.log(`[OCR] File ${l}.traineddata already exists -> size: ${fileInfo.size} bytes`);
      }
    }
  } catch (err) {
    console.error('[OCR] Detailed TessData Init Error:', err?.message, err?.code, err?.stack);
    throw err;
  }
}

export async function preprocessImageForOCRPass(imageUri, mode = 'auto', debugFilename = 'ocr_debug_pass1.png') {
  try {
    const safeUri = imageUri.startsWith('/') ? 'file://' + imageUri : imageUri;
    const manip = await ImageManipulator.manipulateAsync(
      safeUri,
      [{ resize: { width: 1400 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!manip.base64) return { uri: imageUri, width: 0, height: 0, inverted: false };

    const bytes = toByteArray(manip.base64);
    const img = UPNG.decode(bytes.buffer);
    const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
    const w = img.width;
    const h = img.height;
    const HW = w * h;

    let totalLum = 0;
    const gray = new Float32Array(HW);

    for (let i = 0; i < HW; i++) {
      const idx = i * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      gray[i] = lum;
      totalLum += lum;
    }

    const avgLum = totalLum / HW;
    const isDarkImage = avgLum < 128;

    let shouldInvert = false;
    if (mode === 'auto') {
      shouldInvert = isDarkImage;
    } else if (mode === 'force_opposite') {
      shouldInvert = !isDarkImage;
    } else if (mode === 'original_grayscale') {
      shouldInvert = false;
    }

    console.log(`[OCR Preprocess] Mode: '${mode}', Avg Lum: ${avgLum.toFixed(1)}, Invert: ${shouldInvert}`);

    for (let i = 0; i < HW; i++) {
      let val = gray[i];

      if (mode !== 'original_grayscale') {
        if (shouldInvert) {
          val = 255 - val;
        }

        if (val > 175) {
          val = 255;
        } else if (val < 105) {
          val = 0;
        } else {
          val = (val - 105) * (255 / 70);
        }
      }

      val = Math.max(0, Math.min(255, Math.round(val)));
      const idx = i * 4;
      rgba[idx] = val;
      rgba[idx + 1] = val;
      rgba[idx + 2] = val;
    }

    const pngBuf = UPNG.encode([rgba.buffer], w, h, 0);
    const b64 = fromByteArray(new Uint8Array(pngBuf));
    const debugUri = `${FileSystem.documentDirectory}${debugFilename}`;
    await FileSystem.writeAsStringAsync(debugUri, b64, { encoding: FileSystem.EncodingType.Base64 });

    console.log(`[OCR Preprocess] Saved debug image for mode '${mode}': ${debugUri} (${w}x${h})`);

    return { uri: debugUri, width: w, height: h, inverted: shouldInvert };
  } catch (e) {
    console.error(`[OCR Preprocess Error for mode ${mode}]`, e?.message, e?.code, e?.stack);
    return { uri: imageUri, width: 0, height: 0, inverted: false };
  }
}

export function normalizeKurdishText(text) {
  if (!text) return '';
  return text
    .replace(/ك/g, 'ک')
    .replace(/ي/g, 'ی')
    .replace(/ھ/g, 'ه')
    .replace(/ەە/g, 'ە')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function performOnDeviceOCR(imageUri, selectedLang = 'ckb', onProgress) {
  try {
    if (onProgress) onProgress('ئامادەکردنی فایلی زمانی نەخێرا...');
    await ensureTessData(selectedLang, onProgress);

    let tessLang = 'ckb+eng';
    if (selectedLang === 'ara') tessLang = 'ara+eng';
    if (selectedLang === 'eng') tessLang = 'eng';
    if (selectedLang === 'ckb') tessLang = 'ckb+eng';

    const parentDir = FileSystem.documentDirectory;
    const cleanDataPath = parentDir.replace(/^file:\/\//, '');

    console.log(`==================== [OCR DEBUG SESSION START] ====================`);
    console.log(`[OCR Init] Data Path: '${cleanDataPath}', Language String: '${tessLang}'`);

    // --- PASS 1: Auto (smart inversion + binarization) ---
    if (onProgress) onProgress('پشکنین ١: خاوێنکردنەوە و ئۆتۆ-پێچەوانەکردنەوە...');
    const pass1Prep = await preprocessImageForOCRPass(imageUri, 'auto', 'ocr_debug_pass1.png');
    const pass1Res = await recognizeText(parentDir, tessLang, pass1Prep.uri);
    console.log('[OCR Pass 1 Native Result]', JSON.stringify(pass1Res));
    const pass1Text = normalizeKurdishText(pass1Res.text);

    console.log(`[OCR Pass 1] Width x Height: ${pass1Prep.width}x${pass1Prep.height}`);
    console.log(`[OCR Pass 1] Raw Length: ${pass1Text.length}, Mean Confidence: ${pass1Res.confidence}`);
    console.log(`[OCR Pass 1] First 100 Chars: "${pass1Text.slice(0, 100)}"`);
    console.log(`[OCR Pass 1] Saved Debug Image Path: ${pass1Prep.uri}`);

    // --- PASS 2: Opposite Inversion ---
    if (onProgress) onProgress('پشکنین ٢: تاقیکردنەوە بە پێچەوانەی ڕووناکی...');
    const pass2Prep = await preprocessImageForOCRPass(imageUri, 'force_opposite', 'ocr_debug_pass2.png');
    const pass2Res = await recognizeText(parentDir, tessLang, pass2Prep.uri);
    console.log('[OCR Pass 2 Native Result]', JSON.stringify(pass2Res));
    const pass2Text = normalizeKurdishText(pass2Res.text);

    console.log(`[OCR Pass 2] Width x Height: ${pass2Prep.width}x${pass2Prep.height}`);
    console.log(`[OCR Pass 2] Raw Length: ${pass2Text.length}, Mean Confidence: ${pass2Res.confidence}`);
    console.log(`[OCR Pass 2] First 100 Chars: "${pass2Text.slice(0, 100)}"`);
    console.log(`[OCR Pass 2] Saved Debug Image Path: ${pass2Prep.uri}`);

    // --- PASS 3: Original Grayscale (no binarization) ---
    if (onProgress) onProgress('پشکنین ٣: وێنەی ڕەسەن بەبێ دروستکردنی کۆنتراست...');
    const pass3Prep = await preprocessImageForOCRPass(imageUri, 'original_grayscale', 'ocr_debug_pass3.png');
    const pass3Res = await recognizeText(parentDir, tessLang, pass3Prep.uri);
    console.log('[OCR Pass 3 Native Result]', JSON.stringify(pass3Res));
    const pass3Text = normalizeKurdishText(pass3Res.text);

    console.log(`[OCR Pass 3] Width x Height: ${pass3Prep.width}x${pass3Prep.height}`);
    console.log(`[OCR Pass 3] Raw Length: ${pass3Text.length}, Mean Confidence: ${pass3Res.confidence}`);
    console.log(`[OCR Pass 3] First 100 Chars: "${pass3Text.slice(0, 100)}"`);
    console.log(`[OCR Pass 3] Saved Debug Image Path: ${pass3Prep.uri}`);

    // --- Select Best Result (longest valid text or highest confidence) ---
    const passes = [
      { id: 1, text: pass1Text, confidence: pass1Res.confidence },
      { id: 2, text: pass2Text, confidence: pass2Res.confidence },
      { id: 3, text: pass3Text, confidence: pass3Res.confidence },
    ];

    passes.sort((a, b) => {
      if (b.text.length !== a.text.length) {
        return b.text.length - a.text.length;
      }
      return b.confidence - a.confidence;
    });

    const bestPass = passes[0];
    console.log(`[OCR Selection] Selected Pass ${bestPass.id} as best result (Length: ${bestPass.text.length}, Confidence: ${bestPass.confidence})`);
    console.log(`==================== [OCR DEBUG SESSION END] ====================`);

    return bestPass.text;
  } catch (err) {
    console.error('[OCR] Detailed Perform OCR Error:', err?.message, err?.code, err?.stack);
    console.error('[OCR] Full Error Stack:', err?.stack);
    throw err;
  }
}
