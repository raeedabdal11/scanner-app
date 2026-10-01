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

export interface OcrBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  box: OcrBox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  box: OcrBox;
  words: OcrWord[];
}

export interface OcrResult {
  text: string;
  confidence: number;
  lines: OcrLine[];
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

export async function recognizeText(
  tessDataPath: string,
  lang: string,
  imagePath: string,
  psm: number = 6
): Promise<OcrResult> {
  const mod = getNativeModule();
  if (!mod) {
    console.error('[OCR JS] getNativeModule() is null!');
    return {
      text: '',
      confidence: 0,
      lines: [],
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
      lines: [],
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
    console.log('[OCR JS] Calling mod.recognizeText with:', { cleanDataPath, lang, cleanImagePath, psm });
    const res = await mod.recognizeText(cleanDataPath, lang, cleanImagePath, psm);
    console.log('[OCR JS] Raw native res received:', JSON.stringify(res));

    if (res && typeof res === 'object') {
      const rawLines = Array.isArray(res.lines) ? res.lines : [];
      const lines: OcrLine[] = rawLines.map((l: any) => {
        const rawWords = Array.isArray(l?.words) ? l.words : [];
        const words: OcrWord[] = rawWords.map((w: any) => ({
          text: w?.text || '',
          confidence: typeof w?.confidence === 'number' ? w.confidence : 0,
          box: {
            left: typeof w?.box?.left === 'number' ? w.box.left : 0,
            top: typeof w?.box?.top === 'number' ? w.box.top : 0,
            right: typeof w?.box?.right === 'number' ? w.box.right : 0,
            bottom: typeof w?.box?.bottom === 'number' ? w.box.bottom : 0,
          },
        }));

        return {
          text: l?.text || '',
          confidence: typeof l?.confidence === 'number' ? l.confidence : 0,
          box: {
            left: typeof l?.box?.left === 'number' ? l.box.left : 0,
            top: typeof l?.box?.top === 'number' ? l.box.top : 0,
            right: typeof l?.box?.right === 'number' ? l.box.right : 0,
            bottom: typeof l?.box?.bottom === 'number' ? l.box.bottom : 0,
          },
          words,
        };
      });

      return {
        text: res.text || '',
        confidence: typeof res.confidence === 'number' ? res.confidence : 0,
        lines,
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
      lines: [],
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
      lines: [],
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
