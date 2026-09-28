import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray, fromByteArray } from 'base64-js';
import UPNG from 'upng-js';
import { Image } from 'react-native';
import { INPAINT_SERVER_URL } from './config';

const ERASED_DIR = `${FileSystem.documentDirectory}erased/`;

async function ensureErasedDir() {
  try {
    const info = await FileSystem.getInfoAsync(ERASED_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(ERASED_DIR, { intermediates: true });
    }
  } catch (e) {}
}

function drawCircleOnMask(mask, width, height, cx, cy, radius) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  const r2 = radius * radius;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        mask[y * width + x] = 1;
      }
    }
  }
}

function drawLineOnMask(mask, width, height, x1, y1, x2, y2, radius) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 1) return;
  const steps = Math.ceil(dist / 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    drawCircleOnMask(mask, width, height, cx, cy, radius);
  }
}

async function runFallbackInpaint(imageUri, existingRgba, W, H, cropX, cropY, cropDim, realPts, realRadius, t0) {
  try {
    let rgba = existingRgba;
    let width = W;
    let height = H;

    if (!rgba) {
      const safeUri = imageUri.startsWith('/') ? 'file://' + imageUri : imageUri;
      const fullResult = await ImageManipulator.manipulateAsync(
        safeUri,
        [{ resize: { width: 1000 } }],
        { format: ImageManipulator.SaveFormat.PNG, base64: true }
      );

      if (!fullResult.base64) return null;
      const fullBytes = toByteArray(fullResult.base64);
      const fullImg = UPNG.decode(fullBytes.buffer);
      rgba = new Uint8Array(UPNG.toRGBA8(fullImg)[0]);
      width = fullImg.width;
      height = fullImg.height;
    }

    const cropMask = new Uint8Array(cropDim * cropDim);
    for (let k = 0; k < realPts.length; k++) {
      const pt = realPts[k];
      const cx = pt.x - cropX;
      const cy = pt.y - cropY;
      drawCircleOnMask(cropMask, cropDim, cropDim, cx, cy, realRadius);
      if (k > 0) {
        const prev = realPts[k - 1];
        drawLineOnMask(cropMask, cropDim, cropDim, prev.x - cropX, prev.y - cropY, cx, cy, realRadius);
      }
    }

    const dilateR = 4;
    const dilatedCropMask = new Uint8Array(cropDim * cropDim);
    for (let y = 0; y < cropDim; y++) {
      for (let x = 0; x < cropDim; x++) {
        if (cropMask[y * cropDim + x] === 1) {
          for (let dy = -dilateR; dy <= dilateR; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= cropDim) continue;
            for (let dx = -dilateR; dx <= dilateR; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= cropDim) continue;
              if (dx * dx + dy * dy <= dilateR * dilateR) {
                dilatedCropMask[ny * cropDim + nx] = 1;
              }
            }
          }
        }
      }
    }

    const filledR = new Float32Array(cropDim * cropDim);
    const filledG = new Float32Array(cropDim * cropDim);
    const filledB = new Float32Array(cropDim * cropDim);

    for (let cy = 0; cy < cropDim; cy++) {
      const fullY = cropY + cy;
      for (let cx = 0; cx < cropDim; cx++) {
        const fullX = cropX + cx;
        const idx = cy * cropDim + cx;
        if (fullY >= 0 && fullY < height && fullX >= 0 && fullX < width) {
          const fullIdx = (fullY * width + fullX) * 4;
          filledR[idx] = rgba[fullIdx];
          filledG[idx] = rgba[fullIdx + 1];
          filledB[idx] = rgba[fullIdx + 2];
        }
      }
    }

    // Inward diffusion + 6 smoothing passes ONLY on masked pixels
    for (let pass = 0; pass < 6; pass++) {
      const nextR = new Float32Array(filledR);
      const nextG = new Float32Array(filledG);
      const nextB = new Float32Array(filledB);

      for (let cy = 0; cy < cropDim; cy++) {
        for (let cx = 0; cx < cropDim; cx++) {
          const idx = cy * cropDim + cx;
          if (dilatedCropMask[idx] === 1) {
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let dy = -2; dy <= 2; dy++) {
              const ny = cy + dy;
              if (ny < 0 || ny >= cropDim) continue;
              for (let dx = -2; dx <= 2; dx++) {
                const nx = cx + dx;
                if (nx < 0 || nx >= cropDim) continue;
                const nidx = ny * cropDim + nx;
                sumR += filledR[nidx];
                sumG += filledG[nidx];
                sumB += filledB[nidx];
                count++;
              }
            }
            if (count > 0) {
              nextR[idx] = sumR / count;
              nextG[idx] = sumG / count;
              nextB[idx] = sumB / count;
            }
          }
        }
      }
      filledR.set(nextR);
      filledG.set(nextG);
      filledB.set(nextB);
    }

    const alphaMap = new Float32Array(cropDim * cropDim);
    const blurR = 3;
    for (let y = 0; y < cropDim; y++) {
      for (let x = 0; x < cropDim; x++) {
        let sum = 0, count = 0;
        for (let dy = -blurR; dy <= blurR; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= cropDim) continue;
          for (let dx = -blurR; dx <= blurR; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= cropDim) continue;
            sum += dilatedCropMask[ny * cropDim + nx];
            count++;
          }
        }
        alphaMap[y * cropDim + x] = count > 0 ? sum / count : 0;
      }
    }

    for (let cy = 0; cy < cropDim; cy++) {
      const fullY = cropY + cy;
      if (fullY < 0 || fullY >= height) continue;

      for (let cx = 0; cx < cropDim; cx++) {
        const fullX = cropX + cx;
        if (fullX < 0 || fullX >= width) continue;

        const idx = cy * cropDim + cx;
        const alpha = alphaMap[idx];
        if (alpha <= 0.001) continue;

        const fullIdx = (fullY * width + fullX) * 4;
        const origR = rgba[fullIdx];
        const origG = rgba[fullIdx + 1];
        const origB = rgba[fullIdx + 2];

        rgba[fullIdx] = Math.round(alpha * filledR[idx] + (1 - alpha) * origR);
        rgba[fullIdx + 1] = Math.round(alpha * filledG[idx] + (1 - alpha) * origG);
        rgba[fullIdx + 2] = Math.round(alpha * filledB[idx] + (1 - alpha) * origB);
        rgba[fullIdx + 3] = 255;
      }
    }

    const pngBuffer = UPNG.encode([rgba.buffer], width, height, 0);
    const newBase64 = fromByteArray(new Uint8Array(pngBuffer));
    const newFileUri = `${ERASED_DIR}erased_${Date.now()}.png`;

    await FileSystem.writeAsStringAsync(newFileUri, newBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`[Eraser] Saved erased file: ${newFileUri} (+${Date.now() - t0}ms)`);
    return newFileUri;
  } catch (err) {
    return null;
  }
}

export async function inpaintImage(imageUri, strokePts, brushSize, displayW, displayH, onProgress) {
  const t0 = Date.now();
  if (!imageUri || !strokePts || strokePts.length === 0) return null;

  try {
    await ensureErasedDir();
    const safeUri = imageUri.startsWith('/') ? 'file://' + imageUri : imageUri;

    const initialSize = await new Promise((resolve) => {
      Image.getSize(
        safeUri,
        (w, h) => resolve({ width: w, height: h }),
        () => resolve({ width: 1000, height: 1000 })
      );
    });

    // 1. Decode Full Image ONCE
    const fullResult = await ImageManipulator.manipulateAsync(
      safeUri,
      [{ resize: { width: initialSize.width } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!fullResult.base64) return null;

    const fullBytes = toByteArray(fullResult.base64);
    const fullImg = UPNG.decode(fullBytes.buffer);
    const rgba = new Uint8Array(UPNG.toRGBA8(fullImg)[0]);

    const W = fullImg.width;
    const H = fullImg.height;

    const sx = W / displayW;
    const sy = H / displayH;

    console.log(`[Eraser] Real image size: ${W}x${H}, Display size: ${Math.round(displayW)}x${Math.round(displayH)}, Scale: ${sx.toFixed(2)} (+${Date.now() - t0}ms)`);

    const realPts = strokePts.map((p) => ({
      x: p.x * sx,
      y: p.y * sy,
    }));

    const realBrushDiameter = (brushSize || 25) * Math.max(sx, sy);
    const realRadius = Math.max(8, realBrushDiameter / 2);

    const xs = realPts.map((p) => p.x);
    const ys = realPts.map((p) => p.y);

    const minX = Math.max(0, Math.min(...xs) - realRadius);
    const maxX = Math.min(W, Math.max(...xs) + realRadius);
    const minY = Math.max(0, Math.min(...ys) - realRadius);
    const maxY = Math.min(H, Math.max(...ys) + realRadius);

    const boxW = maxX - minX;
    const boxH = maxY - minY;

    const maxDim = Math.max(boxW, boxH);
    const extraMargin = Math.max(32, Math.floor(maxDim * 0.5));
    let cropDim = Math.min(Math.min(W, H), Math.floor(maxDim + extraMargin * 2));
    cropDim = Math.max(64, cropDim);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const cropX = Math.max(0, Math.min(W - cropDim, Math.floor(centerX - cropDim / 2)));
    const cropY = Math.max(0, Math.min(H - cropDim, Math.floor(centerY - cropDim / 2)));

    console.log(`[Eraser] Crop box real pixels: origin (${cropX}, ${cropY}), size ${cropDim}x${cropDim} (+${Date.now() - t0}ms)`);

    // 2. Crop Image Area around Stroke
    const cropResult = await ImageManipulator.manipulateAsync(
      safeUri,
      [
        { crop: { originX: cropX, originY: cropY, width: cropDim, height: cropDim } },
      ],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!cropResult.base64) {
      console.log(`[Eraser] IOPaint run: fallback (+${Date.now() - t0}ms)`);
      return await runFallbackInpaint(safeUri, rgba, W, H, cropX, cropY, cropDim, realPts, realRadius, t0);
    }

    // 3. Build Crop Mask Image (255 for stroke, 0 for background)
    const rawMask = new Uint8Array(cropDim * cropDim);
    const cropPts = realPts.map((pt) => ({
      x: pt.x - cropX,
      y: pt.y - cropY,
    }));

    for (let k = 0; k < cropPts.length; k++) {
      const pt = cropPts[k];
      drawCircleOnMask(rawMask, cropDim, cropDim, pt.x, pt.y, realRadius);
      if (k > 0) {
        const prev = cropPts[k - 1];
        drawLineOnMask(rawMask, cropDim, cropDim, prev.x, prev.y, pt.x, pt.y, realRadius);
      }
    }

    // Dilate mask by 4 pixels
    const dilateR = 4;
    const dilatedCropMask = new Uint8Array(cropDim * cropDim);
    for (let y = 0; y < cropDim; y++) {
      for (let x = 0; x < cropDim; x++) {
        if (rawMask[y * cropDim + x] === 1) {
          for (let dy = -dilateR; dy <= dilateR; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= cropDim) continue;
            for (let dx = -dilateR; dx <= dilateR; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= cropDim) continue;
              if (dx * dx + dy * dy <= dilateR * dilateR) {
                dilatedCropMask[ny * cropDim + nx] = 1;
              }
            }
          }
        }
      }
    }

    const maskRgba = new Uint8Array(cropDim * cropDim * 4);
    for (let i = 0; i < cropDim * cropDim; i++) {
      const isMasked = dilatedCropMask[i] === 1;
      const val = isMasked ? 255 : 0;
      maskRgba[i * 4] = val;
      maskRgba[i * 4 + 1] = val;
      maskRgba[i * 4 + 2] = val;
      maskRgba[i * 4 + 3] = 255;
    }

    const maskPngBuffer = UPNG.encode([maskRgba.buffer], cropDim, cropDim, 0);
    const maskBase64 = fromByteArray(new Uint8Array(maskPngBuffer));
    const maskFileUri = `${FileSystem.cacheDirectory}mask_${Date.now()}.png`;

    await FileSystem.writeAsStringAsync(maskFileUri, maskBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Feathered alpha map for soft edge blending
    const alphaMap = new Float32Array(cropDim * cropDim);
    const blurR = 4;
    for (let y = 0; y < cropDim; y++) {
      for (let x = 0; x < cropDim; x++) {
        let sum = 0, count = 0;
        for (let dy = -blurR; dy <= blurR; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= cropDim) continue;
          for (let dx = -blurR; dx <= blurR; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= cropDim) continue;
            sum += dilatedCropMask[ny * cropDim + nx];
            count++;
          }
        }
        alphaMap[y * cropDim + x] = count > 0 ? sum / count : 0;
      }
    }

    // 4. Send IOPaint Server Request with 60s Timeout (JSON payload with base64 data URIs)
    const reqT0 = Date.now();
    console.log(`[Eraser] IOPaint request sent to ${INPAINT_SERVER_URL}/api/v1/inpaint (+${Date.now() - t0}ms)`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response = null;
    let endpointUrl = `${INPAINT_SERVER_URL}/api/v1/inpaint`;

    try {
      const jsonBody = JSON.stringify({
        image: "data:image/png;base64," + cropResult.base64,
        mask: "data:image/png;base64," + maskBase64,
      });

      response = await fetch(endpointUrl, {
        method: 'POST',
        body: jsonBody,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'image/png, image/jpeg, application/json, */*',
        },
        signal: controller.signal,
      });

      if (!response.ok && response.status === 404) {
        endpointUrl = `${INPAINT_SERVER_URL}/inpaint`;
        response = await fetch(endpointUrl, {
          method: 'POST',
          body: jsonBody,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'image/png, image/jpeg, application/json, */*',
          },
          signal: controller.signal,
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.log(`[Eraser] IOPaint JSON fetch error: name=${err.name}, message=${err.message} (+${Date.now() - t0}ms)`);
      console.log(`[Eraser] IOPaint run: fallback (+${Date.now() - t0}ms)`);
      return await runFallbackInpaint(safeUri, rgba, W, H, cropX, cropY, cropDim, realPts, realRadius, t0);
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {}
      const status = response ? response.status : 'None';
      const statusText = response ? response.statusText : '';
      console.log(`[Eraser] IOPaint HTTP error: status=${status}, statusText=${statusText}, body=${bodyText} (+${Date.now() - t0}ms)`);
      console.log(`[Eraser] IOPaint run: fallback (+${Date.now() - t0}ms)`);
      return await runFallbackInpaint(safeUri, rgba, W, H, cropX, cropY, cropDim, realPts, realRadius, t0);
    }

    console.log(`[Eraser] IOPaint response received: status=${response.status} in ${Date.now() - reqT0}ms (+${Date.now() - t0}ms)`);

    // 5. Decode Response Image
    let inpaintedRgba = null;
    let inpaintW = cropDim;
    let inpaintH = cropDim;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const b64 = json.image || json.result || json.file;
      if (!b64) throw new Error('No image in JSON');
      const bytes = toByteArray(b64);
      const img = UPNG.decode(bytes.buffer);
      inpaintedRgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
      inpaintW = img.width;
      inpaintH = img.height;
    } else {
      const blob = await response.blob();
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          if (typeof base64String === 'string') {
            const commaIdx = base64String.indexOf(',');
            resolve(commaIdx !== -1 ? base64String.slice(commaIdx + 1) : base64String);
          } else {
            reject(new Error('FileReader result is not a string'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      const bytes = toByteArray(base64Data);
      const img = UPNG.decode(bytes.buffer);
      inpaintedRgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
      inpaintW = img.width;
      inpaintH = img.height;
    }

    // 6. Paste Back ONLY Inside Mask with Soft Edge
    for (let cy = 0; cy < cropDim; cy++) {
      const fullY = cropY + cy;
      if (fullY < 0 || fullY >= H) continue;

      const inpY = Math.floor(cy * (inpaintH / cropDim));

      for (let cx = 0; cx < cropDim; cx++) {
        const fullX = cropX + cx;
        if (fullX < 0 || fullX >= W) continue;

        const idx = cy * cropDim + cx;
        const alpha = alphaMap[idx];
        if (alpha <= 0.001) continue;

        const inpX = Math.floor(cx * (inpaintW / cropDim));
        const inpIdx = (inpY * inpaintW + inpX) * 4;

        const outR = inpaintedRgba[inpIdx];
        const outG = inpaintedRgba[inpIdx + 1];
        const outB = inpaintedRgba[inpIdx + 2];

        const fullIdx = (fullY * W + fullX) * 4;
        const origR = rgba[fullIdx];
        const origG = rgba[fullIdx + 1];
        const origB = rgba[fullIdx + 2];

        rgba[fullIdx] = Math.round(alpha * outR + (1 - alpha) * origR);
        rgba[fullIdx + 1] = Math.round(alpha * outG + (1 - alpha) * origG);
        rgba[fullIdx + 2] = Math.round(alpha * outB + (1 - alpha) * origB);
        rgba[fullIdx + 3] = 255;
      }
    }

    const pngBuffer = UPNG.encode([rgba.buffer], W, H, 0);
    const newBase64 = fromByteArray(new Uint8Array(pngBuffer));
    const newFileUri = `${ERASED_DIR}erased_${Date.now()}.png`;

    await FileSystem.writeAsStringAsync(newFileUri, newBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`[Eraser] IOPaint run: success (+${Date.now() - t0}ms)`);
    console.log(`[Eraser] Saved erased file: ${newFileUri} (+${Date.now() - t0}ms)`);
    return newFileUri;
  } catch (err) {
    const errName = err ? err.name : 'UnknownError';
    const errMsg = err ? err.message : 'Unknown exception';
    console.log(`[Eraser] IOPaint run exception: name=${errName}, message=${errMsg} (+${Date.now() - t0}ms)`);
    console.log(`[Eraser] IOPaint run: fallback (+${Date.now() - t0}ms)`);
    return await runFallbackInpaint(imageUri, null, 0, 0, 0, 0, 0, strokePts, brushSize, t0);
  }
}
