import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray, fromByteArray } from 'base64-js';
import UPNG from 'upng-js';
import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const SIGNED_DIR = `${FileSystem.documentDirectory}signed/`;

async function ensureSignedDir() {
  const info = await FileSystem.getInfoAsync(SIGNED_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SIGNED_DIR, { intermediates: true });
  }
}

export async function processAndSaveSignatureImage(sourceUri) {
  return await processAdvancedSignature(sourceUri, { thresholdOffset: 18, inkColor: 'black' });
}

export async function processAdvancedSignature(sourceUri, options = {}) {
  const { thresholdOffset = 18, inkColor = 'black' } = options;
  await ensureSignedDir();
  const safeUri = sourceUri.startsWith('/') ? 'file://' + sourceUri : sourceUri;

  const manip = await ImageManipulator.manipulateAsync(
    safeUri,
    [{ resize: { width: 1200 } }],
    { format: ImageManipulator.SaveFormat.PNG, base64: true }
  );
  if (!manip.base64) return null;

  const bytes = toByteArray(manip.base64);
  const img = UPNG.decode(bytes.buffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const w = img.width;
  const h = img.height;
  const HW = w * h;

  // 1. Convert to Grayscale
  const gray = new Float32Array(HW);
  for (let i = 0; i < HW; i++) {
    const idx = i * 4;
    gray[i] = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
  }

  // 2. Integral Image for Adaptive / Local Thresholding (handles shadows & uneven lighting)
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      const intIdx = (y + 1) * (w + 1) + (x + 1);
      const prevRowInt = y > 0 ? integral[y * (w + 1) + (x + 1)] : 0;
      integral[intIdx] = rowSum + prevRowInt;
    }
  }

  const S = Math.max(15, Math.floor(Math.min(w, h) / 14));
  const halfS = Math.floor(S / 2);
  const C = thresholdOffset;

  const alpha = new Uint8Array(HW);
  const newR = new Uint8Array(HW);
  const newG = new Uint8Array(HW);
  const newB = new Uint8Array(HW);

  let rInk = 0, gInk = 0, bInk = 0;
  if (inkColor === 'blue') { rInk = 11; gInk = 46; bInk = 138; }

  const borderMargin = Math.floor(Math.min(w, h) * 0.03); // Remove camera border noise

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - halfS);
    const y2 = Math.min(h - 1, y + halfS);
    const countY = y2 - y1 + 1;

    for (let x = 0; x < w; x++) {
      const idx = y * w + x;

      if (x < borderMargin || x >= w - borderMargin || y < borderMargin || y >= h - borderMargin) {
        alpha[idx] = 0;
        continue;
      }

      const x1 = Math.max(0, x - halfS);
      const x2 = Math.min(w - 1, x + halfS);
      const countX = x2 - x1 + 1;
      const area = countY * countX;

      const sum =
        integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
        integral[y1 * (w + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (w + 1) + x1] +
        integral[y1 * (w + 1) + x1];

      const localMean = sum / area;
      const threshold = localMean - C;
      const val = gray[idx];

      const origR = rgba[idx * 4];
      const origG = rgba[idx * 4 + 1];
      const origB = rgba[idx * 4 + 2];

      if (val > threshold || val > 215) {
        alpha[idx] = 0;
      } else {
        const diff = threshold - val;
        const rampRange = 10;
        const aVal = diff >= rampRange ? 255 : Math.round((diff / rampRange) * 255);
        alpha[idx] = Math.max(0, Math.min(255, aVal));
      }

      if (inkColor === 'black') {
        newR[idx] = 0; newG[idx] = 0; newB[idx] = 0;
      } else if (inkColor === 'blue') {
        newR[idx] = rInk; newG[idx] = gInk; newB[idx] = bInk;
      } else {
        newR[idx] = origR; newG[idx] = origG; newB[idx] = origB;
      }
    }
  }

  // 3. Trim empty transparent space
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let hasInk = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (alpha[idx] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasInk = true;
      }
    }
  }

  let finalW = w, finalH = h, startX = 0, startY = 0;
  const padding = 10;
  if (hasInk) {
    startX = Math.max(0, minX - padding);
    startY = Math.max(0, minY - padding);
    const endX = Math.min(w - 1, maxX + padding);
    const endY = Math.min(h - 1, maxY + padding);
    finalW = endX - startX + 1;
    finalH = endY - startY + 1;
  }

  const finalRgba = new Uint8Array(finalW * finalH * 4);
  for (let y = 0; y < finalH; y++) {
    for (let x = 0; x < finalW; x++) {
      const srcX = startX + x;
      const srcY = startY + y;
      const srcIdx = srcY * w + srcX;
      const destIdx = (y * finalW + x) * 4;

      finalRgba[destIdx] = newR[srcIdx];
      finalRgba[destIdx + 1] = newG[srcIdx];
      finalRgba[destIdx + 2] = newB[srcIdx];
      finalRgba[destIdx + 3] = alpha[srcIdx];
    }
  }

  const pngBuf = UPNG.encode([finalRgba.buffer], finalW, finalH, 0);
  const b64 = fromByteArray(new Uint8Array(pngBuf));
  const fileUri = `${SIGNED_DIR}sig_create_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

export async function recolorSignature(sourceUri, hexColor) {
  await ensureSignedDir();
  const safeUri = sourceUri.startsWith('/') ? 'file://' + sourceUri : sourceUri;
  const base64 = await FileSystem.readAsStringAsync(safeUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = toByteArray(base64);
  const img = UPNG.decode(bytes.buffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  const w = img.width;
  const h = img.height;

  let r = 0, g = 0, b = 0;
  if (hexColor.startsWith('#')) {
    const num = parseInt(hexColor.slice(1), 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  }

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const a = rgba[idx + 3];
    if (a > 0) {
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
    }
  }

  const pngBuf = UPNG.encode([rgba.buffer], w, h, 0);
  const b64 = fromByteArray(new Uint8Array(pngBuf));
  const fileUri = `${SIGNED_DIR}sig_color_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

export async function mergeSignatures(baseImageUri, placedSignatures, displayW, displayH) {
  await ensureSignedDir();
  const safeUri = baseImageUri.startsWith('/') ? 'file://' + baseImageUri : baseImageUri;

  const size = await new Promise((resolve) => {
    Image.getSize(
      safeUri,
      (w, h) => resolve({ width: w, height: h }),
      () => resolve({ width: 1000, height: 1000 })
    );
  });

  const fullResult = await ImageManipulator.manipulateAsync(
    safeUri,
    [{ resize: { width: size.width } }],
    { format: ImageManipulator.SaveFormat.PNG, base64: true }
  );
  if (!fullResult.base64) return baseImageUri;

  const fullBytes = toByteArray(fullResult.base64);
  const fullImg = UPNG.decode(fullBytes.buffer);
  const baseRgba = new Uint8Array(UPNG.toRGBA8(fullImg)[0]);
  const W = fullImg.width;
  const H = fullImg.height;

  const sx = W / displayW;
  const sy = H / displayH;

  for (const sig of placedSignatures) {
    try {
      let sigUriToUse = sig.uri;
      if (sig.color) {
        sigUriToUse = await recolorSignature(sigUriToUse, sig.color);
      }
      if (sig.rotation && Math.abs(sig.rotation) > 1) {
        const manipRot = await ImageManipulator.manipulateAsync(
          sigUriToUse.startsWith('/') ? 'file://' + sigUriToUse : sigUriToUse,
          [{ rotate: sig.rotation }],
          { format: ImageManipulator.SaveFormat.PNG, base64: true }
        );
        if (manipRot.base64) {
          const rotUri = `${SIGNED_DIR}sig_rot_${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(rotUri, manipRot.base64, { encoding: FileSystem.EncodingType.Base64 });
          sigUriToUse = rotUri;
        }
      }

      const sigSafeUri = sigUriToUse.startsWith('/') ? 'file://' + sigUriToUse : sigUriToUse;
      const sigBase64 = await FileSystem.readAsStringAsync(sigSafeUri, { encoding: FileSystem.EncodingType.Base64 });
      const sigBytes = toByteArray(sigBase64);
      const sigImg = UPNG.decode(sigBytes.buffer);
      const sigRgba = new Uint8Array(UPNG.toRGBA8(sigImg)[0]);
      const sigW = sigImg.width;
      const sigH = sigImg.height;
      const sigAspect = sigW / sigH;
      const sigOpacity = sig.opacity !== undefined ? sig.opacity : 1.0;

      const targetX = sig.x * sx;
      const targetY = sig.y * sy;
      const targetW = sig.width * sx;
      const targetH = sig.height * sy; // Support independent horizontal and vertical (height) scaling

      for (let y = 0; y < targetH; y++) {
        const destY = Math.floor(targetY + y);
        if (destY < 0 || destY >= H) continue;
        const srcY = Math.floor((y / targetH) * sigH);

        for (let x = 0; x < targetW; x++) {
          const destX = Math.floor(targetX + x);
          if (destX < 0 || destX >= W) continue;
          const srcX = Math.floor((x / targetW) * sigW);

          const srcIdx = (srcY * sigW + srcX) * 4;
          const sa = (sigRgba[srcIdx + 3] / 255) * sigOpacity;
          if (sa <= 0.01) continue;

          const destIdx = (destY * W + destX) * 4;
          const dr = baseRgba[destIdx];
          const dg = baseRgba[destIdx + 1];
          const db = baseRgba[destIdx + 2];

          const sr = sigRgba[srcIdx];
          const sg = sigRgba[srcIdx + 1];
          const sb = sigRgba[srcIdx + 2];

          baseRgba[destIdx] = Math.round(sa * sr + (1 - sa) * dr);
          baseRgba[destIdx + 1] = Math.round(sa * sg + (1 - sa) * dg);
          baseRgba[destIdx + 2] = Math.round(sa * sb + (1 - sa) * db);
          baseRgba[destIdx + 3] = 255;
        }
      }
    } catch (e) {
      console.error("Failed to merge signature:", e);
    }
  }

  const finalBuf = UPNG.encode([baseRgba.buffer], W, H, 0);
  const finalB64 = fromByteArray(new Uint8Array(finalBuf));
  const finalUri = `${SIGNED_DIR}signed_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(finalUri, finalB64, { encoding: FileSystem.EncodingType.Base64 });
  return finalUri;
}
