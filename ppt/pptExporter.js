import * as FileSystem from 'expo-file-system/legacy';

if (typeof window === 'undefined') {
  global.window = global;
}

export const exportPresentationToPptx = async (presentation) => {
  try {
    let PptxGenJS;
    try {
      const pptxModule = require('pptxgenjs');
      PptxGenJS = pptxModule.default || pptxModule;
    } catch (e) {
      console.log('[PPT Exporter] Require pptxgenjs error:', e);
      throw new Error('پێویستە پاکێجی pptxgenjs دابمەزرێنرێت (npx expo install pptxgenjs jszip).');
    }

    const pptx = new PptxGenJS();

    const is43 = presentation.aspectRatio === '4:3';
    if (is43) {
      pptx.layout = 'LAYOUT_4x3';
    } else {
      pptx.layout = 'LAYOUT_16x9';
    }

    const slideW = is43 ? 10 : 10;
    const slideH = is43 ? 7.5 : 5.625;

    for (let i = 0; i < presentation.slides.length; i++) {
      const slideData = presentation.slides[i];
      const slide = pptx.addSlide();

      // Set slide background color if custom
      if (slideData.background && slideData.background !== '#ffffff') {
        const hexBg = slideData.background.replace('#', '');
        slide.background = { color: hexBg };
      }

      // Sort elements by zIndex
      const sortedElements = [...(slideData.elements || [])].sort(
        (a, b) => (a.zIndex || 1) - (b.zIndex || 1)
      );

      for (const elem of sortedElements) {
        const xIn = ((elem.x || 0) / 100) * slideW;
        const yIn = ((elem.y || 0) / 100) * slideH;
        const wIn = ((elem.width || 50) / 100) * slideW;
        const hIn = ((elem.height || 20) / 100) * slideH;

        if (elem.type === 'text') {
          const hexColor = (elem.color || '#1c1c1e').replace('#', '');
          const isBold = elem.fontWeight === 'bold';
          const isItalic = elem.fontStyle === 'italic';
          const isUnderline = elem.textDecorationLine === 'underline';
          const align = elem.textAlign || 'right';
          const isRtl = elem.writingDirection !== 'ltr';
          const fontSize = elem.fontSize || 18;

          const textOptions = {
            x: xIn,
            y: yIn,
            w: wIn,
            h: hIn,
            fontSize: fontSize,
            bold: isBold,
            italic: isItalic,
            underline: isUnderline ? { style: 'single' } : false,
            color: hexColor,
            align: align,
            rtl: isRtl,
            valign: 'top',
          };

          if (elem.highlightColor && elem.highlightColor !== 'transparent') {
            textOptions.fill = { color: elem.highlightColor.replace('#', '') };
          }

          slide.addText(elem.text || '', textOptions);
        } else if (elem.type === 'image' && elem.uri) {
          let base64Img = '';
          if (elem.uri.startsWith('data:image')) {
            base64Img = elem.uri;
          } else {
            const rawBase64 = await FileSystem.readAsStringAsync(elem.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const mime = elem.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            base64Img = `data:${mime};base64,${rawBase64}`;
          }

          slide.addImage({
            data: base64Img,
            x: xIn,
            y: yIn,
            w: wIn,
            h: hIn,
            sizing: {
              type: 'contain',
              w: wIn,
              h: hIn,
            },
          });
        }
      }
    }

    const base64Output = await pptx.write({ outputType: 'base64' });

    const now = new Date();
    const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
    const filename = `PPT_${dateStr}.pptx`;
    const targetPath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(targetPath, base64Output, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      fileUri: targetPath,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT Exporter] Error:', err);
    throw err;
  }
};
