/**
 * ppt/formattedText.js
 * Rich Text Runs Engine for PowerPoint Editor
 * Supports run-level & selection-level styling, relative size scaling, word-boundary selection,
 * and lossless migration of legacy elements.
 */

// Punctuation and whitespace characters defining word boundaries
const WORD_BOUNDARY_REGEX = /[\s\n\r.،؟!:؛()«»]/;

/**
 * Checks if a character is part of a word (treating ZWNJ \u200C as part of word)
 */
export const isWordChar = (ch) => {
  if (!ch) return false;
  if (ch === '\u200C') return true; // ZWNJ
  return !WORD_BOUNDARY_REGEX.test(ch);
};

/**
 * Retrieves normalized array of styled runs from element.
 * Migrates legacy elements seamlessly.
 */
export const getElementRuns = (element) => {
  if (!element) return [];

  if (element.runs && Array.isArray(element.runs) && element.runs.length > 0) {
    return element.runs;
  }

  if (
    element.formattedRuns &&
    Array.isArray(element.formattedRuns) &&
    element.formattedRuns.length > 0
  ) {
    const basePt = element.fontSize || element.computedFontSize || 18;
    return element.formattedRuns.map((r) => ({
      text: r.text || '',
      color: r.color || element.color || '#1c1c1e',
      sizeScale:
        r.sizeScale !== undefined
          ? r.sizeScale
          : r.fontSize
          ? r.fontSize / basePt
          : 1.0,
      bold:
        r.bold !== undefined
          ? r.bold
          : r.fontWeight === 'bold' || element.fontWeight === 'bold',
      italic:
        r.italic !== undefined
          ? r.italic
          : r.fontStyle === 'italic' || element.fontStyle === 'italic',
      underline:
        r.underline !== undefined
          ? r.underline
          : r.textDecorationLine === 'underline' ||
            element.textDecorationLine === 'underline',
      highlight: r.highlight || r.highlightColor || element.highlightColor || 'transparent',
      shadow: r.shadow || r.shadowColor || element.shadowColor || 'transparent',
      kuFont: r.kuFont || r.kurdishFont || element.kurdishFont || 'Tahoma',
      enFont: r.enFont || r.englishFont || element.englishFont || 'Calibri',
    }));
  }

  // Fallback single run for legacy elements
  return [
    {
      text: element.text || '',
      color: element.color || '#1c1c1e',
      sizeScale: 1.0,
      bold: element.fontWeight === 'bold',
      italic: element.fontStyle === 'italic',
      underline: element.textDecorationLine === 'underline',
      highlight: element.highlightColor || 'transparent',
      shadow: element.shadowColor || 'transparent',
      kuFont: element.kurdishFont || 'Tahoma',
      enFont: element.englishFont || 'Calibri',
    },
  ];
};

/**
 * Converts array of styled runs to flat text string
 */
export const runsToText = (runs) => {
  if (!runs || !Array.isArray(runs)) return '';
  return runs.map((r) => r.text || '').join('');
};

/**
 * Expands runs into character-by-character style array
 */
export const runsToCharStyles = (runs, defaultElem = {}) => {
  const chars = [];
  if (!runs || !Array.isArray(runs)) return chars;

  const defaultColor = defaultElem.color || '#1c1c1e';
  const defaultKuFont = defaultElem.kurdishFont || 'Tahoma';
  const defaultEnFont = defaultElem.englishFont || 'Calibri';
  const defaultHighlight = defaultElem.highlightColor || 'transparent';
  const defaultShadow = defaultElem.shadowColor || 'transparent';

  for (const run of runs) {
    const txt = run.text || '';
    for (let i = 0; i < txt.length; i++) {
      chars.push({
        ch: txt[i],
        color: run.color || defaultColor,
        sizeScale: run.sizeScale !== undefined ? run.sizeScale : 1.0,
        bold: !!run.bold,
        italic: !!run.italic,
        underline: !!run.underline,
        highlight: run.highlight || defaultHighlight,
        shadow: run.shadow || defaultShadow,
        kuFont: run.kuFont || defaultKuFont,
        enFont: run.enFont || defaultEnFont,
      });
    }
  }
  return chars;
};

/**
 * Merges character-by-character style array back into compact formatted runs
 */
export const charStylesToRuns = (chars) => {
  if (!chars || chars.length === 0) return [];

  const runs = [];
  let currentRun = null;

  for (const item of chars) {
    if (!currentRun) {
      currentRun = {
        text: item.ch,
        color: item.color,
        sizeScale: item.sizeScale,
        bold: item.bold,
        italic: item.italic,
        underline: item.underline,
        highlight: item.highlight,
        shadow: item.shadow,
        kuFont: item.kuFont,
        enFont: item.enFont,
      };
    } else if (
      item.color === currentRun.color &&
      Math.abs((item.sizeScale || 1.0) - (currentRun.sizeScale || 1.0)) < 0.01 &&
      !!item.bold === !!currentRun.bold &&
      !!item.italic === !!currentRun.italic &&
      !!item.underline === !!currentRun.underline &&
      item.highlight === currentRun.highlight &&
      item.shadow === currentRun.shadow &&
      item.kuFont === currentRun.kuFont &&
      item.enFont === currentRun.enFont
    ) {
      currentRun.text += item.ch;
    } else {
      runs.push(currentRun);
      currentRun = {
        text: item.ch,
        color: item.color,
        sizeScale: item.sizeScale,
        bold: item.bold,
        italic: item.italic,
        underline: item.underline,
        highlight: item.highlight,
        shadow: item.shadow,
        kuFont: item.kuFont,
        enFont: item.enFont,
      };
    }
  }

  if (currentRun) {
    runs.push(currentRun);
  }

  return runs;
};

/**
 * Finds word boundaries around a cursor index
 */
export const getWordRangeAtCursor = (text, cursorIdx) => {
  if (!text || text.length === 0) return { start: 0, end: 0 };
  const len = text.length;

  let idx = Math.max(0, Math.min(len, cursorIdx));

  if (idx > 0 && !isWordChar(text[idx]) && isWordChar(text[idx - 1])) {
    idx = idx - 1;
  }

  if (!isWordChar(text[idx])) {
    return { start: cursorIdx, end: cursorIdx };
  }

  let start = idx;
  while (start > 0 && isWordChar(text[start - 1])) {
    start--;
  }

  let end = idx;
  while (end < len && isWordChar(text[end])) {
    end++;
  }

  return { start, end };
};

/**
 * Applies style property change to range (selection, word under cursor, or whole box)
 */
export const applyStyleToElement = (
  element,
  key,
  value,
  selection = { start: 0, end: 0 },
  forceWhole = false
) => {
  const currentRuns = getElementRuns(element);
  const chars = runsToCharStyles(currentRuns, element);
  const totalLen = chars.length;

  let start = 0;
  let end = totalLen;

  if (!forceWhole) {
    if (selection.start !== selection.end) {
      // Range selection
      start = Math.max(0, Math.min(selection.start, selection.end));
      end = Math.min(totalLen, Math.max(selection.start, selection.end));
    } else {
      // Cursor only: find word range under cursor
      const wordRange = getWordRangeAtCursor(element.text || '', selection.start);
      if (wordRange.start !== wordRange.end) {
        start = Math.max(0, Math.min(wordRange.start, totalLen));
        end = Math.min(totalLen, Math.max(wordRange.end, totalLen));
      } else {
        // Fallback to whole box if cursor is in whitespace
        start = 0;
        end = totalLen;
      }
    }
  }

  // Apply property change to target character range
  for (let i = start; i < end; i++) {
    if (key === 'sizeScaleDelta') {
      const curScale = chars[i].sizeScale !== undefined ? chars[i].sizeScale : 1.0;
      chars[i].sizeScale = Math.max(0.4, Math.min(3.0, curScale + value));
    } else if (key === 'bold') {
      chars[i].bold = value !== undefined ? value : !chars[i].bold;
    } else if (key === 'italic') {
      chars[i].italic = value !== undefined ? value : !chars[i].italic;
    } else if (key === 'underline') {
      chars[i].underline = value !== undefined ? value : !chars[i].underline;
    } else {
      chars[i][key] = value;
    }
  }

  const newRuns = charStylesToRuns(chars);

  const updatedElem = {
    ...element,
    runs: newRuns,
    formattedRuns: newRuns,
  };

  // If applied to whole box, also update root element fallbacks
  if (start === 0 && end === totalLen) {
    if (key === 'color') updatedElem.color = value;
    if (key === 'bold') updatedElem.fontWeight = value ? 'bold' : 'normal';
    if (key === 'italic') updatedElem.fontStyle = value ? 'italic' : 'normal';
    if (key === 'underline') updatedElem.textDecorationLine = value ? 'underline' : 'none';
    if (key === 'highlight') updatedElem.highlightColor = value;
    if (key === 'shadow') updatedElem.shadowColor = value;
    if (key === 'kuFont') updatedElem.kurdishFont = value;
    if (key === 'enFont') updatedElem.englishFont = value;
  }

  return updatedElem;
};

/**
 * Diffs newText against current runs, preserving character styles and inheriting cursor style
 */
export const updateElementText = (element, newText, selection = { start: 0, end: 0 }) => {
  const currentRuns = getElementRuns(element);
  const oldText = element.text || '';

  if (newText === oldText) {
    return element;
  }

  const chars = runsToCharStyles(currentRuns, element);

  if (chars.length === 0) {
    const defaultRun = {
      text: newText,
      color: element.color || '#1c1c1e',
      sizeScale: 1.0,
      bold: element.fontWeight === 'bold',
      italic: element.fontStyle === 'italic',
      underline: element.textDecorationLine === 'underline',
      highlight: element.highlightColor || 'transparent',
      shadow: element.shadowColor || 'transparent',
      kuFont: element.kurdishFont || 'Tahoma',
      enFont: element.englishFont || 'Calibri',
    };
    return {
      ...element,
      text: newText,
      runs: [defaultRun],
      formattedRuns: [defaultRun],
    };
  }

  // Find common prefix
  let prefixLen = 0;
  while (
    prefixLen < oldText.length &&
    prefixLen < newText.length &&
    oldText[prefixLen] === newText[prefixLen]
  ) {
    prefixLen++;
  }

  // Find common suffix
  let suffixLen = 0;
  while (
    suffixLen < oldText.length - prefixLen &&
    suffixLen < newText.length - prefixLen &&
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const deletedCount = oldText.length - prefixLen - suffixLen;
  const insertedText = newText.slice(prefixLen, newText.length - suffixLen);

  const styleAtCursor = chars[Math.max(0, prefixLen - 1)] || chars[0];

  const newChars = [
    ...chars.slice(0, prefixLen),
    ...insertedText.split('').map((ch) => ({ ...styleAtCursor, ch })),
    ...chars.slice(prefixLen + deletedCount),
  ];

  const newRuns = charStylesToRuns(newChars);

  return {
    ...element,
    text: newText,
    runs: newRuns,
    formattedRuns: newRuns,
  };
};

/**
 * Returns current style at selection or cursor position
 */
export const getSelectionStyle = (element, selection = { start: 0, end: 0 }) => {
  const currentRuns = getElementRuns(element);
  const chars = runsToCharStyles(currentRuns, element);

  const basePt = element.fontSize || element.computedFontSize || 18;

  if (chars.length === 0) {
    return {
      bold: element.fontWeight === 'bold',
      italic: element.fontStyle === 'italic',
      underline: element.textDecorationLine === 'underline',
      color: element.color || '#1c1c1e',
      sizeScale: 1.0,
      sizePt: Math.round(basePt),
      kuFont: element.kurdishFont || 'Tahoma',
      enFont: element.englishFont || 'Calibri',
      highlight: element.highlightColor || 'transparent',
      shadow: element.shadowColor || 'transparent',
    };
  }

  let targetIdx = selection.start;
  if (selection.start === selection.end) {
    const wordRange = getWordRangeAtCursor(element.text || '', selection.start);
    targetIdx = wordRange.start;
  }

  const idx = Math.max(0, Math.min(targetIdx, chars.length - 1));
  const sample = chars[idx] || chars[0];
  const scale = sample.sizeScale !== undefined ? sample.sizeScale : 1.0;
  const effectivePt = Math.round(basePt * scale);

  return {
    bold: !!sample.bold,
    italic: !!sample.italic,
    underline: !!sample.underline,
    color: sample.color,
    sizeScale: scale,
    sizePt: effectivePt,
    kuFont: sample.kuFont,
    enFont: sample.enFont,
    highlight: sample.highlight,
    shadow: sample.shadow,
  };
};
