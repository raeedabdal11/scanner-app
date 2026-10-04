import { File, Paths } from 'expo-file-system';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { planPage, reverseTableLineColumns, isTableElement, splitRuns } from './pptFit';
import { getExportFontFamily } from './fonts';
import { getElementRuns } from './formattedText';

if (typeof window === 'undefined') {
  global.window = global;
}

/**
 * Standard named colors mapped to 6-character uppercase hex
 */
const NAMED_COLORS = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  lime: '00FF00',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  silver: 'C0C0C0',
  gray: '808080',
  grey: '808080',
  maroon: '800000',
  navy: '000080',
  olive: '808000',
  purple: '800080',
  teal: '008080',
  orange: 'FFA500',
  pink: 'FFC0CB',
  gold: 'FFD700',
};

/**
 * Parses any color string (hex, #hex, rgb, rgba, named colors)
 * Returns { hex: 'RRGGBB', alpha: number|null } where alpha is 0..100000 for OOXML.
 */
export function parseColor(colorInput, defaultHex = null) {
  if (!colorInput || typeof colorInput !== 'string') {
    return defaultHex ? { hex: defaultHex.replace(/^#/, '').toUpperCase(), alpha: null } : null;
  }

  let str = colorInput.trim().toLowerCase();
  if (str === 'transparent' || str === 'none') {
    return null;
  }

  // 1. Named colors
  if (NAMED_COLORS[str]) {
    return { hex: NAMED_COLORS[str], alpha: null };
  }

  // 2. rgb(...) or rgba(...)
  const rgbaMatch = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    const hex = [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();

    let alpha = null;
    if (rgbaMatch[4] !== undefined) {
      const a = parseFloat(rgbaMatch[4]);
      if (!isNaN(a) && a < 1.0) {
        alpha = Math.round(Math.max(0, Math.min(1, a)) * 100000);
      }
    }
    return { hex, alpha };
  }

  // 3. Hex strings (#RGB, #RRGGBB, #RRGGBBAA, or raw hex)
  let hex = str.replace(/^#/, '').trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  let alpha = null;
  if (hex.length === 8) {
    const aa = parseInt(hex.slice(6, 8), 16);
    if (!isNaN(aa) && aa < 255) {
      alpha = Math.round((aa / 255) * 100000);
    }
    hex = hex.slice(0, 6);
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return { hex: hex.toUpperCase(), alpha };
  }

  if (defaultHex) {
    return { hex: defaultHex.replace(/^#/, '').toUpperCase(), alpha: null };
  }

  return null;
}

/**
 * Helper to normalize any color to 6-digit HEX
 */
const normalizeHex = (colorStr, defaultHex = null) => {
  const parsed = parseColor(colorStr, defaultHex);
  return parsed ? parsed.hex : defaultHex;
};

/**
 * Required child element order inside <a:rPr> per OOXML Schema (ECMA-376 Part 1):
 * 1. a:ln
 * 2. Fill: a:noFill / a:solidFill / a:gradFill / a:blipFill / a:pattFill
 * 3. a:effectLst (shadow)
 * 4. a:highlight
 * 5. a:uLnTx / a:uLn
 * 6. a:uFillTx / a:uFill
 * 7. a:latin
 * 8. a:ea
 * 9. a:cs
 * 10. a:sym
 * 11. a:hlinkClick / a:hlinkMouseOver
 * 12. a:rtl
 * 13. a:extLst
 */
const TAG_ORDER = {
  ln: 10,
  nofill: 20,
  solidfill: 20,
  gradfill: 20,
  blipfill: 20,
  pattfill: 20,
  effectlst: 30,
  highlight: 40,
  ulntx: 50,
  uln: 50,
  ufilltx: 60,
  ufill: 60,
  latin: 70,
  ea: 80,
  cs: 90,
  sym: 100,
  hlinkclick: 110,
  hlinkmouseover: 110,
  rtl: 120,
  extlst: 130,
};

function getCleanTagName(node) {
  const name = node.localName || node.tagName || node.nodeName || '';
  return name.replace(/^[^:]+:/, '').toLowerCase();
}

/**
 * Reorders child element nodes inside an <a:rPr> element according to OpenXML schema rules.
 */
export function reorderRPrChildren(rPrNode) {
  const children = [];
  for (let i = 0; i < rPrNode.childNodes.length; i++) {
    const child = rPrNode.childNodes[i];
    if (child.nodeType === 1) { // Element node
      children.push(child);
    }
  }

  children.sort((a, b) => {
    const tagA = getCleanTagName(a);
    const tagB = getCleanTagName(b);
    const orderA = TAG_ORDER[tagA] || 999;
    const orderB = TAG_ORDER[tagB] || 999;
    return orderA - orderB;
  });

  while (rPrNode.firstChild) {
    rPrNode.removeChild(rPrNode.firstChild);
  }

  for (const child of children) {
    rPrNode.appendChild(child);
  }
}

/**
 * Validates every .xml / .rels part using DOMParser and verifies [Content_Types].xml entries.
 */
export async function validatePptxZip(zip) {
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (msg) => { throw new Error(msg); },
      fatalError: (msg) => { throw new Error(msg); },
    },
  });

  const zipFiles = Object.keys(zip.files);

  // 1. Validate all .xml and .rels parts with DOMParser
  for (const partName of zipFiles) {
    if (zip.files[partName].dir) continue;
    const lowerName = partName.toLowerCase();
    if (lowerName.endsWith('.xml') || lowerName.endsWith('.rels')) {
      const content = await zip.file(partName).async('text');
      try {
        const doc = parser.parseFromString(content, 'text/xml');
        const parserErrors = doc.getElementsByTagName('parsererror');
        if (parserErrors && parserErrors.length > 0) {
          const errText = parserErrors[0].textContent || 'XML parse error';
          console.log('[PPTX] invalid', partName, errText);
          return { valid: false, error: errText, partName };
        }
      } catch (xmlErr) {
        console.log('[PPTX] invalid', partName, xmlErr.message);
        return { valid: false, error: xmlErr.message, partName };
      }
    }
  }

  // 2. Validate [Content_Types].xml
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (!contentTypesFile) {
    console.log('[PPTX] invalid', '[Content_Types].xml', 'File missing');
    return { valid: false, error: 'File missing', partName: '[Content_Types].xml' };
  }

  const ctXml = await contentTypesFile.async('text');
  let ctDoc;
  try {
    ctDoc = parser.parseFromString(ctXml, 'text/xml');
  } catch (ctErr) {
    console.log('[PPTX] invalid', '[Content_Types].xml', ctErr.message);
    return { valid: false, error: ctErr.message, partName: '[Content_Types].xml' };
  }

  const defaults = new Set();
  const defaultElems = ctDoc.getElementsByTagName('Default');
  for (let i = 0; i < defaultElems.length; i++) {
    const ext = defaultElems[i].getAttribute('Extension');
    if (ext) defaults.add(ext.toLowerCase());
  }

  const overrides = new Set();
  const overrideElems = ctDoc.getElementsByTagName('Override');
  for (let i = 0; i < overrideElems.length; i++) {
    const pn = overrideElems[i].getAttribute('PartName');
    if (pn) {
      const normalizedPn = pn.startsWith('/') ? pn.slice(1).toLowerCase() : pn.toLowerCase();
      overrides.add(normalizedPn);
    }
  }

  for (const partName of zipFiles) {
    if (zip.files[partName].dir) continue;
    if (partName === '[Content_Types].xml') continue;

    const normalizedPart = partName.toLowerCase();
    const dotIdx = normalizedPart.lastIndexOf('.');
    const ext = dotIdx !== -1 ? normalizedPart.slice(dotIdx + 1) : '';

    const hasExtensionDefault = defaults.has(ext);
    const hasOverride = overrides.has(normalizedPart);

    if (!hasExtensionDefault && !hasOverride) {
      const err = `Missing [Content_Types].xml entry for part: ${partName}`;
      console.log('[PPTX] invalid', partName, err);
      return { valid: false, error: err, partName };
    }
  }

  return { valid: true };
}

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
    // Stores sequential run specifications for JSZip post-processing
    // { slideNum: [ { text: "...", color: {hex, alpha}, highlight: {hex, alpha}, shadow: {hex, alpha} }, ... ] }
    const slideRunSpecs = {};

    for (const pageData of targetPages) {
      // Use planPage to get computed font sizes & split slides if text overflows
      const planned = planPage(pageData);
      const generatedSlides = planned.slides || [pageData];

      for (const slideData of generatedSlides) {
        const slide = pptx.addSlide();
        slideCount++;
        slideRunSpecs[slideCount] = [];

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
              const runKurdishFont = getExportFontFamily(run.kurdishFont || run.kuFont || elem.kurdishFont || 'Tahoma', true);
              const runEnglishFont = getExportFontFamily(run.englishFont || run.enFont || elem.englishFont || 'Calibri', false);
              const scriptRuns = splitRuns(run.text || '', runKurdishFont, runEnglishFont);

              const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
              const runFontSize = Math.round(fontSize * runScale * 10) / 10;

              const runColorObj = parseColor(run.color || elem.color, '1C1C1E');
              const runHighlightObj = parseColor(run.highlight || run.highlightColor, null);

              const shadowColorStr =
                run.shadowColor ||
                run.shadow ||
                run.textShadowColor ||
                elem.shadowColor ||
                elem.shadow ||
                elem.textShadowColor;

              let runShadowObj = null;
              if (shadowColorStr && shadowColorStr !== 'transparent' && shadowColorStr !== 'none') {
                const parsed = parseColor(shadowColorStr);
                let hex = parsed ? parsed.hex : '000000';
                if (hex === 'FFFFFF' || !parsed) {
                  hex = '000000';
                }
                const alpha = (parsed && parsed.alpha !== null && parsed.alpha !== undefined) ? parsed.alpha : 60000;

                const offset = run.textShadowOffset || run.shadowOffset || elem.textShadowOffset || elem.shadowOffset || { width: 2, height: 2 };
                const dx = typeof offset.width === 'number' ? offset.width : 2;
                const dy = typeof offset.height === 'number' ? offset.height : 2;
                const radius = run.textShadowRadius !== undefined ? run.textShadowRadius : (run.shadowRadius !== undefined ? run.shadowRadius : (elem.textShadowRadius !== undefined ? elem.textShadowRadius : (elem.shadowRadius !== undefined ? elem.shadowRadius : 3)));

                const distPt = Math.sqrt(dx * dx + dy * dy);
                const dist = Math.round(distPt * 12700);
                const rad = Math.atan2(dy, dx);
                let deg = rad * (180 / Math.PI);
                if (deg < 0) deg += 360;
                const dir = Math.round(deg * 60000) % 21600000;
                const blurRad = Math.round(radius * 12700);

                runShadowObj = {
                  hex,
                  alpha,
                  dist,
                  dir,
                  blurRad,
                };
              }

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
                  color: runColorObj ? runColorObj.hex : '1C1C1E',
                };

                pptxRuns.push({
                  text: sRun.text,
                  options: runOpts,
                });

                // Record sequential run specification for JSZip post-processing
                slideRunSpecs[slideCount].push({
                  text: sRun.text,
                  color: runColorObj,
                  highlight: runHighlightObj,
                  shadow: runShadowObj,
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

    // 1) Generate raw Uint8Array from pptxgenjs
    const rawUint8Array = await pptx.write({
      outputType: 'uint8array',
      compression: true,
    });

    let finalUint8Array = rawUint8Array;

    try {
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(rawUint8Array);
      const parser = new DOMParser();

      for (let slideNum = 1; slideNum <= slideCount; slideNum++) {
        const runSpecs = slideRunSpecs[slideNum] || [];
        if (runSpecs.length === 0) continue;

        const slideFileName = `ppt/slides/slide${slideNum}.xml`;
        const slideFile = zip.file(slideFileName);
        if (!slideFile) continue;

        const xmlText = await slideFile.async('text');
        const slideDoc = parser.parseFromString(xmlText, 'text/xml');

        // Clean up duplicate <a:pPr> elements inserted by pptxgenjs inside paragraphs
        const pNodes = slideDoc.getElementsByTagName('a:p');
        for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
          const pNode = pNodes[pIdx];
          let firstPPrSeen = false;
          const pChildren = [];
          for (let j = 0; j < pNode.childNodes.length; j++) {
            pChildren.push(pNode.childNodes[j]);
          }
          for (const child of pChildren) {
            if (child.nodeType === 1 && (child.localName === 'pPr' || child.nodeName === 'a:pPr')) {
              if (!firstPPrSeen) {
                firstPPrSeen = true;
              } else {
                pNode.removeChild(child);
                modified = true;
              }
            }
          }
        }

        const runNodes = slideDoc.getElementsByTagName('a:r');
        let modified = false;
        let specIdx = 0;

        for (let i = 0; i < runNodes.length; i++) {
          const runNode = runNodes[i];
          const tNodes = runNode.getElementsByTagName('a:t');
          const runText = tNodes.length > 0 ? (tNodes[0].textContent || '') : '';

          if (specIdx >= runSpecs.length) break;

          let spec = runSpecs[specIdx];

          // Match sequentially with specIdx advance
          if (spec && (spec.text === runText || (runText && spec.text && (spec.text.startsWith(runText) || runText.startsWith(spec.text))))) {
            if (spec.text === runText || runText.length >= spec.text.length) {
              specIdx++;
            }
          } else {
            // Fallback match if indices desynced
            const foundIdx = runSpecs.findIndex(
              (s, idx) => idx >= specIdx && (s.text === runText || (runText && s.text && (s.text.includes(runText) || runText.includes(s.text))))
            );
            if (foundIdx !== -1) {
              specIdx = foundIdx;
              spec = runSpecs[specIdx];
              specIdx++;
            } else {
              continue;
            }
          }

          if (!spec) continue;

          // Find or create <a:rPr>
          let rPrNodes = runNode.getElementsByTagName('a:rPr');
          let rPrNode;
          if (rPrNodes.length > 0) {
            rPrNode = rPrNodes[0];
          } else {
            rPrNode = slideDoc.createElement('a:rPr');
            if (runNode.firstChild) {
              runNode.insertBefore(rPrNode, runNode.firstChild);
            } else {
              runNode.appendChild(rPrNode);
            }
          }

          // 1. Text Color (<a:solidFill>)
          if (spec.color && spec.color.hex) {
            let solidFillNodes = rPrNode.getElementsByTagName('a:solidFill');
            let solidFillNode = solidFillNodes.length > 0 ? solidFillNodes[0] : slideDoc.createElement('a:solidFill');
            let clrNodes = solidFillNode.getElementsByTagName('a:srgbClr');
            let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElement('a:srgbClr');
            clrNode.setAttribute('val', spec.color.hex);

            if (spec.color.alpha !== null && spec.color.alpha !== undefined) {
              let alphaNodes = clrNode.getElementsByTagName('a:alpha');
              let alphaNode = alphaNodes.length > 0 ? alphaNodes[0] : slideDoc.createElement('a:alpha');
              alphaNode.setAttribute('val', String(spec.color.alpha));
              if (alphaNodes.length === 0) clrNode.appendChild(alphaNode);
            }

            if (clrNodes.length === 0) solidFillNode.appendChild(clrNode);
            if (solidFillNodes.length === 0) rPrNode.appendChild(solidFillNode);
            modified = true;
          }

          // 2. Text Shadow (<a:effectLst>)
          if (spec.shadow && spec.shadow.hex) {
            let effNodes = rPrNode.getElementsByTagName('a:effectLst');
            let effNode = effNodes.length > 0 ? effNodes[0] : slideDoc.createElement('a:effectLst');
            let shdwNodes = effNode.getElementsByTagName('a:outerShdw');
            let shdwNode = shdwNodes.length > 0 ? shdwNodes[0] : slideDoc.createElement('a:outerShdw');

            shdwNode.setAttribute('blurRad', String(spec.shadow.blurRad !== undefined ? spec.shadow.blurRad : 38100));
            shdwNode.setAttribute('dist', String(spec.shadow.dist !== undefined ? spec.shadow.dist : 35921));
            shdwNode.setAttribute('dir', String(spec.shadow.dir !== undefined ? spec.shadow.dir : 2700000));
            shdwNode.setAttribute('algn', 'ctr');
            shdwNode.setAttribute('rotWithShape', '0');

            let clrNodes = shdwNode.getElementsByTagName('a:srgbClr');
            let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElement('a:srgbClr');
            clrNode.setAttribute('val', spec.shadow.hex);

            const shadowAlpha = spec.shadow.alpha !== null && spec.shadow.alpha !== undefined ? spec.shadow.alpha : 60000;
            let alphaNodes = clrNode.getElementsByTagName('a:alpha');
            let alphaNode = alphaNodes.length > 0 ? alphaNodes[0] : slideDoc.createElement('a:alpha');
            alphaNode.setAttribute('val', String(shadowAlpha));
            if (alphaNodes.length === 0) clrNode.appendChild(alphaNode);

            if (clrNodes.length === 0) shdwNode.appendChild(clrNode);
            if (shdwNodes.length === 0) effNode.appendChild(shdwNode);
            if (effNodes.length === 0) rPrNode.appendChild(effNode);
            modified = true;
          } else {
            let effNodes = rPrNode.getElementsByTagName('a:effectLst');
            if (effNodes.length > 0) {
              rPrNode.removeChild(effNodes[0]);
              modified = true;
            }
          }

          // 3. Text Highlight (<a:highlight>)
          if (spec.highlight && spec.highlight.hex) {
            let hlNodes = rPrNode.getElementsByTagName('a:highlight');
            let hlNode = hlNodes.length > 0 ? hlNodes[0] : slideDoc.createElement('a:highlight');
            let clrNodes = hlNode.getElementsByTagName('a:srgbClr');
            let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElement('a:srgbClr');
            clrNode.setAttribute('val', spec.highlight.hex);

            if (clrNodes.length === 0) hlNode.appendChild(clrNode);
            if (hlNodes.length === 0) rPrNode.appendChild(hlNode);
            modified = true;
          } else {
            // Remove highlight element if run spec has no highlight
            let hlNodes = rPrNode.getElementsByTagName('a:highlight');
            if (hlNodes.length > 0) {
              rPrNode.removeChild(hlNodes[0]);
              modified = true;
            }
          }

          // Reorder child element nodes according to strict OOXML Schema
          reorderRPrChildren(rPrNode);

          if (spec.color && spec.shadow && spec.highlight) {
            console.log('[PPTX Export] Sample <a:rPr> XML with color + shadow + highlight:\n', new XMLSerializer().serializeToString(rPrNode));
          }
        }

        if (modified) {
          const updatedXml = new XMLSerializer().serializeToString(slideDoc);
          zip.file(slideFileName, updatedXml);
          console.log(`[PPTX Export] Raw post-processed XML for ${slideFileName}:\n${updatedXml}`);
        }
      }

      const validation = await validatePptxZip(zip);
      if (validation.valid) {
        finalUint8Array = await zip.generateAsync({
          type: 'uint8array',
          compression: 'DEFLATE',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });
      } else {
        console.log('[PPTX] Validation failed post-processing, falling back to raw output:', validation.error);
        finalUint8Array = rawUint8Array;
      }
    } catch (zipErr) {
      console.log('[PPTX] Post-processing error, falling back to raw output:', zipErr);
      finalUint8Array = rawUint8Array;
    }

    // Log the first 4 bytes of the output
    const first4 = Array.from(finalUint8Array.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    console.log('[PPTX] First 4 bytes of written file:', first4);

    const now = new Date();
    const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
    const filename = `PPT_${dateStr}.pptx`;

    // Modern expo-file-system API with File and Paths: write Uint8Array directly
    const file = new File(Paths.document, filename);
    file.create();
    await file.write(finalUint8Array);

    return {
      fileUri: file.uri,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT Exporter] Error:', err);
    throw err;
  }
};

