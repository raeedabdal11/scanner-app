// Real table element (type: 'table'): data model, style gallery, merges, layout, borders and edit
// helpers. Pure JS (no React): the canvas, the PDF renderer and the PPTX exporter share it.
//
// Element:
//   { id, type: 'table', x, y, width, height, zIndex, rotation: 0, locked, lockAspect,
//     rows, cols, colWidths[] (fractions), rowHeights[] (fractions),
//     cells[r][c] = { text, gridSpan?, rowSpan?, fill?, fill2?, fillAlpha?, color?, fontSize?, bold?,
//                     italic?, align?, valign?, dir?, pad?, borders?: { top, bottom, left, right } },
//     styleKey, style: {...resolved style colors...},
//     headerRow, totalRow, firstCol, lastCol, bandRows, bandCols,
//     shadow: { offset, blur, opacity, color } | null, bgFill, fontSize, kurdishFont }
// x / y / width / height are slide percentages like every other element.
//
// RTL rule everywhere: logical column 0 is drawn on the RIGHT. Layout returns PHYSICAL cell
// rectangles, and borders are PHYSICAL (top / bottom / left / right), so the canvas (SVG),
// the PDF (HTML) and the PPTX (<a:tbl> written in physical column order) look the same.
// Merges: the top-right (logical top-left) cell is the anchor holding gridSpan / rowSpan; the
// covered cells are derived from the anchors (getMergeMap).

import { makeId } from './makeId';

export const TABLE_LIMITS = { minRows: 1, minCols: 1, maxRows: 10, maxCols: 8 };
export const TABLE_DEFAULT_FONT_PT = 14;
export const TABLE_CELL_PAD_PT = 4;
const LINE_HEIGHT = 1.25;
const CHAR_WIDTH_EM = 0.55;

// ---------------------------------------------------------------- colors

export const DEFAULT_ACCENTS = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];

const isHex6 = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const mixHex = (hex, target, t) => {
  const a = hex.replace('#', '');
  const b = target.replace('#', '');
  let out = '#';
  for (let i = 0; i < 6; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
};
const tint = (hex, t) => mixHex(hex, '#ffffff', t);
const shade = (hex, t) => mixHex(hex, '#000000', t);

// The design-tab theme's accents first, then the default Office accents
export const getThemeAccents = (theme) => {
  if (!theme) return DEFAULT_ACCENTS;
  const list = [];
  [theme.accent, theme.accent2, ...DEFAULT_ACCENTS].forEach((c) => {
    if (isHex6(c) && !list.includes(c.toLowerCase())) list.push(c.toLowerCase());
  });
  return list.slice(0, 6);
};

// ---------------------------------------------------------------- style gallery

const KURDISH_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const toKurdishDigits = (n) => String(n).replace(/\d/g, (d) => KURDISH_DIGITS[Number(d)]);

// Every style field (null fill = transparent). borderMode: all | none | horizontal | outer | headerOnly
export const BASE_TABLE_STYLE = {
  headerFill: null,
  headerFill2: null,
  headerText: '#1c1c1e',
  bodyFill: null,
  bodyText: '#1c1c1e',
  bandRowFill: null,
  bandColFill: null,
  firstColFill: null,
  firstColText: null,
  lastColFill: null,
  lastColText: null,
  totalFill: null,
  totalText: null,
  totalTopLine: true,
  borderColor: '#7f7f7f',
  borderWidth: 1,
  borderMode: 'all',
  cornerRadius: 0,
  shadow: false,
};

export const TABLE_STYLE_GROUPS = [
  { key: 'none', label: 'بێ ستایل' },
  { key: 'light', label: 'ڕووناک' },
  { key: 'medium', label: 'ناوەند' },
  { key: 'dark', label: 'تۆخ' },
  { key: 'modern', label: 'مۆدێرن' },
];

/** All gallery styles for a set of 6 accent colors (37 styles). */
export const buildTableStyles = (accents = DEFAULT_ACCENTS) => {
  const A = accents.length >= 6 ? accents : DEFAULT_ACCENTS;
  const styles = [
    { key: 'none_grid', group: 'none', label: 'تۆڕ', borderMode: 'all', borderColor: '#000000' },
    { key: 'none_plain', group: 'none', label: 'بێ هێڵ', borderMode: 'none' },
  ];
  A.forEach((a, i) => {
    const n = toKurdishDigits(i + 1);
    styles.push(
      {
        key: `light1_${i}`, group: 'light', label: `ڕووناک ${n}`,
        headerText: a, bandRowFill: tint(a, 0.85), bandColFill: tint(a, 0.85),
        firstColText: a, lastColText: a, totalText: a,
        borderMode: 'horizontal', borderColor: a,
      },
      {
        key: `light2_${i}`, group: 'light', label: `ڕووناکی تۆڕ ${n}`,
        headerText: a, bodyFill: '#ffffff', bandRowFill: tint(a, 0.9), bandColFill: tint(a, 0.9),
        firstColText: a, totalText: a,
        borderMode: 'all', borderColor: a,
      },
      {
        key: `medium1_${i}`, group: 'medium', label: `ناوەند ${n}`,
        headerFill: a, headerText: '#ffffff', bodyFill: tint(a, 0.8), bandRowFill: tint(a, 0.6),
        bandColFill: tint(a, 0.6), firstColFill: a, firstColText: '#ffffff', lastColFill: a,
        lastColText: '#ffffff', totalFill: a, totalText: '#ffffff',
        borderMode: 'all', borderColor: '#ffffff',
      },
      {
        key: `medium2_${i}`, group: 'medium', label: `ناوەندی هێڵدار ${n}`,
        headerFill: a, headerText: '#ffffff', bodyFill: '#ffffff', bandRowFill: tint(a, 0.8),
        bandColFill: tint(a, 0.8), firstColText: shade(a, 0.3), totalText: shade(a, 0.3),
        borderMode: 'horizontal', borderColor: tint(a, 0.4),
      },
      {
        key: `dark_${i}`, group: 'dark', label: `تۆخ ${n}`,
        headerFill: shade(a, 0.55), headerText: '#ffffff', bodyFill: a, bodyText: '#ffffff',
        bandRowFill: shade(a, 0.25), bandColFill: shade(a, 0.25), firstColFill: shade(a, 0.55),
        firstColText: '#ffffff', lastColFill: shade(a, 0.55), lastColText: '#ffffff',
        totalFill: shade(a, 0.55), totalText: '#ffffff',
        borderMode: 'all', borderColor: '#ffffff',
      }
    );
  });
  const a0 = A[0];
  styles.push(
    {
      key: 'modern_minimal', group: 'modern', label: 'هێڵی کەم',
      headerText: '#1c1c1e', borderMode: 'headerOnly', borderColor: '#404040', borderWidth: 1.5,
    },
    {
      key: 'modern_zebra', group: 'modern', label: 'زێبرا',
      headerFill: '#404040', headerText: '#ffffff', bodyFill: '#ffffff', bandRowFill: '#f2f2f2',
      bandColFill: '#f2f2f2', borderMode: 'none',
    },
    {
      key: 'modern_rounded', group: 'modern', label: 'سەردێڕی خڕ',
      headerFill: a0, headerText: '#ffffff', bodyFill: tint(a0, 0.9), bandRowFill: tint(a0, 0.75),
      bandColFill: tint(a0, 0.75), borderMode: 'horizontal', borderColor: '#ffffff', cornerRadius: 8,
    },
    {
      key: 'modern_gradient', group: 'modern', label: 'سەردێڕی پلەبەندی',
      headerFill: a0, headerFill2: shade(a0, 0.45), headerText: '#ffffff', bodyFill: '#ffffff',
      bandRowFill: tint(a0, 0.88), bandColFill: tint(a0, 0.88), borderMode: 'all', borderColor: tint(a0, 0.6),
    },
    {
      key: 'modern_card', group: 'modern', label: 'کارتی سێبەردار',
      headerFill: '#ffffff', headerText: a0, bodyFill: '#ffffff', bandRowFill: '#f7f7f7',
      bandColFill: '#f7f7f7', borderMode: 'outer', borderColor: '#d9d9d9', cornerRadius: 6, shadow: true,
    }
  );
  return styles.map((st) => ({ ...BASE_TABLE_STYLE, ...st }));
};

const styleFields = (st) => {
  const out = {};
  Object.keys(BASE_TABLE_STYLE).forEach((k) => { out[k] = st[k] === undefined ? BASE_TABLE_STYLE[k] : st[k]; });
  return out;
};

export const getTableStyleByKey = (key, accents = DEFAULT_ACCENTS) =>
  buildTableStyles(accents).find((s) => s.key === key) || null;

// Old saved tables (first table version) used other field names: map them, never lose colors.
const LEGACY_STYLES = {
  primary: { headerFill: '#4472c4', headerTextColor: '#ffffff', bodyFill: '#dae3f3', altRowFill: '#b4c7e7', bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1 },
  banded: { headerFill: '#ed7d31', headerTextColor: '#ffffff', bodyFill: '#fbe5d6', altRowFill: '#f8cbad', bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1 },
  lines: { headerFill: '#ffffff', headerTextColor: '#1c1c1e', bodyFill: '#ffffff', altRowFill: '#ffffff', bodyTextColor: '#1c1c1e', borderColor: '#7f7f7f', borderWidth: 1 },
  dark: { headerFill: '#000000', headerTextColor: '#ffffff', bodyFill: '#404040', altRowFill: '#262626', bodyTextColor: '#ffffff', borderColor: '#7f7f7f', borderWidth: 1 },
  colorful: { headerFill: '#70ad47', headerTextColor: '#ffffff', bodyFill: '#e2efd9', altRowFill: '#c5e0b3', bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1 },
  plain: { headerFill: '#f2f2f2', headerTextColor: '#1c1c1e', bodyFill: '#ffffff', altRowFill: '#f7f7f7', bodyTextColor: '#1c1c1e', borderColor: '#bfbfbf', borderWidth: 1 },
};

/** Effective style of a table (works for old and new saved data). */
export const resolveTableStyle = (elem) => {
  const raw = { ...(LEGACY_STYLES[elem.styleKey] || {}), ...(elem.style || {}) };
  const st = { ...BASE_TABLE_STYLE, ...raw };
  if (raw.headerText === undefined && raw.headerTextColor) st.headerText = raw.headerTextColor;
  if (raw.bodyText === undefined && raw.bodyTextColor) st.bodyText = raw.bodyTextColor;
  if (raw.bandRowFill === undefined && raw.altRowFill) st.bandRowFill = raw.altRowFill;
  if (raw.bandColFill === undefined && raw.altRowFill) st.bandColFill = raw.altRowFill;
  return st;
};

// ---------------------------------------------------------------- create

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));
const evenFractions = (n) => Array.from({ length: n }, () => 1 / n);
const normalizeFractions = (arr, n) => {
  const list = Array.from({ length: n }, (_, i) => (arr && arr[i] > 0 ? arr[i] : 1 / n));
  const sum = list.reduce((a, b) => a + b, 0) || 1;
  return list.map((v) => v / sum);
};

export const createTableElement = ({ rows = 3, cols = 3, x, y, width = 80, height, zIndex = 1, accents } = {}) => {
  const r = clampInt(rows, TABLE_LIMITS.minRows, TABLE_LIMITS.maxRows);
  const c = clampInt(cols, TABLE_LIMITS.minCols, TABLE_LIMITS.maxCols);
  const h = height || Math.min(80, 10 * r);
  const st = getTableStyleByKey('medium1_0', accents || DEFAULT_ACCENTS);
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
    lockAspect: false,
    opacity: 1,
    rows: r,
    cols: c,
    colWidths: evenFractions(c),
    rowHeights: evenFractions(r),
    cells: Array.from({ length: r }, (_, ri) =>
      Array.from({ length: c }, (_, ci) => ({ text: ri === 0 ? `سەردێڕ ${toKurdishDigits(ci + 1)}` : '' }))
    ),
    headerRow: true,
    totalRow: false,
    firstCol: false,
    lastCol: false,
    bandRows: true,
    bandCols: false,
    styleKey: st.key,
    style: styleFields(st),
    shadow: null,
    bgFill: null,
    fontSize: TABLE_DEFAULT_FONT_PT,
    kurdishFont: 'Tahoma',
  };
};

export const getCell = (elem, r, c) => (elem.cells && elem.cells[r] && elem.cells[r][c]) || { text: '' };

// ---------------------------------------------------------------- merges

/** owner[r][c] = { r, c } of the anchor covering that cell; anchors = [{ r, c, rs, cs }] */
export const getMergeMap = (elem) => {
  const rows = Math.max(1, elem.rows || 1);
  const cols = Math.max(1, elem.cols || 1);
  const owner = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
  const anchors = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (owner[r][c]) continue;
      const cell = getCell(elem, r, c);
      let rs = clampInt(cell.rowSpan || 1, 1, rows - r);
      let cs = clampInt(cell.gridSpan || 1, 1, cols - c);
      // Clip spans that would overlap an already covered cell (broken data never crashes)
      for (let i = 1; i < cs; i++) if (owner[r][c + i]) { cs = i; break; }
      outer: for (let j = 1; j < rs; j++) {
        for (let i = 0; i < cs; i++) if (owner[r + j][c + i]) { rs = j; break outer; }
      }
      for (let j = 0; j < rs; j++) for (let i = 0; i < cs; i++) owner[r + j][c + i] = { r, c };
      anchors.push({ r, c, rs, cs });
    }
  }
  return { owner, anchors };
};

export const getAnchorOf = (elem, r, c) => {
  const { owner } = getMergeMap(elem);
  return (owner[r] && owner[r][c]) || { r, c };
};

// ---------------------------------------------------------------- cell style

/** Effective look of one (anchor) cell: style regions (PowerPoint order) + cell overrides. */
export const getCellStyle = (elem, r, c) => {
  const cell = getCell(elem, r, c);
  const st = resolveTableStyle(elem);
  const rows = elem.rows || 1;
  const cols = elem.cols || 1;
  const isHeader = !!elem.headerRow && r === 0;
  const isTotal = !!elem.totalRow && r === rows - 1 && !isHeader;
  const isFirstCol = !!elem.firstCol && c === 0;
  const isLastCol = !!elem.lastCol && c === cols - 1 && !isFirstCol;
  const bodyRow = elem.headerRow ? r - 1 : r;
  const bodyCol = elem.firstCol ? c - 1 : c;

  let fill = st.bodyFill;
  let fill2 = null;
  let color = st.bodyText;
  let bold = false;
  if (!isHeader && !isTotal && elem.bandCols && bodyCol >= 0 && bodyCol % 2 === 1 && st.bandColFill) fill = st.bandColFill;
  if (!isHeader && !isTotal && elem.bandRows && bodyRow >= 0 && bodyRow % 2 === 1 && st.bandRowFill) fill = st.bandRowFill;
  if (isFirstCol) {
    if (st.firstColFill) fill = st.firstColFill;
    if (st.firstColText) color = st.firstColText;
    bold = true;
  }
  if (isLastCol) {
    if (st.lastColFill) fill = st.lastColFill;
    if (st.lastColText) color = st.lastColText;
    bold = true;
  }
  if (isTotal) {
    if (st.totalFill) fill = st.totalFill;
    if (st.totalText) color = st.totalText;
    bold = true;
  }
  if (isHeader) {
    fill = st.headerFill;
    fill2 = st.headerFill2;
    color = st.headerText;
    bold = true;
  }

  if (cell.fill !== undefined && cell.fill !== null) {
    fill = cell.fill === 'none' ? null : cell.fill;
    fill2 = cell.fill2 || null;
  }
  return {
    fill: fill || null,
    fill2: fill ? fill2 || null : null,
    fillAlpha: cell.fillAlpha !== undefined ? Math.max(0, Math.min(100, cell.fillAlpha)) : 100,
    color: cell.color || color || '#1c1c1e',
    fontSize: cell.fontSize || elem.fontSize || TABLE_DEFAULT_FONT_PT,
    bold: cell.bold !== undefined ? !!cell.bold : bold,
    italic: !!cell.italic,
    align: cell.align || (isHeader ? 'center' : 'right'),
    valign: cell.valign || 'middle',
    dir: cell.dir || 'rtl',
    pad: cell.pad !== undefined ? Math.max(0, cell.pad) : TABLE_CELL_PAD_PT,
    isHeader,
    isTotal,
  };
};

// ---------------------------------------------------------------- layout

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
 * Sizes in slide points. Rows grow so wrapped text always fits (table height follows content).
 * cells[] = anchor cells with PHYSICAL rectangles (x from the table's left edge).
 */
export const layoutTable = (elem, slideWidthPt = 720, slideHeightPt = 405) => {
  const rows = Math.max(1, elem.rows || (elem.cells || []).length || 1);
  const cols = Math.max(1, elem.cols || ((elem.cells || [])[0] || []).length || 1);
  const tableW = ((elem.width || 50) / 100) * slideWidthPt;
  const tableH = ((elem.height || 20) / 100) * slideHeightPt;
  const colWidthsPt = normalizeFractions(elem.colWidths, cols).map((f) => f * tableW);
  const baseRows = normalizeFractions(elem.rowHeights, rows).map((f) => f * tableH);
  const { owner, anchors } = getMergeMap({ ...elem, rows, cols });

  const spanW = (a) => {
    let w = 0;
    for (let i = 0; i < a.cs; i++) w += colWidthsPt[a.c + i];
    return w;
  };
  const needOf = (a) => {
    const cs = getCellStyle(elem, a.r, a.c);
    const innerW = Math.max(4, spanW(a) - 2 * cs.pad);
    return estimateTextHeightPt(getCell(elem, a.r, a.c).text, cs.fontSize, innerW) + 2 * cs.pad;
  };

  const rowHeightsPt = baseRows.slice();
  anchors.filter((a) => a.rs === 1).forEach((a) => {
    rowHeightsPt[a.r] = Math.max(rowHeightsPt[a.r], needOf(a));
  });
  anchors.filter((a) => a.rs > 1).forEach((a) => {
    let have = 0;
    for (let j = 0; j < a.rs; j++) have += rowHeightsPt[a.r + j];
    const need = needOf(a);
    if (need > have) rowHeightsPt[a.r + a.rs - 1] += need - have;
  });

  // Logical column start measured from the RIGHT edge
  const colStart = [];
  let acc = 0;
  for (let c = 0; c < cols; c++) {
    colStart.push(acc);
    acc += colWidthsPt[c];
  }
  const rowY = [];
  let accY = 0;
  for (let r = 0; r < rows; r++) {
    rowY.push(accY);
    accY += rowHeightsPt[r];
  }

  const cells = anchors.map((a) => {
    const w = spanW(a);
    let h = 0;
    for (let j = 0; j < a.rs; j++) h += rowHeightsPt[a.r + j];
    return {
      ...a,
      x: tableW - (colStart[a.c] + w),
      y: rowY[a.r],
      w,
      h,
      physCol: cols - a.c - a.cs, // first physical (left-to-right) grid column
    };
  });

  return {
    rows,
    cols,
    colWidthsPt,
    rowHeightsPt,
    totalWidthPt: tableW,
    totalHeightPt: accY,
    heightPct: (accY / slideHeightPt) * 100,
    cells,
    owner,
  };
};

// ---------------------------------------------------------------- borders

const SIDES = ['top', 'bottom', 'left', 'right'];

/** Physical borders of one anchor cell: { top, bottom, left, right } = { color, width, dash } | null */
export const getCellBorders = (elem, a) => {
  const st = resolveTableStyle(elem);
  const rows = elem.rows || 1;
  const pen = { color: st.borderColor || '#7f7f7f', width: st.borderWidth !== undefined ? st.borderWidth : 1, dash: 'solid' };
  const atTop = a.r === 0;
  const atBottom = a.r + a.rs >= rows;
  const atLeft = a.physCol === 0;
  const atRight = a.c === 0;
  const out = { top: null, bottom: null, left: null, right: null };
  const mode = st.borderMode || 'all';
  if (mode === 'all') SIDES.forEach((s) => { out[s] = pen; });
  if (mode === 'horizontal') { out.top = pen; out.bottom = pen; }
  if (mode === 'outer') {
    if (atTop) out.top = pen;
    if (atBottom) out.bottom = pen;
    if (atLeft) out.left = pen;
    if (atRight) out.right = pen;
  }
  if (mode === 'headerOnly') {
    if (elem.headerRow && a.r === 0) out.bottom = pen;
    if (atBottom) out.bottom = pen;
  }
  if (elem.totalRow && atBottom && a.rs === 1 && st.totalTopLine && mode !== 'none' && !(elem.headerRow && a.r === 0)) {
    out.top = { ...pen, width: Math.max(1.5, pen.width * 2) };
  }
  const own = getCell(elem, a.r, a.c).borders || {};
  SIDES.forEach((s) => {
    const b = own[s];
    if (b) out[s] = b.width > 0 ? { color: b.color || pen.color, width: b.width, dash: b.dash || 'solid' } : null;
  });
  return out;
};

// ---------------------------------------------------------------- selection / targets

/** Normalized logical rectangle { r1, c1, r2, c2 } for a selection and a scope. */
export const getTargetRect = (elem, sel, scope = 'cell') => {
  const rows = elem.rows || 1;
  const cols = elem.cols || 1;
  if (scope === 'table' || !sel) return { r1: 0, c1: 0, r2: rows - 1, c2: cols - 1 };
  const r1 = Math.min(sel.r, sel.r2 !== undefined ? sel.r2 : sel.r);
  const r2 = Math.max(sel.r, sel.r2 !== undefined ? sel.r2 : sel.r);
  const c1 = Math.min(sel.c, sel.c2 !== undefined ? sel.c2 : sel.c);
  const c2 = Math.max(sel.c, sel.c2 !== undefined ? sel.c2 : sel.c);
  if (scope === 'row') return { r1, c1: 0, r2, c2: cols - 1 };
  if (scope === 'col') return { r1: 0, c1, r2: rows - 1, c2 };
  return { r1, c1, r2, c2 };
};

const anchorsInRect = (elem, rect) => {
  const { owner } = getMergeMap(elem);
  const seen = new Set();
  const list = [];
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      const o = (owner[r] && owner[r][c]) || { r, c };
      const k = `${o.r}_${o.c}`;
      if (!seen.has(k)) {
        seen.add(k);
        list.push(o);
      }
    }
  }
  return list;
};

// ---------------------------------------------------------------- edit helpers (return NEW element)

const cloneCells = (elem) => (elem.cells || []).map((row) => row.map((cell) => ({ ...cell })));

export const setCellsProps = (elem, rect, patch) => {
  const cells = cloneCells(elem);
  anchorsInRect(elem, rect).forEach(({ r, c }) => {
    if (cells[r] && cells[r][c]) cells[r][c] = { ...cells[r][c], ...patch };
  });
  return { ...elem, cells };
};

export const setCellText = (elem, r, c, text) => {
  const a = getAnchorOf(elem, r, c);
  const cells = cloneCells(elem);
  if (cells[a.r] && cells[a.r][a.c]) cells[a.r][a.c] = { ...cells[a.r][a.c], text };
  return { ...elem, cells };
};

/** Merge every cell in the rectangle (grown to include any merge it touches). */
export const mergeCells = (elem, rect) => {
  const { anchors } = getMergeMap(elem);
  let { r1, c1, r2, c2 } = rect;
  let grew = true;
  while (grew) {
    grew = false;
    anchors.forEach((a) => {
      const ar2 = a.r + a.rs - 1;
      const ac2 = a.c + a.cs - 1;
      const hit = a.r <= r2 && ar2 >= r1 && a.c <= c2 && ac2 >= c1;
      if (hit && (a.r < r1 || ar2 > r2 || a.c < c1 || ac2 > c2)) {
        r1 = Math.min(r1, a.r); r2 = Math.max(r2, ar2);
        c1 = Math.min(c1, a.c); c2 = Math.max(c2, ac2);
        grew = true;
      }
    });
  }
  if (r1 === r2 && c1 === c2) return elem;
  const cells = cloneCells(elem);
  const texts = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const t = (cells[r][c].text || '').trim();
      if (t) texts.push(t);
      if (r !== r1 || c !== c1) {
        const { gridSpan: _g, rowSpan: _r, ...rest } = cells[r][c];
        cells[r][c] = { ...rest, text: '' };
      }
    }
  }
  cells[r1][c1] = { ...cells[r1][c1], text: texts.join('\n'), gridSpan: c2 - c1 + 1, rowSpan: r2 - r1 + 1 };
  return { ...elem, cells };
};

/** Split the merged cell that covers (r, c) back into single cells. */
export const splitCell = (elem, r, c) => {
  const a = getAnchorOf(elem, r, c);
  const cell = getCell(elem, a.r, a.c);
  if ((cell.gridSpan || 1) === 1 && (cell.rowSpan || 1) === 1) return elem;
  const cells = cloneCells(elem);
  const { gridSpan: _g, rowSpan: _r, ...rest } = cells[a.r][a.c];
  cells[a.r][a.c] = rest;
  return { ...elem, cells };
};

export const isMergedAt = (elem, r, c) => {
  const a = getAnchorOf(elem, r, c);
  const cell = getCell(elem, a.r, a.c);
  return (cell.gridSpan || 1) > 1 || (cell.rowSpan || 1) > 1;
};

export const insertRow = (elem, index) => {
  if (elem.rows >= TABLE_LIMITS.maxRows) return elem;
  const at = Math.max(0, Math.min(elem.rows, index));
  const { anchors } = getMergeMap(elem);
  const cells = cloneCells(elem);
  // A merge that crosses the new row grows over it
  anchors.forEach((a) => {
    if (a.r < at && a.r + a.rs - 1 >= at) cells[a.r][a.c] = { ...cells[a.r][a.c], rowSpan: a.rs + 1 };
  });
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
  const { anchors } = getMergeMap(elem);
  const cells = cloneCells(elem);
  anchors.forEach((a) => {
    if (a.r < index && a.r + a.rs - 1 >= index) cells[a.r][a.c] = { ...cells[a.r][a.c], rowSpan: a.rs - 1 };
    if (a.r === index && a.rs > 1) {
      // The anchor moves down one row with the rest of its merge
      cells[index + 1][a.c] = { ...cells[index][a.c], rowSpan: a.rs - 1 };
    }
  });
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
  const { anchors } = getMergeMap(elem);
  const cells = cloneCells(elem);
  anchors.forEach((a) => {
    if (a.c < at && a.c + a.cs - 1 >= at) cells[a.r][a.c] = { ...cells[a.r][a.c], gridSpan: a.cs + 1 };
  });
  cells.forEach((row) => row.splice(at, 0, { text: '' }));
  const fr = normalizeFractions(elem.colWidths, elem.cols);
  fr.splice(at, 0, 1 / elem.cols);
  const cols = elem.cols + 1;
  return { ...elem, cols, cells, colWidths: normalizeFractions(fr, cols) };
};

export const deleteCol = (elem, index) => {
  if (elem.cols <= TABLE_LIMITS.minCols) return elem;
  const { anchors } = getMergeMap(elem);
  const cells = cloneCells(elem);
  anchors.forEach((a) => {
    if (a.c < index && a.c + a.cs - 1 >= index) cells[a.r][a.c] = { ...cells[a.r][a.c], gridSpan: a.cs - 1 };
    if (a.c === index && a.cs > 1) cells[a.r][index + 1] = { ...cells[a.r][index], gridSpan: a.cs - 1 };
  });
  cells.forEach((row) => row.splice(index, 1));
  const fr = normalizeFractions(elem.colWidths, elem.cols);
  fr.splice(index, 1);
  const cols = elem.cols - 1;
  return { ...elem, cols, cells, colWidths: normalizeFractions(fr, cols) };
};

// ---------------------------------------------------------------- styles / options

const STYLE_CELL_KEYS = ['fill', 'fill2', 'fillAlpha', 'color', 'borders'];
const FORMAT_CELL_KEYS = [...STYLE_CELL_KEYS, 'fontSize', 'bold', 'italic', 'align', 'valign', 'dir', 'pad'];

const stripCellKeys = (elem, keys) =>
  cloneCells(elem).map((row) =>
    row.map((cell) => {
      const next = { ...cell };
      keys.forEach((k) => { delete next[k]; });
      return next;
    })
  );

/** A gallery style replaces the colors and borders (cell color / border overrides are cleared). */
export const applyTableStyle = (elem, style) => ({
  ...elem,
  styleKey: style.key,
  style: styleFields(style),
  shadow: style.shadow ? (elem.shadow || { offset: 3, blur: 6, opacity: 0.35, color: '#000000' }) : elem.shadow,
  cells: stripCellKeys(elem, STYLE_CELL_KEYS),
});

export const setTableOption = (elem, key, value) => ({ ...elem, [key]: !!value });

/** "Clear table formatting": plain grid, no cell formatting, no shadow / background (text and merges kept). */
export const clearTableFormatting = (elem) => {
  const plain = buildTableStyles(DEFAULT_ACCENTS).find((s) => s.key === 'none_grid');
  return {
    ...elem,
    styleKey: plain.key,
    style: styleFields(plain),
    shadow: null,
    bgFill: null,
    cells: stripCellKeys(elem, FORMAT_CELL_KEYS),
  };
};

// ---------------------------------------------------------------- borders tool

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * Border presets on a logical rectangle: all | outside | inside | none | top | bottom | left | right.
 * pen = { color, width, dash }. Neighbour cells sharing an edge get the same edge so the line looks
 * the same from both sides.
 */
export const applyBorderPreset = (elem, rect, preset, pen) => {
  const { owner } = getMergeMap(elem);
  const cells = cloneCells(elem);
  const rows = elem.rows;
  const cols = elem.cols;
  const value = preset === 'none' ? { width: 0 } : { color: pen.color, width: pen.width, dash: pen.dash || 'solid' };
  const setSide = (r, c, side, v) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    const o = owner[r][c] || { r, c };
    const cell = cells[o.r][o.c];
    cells[o.r][o.c] = { ...cell, borders: { ...(cell.borders || {}), [side]: v } };
  };
  // Physical sides: "left" is the logical next column (c + 1), "right" the previous (c - 1)
  const neighbour = (r, c, side) => {
    if (side === 'top') return [r - 1, c];
    if (side === 'bottom') return [r + 1, c];
    if (side === 'left') return [r, c + 1];
    return [r, c - 1];
  };
  const edge = (r, c, side) => {
    setSide(r, c, side, value);
    const [nr, nc] = neighbour(r, c, side);
    setSide(nr, nc, OPPOSITE[side], value);
  };
  for (let r = rect.r1; r <= rect.r2; r++) {
    for (let c = rect.c1; c <= rect.c2; c++) {
      const onTop = r === rect.r1;
      const onBottom = r === rect.r2;
      const onRight = c === rect.c1; // logical first column = physical right
      const onLeft = c === rect.c2;
      const want = {
        top: preset === 'all' || preset === 'none' || (preset === 'outside' && onTop) || (preset === 'inside' && !onTop) || (preset === 'top' && onTop),
        bottom: preset === 'all' || preset === 'none' || (preset === 'outside' && onBottom) || (preset === 'inside' && !onBottom) || (preset === 'bottom' && onBottom),
        left: preset === 'all' || preset === 'none' || (preset === 'outside' && onLeft) || (preset === 'inside' && !onLeft) || (preset === 'left' && onLeft),
        right: preset === 'all' || preset === 'none' || (preset === 'outside' && onRight) || (preset === 'inside' && !onRight) || (preset === 'right' && onRight),
      };
      SIDES.forEach((s) => { if (want[s]) edge(r, c, s); });
    }
  }
  return { ...elem, cells };
};

// ---------------------------------------------------------------- size tools

const capPct = (v, start) => Math.max(2, Math.min(100 - (start || 0), v));

export const getRowHeightPt = (elem, r, slideHeightPt = 405) =>
  layoutTable(elem, 720, slideHeightPt).rowHeightsPt[r] || 0;
export const getColWidthPt = (elem, c) => layoutTable(elem).colWidthsPt[c] || 0;

export const setRowHeightPt = (elem, r, pt, slideHeightPt = 405) => {
  const lay = layoutTable(elem, 720, slideHeightPt);
  const pts = lay.rowHeightsPt.slice();
  pts[r] = Math.max(6, pt);
  const total = pts.reduce((a, b) => a + b, 0);
  return { ...elem, rowHeights: pts.map((p) => p / total), height: capPct((total / slideHeightPt) * 100, elem.y) };
};

export const setColWidthPt = (elem, c, pt) => {
  const lay = layoutTable(elem);
  const pts = lay.colWidthsPt.slice();
  pts[c] = Math.max(10, pt);
  const total = pts.reduce((a, b) => a + b, 0);
  return { ...elem, colWidths: pts.map((p) => p / total), width: capPct((total / 720) * 100, elem.x) };
};

export const distributeRows = (elem) => ({ ...elem, rowHeights: evenFractions(elem.rows) });
export const equalizeColumns = (elem) => ({ ...elem, colWidths: evenFractions(elem.cols) });

/** Rows shrink / grow to exactly fit their text. */
export const autoFitRows = (elem, slideHeightPt = 405) => {
  const lay = layoutTable({ ...elem, height: 0.01, rowHeights: evenFractions(elem.rows) }, 720, slideHeightPt);
  const total = lay.totalHeightPt;
  return {
    ...elem,
    rowHeights: lay.rowHeightsPt.map((p) => p / total),
    height: capPct((total / slideHeightPt) * 100, elem.y),
  };
};
