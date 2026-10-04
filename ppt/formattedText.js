/**
 * ppt/formattedText.js
 * Rich Text Runs Engine for PowerPoint Editor
 * Supports run-level & selection-level styling, relative size scaling, word-boundary selection,
 * and lossless migration of legacy elements.
 */

import { sameStyle, mergeRuns, applyStyle, wordRangeAt } from './richText';

export { sameStyle, mergeRuns, applyStyle, wordRangeAt };

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
 * Migrates legacy elements seamlessly and removes box-level text color.
 */
export const getElementRuns = (element) => {
  if (!element) return [{ text: '', color: '#1c1c1e' }];

  let rawRuns = [];
  if (element.runs && Array.isArray(element.runs) && element.runs.length > 0) {
    rawRuns = element.runs;
  } else if (
    element.formattedRuns &&
    Array.isArray(element.formattedRuns) &&
    element.formattedRuns.length > 0
  ) {
    const basePt = element.computedFontSize || element.fontSize || 18;
    rawRuns = element.formattedRuns.map((r) => ({
      text: r.text || '',
      color: r.color || '#1c1c1e',
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
      highlight: r.highlight && r.highlight !== 'transparent' ? r.highlight : null,
      shadowColor:
        (r.shadowColor || r.shadow) && (r.shadowColor || r.shadow) !== 'transparent'
          ? r.shadowColor || r.shadow
          : null,
      kuFont: r.kuFont || r.kurdishFont || element.kurdishFont || 'Tahoma',
      enFont: r.enFont || r.englishFont || element.englishFont || 'Calibri',
    }));
  } else {
    rawRuns = [
      {
        text: element.text || '',
        color: element.color || '#1c1c1e',
        sizeScale: 1.0,
        bold: element.fontWeight === 'bold',
        italic: element.fontStyle === 'italic',
        underline: element.textDecorationLine === 'underline',
        highlight: null,
        shadowColor: null,
        kuFont: element.kurdishFont || 'Tahoma',
        enFont: element.englishFont || 'Calibri',
      },
    ];
  }

  // Clean out sizeScaleDelta from all runs
  return rawRuns.map((r) => {
    const { sizeScaleDelta, ...cleanR } = r;
    return {
      ...cleanR,
      color: cleanR.color || '#1c1c1e',
      sizeScale: cleanR.sizeScale !== undefined ? cleanR.sizeScale : 1.0,
      highlight: cleanR.highlight && cleanR.highlight !== 'transparent' ? cleanR.highlight : null,
      shadowColor: cleanR.shadowColor && cleanR.shadowColor !== 'transparent' ? cleanR.shadowColor : null,
    };
  });
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

  const defaultKuFont = defaultElem.kurdishFont || 'Tahoma';
  const defaultEnFont = defaultElem.englishFont || 'Calibri';
  const defaultHighlight = defaultElem.highlightColor || 'transparent';
  const defaultShadow = defaultElem.shadowColor || 'transparent';

  for (const run of runs) {
    const txt = run.text || '';
    const runColor = run.color || '#1c1c1e';
    for (let i = 0; i < txt.length; i++) {
      chars.push({
        ch: txt[i],
        color: runColor,
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
    const itemColor = item.color || '#1c1c1e';
    if (!currentRun) {
      currentRun = {
        text: item.ch,
        color: itemColor,
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
      (currentRun.color || '#1c1c1e') === itemColor &&
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
        color: itemColor,
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
  return wordRangeAt(text, cursorIdx);
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
  const plain = currentRuns.map((r) => r.text).join('');

  let start = 0;
  let end = 0;

  if (forceWhole) {
    start = 0;
    end = plain.length;
  } else if (selection.start !== selection.end) {
    start = Math.max(0, Math.min(selection.start, selection.end));
    end = Math.min(plain.length, Math.max(selection.start, selection.end));
  } else {
    const selIdx = selection.start;
    if (selIdx < plain.length && isWordChar(plain[selIdx])) {
      const wRange = wordRangeAt(plain, selIdx);
      start = wRange.start;
      end = wRange.end;
    } else if (selIdx > 0 && selIdx === plain.length && isWordChar(plain[selIdx - 1])) {
      const wRange = wordRangeAt(plain, selIdx - 1);
      start = wRange.start;
      end = wRange.end;
    }
  }

  if (start === end) {
    const { color: _c, ...elemWithoutColor } = element;
    return {
      ...elemWithoutColor,
      text: plain,
      runs: currentRuns,
      formattedRuns: currentRuns,
    };
  }

  let patch = {};
  if (typeof key === 'function') patch = key;
  else if (key === 'color') patch = { color: value };
  else if (key === 'highlight') patch = { highlight: value };
  else if (key === 'shadow' || key === 'shadowColor') patch = { shadowColor: value };
  else if (key === 'bold') patch = { bold: value };
  else if (key === 'italic') patch = { italic: value };
  else if (key === 'underline') patch = { underline: value };
  else if (key === 'kuFont') patch = { kuFont: value };
  else if (key === 'enFont') patch = { enFont: value };
  else patch = { [key]: value };

  const newRuns = applyStyle(currentRuns, start, end, patch);
  const { color: _c, ...elemWithoutColor } = element;

  return {
    ...elemWithoutColor,
    text: plain,
    runs: newRuns,
    formattedRuns: newRuns,
  };
};

/**
 * Diffs newText against current runs, preserving character styles and inheriting cursor style
 */
export const updateElementText = (element, newText, selection = { start: 0, end: 0 }) => {
  const currentRuns = getElementRuns(element);
  const oldText = element.text || '';

  if (newText === oldText) {
    const { color: _c, ...elemWithoutColor } = element;
    return { ...elemWithoutColor, runs: currentRuns, formattedRuns: currentRuns };
  }

  const chars = runsToCharStyles(currentRuns, element);

  if (chars.length === 0) {
    const defaultRun = {
      text: newText,
      color: '#1c1c1e',
      sizeScale: 1.0,
      bold: element.fontWeight === 'bold',
      italic: element.fontStyle === 'italic',
      underline: element.textDecorationLine === 'underline',
      highlight: element.highlightColor || 'transparent',
      shadow: element.shadowColor || 'transparent',
      kuFont: element.kurdishFont || 'Tahoma',
      enFont: element.englishFont || 'Calibri',
    };
    const { color: _c, ...elemWithoutColor } = element;
    return {
      ...elemWithoutColor,
      text: newText,
      runs: [defaultRun],
      formattedRuns: [defaultRun],
    };
  }

  let prefixLen = 0;
  while (
    prefixLen < oldText.length &&
    prefixLen < newText.length &&
    oldText[prefixLen] === newText[prefixLen]
  ) {
    prefixLen++;
  }

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
  const { color: _c, ...elemWithoutColor } = element;

  return {
    ...elemWithoutColor,
    text: newText,
    runs: newRuns,
    formattedRuns: newRuns,
  };
};

/**
 * Updates text while maintaining runs array
 */
export const updateTextWithRuns = (element, newText) => {
  return updateElementText(element, newText);
};

/**
 * Returns current style at selection or cursor position
 */
export const getSelectionStyle = (element, selection = { start: 0, end: 0 }) => {
  const currentRuns = getElementRuns(element);
  const chars = runsToCharStyles(currentRuns, element);
  const basePt = element.computedFontSize || element.fontSize || 18;

  if (chars.length === 0) {
    return {
      bold: false,
      italic: false,
      underline: false,
      color: '#1c1c1e',
      sizeScale: 1.0,
      sizePt: Math.round(basePt),
      kuFont: element.kurdishFont || 'Tahoma',
      enFont: element.englishFont || 'Calibri',
      highlight: 'transparent',
      shadowColor: 'transparent',
    };
  }

  const start = selection ? selection.start : 0;
  const end = selection ? selection.end : 0;
  const text = element.text || '';
  let targetIdx = start;

  if (start === end) {
    if (start < text.length && isWordChar(text[start])) {
      const wordRange = wordRangeAt(text, start);
      targetIdx = wordRange.start;
    } else if (start > 0 && start === text.length && isWordChar(text[start - 1])) {
      const wordRange = wordRangeAt(text, start - 1);
      targetIdx = wordRange.start;
    }
  }

  const idx = Math.max(0, Math.min(targetIdx, chars.length - 1));
  const sample = chars[idx] || chars[0];
  const scale = sample.sizeScale !== undefined ? sample.sizeScale : 1.0;
  const effectivePt = Math.round(basePt * scale);

  return {
    bold: !!sample.bold,
    italic: !!sample.italic,
    underline: !!sample.underline,
    color: sample.color || '#1c1c1e',
    sizeScale: scale,
    sizePt: effectivePt,
    kuFont: sample.kuFont || element.kurdishFont || 'Tahoma',
    enFont: sample.enFont || element.englishFont || 'Calibri',
    highlight: sample.highlight && sample.highlight !== 'transparent' ? sample.highlight : 'transparent',
    shadowColor: sample.shadow && sample.shadow !== 'transparent' ? sample.shadow : sample.shadowColor && sample.shadowColor !== 'transparent' ? sample.shadowColor : 'transparent',
  };
};

/**
 * Splits runs for display only, attaching isStickySelected: true for sticky selection range.
 * Does not mutate runs or saved state.
 */
export const getDisplayRunsWithSelection = (runs, stickyRange) => {
  if (!runs || !Array.isArray(runs) || runs.length === 0) return [];
  if (!stickyRange || stickyRange.start === undefined || stickyRange.end === undefined) {
    return runs;
  }
  const start = Math.max(0, Math.min(stickyRange.start, stickyRange.end));
  const end = Math.max(0, Math.min(stickyRange.start, stickyRange.end));
  if (start === end) return runs;

  const out = [];
  let pos = 0;
  for (const r of runs) {
    const rText = r.text || '';
    const a = pos;
    const b = pos + rText.length;
    pos = b;

    if (b <= start || a >= end) {
      out.push(r);
      continue;
    }

    const s = Math.max(start, a) - a;
    const e = Math.min(end, b) - a;

    if (s > 0) {
      out.push({ ...r, text: rText.slice(0, s) });
    }
    out.push({ ...r, text: rText.slice(s, e), isStickySelected: true });
    if (e < rText.length) {
      out.push({ ...r, text: rText.slice(e) });
    }
  }
  return out;
};

