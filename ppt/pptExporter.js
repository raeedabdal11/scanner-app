import { File, Paths, EncodingType } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { planPage, reverseTableLineColumns, isTableElement, splitRuns, calculateFittingFontSize } from './pptFit';
import { getExportFontFamily } from './fonts';
import { getElementRuns } from './formattedText';

if (typeof window === 'undefined') {
  global.window = global;
}

const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

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
 * Converts any image URI (WEBP, HEIC, PNG, JPEG, file, data URI)
 * to a clean standard JPEG base64 data URI using expo-image-manipulator.
 */
async function prepareImageForPptx(uri) {
  if (!uri) return null;
  try {
    const manipulated = await manipulateAsync(
      uri,
      [],
      { compress: 0.9, format: SaveFormat.JPEG }
    );
    const imgFile = new File(manipulated.uri);
    const rawBase64 = await imgFile.base64();
    return `data:image/jpeg;base64,${rawBase64}`;
  } catch (err) {
    console.log('[PPT Exporter] Image manipulation error, attempting fallback:', err);
    try {
      if (uri.startsWith('data:image/jpeg') || uri.startsWith('data:image/png')) {
        return uri;
      }
      const imgFile = new File(uri);
      const rawBase64 = await imgFile.base64();
      const mime = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${rawBase64}`;
    } catch (fbErr) {
      console.log('[PPT Exporter] Image fallback error:', fbErr);
      return null;
    }
  }
}

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

const WORD_TO_DRAWINGML_UNDERLINE = {
  single: 'sng',
  double: 'dbl',
  thick: 'heavy',
  dash: 'dash',
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

/**
 * Performs self-check on generated PPTX package:
 * - File starts with bytes 50 4B 03 04
 * - No ZIP entry ends with "/"
 * - [Content_Types].xml is the first entry
 * - Every <Override> PartName exists, and every relationship Target exists
 * - No references to notesSlides/notesMasters remain when notes were removed
 * Logs "[PPTX-CHECK] OK" or the exact problem.
 */
export async function performPptxSelfCheck(zip, uint8Array, hasNotes = false) {
  const errors = [];

  // 1. Check header bytes
  if (!uint8Array || uint8Array.length < 4) {
    errors.push('File buffer is empty or too short');
  } else {
    const b0 = uint8Array[0].toString(16).padStart(2, '0').toUpperCase();
    const b1 = uint8Array[1].toString(16).padStart(2, '0').toUpperCase();
    const b2 = uint8Array[2].toString(16).padStart(2, '0').toUpperCase();
    const b3 = uint8Array[3].toString(16).padStart(2, '0').toUpperCase();
    const header = `${b0} ${b1} ${b2} ${b3}`;
    if (header !== '50 4B 03 04') {
      errors.push(`Invalid ZIP header: ${header} (expected 50 4B 03 04)`);
    }
  }

  const zipPaths = Object.keys(zip.files);

  // 2. Check no entry ends with '/'
  for (const path of zipPaths) {
    if (path.endsWith('/')) {
      errors.push(`ZIP entry ends with '/': ${path}`);
    }
  }

  // 3. Check [Content_Types].xml is first entry
  if (zipPaths.length === 0 || zipPaths[0] !== '[Content_Types].xml') {
    errors.push(`First ZIP entry is '${zipPaths[0]}', expected '[Content_Types].xml'`);
  }

  // 4. Check <Override> PartNames and relationship Targets
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });

  const ctFile = zip.file('[Content_Types].xml');
  if (!ctFile) {
    errors.push('[Content_Types].xml missing from package');
  } else {
    const ctXml = await ctFile.async('text');
    const ctDoc = parser.parseFromString(ctXml, 'text/xml');
    const overrides = Array.from(ctDoc.getElementsByTagName('Override'));
    for (const ov of overrides) {
      const pn = ov.getAttribute('PartName');
      if (pn) {
        const normPn = pn.startsWith('/') ? pn.slice(1) : pn;
        if (!zip.file(normPn)) {
          errors.push(`Override PartName does not exist in ZIP: ${pn}`);
        }
      }
    }
  }

  // Check relationship targets in all .rels files
  const relsFiles = zipPaths.filter((p) => p.endsWith('.rels'));
  for (const relsPath of relsFiles) {
    const relsContent = await zip.file(relsPath).async('text');
    const relsDoc = parser.parseFromString(relsContent, 'text/xml');
    const relElems = Array.from(relsDoc.getElementsByTagName('Relationship'));

    let dirPath = '';
    const relsIdx = relsPath.lastIndexOf('/_rels/');
    if (relsIdx !== -1) {
      dirPath = relsPath.substring(0, relsIdx);
    } else if (relsPath.startsWith('_rels/')) {
      dirPath = '';
    }

    for (const rel of relElems) {
      const targetMode = rel.getAttribute('TargetMode');
      if (targetMode === 'External') continue;

      const target = rel.getAttribute('Target');
      if (!target) continue;

      let targetPath = '';
      if (target.startsWith('/')) {
        targetPath = target.slice(1);
      } else if (dirPath) {
        const parts = (dirPath + '/' + target).split('/');
        const stack = [];
        for (const p of parts) {
          if (!p || p === '.') continue;
          if (p === '..') {
            if (stack.length > 0) stack.pop();
          } else {
            stack.push(p);
          }
        }
        targetPath = stack.join('/');
      } else {
        targetPath = target;
      }

      if (!zip.file(targetPath)) {
        errors.push(`Relationship Target in '${relsPath}' does not exist: '${target}' (resolved: '${targetPath}')`);
      }
    }
  }

  // 5. Check no references to notesSlides/notesMasters remain when notes removed
  if (!hasNotes) {
    for (const path of zipPaths) {
      if (path.includes('notesSlides') || path.includes('notesMasters')) {
        errors.push(`ZIP still contains notes entry when notes removed: ${path}`);
      }
    }

    if (ctFile) {
      const ctXml = await ctFile.async('text');
      if (ctXml.includes('notesSlides') || ctXml.includes('notesMasters')) {
        errors.push('[Content_Types].xml still references notesSlides/notesMasters when notes removed');
      }
    }

    const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (presRelsFile) {
      const presRelsXml = await presRelsFile.async('text');
      if (presRelsXml.includes('notesMaster') || presRelsXml.includes('notesMasters')) {
        errors.push('ppt/_rels/presentation.xml.rels still references notesMaster when notes removed');
      }
    }

    const presFile = zip.file('ppt/presentation.xml');
    if (presFile) {
      const presXml = await presFile.async('text');
      if (presXml.includes('notesMasterIdLst')) {
        errors.push('ppt/presentation.xml still references notesMasterIdLst when notes removed');
      }
    }

    const slideRelsFiles = zipPaths.filter((p) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(p));
    for (const sRelsPath of slideRelsFiles) {
      const sRelsXml = await zip.file(sRelsPath).async('text');
      if (sRelsXml.includes('notesSlide')) {
        errors.push(`${sRelsPath} still references notesSlide when notes removed`);
      }
    }
  }

  // 6. Check no u="single" anywhere in slide XML
  const slideFiles = zipPaths.filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p));
  for (const sPath of slideFiles) {
    const sXml = await zip.file(sPath).async('text');
    if (sXml.includes('u="single"')) {
      errors.push(`Slide XML '${sPath}' contains invalid u="single" attribute`);
    }
  }

  if (errors.length === 0) {
    console.log('[PPTX-CHECK] OK');
    return { ok: true, errors: [] };
  } else {
    const problemMsg = errors.join('; ');
    console.log(`[PPTX-CHECK] Error: ${problemMsg}`);
    return { ok: false, errors, problemMsg };
  }
}

/**
 * Exports presentation slides to .pptx format.
 * Supports debugOptions ({ noHighlight, noShadow, noImages, noPostProcessing }) for bisect troubleshooting.
 */
export const exportPresentationToPptx = async (
  presentation,
  selectedSlideIds = null,
  debugOptions = {}
) => {
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
    const slideRunSpecs = {};
    // Stores text box scaling / fit specifications per slide
    const slideTextElemSpecs = {};
    // Stores image element specifications per slide
    const slideImageElemSpecs = {};
    // Stores shape element specifications per slide
    const slideShapeElemSpecs = {};

    for (const pageData of targetPages) {
      // Use planPage to get computed font sizes & split slides if text overflows
      const planned = planPage(pageData);
      const generatedSlides = planned.slides || [pageData];

      for (const slideData of generatedSlides) {
        const slide = pptx.addSlide();
        slideCount++;
        slideRunSpecs[slideCount] = [];
        slideTextElemSpecs[slideCount] = [];
        slideImageElemSpecs[slideCount] = [];
        slideShapeElemSpecs[slideCount] = [];

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

            // Measure fit to determine fontScale for <a:normAutofit fontScale="..."/>
            const fitRes = calculateFittingFontSize(elem);
            let fontScaleAttr = null;
            if (fitRes && fitRes.overflowRatio > 1.0) {
              const computedScale = Math.max(30000, Math.floor((1.0 / fitRes.overflowRatio) * 100000));
              fontScaleAttr = String(computedScale);
            }

            slideTextElemSpecs[slideCount].push({
              textSnippet: textContent.trim().substring(0, 30),
              fontScale: fontScaleAttr,
            });

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
                  underline: runUnderline ? { style: 'sng' } : false,
                  color: runColorObj ? runColorObj.hex : '1C1C1E',
                  lang: 'ar-IQ',
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
              underline: isUnderline ? { style: 'sng' } : false,
              align: align,
              rtl: true,
              lang: 'ar-IQ',
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
            if (debugOptions.noImages) continue;
            if (!elem.uri) continue;

            try {
              const base64Img = await prepareImageForPptx(elem.uri);
              if (!base64Img) continue;

              slideImageElemSpecs[slideCount].push({
                crop: elem.crop || { top: 0, bottom: 0, left: 0, right: 0 },
                borderRadius: elem.borderRadius || 0,
                border: elem.border || { color: 'transparent', width: 0 },
                opacity: elem.opacity !== undefined ? elem.opacity : 1.0,
                rotation: elem.rotation || 0,
              });

              slide.addImage({
                data: base64Img,
                x: xIn,
                y: yIn,
                w: wIn,
                h: hIn,
                sizing: {
                  type: elem.fit === 'fit' ? 'contain' : 'cover',
                  w: wIn,
                  h: hIn,
                },
              });
            } catch (imgErr) {
              console.log('[PPT Exporter] Failed to add image:', imgErr);
            }
          } else if (elem.type === 'shape') {
            const shapeType = elem.shapeType || 'rect';
            const isLineOrArrow = shapeType === 'line' || shapeType === 'arrow';

            const fillParsed = parseColor(elem.fill, null);
            const fillHex = fillParsed ? fillParsed.hex : null;

            const outline = elem.outline || { color: '#000000', width: 2 };
            const outlineParsed = parseColor(outline.color, '000000');
            const outlineHex = outlineParsed ? outlineParsed.hex : '000000';
            const outlineWidth = outline.width !== undefined ? outline.width : 2;

            slideShapeElemSpecs[slideCount].push({
              shapeType: shapeType,
              fill: elem.fill,
              fillHex: fillHex,
              outline: outline,
              outlineHex: outlineHex,
              outlineWidth: outlineWidth,
              opacity: elem.opacity !== undefined ? elem.opacity : 1.0,
              rotation: elem.rotation || 0,
              cornerRadius: elem.cornerRadius !== undefined ? elem.cornerRadius : 20,
              text: elem.text || '',
              textColor: elem.textColor || '#000000',
              fontSize: elem.fontSize || 16,
              bold: !!elem.bold,
              kurdishFont: elem.kurdishFont || 'Tahoma',
              xIn,
              yIn,
              wIn,
              hIn,
            });

            try {
              let pptxShapeType = pptx.shapes ? pptx.shapes.RECTANGLE : 'rect';
              if (pptx.shapes) {
                const upper = shapeType.toUpperCase();
                if (pptx.shapes[upper]) {
                  pptxShapeType = pptx.shapes[upper];
                } else {
                  const shapeMap = {
                    rect: pptx.shapes.RECTANGLE,
                    roundRect: pptx.shapes.ROUNDED_RECTANGLE,
                    ellipse: pptx.shapes.OVAL,
                    triangle: pptx.shapes.TRIANGLE,
                    rtTriangle: pptx.shapes.RIGHT_TRIANGLE,
                    diamond: pptx.shapes.DIAMOND,
                    parallelogram: pptx.shapes.PARALLELOGRAM,
                    trapezoid: pptx.shapes.TRAPEZOID,
                    pentagon: pptx.shapes.PENTAGON,
                    hexagon: pptx.shapes.HEXAGON,
                    octagon: pptx.shapes.OCTAGON,
                    line: pptx.shapes.LINE,
                    arrow: pptx.shapes.LINE,
                    doubleArrow: pptx.shapes.LINE,
                    rightArrow: pptx.shapes.RIGHT_ARROW,
                    leftArrow: pptx.shapes.LEFT_ARROW,
                    upArrow: pptx.shapes.UP_ARROW,
                    downArrow: pptx.shapes.DOWN_ARROW,
                    leftRightArrow: pptx.shapes.LEFT_RIGHT_ARROW,
                    upDownArrow: pptx.shapes.UP_DOWN_ARROW,
                    star4: pptx.shapes.STAR_4_POINT,
                    star5: pptx.shapes.STAR_5_POINT,
                    star6: pptx.shapes.STAR_6_POINT,
                    star8: pptx.shapes.STAR_8_POINT,
                    heart: pptx.shapes.HEART,
                    lightningBolt: pptx.shapes.LIGHTNING_BOLT,
                    sun: pptx.shapes.SUN,
                    moon: pptx.shapes.MOON,
                    cloud: pptx.shapes.CLOUD,
                    smileyFace: pptx.shapes.SMILEY_FACE,
                    donut: pptx.shapes.DONUT,
                    can: pptx.shapes.CAN,
                    cube: pptx.shapes.CUBE,
                  };
                  pptxShapeType = shapeMap[shapeType] || pptx.shapes.RECTANGLE;
                }
              }

              const shapeOpts = {
                x: xIn,
                y: yIn,
                w: wIn,
                h: hIn,
              };

              if (!isLineOrArrow && fillHex) {
                shapeOpts.fill = { color: fillHex };
              } else {
                shapeOpts.fill = { color: 'FFFFFF' };
              }

              if (outlineWidth > 0 && outlineHex) {
                shapeOpts.line = { color: outlineHex, width: outlineWidth };
              }

              slide.addShape(pptxShapeType, shapeOpts);
            } catch (shapeErr) {
              console.log('[PPT Exporter] Failed to add shape:', shapeErr);
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

    if (debugOptions.noPostProcessing) {
      console.log('[PPTX Exporter] Debug option noPostProcessing active, returning raw pptxgenjs output.');
      const now = new Date();
      const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
      const filename = `PPT_Debug_D_${dateStr}.pptx`;

      const file = new File(Paths.document, filename);
      file.create();
      await file.write(rawUint8Array);

      const savedBytes = await file.bytes();
      const first4Bytes = Array.from(savedBytes.subarray(0, 4))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      console.log('[PPTX Debug] Saved file first 4 bytes:', first4Bytes);

      if (first4Bytes !== '50 4B 03 04') {
        throw new Error(`پاشەکەوتکردنی فایلەکە سەرکەوتوو نەبوو: سەردێڕی فایلەکە هەڵەیە (${first4Bytes}).`);
      }

      return {
        fileUri: file.uri,
        filename: filename,
      };
    }

    let finalUint8Array = rawUint8Array;
    let finalZip = null;

    // Check whether any target page has speaker notes
    const hasNotes = targetPages.some(
      (p) => typeof p.notes === 'string' && p.notes.trim().length > 0
    );

    try {
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(rawUint8Array, { createFolders: false });
      const parser = new DOMParser();

      // =========================================================================
      // 1. REMOVE EMPTY NOTES (if no slide has speaker notes)
      // =========================================================================
      if (!hasNotes) {
        // a) Remove all files under ppt/notesSlides/ and ppt/notesMasters/ (including _rels)
        const notesPaths = Object.keys(zip.files).filter(
          (p) => p.startsWith('ppt/notesSlides/') || p.startsWith('ppt/notesMasters/')
        );
        for (const np of notesPaths) {
          zip.remove(np);
        }

        // b) Remove notes Override entries in [Content_Types].xml
        const contentTypesFile = zip.file('[Content_Types].xml');
        if (contentTypesFile) {
          const ctXml = await contentTypesFile.async('text');
          const ctDoc = parser.parseFromString(ctXml, 'text/xml');
          const overrideElems = Array.from(ctDoc.getElementsByTagName('Override'));

          for (const overrideElem of overrideElems) {
            const pn = overrideElem.getAttribute('PartName');
            if (pn) {
              const normPn = pn.startsWith('/') ? pn.slice(1).toLowerCase() : pn.toLowerCase();
              if (normPn.startsWith('ppt/notesslides/') || normPn.startsWith('ppt/notesmasters/')) {
                if (overrideElem.parentNode) {
                  overrideElem.parentNode.removeChild(overrideElem);
                }
              }
            }
          }
          zip.file('[Content_Types].xml', new XMLSerializer().serializeToString(ctDoc));
        }

        // c) Remove notesMaster relationship in ppt/_rels/presentation.xml.rels
        const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
        if (presRelsFile) {
          const presRelsXml = await presRelsFile.async('text');
          const presRelsDoc = parser.parseFromString(presRelsXml, 'text/xml');
          const rels = Array.from(presRelsDoc.getElementsByTagName('Relationship'));
          let relsModified = false;
          for (const rel of rels) {
            const type = rel.getAttribute('Type') || '';
            const target = rel.getAttribute('Target') || '';
            if (type.includes('notesMaster') || target.includes('notesMasters') || target.includes('notesMaster')) {
              if (rel.parentNode) {
                rel.parentNode.removeChild(rel);
                relsModified = true;
              }
            }
          }
          if (relsModified) {
            zip.file('ppt/_rels/presentation.xml.rels', new XMLSerializer().serializeToString(presRelsDoc));
          }
        }

        // d) Remove <p:notesMasterIdLst> in ppt/presentation.xml
        const presFile = zip.file('ppt/presentation.xml');
        if (presFile) {
          const presXml = await presFile.async('text');
          const presDoc = parser.parseFromString(presXml, 'text/xml');
          const lsts = Array.from(presDoc.getElementsByTagName('*')).filter(
            (el) => el.localName === 'notesMasterIdLst' || el.tagName === 'p:notesMasterIdLst'
          );
          let presModified = false;
          for (const lst of lsts) {
            if (lst.parentNode) {
              lst.parentNode.removeChild(lst);
              presModified = true;
            }
          }
          if (presModified) {
            zip.file('ppt/presentation.xml', new XMLSerializer().serializeToString(presDoc));
          }
        }

        // e) Remove notesSlide relationship in every ppt/slides/_rels/slideN.xml.rels
        const slideRelsPaths = Object.keys(zip.files).filter((p) =>
          /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(p)
        );
        for (const sRelsPath of slideRelsPaths) {
          const sRelsXml = await zip.file(sRelsPath).async('text');
          const sRelsDoc = parser.parseFromString(sRelsXml, 'text/xml');
          const rels = Array.from(sRelsDoc.getElementsByTagName('Relationship'));
          let sRelsModified = false;
          for (const rel of rels) {
            const type = rel.getAttribute('Type') || '';
            const target = rel.getAttribute('Target') || '';
            if (type.includes('notesSlide') || target.includes('notesSlide') || target.includes('notesSlides')) {
              if (rel.parentNode) {
                rel.parentNode.removeChild(rel);
                sRelsModified = true;
              }
            }
          }
          if (sRelsModified) {
            zip.file(sRelsPath, new XMLSerializer().serializeToString(sRelsDoc));
          }
        }

        // f) Update docProps/app.xml <Notes> to 0
        const appPropsFile = zip.file('docProps/app.xml');
        if (appPropsFile) {
          const appPropsXml = await appPropsFile.async('text');
          const appPropsDoc = parser.parseFromString(appPropsXml, 'text/xml');
          const notesElems = Array.from(appPropsDoc.getElementsByTagName('*')).filter(
            (el) => el.localName === 'Notes' || el.tagName === 'Notes'
          );
          let appModified = false;
          for (const nEl of notesElems) {
            nEl.textContent = '0';
            appModified = true;
          }
          if (appModified) {
            zip.file('docProps/app.xml', new XMLSerializer().serializeToString(appPropsDoc));
          }
        }
      }

      // Regex for Arabic/Kurdish script detection
      const IS_ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

      // =========================================================================
      // 2. PROCESS SLIDES (RTL, Remove Empty Runs, Styles & <a:rPr> Child Orders)
      // =========================================================================
      for (let slideNum = 1; slideNum <= slideCount; slideNum++) {
        const runSpecs = slideRunSpecs[slideNum] || [];
        const slideFileName = `ppt/slides/slide${slideNum}.xml`;
        const slideFile = zip.file(slideFileName);
        if (!slideFile) continue;

        const xmlText = await slideFile.async('text');
        const slideDoc = parser.parseFromString(xmlText, 'text/xml');
        let modified = false;

        // Process paragraphs in slide
        const pNodes = Array.from(slideDoc.getElementsByTagName('a:p'));
        for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
          const pNode = pNodes[pIdx];

          // Clean up duplicate <a:pPr> elements inserted by pptxgenjs inside paragraphs
          let firstPPrSeen = false;
          let mainPPr = null;
          const pChildren = Array.from(pNode.childNodes);

          for (const child of pChildren) {
            if (child.nodeType === 1 && (child.localName === 'pPr' || child.nodeName === 'a:pPr')) {
              if (!firstPPrSeen) {
                firstPPrSeen = true;
                mainPPr = child;
              } else {
                pNode.removeChild(child);
                modified = true;
              }
            }
          }

          // Remove any empty text runs (<a:r> with missing or empty <a:t></a:t>)
          const rChildren = Array.from(pNode.getElementsByTagName('a:r'));
          for (const rNode of rChildren) {
            const tNodes = rNode.getElementsByTagName('a:t');
            const tText = tNodes.length > 0 ? (tNodes[0].textContent || '') : '';
            if (tNodes.length === 0 || tText === '') {
              if (rNode.parentNode) {
                rNode.parentNode.removeChild(rNode);
                modified = true;
              }
            }
          }

          // Proper RTL for Kurdish/Arabic: set rtl="1" on <a:pPr> (keep algn="r")
          const pText = pNode.textContent || '';
          const hasArabicText = IS_ARABIC_REGEX.test(pText);

          if (hasArabicText) {
            if (!mainPPr) {
              mainPPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:pPr');
              if (pNode.firstChild) {
                pNode.insertBefore(mainPPr, pNode.firstChild);
              } else {
                pNode.appendChild(mainPPr);
              }
              modified = true;
            }
            mainPPr.setAttribute('rtl', '1');
            if (!mainPPr.hasAttribute('algn')) {
              mainPPr.setAttribute('algn', 'r');
            }
            modified = true;
          }
        }

        // Process Picture elements <p:pic> in slide (crop, opacity, rotation, rounded corners, border)
        const picNodes = Array.from(slideDoc.getElementsByTagName('p:pic'));
        const imageElemSpecs = slideImageElemSpecs[slideNum] || [];

        for (let pIdx = 0; pIdx < picNodes.length; pIdx++) {
          const picNode = picNodes[pIdx];
          const spec = imageElemSpecs[pIdx];
          if (!spec) continue;

          // 1. Crop & Opacity in <p:blipFill>
          const blipFillNodes = picNode.getElementsByTagName('p:blipFill');
          if (blipFillNodes.length > 0) {
            const blipFill = blipFillNodes[0];

            // Crop: <a:srcRect l="..." t="..." r="..." b="..."/>
            const crop = spec.crop || {};
            const lVal = Math.round((crop.left || 0) * 100000);
            const tVal = Math.round((crop.top || 0) * 100000);
            const rVal = Math.round((crop.right || 0) * 100000);
            const bVal = Math.round((crop.bottom || 0) * 100000);

            if (lVal > 0 || tVal > 0 || rVal > 0 || bVal > 0) {
              let srcRectNodes = blipFill.getElementsByTagName('a:srcRect');
              let srcRect = srcRectNodes.length > 0 ? srcRectNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:srcRect');
              srcRect.setAttribute('l', String(lVal));
              srcRect.setAttribute('t', String(tVal));
              srcRect.setAttribute('r', String(rVal));
              srcRect.setAttribute('b', String(bVal));

              if (srcRectNodes.length === 0) {
                if (blipFill.firstChild) {
                  blipFill.insertBefore(srcRect, blipFill.firstChild);
                } else {
                  blipFill.appendChild(srcRect);
                }
              }
              modified = true;
            }

            // Opacity: <a:alphaModFix amt="..."/> inside <a:blip>
            if (spec.opacity !== undefined && spec.opacity < 1.0) {
              const blipNodes = blipFill.getElementsByTagName('a:blip');
              if (blipNodes.length > 0) {
                const blip = blipNodes[0];
                let alphaNodes = blip.getElementsByTagName('a:alphaModFix');
                let alphaNode = alphaNodes.length > 0 ? alphaNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:alphaModFix');
                const amtVal = Math.round(Math.max(0.1, Math.min(1.0, spec.opacity)) * 100000);
                alphaNode.setAttribute('amt', String(amtVal));

                if (alphaNodes.length === 0) {
                  blip.appendChild(alphaNode);
                }
                modified = true;
              }
            }
          }

          // 2. Shape Properties <p:spPr> (Rotation, Geometry/Rounded Corners, Border)
          const spPrNodes = picNode.getElementsByTagName('p:spPr');
          if (spPrNodes.length > 0) {
            const spPr = spPrNodes[0];

            // Rotation: <a:xfrm rot="...">
            if (spec.rotation) {
              const xfrmNodes = spPr.getElementsByTagName('a:xfrm');
              if (xfrmNodes.length > 0) {
                const xfrm = xfrmNodes[0];
                let rotDeg = ((spec.rotation % 360) + 360) % 360;
                const rotVal = Math.round(rotDeg * 60000);
                xfrm.setAttribute('rot', String(rotVal));
                modified = true;
              }
            }

            // Rounded Corners: <a:prstGeom prst="roundRect">
            if (spec.borderRadius && spec.borderRadius > 0) {
              let prstGeomNodes = spPr.getElementsByTagName('a:prstGeom');
              if (prstGeomNodes.length > 0) {
                const prstGeom = prstGeomNodes[0];
                prstGeom.setAttribute('prst', 'roundRect');

                let avLstNodes = prstGeom.getElementsByTagName('a:avLst');
                let avLst = avLstNodes.length > 0 ? avLstNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:avLst');

                let gdNodes = avLst.getElementsByTagName('a:gd');
                let gdNode = gdNodes.length > 0 ? gdNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:gd');
                gdNode.setAttribute('name', 'adj');

                // DrawingML roundRect adj: 0 to 50000
                const adjVal = Math.round((spec.borderRadius / 50) * 50000);
                gdNode.setAttribute('fmla', `val ${adjVal}`);

                if (gdNodes.length === 0) avLst.appendChild(gdNode);
                if (avLstNodes.length === 0) prstGeom.appendChild(avLst);
                modified = true;
              }
            }

            // Border: <a:ln w="...">
            if (spec.border && spec.border.width > 0 && spec.border.color && spec.border.color !== 'transparent') {
              const parsedClr = parseColor(spec.border.color, '000000');
              if (parsedClr) {
                let lnNodes = spPr.getElementsByTagName('a:ln');
                let lnNode = lnNodes.length > 0 ? lnNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:ln');
                const emuWidth = Math.round(spec.border.width * 12700); // 1 pt = 12700 EMUs
                lnNode.setAttribute('w', String(emuWidth));

                let solidFillNodes = lnNode.getElementsByTagName('a:solidFill');
                let solidFillNode = solidFillNodes.length > 0 ? solidFillNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:solidFill');

                let srgbClrNodes = solidFillNode.getElementsByTagName('a:srgbClr');
                let srgbClrNode = srgbClrNodes.length > 0 ? srgbClrNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
                srgbClrNode.setAttribute('val', parsedClr.hex);

                if (srgbClrNodes.length === 0) solidFillNode.appendChild(srgbClrNode);
                if (solidFillNodes.length === 0) lnNode.appendChild(solidFillNode);
                if (lnNodes.length === 0) spPr.appendChild(lnNode);
                modified = true;
              }
            }
          }
        }

        // Process Shape elements <p:sp> in slide (geometry, fill, outline, rotation, alpha)
        const shapeElemSpecs = slideShapeElemSpecs[slideNum] || [];
        const spNodes = Array.from(slideDoc.getElementsByTagName('p:sp'));

        const shapeSpNodes = spNodes.filter((spNode) => {
          const txBody = spNode.getElementsByTagName('p:txBody')[0];
          if (!txBody) return true;
          const textRuns = txBody.getElementsByTagName('a:r');
          const pText = txBody.textContent || '';
          return textRuns.length === 0 && pText.trim() === '';
        });

        let shapeExportCount = 0;
        let shapesWithTextCount = 0;

        for (let sIdx = 0; sIdx < shapeSpNodes.length; sIdx++) {
          const spNode = shapeSpNodes[sIdx];
          const spec = shapeElemSpecs[sIdx];
          if (!spec) continue;

          shapeExportCount++;
          const shapeType = spec.shapeType || 'rect';
          const isLineOrArrow = shapeType === 'line' || shapeType === 'arrow';

          let targetNode = spNode;
          if (isLineOrArrow) {
            const cxnSp = slideDoc.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:cxnSp');
            while (spNode.firstChild) {
              const child = spNode.firstChild;
              spNode.removeChild(child);
              if (child.nodeType === 1) {
                const tag = child.localName || child.tagName;
                if (tag === 'nvSpPr' || tag === 'p:nvSpPr') {
                  const nvCxnSpPr = slideDoc.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:nvCxnSpPr');
                  while (child.firstChild) {
                    const grandChild = child.firstChild;
                    child.removeChild(grandChild);
                    if (grandChild.nodeType === 1 && (grandChild.localName === 'cNvSpPr' || grandChild.tagName === 'p:cNvSpPr')) {
                      const cNvCxnSpPr = slideDoc.createElementNS('http://schemas.openxmlformats.org/presentationml/2006/main', 'p:cNvCxnSpPr');
                      nvCxnSpPr.appendChild(cNvCxnSpPr);
                    } else {
                      nvCxnSpPr.appendChild(grandChild);
                    }
                  }
                  cxnSp.appendChild(nvCxnSpPr);
                } else {
                  cxnSp.appendChild(child);
                }
              }
            }
            if (spNode.parentNode) {
              spNode.parentNode.replaceChild(cxnSp, spNode);
            }
            targetNode = cxnSp;
            modified = true;
          }

          let spPrNodes = targetNode.getElementsByTagName('p:spPr');
          if (spPrNodes.length === 0) {
            spPrNodes = targetNode.getElementsByTagName('a:spPr');
          }
          if (spPrNodes.length > 0) {
            const spPr = spPrNodes[0];

            if (spec.rotation) {
              const xfrmNodes = spPr.getElementsByTagName('a:xfrm');
              if (xfrmNodes.length > 0) {
                const xfrm = xfrmNodes[0];
                let rotDeg = ((spec.rotation % 360) + 360) % 360;
                const rotVal = Math.round(rotDeg * 60000);
                xfrm.setAttribute('rot', String(rotVal));
                modified = true;
              }
            }

            let prstGeomNodes = spPr.getElementsByTagName('a:prstGeom');
            let prstGeom = prstGeomNodes.length > 0 ? prstGeomNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:prstGeom');

            let prstName = shapeType || 'rect';
            if (shapeType === 'line' || shapeType === 'arrow' || shapeType === 'doubleArrow') {
              prstName = 'line';
            }

            prstGeom.setAttribute('prst', prstName);

            let avLstNodes = prstGeom.getElementsByTagName('a:avLst');
            let avLst = avLstNodes.length > 0 ? avLstNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:avLst');

            if (shapeType === 'roundRect') {
              let gdNodes = avLst.getElementsByTagName('a:gd');
              let gdNode = gdNodes.length > 0 ? gdNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:gd');
              gdNode.setAttribute('name', 'adj');
              const adjVal = Math.round(((spec.cornerRadius !== undefined ? spec.cornerRadius : 20) / 50) * 50000);
              gdNode.setAttribute('fmla', `val ${adjVal}`);
              if (gdNodes.length === 0) avLst.appendChild(gdNode);
            }
            if (avLstNodes.length === 0) prstGeom.appendChild(avLst);
            if (prstGeomNodes.length === 0) spPr.appendChild(prstGeom);
            modified = true;

            const fillTags = ['a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:noFill'];
            for (const ft of fillTags) {
              const existingFills = spPr.getElementsByTagName(ft);
              while (existingFills.length > 0) {
                spPr.removeChild(existingFills[0]);
              }
            }

            const fillParsed = parseColor(spec.fill, null);
            if (!isLineOrArrow && fillParsed && fillParsed.hex) {
              const solidFill = slideDoc.createElementNS(DRAWINGML_NS, 'a:solidFill');
              const srgbClr = slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
              srgbClr.setAttribute('val', fillParsed.hex);

              const opacity = spec.opacity !== undefined ? spec.opacity : 1.0;
              if (opacity < 1.0 || fillParsed.alpha !== null) {
                const alphaVal = Math.round(opacity * (fillParsed.alpha !== null ? fillParsed.alpha / 100000 : 1.0) * 100000);
                const alphaNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:alpha');
                alphaNode.setAttribute('val', String(alphaVal));
                srgbClr.appendChild(alphaNode);
              }

              solidFill.appendChild(srgbClr);
              spPr.appendChild(solidFill);
            } else {
              const noFill = slideDoc.createElementNS(DRAWINGML_NS, 'a:noFill');
              spPr.appendChild(noFill);
            }
            modified = true;

            const existingLns = spPr.getElementsByTagName('a:ln');
            while (existingLns.length > 0) {
              spPr.removeChild(existingLns[0]);
            }

            const outline = spec.outline || { color: '#000000', width: 2 };
            const outlineWidth = outline.width !== undefined ? outline.width : 2;
            const outlineParsed = parseColor(outline.color, '000000');

            if (outlineWidth > 0 && outlineParsed && outlineParsed.hex) {
              const lnNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:ln');
              const emuWidth = Math.round(outlineWidth * 12700);
              lnNode.setAttribute('w', String(emuWidth));

              const solidFill = slideDoc.createElementNS(DRAWINGML_NS, 'a:solidFill');
              const srgbClr = slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
              srgbClr.setAttribute('val', outlineParsed.hex);

              const opacity = spec.opacity !== undefined ? spec.opacity : 1.0;
              if (opacity < 1.0 || outlineParsed.alpha !== null) {
                const alphaVal = Math.round(opacity * (outlineParsed.alpha !== null ? outlineParsed.alpha / 100000 : 1.0) * 100000);
                const alphaNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:alpha');
                alphaNode.setAttribute('val', String(alphaVal));
                srgbClr.appendChild(alphaNode);
              }

              solidFill.appendChild(srgbClr);
              lnNode.appendChild(solidFill);

              if (shapeType === 'arrow') {
                const tailEnd = slideDoc.createElementNS(DRAWINGML_NS, 'a:tailEnd');
                tailEnd.setAttribute('type', 'triangle');
                tailEnd.setAttribute('w', 'med');
                tailEnd.setAttribute('len', 'med');
                lnNode.appendChild(tailEnd);
              }

              spPr.appendChild(lnNode);
            } else {
              const lnNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:ln');
              const noFill = slideDoc.createElementNS(DRAWINGML_NS, 'a:noFill');
              lnNode.appendChild(noFill);
              spPr.appendChild(lnNode);
            }
            modified = true;
          }

          // Process Text inside Shape <p:txBody>
          if (!isLineOrArrow) {
            let txBody = targetNode.getElementsByTagName('p:txBody')[0];
            if (txBody) {
              while (txBody.firstChild) {
                txBody.removeChild(txBody.firstChild);
              }
            } else {
              txBody = slideDoc.createElementNS(PML_NS, 'p:txBody');
              targetNode.appendChild(txBody);
            }

            const bodyPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:bodyPr');
            bodyPr.setAttribute('anchor', 'ctr');
            txBody.appendChild(bodyPr);

            const lstStyle = slideDoc.createElementNS(DRAWINGML_NS, 'a:lstStyle');
            txBody.appendChild(lstStyle);

            if (spec.text && spec.text.trim()) {
              shapesWithTextCount++;
              const lines = spec.text.split(/\r?\n/);
              const textColorParsed = parseColor(spec.textColor || '#000000', '000000');
              const textColorHex = textColorParsed ? textColorParsed.hex : '000000';
              const szVal = String(Math.round((spec.fontSize || 16) * 100));
              const fontName = getExportFontFamily(spec.kurdishFont || 'Tahoma', true);

              for (const line of lines) {
                const pNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:p');
                const pPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:pPr');
                pPr.setAttribute('algn', 'ctr');
                pPr.setAttribute('rtl', '1');
                pNode.appendChild(pPr);

                if (line.length > 0) {
                  const rNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:r');
                  const rPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:rPr');
                  rPr.setAttribute('lang', 'ar-IQ');
                  rPr.setAttribute('sz', szVal);
                  if (spec.bold) {
                    rPr.setAttribute('b', '1');
                  }

                  const solidFill = slideDoc.createElementNS(DRAWINGML_NS, 'a:solidFill');
                  const srgbClr = slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
                  srgbClr.setAttribute('val', textColorHex);
                  solidFill.appendChild(srgbClr);
                  rPr.appendChild(solidFill);

                  const latinFont = slideDoc.createElementNS(DRAWINGML_NS, 'a:latin');
                  latinFont.setAttribute('typeface', fontName);
                  rPr.appendChild(latinFont);

                  const eaFont = slideDoc.createElementNS(DRAWINGML_NS, 'a:ea');
                  eaFont.setAttribute('typeface', fontName);
                  rPr.appendChild(eaFont);

                  const csFont = slideDoc.createElementNS(DRAWINGML_NS, 'a:cs');
                  csFont.setAttribute('typeface', fontName);
                  rPr.appendChild(csFont);

                  reorderRPrChildren(rPr);
                  rNode.appendChild(rPr);

                  const tNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:t');
                  tNode.textContent = line;
                  rNode.appendChild(tNode);

                  pNode.appendChild(rNode);
                }
                txBody.appendChild(pNode);
              }
            } else {
              // Text is empty -> omit txBody runs
              const pNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:p');
              const pPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:pPr');
              pPr.setAttribute('algn', 'ctr');
              pPr.setAttribute('rtl', '1');
              pNode.appendChild(pPr);
              txBody.appendChild(pNode);
            }
            modified = true;
          }
        }

        console.log(`[PPT Exporter] Slide ${slideNum}: Exported ${shapeExportCount} shapes (${shapesWithTextCount} shapes with text)`);

        // Configure <a:bodyPr> for text boxes to enforce wrap="square", tight zero insets, and <a:normAutofit/>
        const txBodyNodes = slideDoc.getElementsByTagName('p:txBody');
        const textElemSpecs = slideTextElemSpecs[slideNum] || [];

        for (let bIdx = 0; bIdx < txBodyNodes.length; bIdx++) {
          const txBody = txBodyNodes[bIdx];
          let bodyPrNodes = txBody.getElementsByTagName('a:bodyPr');
          let bodyPr;
          if (bodyPrNodes.length > 0) {
            bodyPr = bodyPrNodes[0];
          } else {
            bodyPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:bodyPr');
            if (txBody.firstChild) {
              txBody.insertBefore(bodyPr, txBody.firstChild);
            } else {
              txBody.appendChild(bodyPr);
            }
          }

          bodyPr.setAttribute('wrap', 'square');
          bodyPr.setAttribute('lIns', '0');
          bodyPr.setAttribute('tIns', '0');
          bodyPr.setAttribute('rIns', '0');
          bodyPr.setAttribute('bIns', '0');
          bodyPr.setAttribute('rtlCol', '0');

          // Remove any noAutofit or spAutoFit children
          const noAutofits = bodyPr.getElementsByTagName('a:noAutofit');
          while (noAutofits.length > 0) {
            bodyPr.removeChild(noAutofits[0]);
          }
          const spAutofits = bodyPr.getElementsByTagName('a:spAutoFit');
          while (spAutofits.length > 0) {
            bodyPr.removeChild(spAutofits[0]);
          }

          let normAutofits = bodyPr.getElementsByTagName('a:normAutofit');
          let normAutofit;
          if (normAutofits.length > 0) {
            normAutofit = normAutofits[0];
          } else {
            normAutofit = slideDoc.createElementNS(DRAWINGML_NS, 'a:normAutofit');
            bodyPr.appendChild(normAutofit);
          }

          const elemSpec = textElemSpecs[bIdx];
          if (elemSpec && elemSpec.fontScale) {
            normAutofit.setAttribute('fontScale', elemSpec.fontScale);
          }

          modified = true;
        }

        // Process remaining text run nodes
        const runNodes = slideDoc.getElementsByTagName('a:r');
        let specIdx = 0;

        for (let i = 0; i < runNodes.length; i++) {
          const runNode = runNodes[i];
          const tNodes = runNode.getElementsByTagName('a:t');
          const runText = tNodes.length > 0 ? (tNodes[0].textContent || '') : '';

          // Find or create <a:rPr> using DrawingML namespace
          let rPrNodes = runNode.getElementsByTagName('a:rPr');
          let rPrNode;
          if (rPrNodes.length > 0) {
            rPrNode = rPrNodes[0];
          } else {
            rPrNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:rPr');
            if (runNode.firstChild) {
              runNode.insertBefore(rPrNode, runNode.firstChild);
            } else {
              runNode.appendChild(rPrNode);
            }
            modified = true;
          }

          // Set lang="ar-IQ" altLang="en-US" on <a:rPr> for Kurdish/Arabic runs
          const pParent = runNode.parentNode;
          const pText = pParent ? (pParent.textContent || '') : '';
          if (IS_ARABIC_REGEX.test(runText) || IS_ARABIC_REGEX.test(pText)) {
            rPrNode.setAttribute('lang', 'ar-IQ');
            rPrNode.setAttribute('altLang', 'en-US');
            modified = true;
          }

          if (specIdx < runSpecs.length) {
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
                spec = null;
              }
            }

            if (spec) {
              // 1. Text Color (<a:solidFill>)
              if (spec.color && spec.color.hex) {
                let solidFillNodes = rPrNode.getElementsByTagName('a:solidFill');
                let solidFillNode = solidFillNodes.length > 0 ? solidFillNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:solidFill');
                let clrNodes = solidFillNode.getElementsByTagName('a:srgbClr');
                let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
                clrNode.setAttribute('val', spec.color.hex);

                let alphaNodes = clrNode.getElementsByTagName('a:alpha');
                if (spec.color.alpha !== null && spec.color.alpha !== undefined) {
                  let alphaNode = alphaNodes.length > 0 ? alphaNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:alpha');
                  alphaNode.setAttribute('val', String(spec.color.alpha));
                  if (alphaNodes.length === 0) clrNode.appendChild(alphaNode);
                } else {
                  while (alphaNodes.length > 0) {
                    clrNode.removeChild(alphaNodes[0]);
                  }
                }

                if (clrNodes.length === 0) solidFillNode.appendChild(clrNode);
                if (solidFillNodes.length === 0) rPrNode.appendChild(solidFillNode);
                modified = true;
              }

              // 2. Text Shadow (<a:effectLst>)
              if (!debugOptions.noShadow && spec.shadow && spec.shadow.hex) {
                let effNodes = rPrNode.getElementsByTagName('a:effectLst');
                let effNode = effNodes.length > 0 ? effNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:effectLst');
                let shdwNodes = effNode.getElementsByTagName('a:outerShdw');
                let shdwNode = shdwNodes.length > 0 ? shdwNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:outerShdw');

                shdwNode.setAttribute('blurRad', String(spec.shadow.blurRad !== undefined ? spec.shadow.blurRad : 38100));
                shdwNode.setAttribute('dist', String(spec.shadow.dist !== undefined ? spec.shadow.dist : 35921));
                shdwNode.setAttribute('dir', String(spec.shadow.dir !== undefined ? spec.shadow.dir : 2700000));
                shdwNode.setAttribute('algn', 'ctr');
                shdwNode.setAttribute('rotWithShape', '0');

                let clrNodes = shdwNode.getElementsByTagName('a:srgbClr');
                let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
                clrNode.setAttribute('val', spec.shadow.hex);

                const shadowAlpha = spec.shadow.alpha !== null && spec.shadow.alpha !== undefined ? spec.shadow.alpha : 60000;
                let alphaNodes = clrNode.getElementsByTagName('a:alpha');
                let alphaNode = alphaNodes.length > 0 ? alphaNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:alpha');
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
              if (!debugOptions.noHighlight && spec.highlight && spec.highlight.hex) {
                let hlNodes = rPrNode.getElementsByTagName('a:highlight');
                let hlNode = hlNodes.length > 0 ? hlNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:highlight');
                let clrNodes = hlNode.getElementsByTagName('a:srgbClr');
                let clrNode = clrNodes.length > 0 ? clrNodes[0] : slideDoc.createElementNS(DRAWINGML_NS, 'a:srgbClr');
                clrNode.setAttribute('val', spec.highlight.hex);

                if (clrNodes.length === 0) hlNode.appendChild(clrNode);
                if (hlNodes.length === 0) rPrNode.appendChild(hlNode);
                modified = true;
              } else {
                let hlNodes = rPrNode.getElementsByTagName('a:highlight');
                if (hlNodes.length > 0) {
                  rPrNode.removeChild(hlNodes[0]);
                  modified = true;
                }
              }
            }
          }

          // Reorder child element nodes according to strict OOXML Schema
          reorderRPrChildren(rPrNode);
        }

        // Safety net: map any Word-style underline values on XML elements to valid DrawingML values
        const elemsWithU = slideDoc.getElementsByTagName('*');
        for (let eIdx = 0; eIdx < elemsWithU.length; eIdx++) {
          const el = elemsWithU[eIdx];
          if (el.hasAttribute('u')) {
            const uVal = el.getAttribute('u');
            if (WORD_TO_DRAWINGML_UNDERLINE[uVal]) {
              el.setAttribute('u', WORD_TO_DRAWINGML_UNDERLINE[uVal]);
              modified = true;
            }
          }
        }

        if (modified) {
          const updatedXml = new XMLSerializer().serializeToString(slideDoc);
          zip.file(slideFileName, updatedXml);
        }
      }

      // Clean [Content_Types].xml: remove every <Override> whose PartName does not exist as a file in the package
      const contentTypesFile = zip.file('[Content_Types].xml');
      if (contentTypesFile) {
        const ctXml = await contentTypesFile.async('text');
        const ctDoc = parser.parseFromString(ctXml, 'text/xml');
        const overrideElems = Array.from(ctDoc.getElementsByTagName('Override'));

        for (const overrideElem of overrideElems) {
          const pn = overrideElem.getAttribute('PartName');
          if (pn) {
            const normalizedPn = pn.startsWith('/') ? pn.slice(1) : pn;
            const targetFile = zip.file(normalizedPn);
            if (!targetFile || targetFile.dir) {
              if (overrideElem.parentNode) {
                overrideElem.parentNode.removeChild(overrideElem);
              }
            }
          }
        }
        const cleanedCtXml = new XMLSerializer().serializeToString(ctDoc);
        zip.file('[Content_Types].xml', cleanedCtXml);
      }

      // Build a NEW JSZip instance and copy ONLY file entries (skip every entry where entry.dir === true)
      const newZip = new JSZip();

      const allFilePaths = Object.keys(zip.files).filter((path) => {
        const entry = zip.files[path];
        return entry && !entry.dir && !path.endsWith('/');
      });

      // Add files in order: "[Content_Types].xml" first, then "_rels/.rels", then all other files
      const orderedPaths = [];
      if (allFilePaths.includes('[Content_Types].xml')) {
        orderedPaths.push('[Content_Types].xml');
      }
      if (allFilePaths.includes('_rels/.rels')) {
        orderedPaths.push('_rels/.rels');
      }
      for (const path of allFilePaths) {
        if (path !== '[Content_Types].xml' && path !== '_rels/.rels') {
          orderedPaths.push(path);
        }
      }

      for (const path of orderedPaths) {
        const content = await zip.file(path).async('uint8array');
        newZip.file(path, content, { createFolders: false });
      }

      finalZip = newZip;
      const validation = await validatePptxZip(newZip);
      if (validation.valid) {
        finalUint8Array = await newZip.generateAsync({
          type: 'uint8array',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });
        console.log('[PPTX] ZIP entry list:', Object.keys(newZip.files));
      } else {
        console.log('[PPTX] Validation failed post-processing, falling back to raw output:', validation.error);
        finalUint8Array = rawUint8Array;
      }
    } catch (zipErr) {
      console.log('[PPTX] Post-processing error, falling back to raw output:', zipErr);
      finalUint8Array = rawUint8Array;
    }

    // Perform self-check validation after generating
    try {
      if (finalZip) {
        await performPptxSelfCheck(finalZip, finalUint8Array, hasNotes);
      }
    } catch (checkErr) {
      console.log(`[PPTX-CHECK] Error: ${checkErr.message}`);
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;
    const filename = `PPT_${dateStr}.pptx`;

    const file = new File(Paths.document, filename);
    file.create();
    await file.write(finalUint8Array);

    // Read the first 4 bytes of the saved file and log them
    const savedBytes = await file.bytes();
    const first4Bytes = Array.from(savedBytes.subarray(0, 4))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    console.log('[PPTX] Saved file first 4 bytes:', first4Bytes);

    if (first4Bytes !== '50 4B 03 04') {
      console.log('[PPTX] Error: Saved file header is invalid:', first4Bytes);
      throw new Error(`پاشەکەوتکردنی فایلەکە سەرکەوتوو نەبوو: سەردێڕی فایلەکە هەڵەیە (${first4Bytes}).`);
    }

    return {
      fileUri: file.uri,
      filename: filename,
    };
  } catch (err) {
    console.log('[PPT Exporter] Error:', err);
    throw err;
  }
};
