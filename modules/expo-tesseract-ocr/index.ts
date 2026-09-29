import { requireOptionalNativeModule } from 'expo-modules-core';

function getNativeModule() {
  try {
    const mod = requireOptionalNativeModule('ExpoTesseractOcr');
    if (mod) {
      console.log('[OCR JS] Native module ExpoTesseractOcr found! Keys:', Object.keys(mod));
    } else {
      console.error('[OCR JS] requireOptionalNativeModule("ExpoTesseractOcr") returned null/undefined!');
    }
    return mod;
  } catch (e: any) {
    console.error('[OCR JS] Error loading ExpoTesseractOcr native module:', {
      message: e?.message,
      code: e?.code,
      stack: e?.stack,
    });
    return null;
  }
}

export interface OcrResult {
  text: string;
  confidence: number;
  success: boolean;
  initOk: boolean;
  dataPathUsed: string;
  imagePathUsed: string;
  ckbExists: boolean;
  ckbSize: number;
  engExists: boolean;
  engSize: number;
  bitmapNull: boolean;
  bitmapWidth: number;
  bitmapHeight: number;
  languagesLoaded: string;
  tessVersion: string;
  error?: string;
}

export async function recognizeText(tessDataPath: string, lang: string, imagePath: string): Promise<OcrResult> {
  const mod = getNativeModule();
  if (!mod) {
    console.error('[OCR JS] getNativeModule() is null!');
    return {
      text: '',
      confidence: 0,
      success: false,
      initOk: false,
      dataPathUsed: '',
      imagePathUsed: '',
      ckbExists: false,
      ckbSize: 0,
      engExists: false,
      engSize: 0,
      bitmapNull: true,
      bitmapWidth: 0,
      bitmapHeight: 0,
      languagesLoaded: '',
      tessVersion: '',
      error: 'Native module ExpoTesseractOcr is null or not found',
    };
  }

  if (!mod.recognizeText) {
    console.error('[OCR JS] mod.recognizeText is missing! Available keys:', Object.keys(mod));
    return {
      text: '',
      confidence: 0,
      success: false,
      initOk: false,
      dataPathUsed: '',
      imagePathUsed: '',
      ckbExists: false,
      ckbSize: 0,
      engExists: false,
      engSize: 0,
      bitmapNull: true,
      bitmapWidth: 0,
      bitmapHeight: 0,
      languagesLoaded: '',
      tessVersion: '',
      error: 'mod.recognizeText function is missing on native module',
    };
  }

  const cleanDataPath = tessDataPath.replace(/^file:\/\//, '');
  const cleanImagePath = imagePath.replace(/^file:\/\//, '');

  try {
    console.log('[OCR JS] Calling mod.recognizeText with:', { cleanDataPath, lang, cleanImagePath });
    const res = await mod.recognizeText(cleanDataPath, lang, cleanImagePath);
    console.log('[OCR JS] Raw native res received:', JSON.stringify(res));

    if (res && typeof res === 'object') {
      return {
        text: res.text || '',
        confidence: typeof res.confidence === 'number' ? res.confidence : 0,
        success: !!res.initOk && !res.bitmapNull,
        initOk: !!res.initOk,
        dataPathUsed: res.dataPathUsed || cleanDataPath,
        imagePathUsed: res.imagePathUsed || cleanImagePath,
        ckbExists: !!res.ckbExists,
        ckbSize: typeof res.ckbSize === 'number' ? res.ckbSize : 0,
        engExists: !!res.engExists,
        engSize: typeof res.engSize === 'number' ? res.engSize : 0,
        bitmapNull: res.bitmapNull !== undefined ? !!res.bitmapNull : true,
        bitmapWidth: typeof res.bitmapWidth === 'number' ? res.bitmapWidth : 0,
        bitmapHeight: typeof res.bitmapHeight === 'number' ? res.bitmapHeight : 0,
        languagesLoaded: res.languagesLoaded || '',
        tessVersion: res.tessVersion || '',
        error: res.error || undefined,
      };
    }
    return {
      text: '',
      confidence: 0,
      success: false,
      initOk: false,
      dataPathUsed: cleanDataPath,
      imagePathUsed: cleanImagePath,
      ckbExists: false,
      ckbSize: 0,
      engExists: false,
      engSize: 0,
      bitmapNull: true,
      bitmapWidth: 0,
      bitmapHeight: 0,
      languagesLoaded: '',
      tessVersion: '',
      error: 'Native function returned non-object: ' + String(res),
    };
  } catch (err: any) {
    console.error('[OCR JS Exception during recognizeText]:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    console.error('[OCR JS Full Exception]:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

    return {
      text: '',
      confidence: 0,
      success: false,
      initOk: false,
      dataPathUsed: cleanDataPath,
      imagePathUsed: cleanImagePath,
      ckbExists: false,
      ckbSize: 0,
      engExists: false,
      engSize: 0,
      bitmapNull: true,
      bitmapWidth: 0,
      bitmapHeight: 0,
      languagesLoaded: '',
      tessVersion: '',
      error: `JS Catch Exception: ${err?.message}\nCode: ${err?.code}\nStack: ${err?.stack}`,
    };
  }
}
