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

    const requiredLangs = ['ckb', 'eng'];
    if (langKey === 'ara') {
      requiredLangs.push('ara');
    }

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

/**
 * Clean OCR output to remove stray Latin noise words when Kurdish/Arabic is selected.
 */
export function cleanKurdishOcrOutput(text, lang = 'ckb') {
  if (!text) return '';

  let cleaned = normalizeKurdishText(text);

  if (lang === 'ckb' || lang === 'ara') {
    const lines = cleaned.split('\n');
    const cleanedLines = lines.map(line => {
      if (!line) return '';

      const arabicCount = (line.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
      const latinCount = (line.match(/[a-zA-Z]/g) || []).length;

      if (arabicCount > 0 && arabicCount >= latinCount) {
        const words = line.split(/\s+/);
        const filteredWords = words.filter(w => {
          const latinLetters = w.replace(/[^a-zA-Z]/g, '');
          const isPureLatin = latinLetters.length > 0 && /^[a-zA-Z]+$/.test(w.replace(/[^\p{L}]/gu, ''));
          // Remove stray Latin noise words
          if (isPureLatin && latinLetters.length <= 4) {
            return false;
          }
          return true;
        });
        return filteredWords.join(' ');
      }
      return line;
    });

    cleaned = cleanedLines.join('\n');
  }

  return cleaned
    .replace(/[|\]\[~`]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Extract channel array from RGBA buffer:
 * - 'gray': standard luminance (0.299R + 0.587G + 0.114B)
 * - 'blue': blue channel only
 * - 'min_rgb': min(R, G, B) per pixel
 */
export function extractChannel(rgba, width, height, channelType) {
  const HW = width * height;
  const channelData = new Uint8Array(HW);

  for (let i = 0; i < HW; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];

    if (channelType === 'blue') {
      channelData[i] = b;
    } else if (channelType === 'min_rgb') {
      channelData[i] = Math.min(r, Math.min(g, b));
    } else {
      channelData[i] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    }
  }

  return channelData;
}

/**
 * Adaptive/local thresholding (Block-based mean using integral image).
 */
export function applyAdaptiveThreshold(channelData, width, height, inverted = false) {
  const W = width;
  const H = height;
  const HW = W * H;

  const integral = new Uint32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    const yW = y * W;
    const intY1 = (y + 1) * (W + 1);
    const intY0 = y * (W + 1);
    for (let x = 0; x < W; x++) {
      rowSum += channelData[yW + x];
      integral[intY1 + x + 1] = integral[intY0 + x + 1] + rowSum;
    }
  }

  const outRgba = new Uint8Array(HW * 4);
  const windowRadius = Math.max(6, Math.floor(Math.min(W, H) / 30));
  const t = 0.10;

  for (let y = 0; y < H; y++) {
    const y1 = Math.max(0, y - windowRadius);
    const y2 = Math.min(H - 1, y + windowRadius);

    const intY2 = (y2 + 1) * (W + 1);
    const intY1 = y1 * (W + 1);
    const yW = y * W;

    for (let x = 0; x < W; x++) {
      const x1 = Math.max(0, x - windowRadius);
      const x2 = Math.min(W - 1, x + windowRadius);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[intY2 + x2 + 1] - integral[intY1 + x2 + 1] - integral[intY2 + x1] + integral[intY1 + x1];
      const localMean = sum / count;
      const thresh = localMean * (1 - t);

      const val = channelData[yW + x];
      let pixelVal = 0;

      if (!inverted) {
        pixelVal = val < thresh ? 0 : 255;
      } else {
        pixelVal = val < thresh ? 255 : 0;
      }

      const idx = (yW + x) * 4;
      outRgba[idx] = pixelVal;
      outRgba[idx + 1] = pixelVal;
      outRgba[idx + 2] = pixelVal;
      outRgba[idx + 3] = 255;
    }
  }

  return outRgba;
}

/**
 * Encodes RGBA to PNG and saves debug file.
 */
export async function savePassImage(outRgba, width, height, debugFilename) {
  const pngBuf = UPNG.encode([outRgba.buffer], width, height, 0);
  const b64 = fromByteArray(new Uint8Array(pngBuf));
  const debugUri = `${FileSystem.documentDirectory}${debugFilename}`;
  await FileSystem.writeAsStringAsync(debugUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return debugUri;
}

export async function performOnDeviceOCR(imageUri, selectedLang = 'ckb', onProgress) {
  try {
    if (onProgress) onProgress('ئامادەکردنی فایلی زمانی نەخێرا...');
    await ensureTessData(selectedLang, onProgress);

    // Set tessLang: Use pure lang model ('ckb' for Kurdish, 'ara' for Arabic, 'eng' for English)
    let tessLang = 'ckb';
    if (selectedLang === 'ara') tessLang = 'ara';
    if (selectedLang === 'eng') tessLang = 'eng';
    if (selectedLang === 'ckb') tessLang = 'ckb';

    const parentDir = FileSystem.documentDirectory;
    const cleanDataPath = parentDir.replace(/^file:\/\//, '');

    console.log(`==================== [OCR DEBUG SESSION START] ====================`);
    console.log(`[OCR Init] Data Path: '${cleanDataPath}', Language String: '${tessLang}'`);

    const safeUri = imageUri.startsWith('/') ? 'file://' + imageUri : imageUri;

    if (onProgress) onProgress('خوێندنەوەی دەقەکە...');

    // Decode full original image
    const fullManip = await ImageManipulator.manipulateAsync(
      safeUri,
      [],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!fullManip.base64) {
      throw new Error('Image manipulation failed to produce base64');
    }

    const fullBytes = toByteArray(fullManip.base64);
    const fullImg = UPNG.decode(fullBytes.buffer);
    const imgW = fullImg.width;
    const imgH = fullImg.height;

    console.log(`[OCR] Original Image Dimensions: ${imgW}x${imgH}`);

    // Upscale image if longer side < 1800px so all fonts and diacritics are sharp
    let processedUri = safeUri;
    let processedRgba = new Uint8Array(UPNG.toRGBA8(fullImg)[0]);
    let processedW = imgW;
    let processedH = imgH;

    const maxDim = Math.max(imgW, imgH);
    if (maxDim < 1800) {
      const scale = 1800 / maxDim;
      processedW = Math.round(imgW * scale);
      processedH = Math.round(imgH * scale);
      console.log(`[OCR] Upscaling image from ${imgW}x${imgH} to ${processedW}x${processedH}...`);

      const upscaledManip = await ImageManipulator.manipulateAsync(
        safeUri,
        [{ resize: { width: processedW, height: processedH } }],
        { format: ImageManipulator.SaveFormat.PNG, base64: true }
      );

      const upBytes = toByteArray(upscaledManip.base64);
      const upImg = UPNG.decode(upBytes.buffer);
      processedRgba = new Uint8Array(UPNG.toRGBA8(upImg)[0]);
      processedW = upImg.width;
      processedH = upImg.height;
      processedUri = upscaledManip.uri;
    }

    // Preprocess image variants:
    // 1. original_upscaled (Smooth original image - best for Tesseract LSTM)
    // 2. grayscale_adaptive (Adaptive threshold)
    const grayChannel = extractChannel(processedRgba, processedW, processedH, 'gray');
    const grayThresholdRgba = applyAdaptiveThreshold(grayChannel, processedW, processedH, false);

    const fullPasses = [
      {
        name: 'original_upscaled',
        uri: processedUri,
      },
      {
        name: 'grayscale_adaptive',
        uri: await savePassImage(grayThresholdRgba, processedW, processedH, 'ocr_full_gray.png'),
      },
    ];

    const passResults = [];

    for (const pass of fullPasses) {
      // PSM 4: Single column of text of variable sizes (captures entire column top to bottom)
      const res4 = await recognizeText(parentDir, tessLang, pass.uri, 4);
      const clean4 = cleanKurdishOcrOutput(res4.text || '', selectedLang);
      const letters4 = (clean4.match(/\p{L}/gu) || []).length;
      const conf4 = typeof res4.confidence === 'number' ? res4.confidence : 0;
      const score4 = conf4 * letters4;

      passResults.push({
        name: `${pass.name}_psm4`,
        text: clean4,
        confidence: conf4,
        letters: letters4,
        score: score4,
      });

      // PSM 6: Single uniform block of text
      const res6 = await recognizeText(parentDir, tessLang, pass.uri, 6);
      const clean6 = cleanKurdishOcrOutput(res6.text || '', selectedLang);
      const letters6 = (clean6.match(/\p{L}/gu) || []).length;
      const conf6 = typeof res6.confidence === 'number' ? res6.confidence : 0;
      const score6 = conf6 * letters6;

      passResults.push({
        name: `${pass.name}_psm6`,
        text: clean6,
        confidence: conf6,
        letters: letters6,
        score: score6,
      });
    }

    // Sort by SCORE (highest letter count & confidence wins)
    passResults.sort((a, b) => b.score - a.score);

    const bestPass = passResults[0];
    console.log(`[OCR Best Choice]: '${bestPass.name}' (Conf: ${bestPass.confidence}, Letters: ${bestPass.letters}, Score: ${bestPass.score})`);
    console.log(`[OCR Final Output Text]:\n"${bestPass.text}"`);
    console.log(`==================== [OCR DEBUG SESSION END] ====================`);

    return bestPass.text;
  } catch (err) {
    console.error('[OCR] Detailed Perform OCR Error:', err?.message, err?.code, err?.stack);
    throw err;
  }
}
