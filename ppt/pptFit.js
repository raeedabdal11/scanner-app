import { getElementRuns, runsToText } from './formattedText';

/**
 * pptFit.js - Shared font-fitting math for PowerPoint Editor & Exporter
 * Single source of truth for font sizing, layout planning, and slide splitting.
 */

// SLIDE Constants (16:9 widescreen layout in points: 10in x 5.625in)
export const SLIDE = {
  widthPt: 720,   // 10 inches = 720pt
  heightPt: 405,  // 5.625 inches = 405pt
  aspectRatio: '16:9',
};

// Font limits (in points)
export const FONT = {
  textMaxPt: 40,   // Max 40pt for body
  titleMaxPt: 36,  // Max 36pt for titles
  textMinPt: 14,   // Min 14pt for text
  tableMaxPt: 28,
  tableMinPt: 11,
  defaultManualPt: 18,
  stepPt: 2,
};

// Standard Body Box dimensions
export const BODY_BOX = {
  xPercent: 5,
  yPercent: 25,
  widthPercent: 90,
  heightPercent: 65,
};

/**
 * Checks if a character is in the Arabic/Kurdish script range
 */
export const isArabicKurdishChar = (ch) => {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x0600 && code <= 0x06FF) ||
    (code >= 0x0750 && code <= 0x077F) ||
    (code >= 0x08A0 && code <= 0x08FF) ||
    (code >= 0xFB50 && code <= 0xFDFF) ||
    (code >= 0xFE70 && code <= 0xFEFE)
  );
};

/**
 * Splits text into runs based on script (Kurdish/Arabic vs English/Latin)
 */
export const splitRuns = (text, kurdishFont = 'Tahoma', englishFont = 'Calibri') => {
  if (!text) return [];

  const runs = [];
  let currentText = '';
  let currentIsKurdish = null;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isKu = isArabicKurdishChar(ch);
    const isEng = /[a-zA-Z]/.test(ch);

    let charScriptIsKurdish = currentIsKurdish !== null ? currentIsKurdish : true;
    if (isKu) {
      charScriptIsKurdish = true;
    } else if (isEng) {
      charScriptIsKurdish = false;
    }

    if (currentIsKurdish === null) {
      currentIsKurdish = charScriptIsKurdish;
      currentText += ch;
    } else if (charScriptIsKurdish === currentIsKurdish) {
      currentText += ch;
    } else {
      if (currentText) {
        runs.push({
          text: currentText,
          isKurdish: currentIsKurdish,
          fontFamily: currentIsKurdish ? kurdishFont : englishFont,
        });
      }
      currentText = ch;
      currentIsKurdish = charScriptIsKurdish;
    }
  }

  if (currentText) {
    runs.push({
      text: currentText,
      isKurdish: currentIsKurdish,
      fontFamily: currentIsKurdish ? kurdishFont : englishFont,
    });
  }

  return runs;
};

/**
 * Checks if text is a table
 */
export const isTableElement = (elem) => {
  if (!elem) return false;
  if (elem.isTable || elem.type === 'table') return true;
  if (elem.type === 'text' && elem.text && elem.text.includes('|')) return true;
  return false;
};

/**
 * Reverses table columns for RTL orientation
 */
export const reverseTableLineColumns = (lineStr) => {
  if (!lineStr || !lineStr.includes('|')) return lineStr;
  if (lineStr.trim().startsWith('-')) return lineStr; // Separator line
  const cols = lineStr.split('|').map((c) => c.trim());
  cols.reverse();
  return cols.join(' | ');
};

/**
 * Measures layout height and fit for an element at a candidate base size (in pt)
 * accounting for character-by-character run sizeScale and line wrapping.
 */
export const measureElementLayout = (elem, basePt) => {
  const boxWidthPt = ((elem.width || 80) / 100) * SLIDE.widthPt;
  const boxHeightPt = ((elem.height || 20) / 100) * SLIDE.heightPt;
  const lineSpacingMultiple = elem.lineSpacing || 1.35;

  const runs = getElementRuns(elem);
  const fullText = runsToText(runs);
  if (!runs || runs.length === 0 || !fullText.trim()) {
    return { fits: true, totalHeightPt: 0, linesCount: 0 };
  }

  // Expand runs into character array with effective fontSize and width
  const chars = [];
  for (const r of runs) {
    const scale = r.sizeScale !== undefined ? r.sizeScale : 1.0;
    const fSize = basePt * scale;
    const txt = r.text || '';
    for (let i = 0; i < txt.length; i++) {
      chars.push({ ch: txt[i], fontSize: fSize, charWidth: fSize * 0.52 });
    }
  }

  // Split into paragraphs by newline
  const paragraphs = [];
  let currentP = [];
  for (const c of chars) {
    if (c.ch === '\n') {
      paragraphs.push(currentP);
      currentP = [];
    } else {
      currentP.push(c);
    }
  }
  paragraphs.push(currentP);

  let totalHeightPt = 0;
  let totalWrappedLines = 0;
  let singleWordExceedsWidth = false;

  for (const pChars of paragraphs) {
    if (pChars.length === 0) {
      const defaultLineHeight = basePt * lineSpacingMultiple;
      totalHeightPt += defaultLineHeight;
      totalWrappedLines += 1;
      continue;
    }

    // Group pChars into words (and space tokens)
    const words = [];
    let currentWord = [];
    for (const c of pChars) {
      if (c.ch === ' ') {
        if (currentWord.length > 0) {
          words.push(currentWord);
          currentWord = [];
        }
        words.push([c]);
      } else {
        currentWord.push(c);
      }
    }
    if (currentWord.length > 0) {
      words.push(currentWord);
    }

    let currentLineWidth = 0;
    let currentLineMaxFontSize = 0;
    let lineHasContent = false;

    for (const wordChars of words) {
      const isSpace = wordChars.length === 1 && wordChars[0].ch === ' ';
      const wordWidth = wordChars.reduce((sum, c) => sum + c.charWidth, 0);
      const wordMaxFontSize = Math.max(...wordChars.map((c) => c.fontSize));

      if (wordWidth > boxWidthPt + 1 && !isSpace) {
        singleWordExceedsWidth = true;
      }

      if (!lineHasContent) {
        if (isSpace) continue;
        currentLineWidth = wordWidth;
        currentLineMaxFontSize = wordMaxFontSize;
        lineHasContent = true;
      } else {
        if (currentLineWidth + wordWidth <= boxWidthPt + 1) {
          currentLineWidth += wordWidth;
          if (wordMaxFontSize > currentLineMaxFontSize) {
            currentLineMaxFontSize = wordMaxFontSize;
          }
        } else {
          // Wrap to new line
          const lineHeight = currentLineMaxFontSize * lineSpacingMultiple;
          totalHeightPt += lineHeight;
          totalWrappedLines += 1;

          if (isSpace) {
            currentLineWidth = 0;
            currentLineMaxFontSize = 0;
            lineHasContent = false;
          } else {
            currentLineWidth = wordWidth;
            currentLineMaxFontSize = wordMaxFontSize;
            lineHasContent = true;
          }
        }
      }
    }

    if (lineHasContent) {
      const lineHeight = currentLineMaxFontSize * lineSpacingMultiple;
      totalHeightPt += lineHeight;
      totalWrappedLines += 1;
    }
  }

  const fitsHeight = totalHeightPt <= boxHeightPt + 2;
  const fits = fitsHeight && !singleWordExceedsWidth;

  return { fits, totalHeightPt, linesCount: totalWrappedLines };
};

/**
 * Calculates fitting font size for a text or table element inside its box
 */
export const calculateFittingFontSize = (elem) => {
  if (!elem || elem.type !== 'text') {
    return { fontSizePt: elem?.fontSize || FONT.defaultManualPt, fits: true, overflowRatio: 1 };
  }

  const isTable = isTableElement(elem);
  const isTitle = elem.fontWeight === 'bold' || (elem.y || 0) < 20 || (elem.fontSize && elem.fontSize >= 24);

  // Determine font bounds
  const maxPt = isTable
    ? FONT.tableMaxPt
    : isTitle
    ? FONT.titleMaxPt
    : FONT.textMaxPt;

  const minPt = isTable ? FONT.tableMinPt : FONT.textMinPt;

  const fontMode = elem.fontMode || 'auto';
  let targetFontSize = elem.fontSize || (isTable ? 16 : 18);

  const boxHeightPt = ((elem.height || 20) / 100) * SLIDE.heightPt;

  if (fontMode === 'manual') {
    const clampedSize = Math.max(minPt, Math.min(maxPt, targetFontSize));
    const { fits, totalHeightPt } = measureElementLayout(elem, clampedSize);
    const overflowRatio = boxHeightPt > 0 ? totalHeightPt / boxHeightPt : 1;
    return {
      fontSizePt: clampedSize,
      fits,
      overflowRatio,
    };
  }

  // AUTO Mode: Shrink from maxPt down to minPt until it fits cleanly
  let currentPt = maxPt;
  let bestFitSize = minPt;
  let fitsAtCurrent = false;
  let lastOverflowRatio = 1;

  while (currentPt >= minPt) {
    const { fits, totalHeightPt } = measureElementLayout(elem, currentPt);
    lastOverflowRatio = boxHeightPt > 0 ? totalHeightPt / boxHeightPt : 1;

    if (fits) {
      bestFitSize = currentPt;
      fitsAtCurrent = true;
      break;
    }
    currentPt -= 1;
  }

  if (!fitsAtCurrent) {
    bestFitSize = minPt;
  }

  return {
    fontSizePt: bestFitSize,
    fits: fitsAtCurrent,
    overflowRatio: lastOverflowRatio,
  };
};

/**
 * Splits overflowing element content (text or table) across multiple slide pages.
 */
export const splitElementContent = (elem, fontSizePt) => {
  const isTable = isTableElement(elem);
  const textStr = elem.text || '';
  const paragraphs = textStr.split('\n');

  const boxWidthPt = ((elem.width || 80) / 100) * SLIDE.widthPt;
  const boxHeightPt = ((elem.height || 20) / 100) * SLIDE.heightPt;
  const lineHeightPt = fontSizePt * (elem.lineSpacing || 1.35);
  const charWidthPt = fontSizePt * 0.52;
  const charsPerLine = Math.max(1, Math.floor(boxWidthPt / charWidthPt));

  const maxLinesPerBox = Math.max(1, Math.floor(boxHeightPt / lineHeightPt));

  if (isTable) {
    let headerLine = '';
    let dataLines = [];

    if (paragraphs.length > 0) {
      headerLine = paragraphs[0];
      dataLines = paragraphs.slice(1).filter((l) => l.trim() !== '' && !l.startsWith('----'));
    }

    const chunks = [];
    let currentChunk = [];
    let currentLineCount = 1;

    for (const row of dataLines) {
      if (currentLineCount + 1 > maxLinesPerBox && currentChunk.length > 0) {
        chunks.push([headerLine, '---------------------------------------------', ...currentChunk].join('\n'));
        currentChunk = [];
        currentLineCount = 1;
      }
      currentChunk.push(row);
      currentLineCount += 1;
    }

    if (currentChunk.length > 0 || chunks.length === 0) {
      chunks.push([headerLine, '---------------------------------------------', ...currentChunk].join('\n'));
    }

    return chunks;
  }

  const allWrappedLines = [];
  for (const p of paragraphs) {
    if (!p) {
      allWrappedLines.push('');
      continue;
    }
    const words = p.split(' ');
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).trim().length <= charsPerLine) {
        currentLine = (currentLine + ' ' + w).trim();
      } else {
        if (currentLine) allWrappedLines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) allWrappedLines.push(currentLine);
  }

  const chunks = [];
  for (let i = 0; i < allWrappedLines.length; i += maxLinesPerBox) {
    const slice = allWrappedLines.slice(i, i + maxLinesPerBox);
    chunks.push(slice.join('\n'));
  }

  return chunks.length > 0 ? chunks : [textStr];
};

/**
 * planPage(page)
 */
export const planPage = (page) => {
  if (!page || !page.elements) {
    return {
      computedPage: page,
      slides: [page || { elements: [] }],
      fill: 0,
      isFull: false,
      splitCount: 0,
    };
  }

  let maxOverflowRatio = 0;
  let anyOverflow = false;
  let totalFillAccumulator = 0;
  let textElemCount = 0;

  const elementsWithComputed = page.elements.map((elem) => {
    if (elem.type !== 'text') return elem;

    const { fontSizePt, fits, overflowRatio } = calculateFittingFontSize(elem);
    textElemCount++;
    totalFillAccumulator += Math.min(1, overflowRatio);

    if (!fits || overflowRatio > 1) {
      anyOverflow = true;
    }
    if (overflowRatio > maxOverflowRatio) {
      maxOverflowRatio = overflowRatio;
    }

    return {
      ...elem,
      fontMode: elem.fontMode || 'auto',
      computedFontSize: fontSizePt,
      fontSize: fontSizePt,
    };
  });

  const pageFill = textElemCount > 0 ? Math.min(1, totalFillAccumulator / textElemCount) : 0;

  const overflowElem = elementsWithComputed.find((e) => {
    if (e.type !== 'text') return false;
    const { fits } = calculateFittingFontSize(e);
    return !fits;
  });

  if (!overflowElem) {
    const computedPage = { ...page, elements: elementsWithComputed };
    return {
      computedPage,
      slides: [computedPage],
      fill: Math.min(1, Math.max(pageFill, maxOverflowRatio > 0.9 ? 1 : pageFill)),
      isFull: pageFill >= 0.95 || maxOverflowRatio >= 0.98,
      splitCount: 0,
    };
  }

  const chunks = splitElementContent(overflowElem, overflowElem.computedFontSize);
  const totalSlidesNeeded = chunks.length;

  if (totalSlidesNeeded <= 1) {
    const computedPage = { ...page, elements: elementsWithComputed };
    return {
      computedPage,
      slides: [computedPage],
      fill: 1.0,
      isFull: true,
      splitCount: 0,
    };
  }

  const titleElem = elementsWithComputed.find(
    (e) => e.type === 'text' && e.id !== overflowElem.id && (e.fontSize >= 20 || e.fontWeight === 'bold' || e.y < 20)
  );

  const generatedSlides = [];

  for (let sIdx = 0; sIdx < totalSlidesNeeded; sIdx++) {
    const slideNumberSuffix = `(${sIdx + 1}/${totalSlidesNeeded})`;

    const slideElements = elementsWithComputed.map((e) => {
      if (e.id === overflowElem.id) {
        return {
          ...e,
          text: chunks[sIdx] || '',
        };
      }
      if (titleElem && e.id === titleElem.id) {
        const baseTitle = titleElem.text.replace(/\s*\(\d+\/\d+\)$/, '');
        return {
          ...e,
          text: `${baseTitle} ${slideNumberSuffix}`,
        };
      }
      return e;
    });

    generatedSlides.push({
      ...page,
      id: sIdx === 0 ? page.id : `${page.id}_split_${sIdx}`,
      elements: slideElements,
    });
  }

  return {
    computedPage: generatedSlides[0],
    slides: generatedSlides,
    fill: 1.0,
    isFull: true,
    splitCount: totalSlidesNeeded - 1,
  };
};

/**
 * countSlides(pages)
 */
export const countSlides = (pages = []) => {
  if (!Array.isArray(pages)) return 0;
  return pages.reduce((acc, p) => acc + planPage(p).slides.length, 0);
};
