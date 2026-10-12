// SmartArt-like "نەخشەی زانیاری" engine.
//
// A SmartArt element stores only data:
//   { id, type: 'smartart', layoutId, items: [{ id, text, level }], colorScheme, style, accents[6],
//     kurdishFont, fontSize (max pt, text auto-fits below it), bold, textColor (null = automatic),
//     x, y, width, height, zIndex, locked, rotation: 0 }
// buildSmartArtNodes() turns it into plain geometry: shapes from the normal shape catalog
// (valid prstGeom names), with text, in POINTS inside the element box. The canvas, the PDF and the
// PPTX exporter (a <p:grpSp> of ordinary shapes) all draw these same nodes.
//
// RTL rule: horizontal flows run RIGHT to LEFT (item 0 on the right, arrows point left; chevrons /
// pentagon arrows are mirrored with flipH so their text stays readable); vertical lists put the
// main shape on the right and align text to the right.

import { makeId } from '../makeId';
import { LIST_LAYOUTS } from './listLayouts';
import { PROCESS_LAYOUTS } from './processLayouts';
import { CYCLE_LAYOUTS } from './cycleLayouts';
import { HIERARCHY_LAYOUTS } from './hierarchyLayouts';
import { RELATIONSHIP_LAYOUTS } from './relationshipLayouts';
import { MATRIX_LAYOUTS } from './matrixLayouts';
import { PYRAMID_LAYOUTS } from './pyramidLayouts';
import { PICTURE_LAYOUTS } from './pictureLayouts';

// ---------------------------------------------------------------- catalog

export const SMARTART_CATEGORIES = [
  { key: 'all', label: 'هەموو', ready: true },
  { key: 'list', label: 'لیست', ready: true },
  { key: 'process', label: 'پڕۆسە', ready: true },
  { key: 'cycle', label: 'خولگە', ready: true },
  { key: 'hierarchy', label: 'پلەبەندی', ready: true },
  { key: 'relationship', label: 'پەیوەندی', ready: true },
  { key: 'matrix', label: 'ماتریکس', ready: true },
  { key: 'pyramid', label: 'هەرەم', ready: true },
  { key: 'picture', label: 'وێنە', ready: true },
];

export const SMARTART_LAYOUTS = [
  ...LIST_LAYOUTS,
  ...PROCESS_LAYOUTS,
  ...CYCLE_LAYOUTS,
  ...HIERARCHY_LAYOUTS,
  ...RELATIONSHIP_LAYOUTS,
  ...MATRIX_LAYOUTS,
  ...PYRAMID_LAYOUTS,
  ...PICTURE_LAYOUTS,
];
const LAYOUT_MAP = SMARTART_LAYOUTS.reduce((m, l) => { m[l.id] = l; return m; }, {});
export const getSmartArtLayout = (id) => LAYOUT_MAP[id] || SMARTART_LAYOUTS[0];

export const SMARTART_MIN_ITEMS = 1;
export const SMARTART_MAX_ITEMS = 10;

// Sample data for the PICKER THUMBNAILS ONLY (never copied into a real element)
export const SAMPLE_ITEMS = [
  { text: 'یەکەم', level: 0 },
  { text: 'خاڵێک', level: 1 },
  { text: 'دووەم', level: 0 },
  { text: 'خاڵێک', level: 1 },
  { text: 'سێیەم', level: 0 },
  { text: 'خاڵێک', level: 1 },
];

// Every text the engine ever used as sample content (old saved SmartArt is cleaned on load)
export const SMARTART_SAMPLE_TEXTS = new Set([
  'یەکەم', 'خاڵێک', 'دووەم', 'سێیەم', 'ڕاید',
  'بەڕێوەبەر', 'بەشی یەک', 'ستاف', 'بەشی دوو', 'بەشی سێ',
]);

// Faint guide text for empty items (editing canvas only; never exported)
export const SMARTART_HINT = 'دەق بنووسە';
const HINT_MARK = '\u2063'; // invisible separator: "<mark><itemIndex><mark><hint>"

// Natural number of top-level items for a new graphic (default 3)
const DEFAULT_ITEM_COUNTS = {
  basicMatrix: 4, gridMatrix: 4, matrixCycle: 4, titledMatrix: 5, cycleMatrix: 5,
  balance: 2, counterbalanceArrows: 2, opposingArrows: 2, divergingArrows: 2, convergingArrows: 2,
};
export const defaultItemCount = (layoutId) => DEFAULT_ITEM_COUNTS[layoutId] || 3;

const emptyItem = () => ({ id: makeId('item'), text: '', level: 0, isPlaceholder: true });

/**
 * Old saved SmartArt: sample texts the user never edited become empty placeholders, and sample
 * sub-items (level >= 1) are removed. Items with the user's own text are untouched.
 * Returns the SAME array when nothing changes.
 */
export const migrateSmartArtItems = (items) => {
  if (!Array.isArray(items)) return [emptyItem(), emptyItem(), emptyItem()];
  let changed = false;
  const out = [];
  items.forEach((it) => {
    if (!it) { changed = true; return; }
    const sample = !it.edited && SMARTART_SAMPLE_TEXTS.has(String(it.text || '').trim());
    if (sample && (it.level || 0) > 0) { changed = true; return; }
    if (sample) {
      changed = true;
      out.push({ ...it, text: '', isPlaceholder: true });
      return;
    }
    const empty = !String(it.text || '').trim();
    if (empty && !it.isPlaceholder) {
      changed = true;
      out.push({ ...it, isPlaceholder: true });
      return;
    }
    out.push(it);
  });
  if (out.length === 0) {
    changed = true;
    out.push(emptyItem());
  }
  return changed ? out : items;
};

/** Applies migrateSmartArtItems to every SmartArt in a presentation (same object if unchanged). */
export const migratePresentationSmartArt = (presentation) => {
  if (!presentation || !Array.isArray(presentation.slides)) return presentation;
  let changed = false;
  const slides = presentation.slides.map((slide) => {
    if (!slide || !Array.isArray(slide.elements)) return slide;
    let slideChanged = false;
    const elements = slide.elements.map((el) => {
      if (!el || el.type !== 'smartart') return el;
      const items = migrateSmartArtItems(el.items);
      if (items === el.items) return el;
      slideChanged = true;
      return { ...el, items };
    });
    if (!slideChanged) return slide;
    changed = true;
    return { ...slide, elements };
  });
  return changed ? { ...presentation, slides } : presentation;
};

// ---------------------------------------------------------------- colors

export const DEFAULT_ACCENTS = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];

const hexOk = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
export const mixHex = (hex, target, t) => {
  const a = (hexOk(hex) ? hex : '#888888').replace('#', '');
  const b = target.replace('#', '');
  let out = '#';
  for (let i = 0; i < 6; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
};
export const tint = (hex, t) => mixHex(hex, '#ffffff', t);
export const shade = (hex, t) => mixHex(hex, '#000000', t);
const luminance = (hex) => {
  const h = (hexOk(hex) ? hex : '#888888').replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const readableText = (fill) => (luminance(fill) > 0.62 ? '#1c1c1e' : '#ffffff');

export const getThemeAccents = (theme) => {
  if (!theme) return DEFAULT_ACCENTS;
  const list = [];
  [theme.accent, theme.accent2, ...DEFAULT_ACCENTS].forEach((c) => {
    if (hexOk(c) && !list.includes(c.toLowerCase())) list.push(c.toLowerCase());
  });
  return list.slice(0, 6);
};

// Each scheme: main fill for item i of n (accents A)
const range = (from, to) => (i, n) => mixHex(from, to, n > 1 ? i / (n - 1) : 0);
export const COLOR_SCHEMES = [
  { key: 'colorful1', label: 'ڕەنگاوڕەنگ ١', group: 'colorful', fill: (A) => (i) => A[i % 6] },
  { key: 'colorful2', label: 'ڕەنگاوڕەنگ ٢', group: 'colorful', fill: (A) => (i) => A[(i + 1) % 6] },
  { key: 'colorful3', label: 'ڕەنگاوڕەنگ ٣', group: 'colorful', fill: (A) => (i) => [A[0], A[3], A[5], A[1], A[4]][i % 5] },
  { key: 'colorful4', label: 'ڕەنگاوڕەنگ ٤', group: 'colorful', fill: (A) => range(A[0], A[1]) },
  ...[0, 1, 2, 3, 4, 5].map((k) => ({
    key: `accent${k + 1}`, label: `ڕەنگی ${'١٢٣٤٥٦'[k]}`, group: 'accent', fill: (A) => () => A[k],
  })),
  ...[0, 1, 2, 3, 4, 5].map((k) => ({
    key: `accent${k + 1}_range`, label: `پلەبەندی ${'١٢٣٤٥٦'[k]}`, group: 'range',
    fill: (A) => range(shade(A[k], 0.3), tint(A[k], 0.45)),
  })),
  { key: 'dark', label: 'تۆخ', group: 'other', fill: () => (i) => ['#262626', '#404040', '#595959'][i % 3] },
  { key: 'mono', label: 'یەک ڕەنگ', group: 'other', fill: () => range('#404040', '#bfbfbf') },
  { key: 'theme', label: 'ڕەنگی تێم', group: 'other', fill: (A) => range(A[0], A[1]) },
];
const SCHEME_MAP = COLOR_SCHEMES.reduce((m, s) => { m[s.key] = s; return m; }, {});

export const SMARTART_STYLES = [
  { key: 'simple', label: 'سادە', line: 'light', shadow: false, gradient: null },
  { key: 'outline', label: 'هێڵکاری', line: 'accent', outlineOnly: true, shadow: false, gradient: null },
  { key: 'subtle', label: 'پلەبەندی نەرم', line: 'light', shadow: false, gradient: 'subtle' },
  { key: 'shadow', label: 'سێبەردار', line: 'light', shadow: true, gradient: null },
  { key: 'glossy', label: 'درەوشاوە', line: 'none', shadow: true, gradient: 'glossy' },
  { key: 'flat', label: 'تەخت', line: 'none', shadow: false, gradient: null },
  { key: 'bold', label: 'چوارچێوەی ئەستوور', line: 'dark', lineWidth: 3, shadow: false, gradient: null },
];
const STYLE_MAP = SMARTART_STYLES.reduce((m, s) => { m[s.key] = s; return m; }, {});

// ---------------------------------------------------------------- data helpers

/** Flat items -> groups: [{ text, children: [text] }] (level >= 1 = child of the last main item) */
/** Flat items -> tree by level: an item is the child of the previous item with a lower level. */
export const toTree = (items) => {
  const roots = [];
  const stack = [];
  (items || []).slice(0, 40).forEach((it) => {
    const level = Math.max(0, Math.min(4, (it && it.level) || 0));
    const node = { text: (it && it.text) || '', level, children: [] };
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  });
  if (roots.length === 0) roots.push({ text: '', level: 0, children: [] });
  return roots;
};

export const toGroups = (items) => {
  const groups = [];
  (items || []).forEach((it) => {
    const text = (it && it.text) || '';
    if ((it.level || 0) > 0 && groups.length > 0) groups[groups.length - 1].children.push(text);
    else groups.push({ text, children: [], image: (it && it.image && it.image.uri) ? it.image : null });
  });
  if (groups.length === 0) groups.push({ text: '', children: [] });
  return groups.slice(0, SMARTART_MAX_ITEMS);
};

export const createSmartArtElement = ({ layoutId, items, x, y, width = 80, height = 55, zIndex = 1, accents } = {}) => ({
  id: makeId('smartart'),
  type: 'smartart',
  layoutId: getSmartArtLayout(layoutId).id,
  items: items
    ? items.map((it) => ({ id: makeId('item'), text: it.text || '', level: it.level || 0, ...(it.text ? {} : { isPlaceholder: true }), ...(it.image ? { image: it.image } : {}) }))
    : Array.from({ length: defaultItemCount(layoutId) }, emptyItem),
  colorScheme: 'colorful1',
  style: 'simple',
  accents: (accents || DEFAULT_ACCENTS).slice(0, 6),
  kurdishFont: 'Tahoma',
  fontSize: 20,
  bold: false,
  textColor: null,
  x: x !== undefined ? x : (100 - width) / 2,
  y: y !== undefined ? y : Math.max(2, (100 - height) / 2),
  width,
  height,
  zIndex,
  rotation: 0,
  locked: false,
  opacity: 1,
});

// ---------------------------------------------------------------- text auto-fit

const CHAR_EM = 0.55;
const LINE_H = 1.2;
const linesFor = (text, fontPt, innerW) => {
  const perLine = Math.max(1, Math.floor(innerW / (fontPt * CHAR_EM)));
  return String(text || '')
    .split('\n')
    .reduce((s, p) => s + Math.max(1, Math.ceil(p.length / perLine)), 0);
};
export const fitFontSize = (text, w, h, maxPt, inset) => {
  const innerW = Math.max(4, w - 2 * inset);
  const innerH = Math.max(4, h - 2 * inset);
  let size = maxPt;
  while (size > 6) {
    // the longest single word must fit on one line too
    const longest = String(text || '').split(/\s+/).reduce((m, wd) => Math.max(m, wd.length), 0);
    if (linesFor(text, size, innerW) * size * LINE_H <= innerH && longest * size * CHAR_EM <= innerW * 1.15) break;
    size -= 0.5;
  }
  return Math.max(6, size);
};

// ---------------------------------------------------------------- build

/**
 * Nodes for drawing / export, in points inside a W x H box:
 * { shape, x, y, w, h, rotation, flipH, fill, fill2, gloss, line: { color, width } | null, shadow,
 *   text, textColor, fontSize, bold, align, valign, inset, cornerRadius }
 */
export const buildSmartArtNodes = (elem, W, H, opts = {}) => {
  const layout = getSmartArtLayout(elem.layoutId);
  // opts.hints (editing canvas only): empty items get a faint "دەق بنووسە" guide; everywhere else
  // (preview, slideshow, PDF, PPTX) an empty item simply has no text, its shape stays.
  const srcItems = (elem.items || []).map((it, i) =>
    opts.hints && it && !String(it.text || '').trim() ? { ...it, text: `${HINT_MARK}${i}${HINT_MARK}${SMARTART_HINT}` } : it
  );
  const groups = toGroups(srcItems);
  const tree = toTree(srcItems);
  const raw = layout.build(groups, W, H, { items: srcItems, tree }) || [];
  const A = (elem.accents && elem.accents.length >= 6 ? elem.accents : DEFAULT_ACCENTS);
  const scheme = SCHEME_MAP[elem.colorScheme] || SCHEME_MAP.colorful1;
  const st = STYLE_MAP[elem.style] || STYLE_MAP.simple;
  const fillOf = scheme.fill(A);
  const n = Math.max(groups.length, raw.reduce((m, nd) => Math.max(m, (nd.idx || 0) + 1), 0));
  const maxPt = elem.fontSize || 20;

  // A rotated shape never carries text (PowerPoint would rotate it): the text becomes a label on top
  const expanded = [];
  raw.forEach((nd) => {
    if (nd.rotation && nd.text && nd.role !== 'line') {
      expanded.push({ ...nd, text: '' });
      expanded.push({ ...nd, shape: 'rect', rotation: 0, flipH: false, role: nd.role === 'main' || nd.role === 'accent' ? 'label' : 'text' });
    } else {
      expanded.push(nd);
    }
  });

  const nodes = expanded.map((nd) => {
    const main = fillOf(nd.idx || 0, n);
    let fill = null;
    let textColor = '#1c1c1e';
    let alpha = 100;
    switch (nd.role) {
      case 'main':
        fill = main;
        textColor = readableText(main);
        break;
      case 'sub':
        fill = tint(main, 0.82);
        textColor = '#1c1c1e';
        break;
      case 'accent':
        fill = main;
        break;
      case 'connector':
        fill = tint(main, 0.45);
        break;
      case 'bg':
        fill = tint(A[0], 0.88);
        break;
      case 'label': // text only, drawn over a main-colored shape (e.g. a rotated chevron)
        fill = null;
        textColor = readableText(main);
        break;
      case 'picture': // image slot: the image (cover-cropped) or a light placeholder
        fill = nd.image ? null : tint(main, 0.72);
        break;
      case 'venn': // semi-transparent circle (Venn): overlaps mix
        fill = main;
        alpha = nd.alpha !== undefined ? nd.alpha : 55;
        textColor = '#1c1c1e';
        break;
      default: // 'text' (text only), 'ring' (outline only), 'line' (straight connector)
        fill = null;
    }
    let line = null;
    if (nd.role === 'ring') line = { color: main, width: nd.lineWidth || 2.5 };
    if (nd.role === 'line') line = { color: nd.lineColor || shade(fillOf(0, n), 0.15), width: nd.lineWidth || 1.5 };
    if ((fill || nd.role === 'picture') && nd.role !== 'connector' && nd.role !== 'bg' && nd.role !== 'venn') {
      if (st.line === 'light') line = { color: '#ffffff', width: 1 };
      if (st.line === 'accent') line = { color: main, width: 2 };
      if (st.line === 'dark') line = { color: shade(main, 0.45), width: st.lineWidth || 3 };
    }
    if (st.outlineOnly && (nd.role === 'main' || nd.role === 'accent')) {
      textColor = shade(main, 0.2);
      fill = '#ffffff';
    }
    if (nd.role === 'text') textColor = '#1c1c1e';
    if (st.outlineOnly && nd.role === 'label') textColor = shade(main, 0.2);
    if (elem.textColor) textColor = elem.textColor;
    const gradient = fill && (nd.role === 'main' || nd.role === 'accent') ? st.gradient : null;
    const isLine = nd.role === 'line';
    return {
      shape: isLine ? 'line' : nd.shape || 'rect',
      isLine,
      x: nd.x,
      y: nd.y,
      // Lines keep a zero width / height (horizontal / vertical); every other shape is at least 1pt
      w: isLine ? Math.max(0, nd.w) : Math.max(1, nd.w),
      h: isLine ? Math.max(0, nd.h) : Math.max(1, nd.h),
      rotation: nd.rotation || 0,
      flipH: !!nd.flipH,
      fill,
      alpha,
      fill2: gradient ? tint(fill, gradient === 'glossy' ? 0.55 : 0.3) : null,
      gloss: gradient,
      line,
      shadow: !!st.shadow && !!fill && alpha === 100 && nd.role !== 'connector' && nd.role !== 'bg',
      text: nd.text || '',
      textColor,
      bold: nd.bold !== undefined ? nd.bold : !!elem.bold,
      align: nd.align || (nd.role === 'text' || nd.role === 'sub' ? 'right' : 'center'),
      valign: nd.valign || 'middle',
      inset: nd.inset !== undefined ? nd.inset : Math.min(6, Math.max(2, Math.min(nd.w, nd.h) * 0.06)),
      cornerRadius: nd.cornerRadius !== undefined ? nd.cornerRadius : 12,
      image: nd.role === 'picture' ? nd.image || null : null,
      isPicture: nd.role === 'picture',
      textGroup: nd.textGroup || nd.role,
      maxPt: nd.role === 'main' || nd.role === 'accent' ? maxPt : maxPt * 0.8,
    };
  });

  if (opts.hints) {
    // Turn hint marks into faint guide text and remember which item each text shape edits
    const itemTexts = (elem.items || []).map((it) => String((it && it.text) || '').trim());
    nodes.forEach((nd) => {
      if (!nd.text) return;
      const lines = nd.text.split('\n');
      const hintIdx = [];
      const real = [];
      lines.forEach((ln) => {
        const bare = ln.replace(/^• /, '');
        if (bare.startsWith(HINT_MARK)) hintIdx.push(Number(bare.slice(1, bare.indexOf(HINT_MARK, 1))));
        else real.push(ln);
      });
      if (real.length === 0) {
        nd.text = SMARTART_HINT;
        nd.isHint = true;
        nd.itemIndex = hintIdx[0];
      } else {
        nd.text = real.join('\n');
        const first = real[0].replace(/^• /, '').trim();
        const found = itemTexts.indexOf(first);
        nd.itemIndex = found >= 0 ? found : hintIdx[0];
      }
    });
  }

  // Auto-fit, then one size per text group so same-level shapes match (like PowerPoint)
  const groupSize = {};
  nodes.forEach((nd) => {
    if (!nd.text) return;
    const size = fitFontSize(nd.text, nd.w, nd.h, nd.maxPt, nd.inset);
    groupSize[nd.textGroup] = Math.min(groupSize[nd.textGroup] || 999, size);
  });
  nodes.forEach((nd) => {
    nd.fontSize = nd.text ? groupSize[nd.textGroup] : 0;
  });
  return nodes;
};

/**
 * Cover-crop an image (imgW x imgH) into a box (boxW x boxH), keeping the chosen side / center.
 * Returns the hidden fractions of the SOURCE image (left / right / top / bottom: PPTX srcRect and
 * the image element's crop) and the drawn size + offset inside the box (canvas / PDF).
 */
export const coverCrop = (boxW, boxH, imgW, imgH, pos = 'center') => {
  const iw = imgW > 0 ? imgW : boxW;
  const ih = imgH > 0 ? imgH : boxH;
  const s = Math.max(boxW / iw, boxH / ih);
  const drawW = iw * s;
  const drawH = ih * s;
  const hx = Math.max(0, 1 - boxW / drawW);
  const hy = Math.max(0, 1 - boxH / drawH);
  let left = hx / 2;
  let right = hx / 2;
  let top = hy / 2;
  let bottom = hy / 2;
  if (pos === 'left') { left = 0; right = hx; }
  if (pos === 'right') { left = hx; right = 0; }
  if (pos === 'top') { top = 0; bottom = hy; }
  if (pos === 'bottom') { top = hy; bottom = 0; }
  return { left, right, top, bottom, drawW, drawH, offX: -left * drawW, offY: -top * drawH };
};

export const CROP_POSITIONS = [
  { key: 'center', label: 'ناوەڕاست' },
  { key: 'top', label: 'سەرەوە' },
  { key: 'bottom', label: 'خوارەوە' },
  { key: 'right', label: 'ڕاست' },
  { key: 'left', label: 'چەپ' },
];

export const getSmartArtBox = (elem, slideHeightPt = 405) => ({
  W: ((elem.width || 50) / 100) * 720,
  H: ((elem.height || 40) / 100) * slideHeightPt,
});

/** "گۆڕین بۆ شێوە": independent shape elements at the same place (slide %). */
export const smartArtToShapes = (elem, slideHeightPt = 405) => {
  const { W, H } = getSmartArtBox(elem, slideHeightPt);
  const nodes = buildSmartArtNodes(elem, W, H).map((nd) => {
    if (!nd.isLine) return nd;
    // A straight line becomes a thin rectangle rotated along the segment (any direction)
    const x1 = nd.flipH ? nd.x + nd.w : nd.x;
    const x2 = nd.flipH ? nd.x : nd.x + nd.w;
    const len = Math.max(1, Math.hypot(nd.w, nd.h));
    const t = Math.max(1, nd.line ? nd.line.width : 1.5);
    const cx = (x1 + x2) / 2;
    const cy = nd.y + nd.h / 2;
    return {
      ...nd,
      shape: 'rect',
      x: cx - len / 2,
      y: cy - t / 2,
      w: len,
      h: t,
      rotation: (Math.atan2(nd.y + nd.h - nd.y, x2 - x1) * 180) / Math.PI,
      flipH: false,
      fill: nd.line ? nd.line.color : '#7f7f7f',
      line: null,
    };
  });
  const toPct = (pt, axis) => (axis === 'x' ? (pt / 720) * 100 : (pt / slideHeightPt) * 100);
  const r2 = (v) => Math.round(v * 100) / 100;
  return nodes.map((nd, k) => (nd.isPicture && nd.image ? (() => {
    // An image element's box is the UNCROPPED image; the crop fractions leave exactly the slot visible
    const c = coverCrop(nd.w, nd.h, nd.image.w, nd.image.h, nd.image.crop);
    const fullW = nd.w / Math.max(0.05, 1 - c.left - c.right);
    const fullH = nd.h / Math.max(0.05, 1 - c.top - c.bottom);
    return {
      id: makeId('img'),
      type: 'image',
      uri: nd.image.uri,
      x: r2((elem.x || 0) + toPct(nd.x - c.left * fullW, 'x')),
      y: r2((elem.y || 0) + toPct(nd.y - c.top * fullH, 'y')),
      width: r2(toPct(fullW, 'x')),
      height: r2(toPct(fullH, 'y')),
      aspectRatio: fullW / Math.max(1, fullH),
      rotation: 0,
      fit: 'fill',
      crop: { top: c.top, bottom: c.bottom, left: c.left, right: c.right },
      borderRadius: nd.shape === 'ellipse' ? 100 : nd.shape === 'roundRect' ? 15 : 0,
      border: nd.line ? { color: nd.line.color, width: nd.line.width } : { color: 'transparent', width: 0 },
      opacity: 1,
      locked: false,
      zIndex: (elem.zIndex || 1) + k * 0.001,
    };
  })() : {
    id: makeId('shape'),
    type: 'shape',
    shapeType: nd.shape,
    x: Math.round(((elem.x || 0) + (nd.x / 720) * 100) * 100) / 100,
    y: Math.round(((elem.y || 0) + (nd.y / slideHeightPt) * 100) * 100) / 100,
    width: Math.round((nd.w / 720) * 100 * 100) / 100,
    height: Math.round((nd.h / slideHeightPt) * 100 * 100) / 100,
    rotation: nd.rotation || 0,
    flipH: nd.flipH || false,
    fill: nd.fill || 'none',
    outline: nd.line ? { color: nd.line.color, width: nd.line.width } : { color: '#000000', width: 0 },
    opacity: nd.alpha !== undefined && nd.alpha < 100 ? nd.alpha / 100 : 1,
    cornerRadius: nd.shape === 'roundRect' ? nd.cornerRadius : 0,
    locked: false,
    zIndex: (elem.zIndex || 1) + k * 0.001,
    text: nd.text,
    textColor: nd.textColor,
    fontSize: nd.fontSize || 14,
    bold: nd.bold,
    kurdishFont: elem.kurdishFont || 'Tahoma',
  }));
};
