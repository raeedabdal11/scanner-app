import { File, Paths } from 'expo-file-system';
import { planPage, reverseTableLineColumns, isTableElement, splitRuns } from './pptFit';
import { getExportFontFamily } from './fonts';
import { getElementRuns } from './formattedText';

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

    let slideCount = 0;
    const slideShadowRuns = {}; // { 1: [ { text: "...", hex: "RRGGBB" }, ... ] }

    for (const pageData of targetPages) {
      // Use planPage to get computed font sizes & split slides if text overflows
      const planned = planPage(pageData);
      const generatedSlides = planned.slides || [pageData];

      for (const slideData of generatedSlides) {
        const slide = pptx.addSlide();
        slideCount++;

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

            const isBold = elem.fontWeight === 'bold';
            const isItalic = elem.fontStyle === 'italic';
            const isUnderline = elem.textDecorationLine === 'underline';
            const align = elem.textAlign || 'right';

            // Computed fontSize from planPage
            const fontSize = elem.computedFontSize || elem.fontSize || 18;

            const elemRuns = getElementRuns(elem);
            const pptxRuns = [];

            for (const run of elemRuns) {
              const runKurdishFont = getExportFontFamily(run.kurdishFont || elem.kurdishFont || 'Tahoma', true);
              const runEnglishFont = getExportFontFamily(run.englishFont || elem.englishFont || 'Calibri', false);
              const scriptRuns = splitRuns(run.text || '', runKurdishFont, runEnglishFont);

              const runFontSize = run.fontSize || fontSize;
              const runColor = normalizeHex(run.color, '1C1C1E');
              const runHighlight = normalizeHex(run.highlight || run.highlightColor, null);
              const runShadow = normalizeHex(run.shadowColor || run.shadow, null);
              const runBold = !!run.bold || run.fontWeight === 'bold';
              const runItalic = !!run.italic || run.fontStyle === 'italic';
              const runUnderline = !!run.underline || run.textDecorationLine === 'underline';

              for (const sRun of scriptRuns) {
                const runOpts = {
                  fontSize: runFontSize,
                  fontFace: sRun.fontFamily,
                  bold: runBold,
                  italic: runItalic,
                  underline: runUnderline ? { style: 'single' } : false,
                  color: runColor,
                };

                if (runHighlight) {
                  runOpts.highlight = runHighlight;
                }

                if (runShadow) {
                  slideShadowRuns[slideCount] = slideShadowRuns[slideCount] || [];
                  slideShadowRuns[slideCount].push({ text: sRun.text, hex: runShadow });
                }

                pptxRuns.push({
                  text: sRun.text,
                  options: runOpts,
                });
              }
            }

            const primaryFont = pptxRuns[0]?.options?.fontFace || 'Arial';

            const textOptions = {
              x: xIn,
              y: yIn,
              w: wIn,
              h: hIn,
              fontSize: fontSize,
              bold: isBold,
              italic: isItalic,
              underline: isUnderline ? { style: 'single' } : false,
              align: align,
              rtl: true,
              lineSpacingMultiple: 1.35,
              margin: 0,
              fontFace: primaryFont,
              valign: 'top',
            };

            if (pptxRuns.length > 0) {
              slide.addText(pptxRuns, textOptions);
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

    let finalBase64 = base64Output;
    const hasAnyShadow = Object.values(slideShadowRuns).some((arr) => arr && arr.length > 0);

    if (hasAnyShadow) {
      try {
        const JSZip = require('jszip');
        const zip = await JSZip.loadAsync(base64Output, { base64: true });

        for (const [slideNum, shadowList] of Object.entries(slideShadowRuns)) {
          if (!shadowList || shadowList.length === 0) continue;

          const slideFileName = `ppt/slides/slide${slideNum}.xml`;
          const slideFile = zip.file(slideFileName);
          if (!slideFile) continue;

          let xml = await slideFile.async('text');

          xml = xml.replace(/<a:r\b[^>]*>([\s\S]*?)<\/a:r>/g, (fullRunTag, innerContent) => {
            const textMatch = innerContent.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/);
            const runText = textMatch ? textMatch[1] : '';

            const shadowItem = shadowList.find(
              (s) => s.text === runText || (runText && s.text.includes(runText)) || (s.text && runText.includes(s.text))
            );

            if (shadowItem && shadowItem.hex) {
              const shadowXml = `<a:effectLst><a:outerShdw blurRad="25400" dist="12700" dir="2700000" algn="tl"><a:srgbClr val="${shadowItem.hex}"/></a:outerShdw></a:effectLst>`;

              if (/<a:rPr\b[^>]*\/>/.test(innerContent)) {
                const updatedInner = innerContent.replace(
                  /<a:rPr(\b[^>]*)\/>/,
                  `<a:rPr$1>${shadowXml}</a:rPr>`
                );
                return `<a:r>${updatedInner}</a:r>`;
              } else if (/<a:rPr\b[^>]*>/.test(innerContent)) {
                const updatedInner = innerContent.replace(
                  /<\/a:rPr>/,
                  `${shadowXml}</a:rPr>`
                );
                return `<a:r>${updatedInner}</a:r>`;
              } else {
                return `<a:r><a:rPr>${shadowXml}</a:rPr>${innerContent}</a:r>`;
              }
            }

            return fullRunTag;
          });

          zip.file(slideFileName, xml);
        }

        finalBase64 = await zip.generateAsync({ type: 'base64' });
      } catch (zipErr) {
        console.log('[PPT Exporter] JSZip post-processing error:', zipErr);
      }
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
    const filename = `PPT_${dateStr}.pptx`;

    // Modern expo-file-system API with File and Paths
    const file = new File(Paths.document, filename);
    file.create();
    await file.write(finalBase64, { encoding: 'base64' });

    return {
      fileUri: file.uri,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT Exporter] Error:', err);
    throw err;
  }
};
