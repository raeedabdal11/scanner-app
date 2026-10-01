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
 * Extract channel array from RGBA buffer:
 * - 'gray': standard luminance (0.299R + 0.587G + 0.114B)
 * - 'blue': blue channel only (makes yellow/orange text dark on light background)
 * - 'min_rgb': min(R, G, B) per pixel (makes colored text dark on light background)
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
 * Calculates the percentage of dark pixels (< 128 value) in an RGBA buffer.
 */
export function getDarkPixelPercentage(rgba, width, height) {
  const total = width * height;
  if (total === 0) return 0;
  let darkCount = 0;
  const len = total * 4;
  for (let i = 0; i < len; i += 4) {
    if (rgba[i] < 128) {
      darkCount++;
    }
  }
  return (darkCount / total) * 100;
}

/**
 * Merges bounding boxes that overlap vertically by more than 50%.
 */
export function mergeOverlappingLineBoxes(boxes) {
  if (boxes.length <= 1) return boxes;

  let currentBoxes = boxes.map(b => ({ ...b }));
  let merged = true;

  while (merged) {
    merged = false;
    const nextBoxes = [];
    const used = new Array(currentBoxes.length).fill(false);

    for (let i = 0; i < currentBoxes.length; i++) {
      if (used[i]) continue;
      let boxA = { ...currentBoxes[i] };

      for (let j = i + 1; j < currentBoxes.length; j++) {
        if (used[j]) continue;
        const boxB = currentBoxes[j];

        const overlapTop = Math.max(boxA.top, boxB.top);
        const overlapBottom = Math.min(boxA.bottom, boxB.bottom);
        const overlap = Math.max(0, overlapBottom - overlapTop);

        const hA = boxA.bottom - boxA.top;
        const hB = boxB.bottom - boxB.top;
        const minH = Math.min(hA, hB);

        if (minH > 0 && overlap / minH > 0.5) {
          boxA = {
            left: Math.min(boxA.left, boxB.left),
            top: Math.min(boxA.top, boxB.top),
            right: Math.max(boxA.right, boxB.right),
            bottom: Math.max(boxA.bottom, boxB.bottom),
          };
          used[j] = true;
          merged = true;
        }
      }
      nextBoxes.push(boxA);
    }
    currentBoxes = nextBoxes;
  }

  return currentBoxes;
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

/**
 * Filter individual words inside a cropped text line:
 * - Removed word confidence deletion completely.
 * - Only remove words that contain no letters or digits at all (pure symbols).
 * - Inside a mostly Arabic/Kurdish line, remove standalone Latin words of 3 or fewer letters (e.g. junk from ﷺ).
 */
export function filterWordsInCropLine(rawLine) {
  if (!rawLine) return { text: '', words: [] };

  const lineConf = typeof rawLine.confidence === 'number' ? rawLine.confidence : 0;
  const rawWords = Array.isArray(rawLine.words) && rawLine.words.length > 0
    ? rawLine.words
    : (rawLine.text || '').split(/\s+/).map(w => ({ text: w, confidence: lineConf }));

  const lineFullText = Array.isArray(rawLine.words) && rawLine.words.length > 0
    ? rawLine.words.map(w => w?.text || '').join(' ')
    : (rawLine.text || '');

  // Check if line is mostly Arabic/Kurdish script
  const arabicLetters = (lineFullText.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latinLetters = (lineFullText.match(/[a-zA-Z]/g) || []).length;
  const isMostlyArabic = arabicLetters > latinLetters;

  let validWords = [];

  for (const w of rawWords) {
    if (!w || !w.text) continue;
    const wordText = w.text.trim();
    if (!wordText) continue;

    const wordConf = typeof w.confidence === 'number' ? w.confidence : lineConf;

    // Requirement 1: Only remove words that contain no letters or numbers at all (only symbols)
    const hasLetterOrDigit = /[\p{L}\p{N}]/u.test(wordText);
    if (!hasLetterOrDigit) continue;

    // Requirement 5: Replace Latin junk from ﷺ symbol inside mostly Arabic-script lines
    if (isMostlyArabic) {
      const lettersOnly = wordText.replace(/[^\p{L}]/gu, '');
      const isPureLatin = lettersOnly.length > 0 && /^[a-zA-Z]+$/.test(lettersOnly);
      if (isPureLatin && lettersOnly.length <= 3) {
        continue;
      }
    }

    validWords.push({
      text: wordText,
      confidence: wordConf,
    });
  }

  const filteredText = validWords.map(w => w.text).join(' ');

  return {
    text: filteredText,
    words: validWords,
  };
}

/**
 * Line eligibility check:
 * - Best variant confidence >= 40
 * - At least 3 letters
 */
export function isLineEligible(filteredText, confidence) {
  const clean = (filteredText || '').trim();
  if (!clean) return false;

  if (confidence < 40) return false;

  const letterCount = (clean.match(/\p{L}/gu) || []).length;
  if (letterCount < 3) return false;

  return true;
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

    const safeUri = imageUri.startsWith('/') ? 'file://' + imageUri : imageUri;

    // STEP 1: LAYOUT & UPSCALING
    if (onProgress) onProgress('پشکنینی نەخشەی دەقەکان (Layout)...');

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

    console.log(`[OCR Layout] Original Image Dimensions: ${imgW}x${imgH}`);

    // Requirement 1 from previous step: Upscale image so longer side is at least 1600px
    let upscaledUri = safeUri;
    let upscaledRgba = new Uint8Array(UPNG.toRGBA8(fullImg)[0]);
    let upscaledW = imgW;
    let upscaledH = imgH;

    const maxDim = Math.max(imgW, imgH);
    if (maxDim < 1600) {
      const scale = 1600 / maxDim;
      const targetW = Math.round(imgW * scale);
      const targetH = Math.round(imgH * scale);
      console.log(`[OCR Layout] Upscaling image from ${imgW}x${imgH} to ${targetW}x${targetH} (longer side >= 1600px)...`);

      const upscaledManip = await ImageManipulator.manipulateAsync(
        safeUri,
        [{ resize: { width: targetW, height: targetH } }],
        { format: ImageManipulator.SaveFormat.PNG, base64: true }
      );

      const upBytes = toByteArray(upscaledManip.base64);
      const upImg = UPNG.decode(upBytes.buffer);
      upscaledRgba = new Uint8Array(UPNG.toRGBA8(upImg)[0]);
      upscaledW = upImg.width;
      upscaledH = upImg.height;
      upscaledUri = upscaledManip.uri;
    }

    console.log(`[OCR Layout] Final Image Dimensions for Layout & Crop: ${upscaledW}x${upscaledH}`);

    // Run layout detection (PSM 4, RIL_TEXTLINE) on 3 images:
    // 1. grayscale
    // 2. inverted grayscale
    // 3. min(R,G,B) inverted
    const grayChannel = extractChannel(upscaledRgba, upscaledW, upscaledH, 'gray');
    const minRgbChannel = extractChannel(upscaledRgba, upscaledW, upscaledH, 'min_rgb');

    const layoutPassConfigs = [
      {
        name: 'grayscale',
        rgba: applyAdaptiveThreshold(grayChannel, upscaledW, upscaledH, false),
        debugFilename: 'ocr_debug_layout_grayscale.png',
      },
      {
        name: 'grayscale_inverted',
        rgba: applyAdaptiveThreshold(grayChannel, upscaledW, upscaledH, true),
        debugFilename: 'ocr_debug_layout_grayscale_inverted.png',
      },
      {
        name: 'min_rgb_inverted',
        rgba: applyAdaptiveThreshold(minRgbChannel, upscaledW, upscaledH, true),
        debugFilename: 'ocr_debug_layout_min_rgb_inverted.png',
      },
    ];

    const allRawBoxes = [];
    let grayscaleLayoutUri = null;

    for (const pass of layoutPassConfigs) {
      const darkPct = getDarkPixelPercentage(pass.rgba, upscaledW, upscaledH);
      const passUri = await savePassImage(pass.rgba, upscaledW, upscaledH, pass.debugFilename);

      if (pass.name === 'grayscale') {
        grayscaleLayoutUri = passUri;
      }

      console.log(`[OCR Layout Pass - ${pass.name}] Running layout detection (PSM 4)...`);
      const passRes = await recognizeText(parentDir, tessLang, passUri, 4);

      const passLines = passRes.lines || [];
      console.log(`[OCR Layout Pass - ${pass.name}] Dark Pixels: ${darkPct.toFixed(2)}%, Lines Found: ${passLines.length}`);

      for (let i = 0; i < passLines.length; i++) {
        const box = passLines[i].box || { left: 0, top: 0, right: upscaledW, bottom: upscaledH };
        allRawBoxes.push({
          left: Math.max(0, box.left),
          top: Math.max(0, box.top),
          right: Math.min(upscaledW, box.right),
          bottom: Math.min(upscaledH, box.bottom),
        });
      }
    }

    // Combine all detected line boxes, and merge boxes that overlap vertically by more than 50%
    const mergedRawBoxes = mergeOverlappingLineBoxes(allRawBoxes);
    console.log(`[OCR Layout] Total raw boxes combined across 3 passes: ${allRawBoxes.length}, after vertical 50% merge: ${mergedRawBoxes.length}`);

    // If all 3 layout images find 0 lines, fall back to running full-image OCR with PSM 6 on grayscale image
    if (mergedRawBoxes.length === 0) {
      console.log('[OCR Layout] All 3 layout images found 0 lines. Falling back to full-image OCR with PSM 6 on grayscale image...');
      const fallbackUri = grayscaleLayoutUri || (await savePassImage(
        applyAdaptiveThreshold(grayChannel, upscaledW, upscaledH, false),
        upscaledW,
        upscaledH,
        'ocr_debug_layout_grayscale.png'
      ));
      const fallbackRes = await recognizeText(parentDir, tessLang, fallbackUri, 6);
      const fallbackText = normalizeKurdishText(fallbackRes.text || '');
      console.log(`[OCR Fallback Output Length]: ${fallbackText.length} chars`);
      console.log(`[OCR Fallback Output Text]: "${fallbackText}"`);
      console.log(`==================== [OCR DEBUG SESSION END] ====================`);
      return fallbackText;
    }

    const lineBoxes = [];
    for (let i = 0; i < mergedRawBoxes.length; i++) {
      const box = mergedRawBoxes[i];

      // Add 6px padding to each box
      const cropLeft = Math.max(0, Math.floor(box.left) - 6);
      const cropTop = Math.max(0, Math.floor(box.top) - 6);
      const cropRight = Math.min(upscaledW, Math.ceil(box.right) + 6);
      const cropBottom = Math.min(upscaledH, Math.ceil(box.bottom) + 6);

      const cropW = Math.max(10, cropRight - cropLeft);
      const cropH = Math.max(10, cropBottom - cropTop);

      lineBoxes.push({
        cropLeft,
        cropTop,
        cropW,
        cropH,
      });
    }

    // Sort bounding boxes top to bottom by cropTop
    lineBoxes.sort((a, b) => a.cropTop - b.cropTop);

    // STEP 2 & 3: PER LINE Crop & 6 Variants
    const finalAcceptedLines = [];

    for (let index = 0; index < lineBoxes.length; index++) {
      const lbox = lineBoxes[index];
      const lineNum = index + 1;

      if (onProgress) {
        onProgress(`خوێندنەوەی ڕستەی ${lineNum} لە ${lineBoxes.length}...`);
      }

      console.log(`--- [Line ${lineNum}/${lineBoxes.length}] Box: (${lbox.cropLeft}, ${lbox.cropTop}, ${lbox.cropW}x${lbox.cropH}) ---`);

      // Crop from UPSCALED image and resize height to ~64px
      const cropResult = await ImageManipulator.manipulateAsync(
        upscaledUri,
        [
          { crop: { originX: lbox.cropLeft, originY: lbox.cropTop, width: lbox.cropW, height: lbox.cropH } },
          { resize: { height: 64 } },
        ],
        { format: ImageManipulator.SaveFormat.PNG, base64: true }
      );

      const cropBytes = toByteArray(cropResult.base64);
      const cropImg = UPNG.decode(cropBytes.buffer);
      const cropRgba = new Uint8Array(UPNG.toRGBA8(cropImg)[0]);
      const cropW = cropImg.width;
      const cropH = cropImg.height;

      // Extract channel buffers for the crop
      const cropGray = extractChannel(cropRgba, cropW, cropH, 'gray');
      const cropBlue = extractChannel(cropRgba, cropW, cropH, 'blue');
      const cropMinRgb = extractChannel(cropRgba, cropW, cropH, 'min_rgb');

      const variantConfigs = [
        { name: 'grayscale', data: cropGray, inverted: false },
        { name: 'grayscale_inverted', data: cropGray, inverted: true },
        { name: 'blue_channel', data: cropBlue, inverted: false },
        { name: 'blue_channel_inverted', data: cropBlue, inverted: true },
        { name: 'min_rgb', data: cropMinRgb, inverted: false },
        { name: 'min_rgb_inverted', data: cropMinRgb, inverted: true },
      ];

      const variantResults = [];

      for (const v of variantConfigs) {
        const vRgba = applyAdaptiveThreshold(v.data, cropW, cropH, v.inverted);
        const debugFilename = `ocr_crop_line${lineNum}_${v.name}.png`;
        const vUri = await savePassImage(vRgba, cropW, cropH, debugFilename);

        // Run OCR on each variant with PSM 7 (PSM_SINGLE_LINE)
        const vRes = await recognizeText(parentDir, tessLang, vUri, 7);

        const rawText = normalizeKurdishText(vRes.text);
        const lineObj = (vRes.lines && vRes.lines.length > 0) ? vRes.lines[0] : { text: rawText, confidence: vRes.confidence, words: [] };

        const filtered = filterWordsInCropLine(lineObj);
        const cleanFilteredText = normalizeKurdishText(filtered.text);

        const confidence = typeof vRes.confidence === 'number' ? vRes.confidence : 0;
        const letterCount = (cleanFilteredText.match(/\p{L}/gu) || []).length;

        // Requirement 2: SCORE = average confidence x number of letters
        const score = confidence * letterCount;

        const textSnippet = (cleanFilteredText || '').replace(/\s+/g, ' ');
        console.log(`  [Line ${lineNum} - Variant '${v.name}'] Conf: ${confidence}, Letters: ${letterCount}, Score: ${score}, Text: "${textSnippet}"`);

        variantResults.push({
          name: v.name,
          confidence,
          letterCount,
          score,
          text: cleanFilteredText,
          rawLine: lineObj,
        });
      }

      // Requirement 2: Choose best variant by SCORE (highest score wins)
      variantResults.sort((a, b) => b.score - a.score);
      const bestVariant = variantResults[0];

      console.log(`[Line ${lineNum} Choice] Chosen Variant: '${bestVariant.name}' (Conf: ${bestVariant.confidence}, Letters: ${bestVariant.letterCount}, Score: ${bestVariant.score}), Text: "${bestVariant.text}"`);

      // Requirement 3: Lower line threshold (confidence >= 40 and at least 3 letters)
      if (bestVariant.confidence >= 40 && bestVariant.letterCount >= 3) {
        console.log(`[Line ${lineNum} Status] ACCEPTED ✓`);
        finalAcceptedLines.push({
          top: lbox.cropTop,
          text: bestVariant.text,
          confidence: bestVariant.confidence,
          variantName: bestVariant.name,
        });
      } else {
        // Requirement 4: Log for every line that is NOT output
        let reason = '';
        if (bestVariant.letterCount < 3) {
          reason = `letter count (${bestVariant.letterCount}) < 3`;
        } else if (bestVariant.confidence < 40) {
          reason = `confidence (${bestVariant.confidence}) < 40`;
        } else {
          reason = 'low confidence or empty text';
        }

        console.log(`[Line ${lineNum} DROPPED] reason: ${reason}, best text: "${bestVariant.text}", confidence: ${bestVariant.confidence}`);
      }
    }

    if (finalAcceptedLines.length === 0) {
      console.log('[OCR Line Crops] All line crops were dropped. Falling back to full-image OCR with PSM 6 on grayscale image...');
      const fallbackUri = grayscaleLayoutUri || (await savePassImage(
        applyAdaptiveThreshold(grayChannel, upscaledW, upscaledH, false),
        upscaledW,
        upscaledH,
        'ocr_debug_layout_grayscale.png'
      ));
      const fallbackRes = await recognizeText(parentDir, tessLang, fallbackUri, 6);
      const fallbackText = normalizeKurdishText(fallbackRes.text || '');
      console.log(`[OCR Fallback Output Length]: ${fallbackText.length} chars`);
      console.log(`[OCR Fallback Output Text]: "${fallbackText}"`);
      console.log(`==================== [OCR DEBUG SESSION END] ====================`);
      return fallbackText;
    }

    // Sort accepted lines top to bottom
    finalAcceptedLines.sort((a, b) => a.top - b.top);

    console.log(`[OCR Final Line Assembly] Outputting ${finalAcceptedLines.length} accepted lines:`);
    for (let i = 0; i < finalAcceptedLines.length; i++) {
      const l = finalAcceptedLines[i];
      console.log(`  Line ${i + 1} (Conf ${l.confidence}% | Variant: ${l.variantName}): "${l.text}"`);
    }

    const finalText = finalAcceptedLines.map(l => l.text).join('\n');
    console.log(`[OCR Final Output Length]: ${finalText.length} chars`);
    console.log(`==================== [OCR DEBUG SESSION END] ====================`);

    return finalText;
  } catch (err) {
    console.error('[OCR] Detailed Perform OCR Error:', err?.message, err?.code, err?.stack);
    console.error('[OCR] Full Error Stack:', err?.stack);
    throw err;
  }
}
