// Real table element (type: 'table'): data model, styles, layout and edit helpers.
// Pure JS (no React) so the canvas, the PDF renderer and the PPTX exporter share one layout.
//
// Element:
//   { id, type: 'table', x, y, width, height, zIndex, rotation: 0, locked,
//     rows, cols, colWidths[] (fractions, sum 1), rowHeights[] (fractions, sum 1),
//     cells[r][c] = { text, fontSize?, bold?, italic?, color?, align?, fill? },
//     headerRow, bandRows, styleKey, style: { headerFill, headerTextColor, bodyFill, altRowFill,
//     bodyTextColor, borderColor, borderWidth }, fontSize, kurdishFont }
// x / y / width / height are slide percentages like every other element.
// RTL rule everywhere: column 0 is drawn on the RIGHT (canvas row-reverse, HTML dir="rtl",
// PPTX <a:tblPr rtl="1">). Cell alignment ('right' / 'center' / 'left') is physical.

import { makeId } from './makeId';

export const TABLE_LIMITS = { minRows: 1, minCols: 1, maxRows: 10, maxCols: 8 };
export const TABLE_DEFAULT_FONT_PT = 14;
export const TABLE_CELL_PAD_PT = 4;
const LINE_HEIGHT = 1.25;
const CHAR_WIDTH_EM = 0.55;

export const TABLE_STYLES = [
  {
    key: 'primary', label: 'ڕەنگی سەرەکی',
    headerFill: '#4472c4', headerTextColor: '#ffffff', bodyFill: '#dae3f3', altRowFill: '#b4c7e7',
    bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1,
  },
  {
    key: 'banded', label: 'هێڵدار',
    headerFill: '#ed7d31', headerTextColor: '#ffffff', bodyFill: '#fbe5d6', altRowFill: '#f8cbad',
    bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1,
  },
  {
    key: 'lines', label: 'تەنها هێڵ',
    headerFill: '#ffffff', headerTextColor: '#1c1c1e', bodyFill: '#ffffff', altRowFill: '#ffffff',
    bodyTextColor: '#1c1c1e', borderColor: '#7f7f7f', borderWidth: 1,
  },
  {
    key: 'dark', label: 'تاریک',
    headerFill: '#000000', headerTextColor: '#ffffff', bodyFill: '#404040', altRowFill: '#262626',
    bodyTextColor: '#ffffff', borderColor: '#7f7f7f', borderWidth: 1,
  },
  {
    key: 'colorful', label: 'ڕەنگاڵە',
    headerFill: '#70ad47', headerTextColor: '#ffffff', bodyFill: '#e2efd9', altRowFill: '#c5e0b3',
    bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1,
  },
  {
    key: 'plain', label: 'سادە',
    headerFill: '#f2f2f2', headerTextColor: '#1c1c1e', bodyFill: '#ffffff', altRowFill: '#f7f7f7',
    bodyTextColor: '#1c1c1e', borderColor: '#bfbfbf', borderWidth: 1,
  },
];

const styleFields = (s) => ({
  headerFill: s.headerFill,
  headerTextColor: s.headerTextColor,
  bodyFill: s.bodyFill,
  altRowFill: s.altRowFill,
  bodyTextColor: s.bodyTextColor,
  borderColor: s.borderColor,
  borderWidth: s.borderWidth,
});

export const getTableStyle = (key) => TABLE_STYLES.find((s) => s.key === key) || TABLE_STYLES[0];

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));
const evenFractions = (n) => Array.from({ length: n }, () => 1 / n);

const normalizeFractions = (arr, n) => {
  const list = Array.from({ length: n }, (_, i) => (arr && arr[i] > 0 ? arr[i] : 1 / n));
  const sum = list.reduce((a, b) => a + b, 0) || 1;
  return list.map((v) => v / sum);
};

export const createTableElement = ({ rows = 3, cols = 3, x, y, width = 80, height, zIndex = 1, styleKey = 'primary' } = {}) => {
  const r = clampInt(rows, TABLE_LIMITS.minRows, TABLE_LIMITS.maxRows);
  const c = clampInt(cols, TABLE_LIMITS.minCols, TABLE_LIMITS.maxCols);
  const h = height || Math.min(80, 10 * r);
  const cells = Array.from({ length: r }, (_, ri) =>
    Array.from({ length: c }, (_, ci) => ({ text: ri === 0 ? `سەردێڕ ${toKurdishDigits(ci + 1)}` : '' }))
  );
  return {
    id: makeId('table'),
    type: 'table',
    x: x !== undefined ? x : (100 - width) / 2,
    y: y !== undefined ? y : Math.max(2, (100 - h) / 2),
    width,
    height: h,
    zIndex,
    rotation: 0,
    locked: false,
    opacity: 1,
    rows: r,
    cols: c,
    colWidths: evenFractions(c),
    rowHeights: evenFractions(r),
    cells,
    headerRow: true,
    bandRows: true,
    styleKey,
    style: styleFields(getTableStyle(styleKey)),
    fontSize: TABLE_DEFAULT_FONT_PT,
    kurdishFont: 'Tahoma',
  };
};

const KURDISH_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toKurdishDigits = (n) => String(n).replace(/\d/g, (d) => KURDISH_DIGITS[Number(d)]);

export const getCell = (elem, r, c) => (elem.cells && elem.cells[r] && elem.cells[r][c]) || { text: '' };

// Effective look of one cell (cell overrides > header/band style > table defaults)
export const getCellStyle = (elem, r, c) => {
  const cell = getCell(elem, r, c);
  const style = { ...styleFields(getTableStyle(elem.styleKey)), ...(elem.style || {}) };
  const isHeader = !!elem.headerRow && r === 0;
  const bodyIndex = elem.headerRow ? r - 1 : r;
  const banded = !isHeader && !!elem.bandRows && bodyIndex % 2 === 1;
  return {
    fill: cell.fill || (isHeader ? style.headerFill : banded ? style.altRowFill : style.bodyFill),
    color: cell.color || (isHeader ? style.headerTextColor : style.bodyTextColor),
    fontSize: cell.fontSize || elem.fontSize || TABLE_DEFAULT_FONT_PT,
    bold: cell.bold !== undefined ? !!cell.bold : isHeader,
    italic: !!cell.italic,
    align: cell.align || (isHeader ? 'center' : 'right'),
    isHeader,
  };
};

export const getTableBorder = (elem) => {
  const style = { ...styleFields(getTableStyle(elem.styleKey)), ...(elem.style || {}) };
  return {
    color: style.borderColor || '#7f7f7f',
    width: style.borderWidth !== undefined ? Math.max(0, style.borderWidth) : 1,
  };
};

// Rough wrapped-text height (same character-width estimate idea as pptFit)
const estimateTextHeightPt = (text, fontPt, widthPt) => {
  const lineH = fontPt * LINE_HEIGHT;
  if (!text) return lineH;
  const charsPerLine = Math.max(1, Math.floor(widthPt / (fontPt * CHAR_WIDTH_EM)));
  const lines = String(text)
    .split('\n')
    .reduce((sum, p) => sum + Math.max(1, Math.ceil(p.length / charsPerLine)), 0);
  return lines * lineH;
};

/**
 * Column widths / row heights in slide points. Rows grow so wrapped text always fits, so the
 * table height follows its content (never smaller than the stored element height).
 */
export const layoutTable = (elem, slideWidthPt = 720, slideHeightPt = 405) => {
  const rows = Math.max(1, elem.rows || (elem.cells || []).length || 1);
  const cols = Math.max(1, elem.cols || ((elem.cells || [])[0] || []).length || 1);
  const tableW = ((elem.width || 50) / 100) * slideWidthPt;
  const tableH = ((elem.height || 20) / 100) * slideHeightPt;
  const colWidthsPt = normalizeFractions(elem.colWidths, cols).map((f) => f * tableW);
  const rowFractions = normalizeFractions(elem.rowHeights, rows);
  const rowHeightsPt = rowFractions.map((f, r) => {
    let need = 0;
    for (let c = 0; c < cols; c++) {
      const cs = getCellStyle(elem, r, c);
      const innerW = Math.max(4, colWidthsPt[c] - 2 * TABLE_CELL_PAD_PT);
      need = Math.max(need, estimateTextHeightPt(getCell(elem, r, c).text, cs.fontSize, innerW) + 2 * TABLE_CELL_PAD_PT);
    }
    return Math.max(f * tableH, need);
  });
  const totalHeightPt = rowHeightsPt.reduce((a, b) => a + b, 0);
  return {
    rows,
    cols,
    colWidthsPt,
    rowHeightsPt,
    totalWidthPt: tableW,
    totalHeightPt,
    heightPct: (totalHeightPt / slideHeightPt) * 100,
  };
};

// ---- Edit helpers (all return a NEW element) ----

const cloneCells = (elem) => (elem.cells || []).map((row) => row.map((cell) => ({ ...cell })));

export const insertRow = (elem, index) => {
  if (elem.rows >= TABLE_LIMITS.maxRows) return elem;
  const at = Math.max(0, Math.min(elem.rows, index));
  const cells = cloneCells(elem);
  cells.splice(at, 0, Array.from({ length: elem.cols }, () => ({ text: '' })));
  const fr = normalizeFractions(elem.rowHeights, elem.rows);
  fr.splice(at, 0, 1 / elem.rows);
  const rows = elem.rows + 1;
  return {
    ...elem,
    rows,
    cells,
    rowHeights: normalizeFractions(fr, rows),
    height: Math.min(100 - (elem.y || 0), (elem.height || 20) * (rows / elem.rows)),
  };
};

export const deleteRow = (elem, index) => {
  if (elem.rows <= TABLE_LIMITS.minRows) return elem;
  const cells = cloneCells(elem);
  cells.splice(index, 1);
  const fr = normalizeFractions(elem.rowHeights, elem.rows);
  fr.splice(index, 1);
  const rows = elem.rows - 1;
  return {
    ...elem,
    rows,
    cells,
    rowHeights: normalizeFractions(fr, rows),
    height: Math.max(4, (elem.height || 20) * (rows / elem.rows)),
  };
};

export const insertCol = (elem, index) => {
  if (elem.cols >= TABLE_LIMITS.maxCols) return elem;
  const at = Math.max(0, Math.min(elem.cols, index));
  const cells = cloneCells(elem).map((row) => {
    row.splice(at, 0, { text: '' });
    return row;
  });
  const fr = normalizeFractions(elem.colWidths, elem.cols);
  fr.splice(at, 0, 1 / elem.cols);
  const cols = elem.cols + 1;
  return { ...elem, cols, cells, colWidths: normalizeFractions(fr, cols) };
};

export const deleteCol = (elem, index) => {
  if (elem.cols <= TABLE_LIMITS.minCols) return elem;
  const cells = cloneCells(elem).map((row) => {
    row.splice(index, 1);
    return row;
  });
  const fr = normalizeFractions(elem.colWidths, elem.cols);
  fr.splice(index, 1);
  const cols = elem.cols - 1;
  return { ...elem, cols, cells, colWidths: normalizeFractions(fr, cols) };
};

export const equalizeColumns = (elem) => ({ ...elem, colWidths: evenFractions(elem.cols) });

// scope: 'cell' | 'row' | 'col'
export const getTargetCells = (elem, sel, scope = 'cell') => {
  if (!sel) return [];
  if (scope === 'row') return Array.from({ length: elem.cols }, (_, c) => ({ r: sel.r, c }));
  if (scope === 'col') return Array.from({ length: elem.rows }, (_, r) => ({ r, c: sel.c }));
  return [{ r: sel.r, c: sel.c }];
};

export const setCellProps = (elem, targets, patch) => {
  const cells = cloneCells(elem);
  for (const { r, c } of targets) {
    if (cells[r] && cells[r][c]) cells[r][c] = { ...cells[r][c], ...patch };
  }
  return { ...elem, cells };
};

export const setCellText = (elem, r, c, text) => setCellProps(elem, [{ r, c }], { text });

// A ready style replaces the colors (cell fill / text color overrides are cleared)
export const applyTableStyle = (elem, key) => {
  const cells = cloneCells(elem).map((row) =>
    row.map(({ fill: _f, color: _c, ...rest }) => rest)
  );
  return { ...elem, styleKey: key, style: styleFields(getTableStyle(key)), cells };
};

export const setTableBorder = (elem, patch) => ({
  ...elem,
  style: { ...styleFields(getTableStyle(elem.styleKey)), ...(elem.style || {}), ...patch },
});
