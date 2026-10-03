import { File, Paths } from 'expo-file-system';
import { planPage, reverseTableLineColumns, isTableElement, splitRuns } from './pptFit';

if (typeof window === 'undefined') {
  global.window = global;
}

/**
 * Normalizes any color string to a 6-character uppercase HEX string for pptxgenjs
 */
const normalizeHex = (colorStr, defaultHex = null) => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'none') {
    return defaultHex;
  }
  let hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return defaultHex;
  }
  return hex.toUpperCase();
};

export const exportPresentationToPptx = async (presentation, selectedSlideIds = null) => {
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

    const slideW = 10;
    const slideH = is43 ? 7.5 : 5.625;

    // Filter pages if selectedSlideIds is provided
    const targetPages = Array.isArray(selectedSlideIds) && selectedSlideIds.length > 0
      ? presentation.slides.filter((s) => selectedSlideIds.includes(s.id))
      : presentation.slides;

    for (const pageData of targetPages) {
      // Use planPage to get computed font sizes & split slides if text overflows
      const planned = planPage(pageData);
      const generatedSlides = planned.slides || [pageData];

      for (const slideData of generatedSlides) {
        const slide = pptx.addSlide();

        // Set slide background color
        if (slideData.background && slideData.background !== '#ffffff') {
          const hexBg = normalizeHex(slideData.background, 'FFFFFF');
          if (hexBg) {
            slide.background = { color: hexBg };
          }
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
            if (!elem.text || !elem.text.trim()) continue;

            let textContent = elem.text;

            // For tables: reverse column order so the first column is on the right
            if (isTableElement(elem)) {
              const lines = textContent.split('\n');
              textContent = lines.map((l) => reverseTableLineColumns(l)).join('\n');
            }

            const textColor = normalizeHex(elem.color, '1C1C1E');
            const highlightColor = normalizeHex(elem.highlightColor, null);

            const isBold = elem.fontWeight === 'bold';
            const isItalic = elem.fontStyle === 'italic';
            const isUnderline = elem.textDecorationLine === 'underline';
            const align = elem.textAlign || 'right';

            // Computed fontSize from planPage
            const fontSize = elem.computedFontSize || elem.fontSize || 18;

            const runs = splitRuns(
              textContent,
              elem.kurdishFont || 'Tahoma',
              elem.englishFont || 'Calibri'
            );

            const primaryFont = runs[0]?.fontFamily || elem.kurdishFont || elem.englishFont || 'Arial';

            const textOptions = {
              x: xIn,
              y: yIn,
              w: wIn,
              h: hIn,
              fontSize: fontSize,
              bold: isBold,
              italic: isItalic,
              underline: isUnderline ? { style: 'single' } : false,
              color: textColor,
              align: align,
              rtl: true,
              lineSpacingMultiple: 1.35,
              margin: 0,
              fontFace: primaryFont,
              valign: 'top',
            };

            // Set highlight & solid fill for 100% cross-platform PowerPoint compatibility
            if (highlightColor) {
              textOptions.highlight = highlightColor;
              textOptions.fill = { color: highlightColor };
            }

            // Set text shadow for PowerPoint export
            if (elem.shadowColor && elem.shadowColor !== 'transparent') {
              textOptions.shadow = {
                type: 'outer',
                color: elem.shadowColor.replace('#', ''),
                blur: 3,
                offset: 2,
                angle: 45,
                opacity: 0.6,
              };
            }

            if (runs.length > 1) {
              const formattedRuns = runs.map((run) => ({
                text: run.text,
                options: {
                  fontSize: fontSize,
                  fontFace: run.fontFamily,
                  bold: isBold,
                  italic: isItalic,
                  underline: isUnderline ? { style: 'single' } : false,
                  color: textColor,
                },
              }));
              slide.addText(formattedRuns, textOptions);
            } else {
              slide.addText(textContent, textOptions);
            }
          } else if (elem.type === 'image') {
            if (!elem.uri) continue;

            try {
              let base64Img = '';
              if (elem.uri.startsWith('data:image')) {
                base64Img = elem.uri;
              } else {
                const imgFile = new File(elem.uri);
                const rawBase64 = await imgFile.base64();
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
                  type: 'cover',
                  w: wIn,
                  h: hIn,
                },
              });
            } catch (imgErr) {
              console.log('[PPT Exporter] Failed to add image:', imgErr);
            }
          }
        }
      }
    }

    const base64Output = await pptx.write({ outputType: 'base64' });

    const now = new Date();
    const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
    const filename = `PPT_${dateStr}.pptx`;

    // Modern expo-file-system API with File and Paths
    const file = new File(Paths.document, filename);
    file.create();
    await file.write(base64Output, { encoding: 'base64' });

    return {
      fileUri: file.uri,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT Exporter] Error:', err);
    throw err;
  }
};
