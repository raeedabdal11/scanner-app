// SmartArt "Hierarchy" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// The tree comes from the text pane levels (an item is the child of the previous item with a lower
// level). Siblings run RIGHT to LEFT; horizontal charts grow from the right edge to the left.
// Connectors are plain straight "line" shapes (never glued), so PowerPoint never repairs them.
import { N, placeTree, elbowLines, directLines, treeDepth } from './layoutKit';

// Sample tree for thumbnails / new graphics: one root, three children, one grandchild
const HIERARCHY_SAMPLE = [
  { text: 'بەڕێوەبەر', level: 0 },
  { text: 'بەشی یەک', level: 1 },
  { text: 'ستاف', level: 2 },
  { text: 'بەشی دوو', level: 1 },
  { text: 'بەشی سێ', level: 1 },
];

const Hh = (id, name, desc, build, approx = false) => ({ id, category: 'hierarchy', name, desc, build, approx, sample: HIERARCHY_SAMPLE });

const textOf = (node) => node.text || '';
const box = (p, shape, role, idx, extra = {}) =>
  N(shape, p.cx - p.w / 2, p.cy - p.h / 2, p.w, p.h, role, idx, { text: textOf(p.node), textGroup: `lvl${Math.min(p.depth, 2)}`, ...extra });

// Color by top-level branch so each branch keeps one color (like PowerPoint's colorful schemes)
const branchIndex = (placed) => {
  const map = new Map();
  let next = 0;
  placed.forEach((p) => {
    let top = p;
    while (top.parent && top.parent.parent) top = top.parent;
    const key = top.parent ? top : p;
    if (!map.has(key)) map.set(key, p.depth === 0 ? 0 : ++next);
    p.idx = p.depth === 0 ? 0 : map.get(key);
  });
};

export const HIERARCHY_LAYOUTS = [
  // Organization Chart
  Hh('orgChart', 'هێڵکاری ڕێکخراو', 'سەرۆک لە سەرەوە و بەشەکان لە ژێریدا بە هێڵ.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'down', 0.58);
    branchIndex(placed);
    return [...elbowLines(placed, 'down'), ...placed.map((p) => box(p, 'rect', 'main', p.idx))];
  }),

  // Name and Title Organization Chart
  Hh('nameTitleOrgChart', 'هێڵکاری ناو و پۆست', 'ناو لە سەرەوەی هەر سندوقێک و پۆست لە ژێریدا (دێڕی دووەمی دەق).', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'down', 0.62);
    branchIndex(placed);
    const out = elbowLines(placed, 'down');
    placed.forEach((p) => {
      const [name, ...rest] = textOf(p.node).split('\n');
      out.push(N('rect', p.cx - p.w / 2, p.cy - p.h / 2, p.w, p.h * 0.72, 'main', p.idx, { text: name, textGroup: 'name' }));
      out.push(N('rect', p.cx - p.w * 0.45, p.cy + p.h * 0.12, p.w * 0.8, p.h * 0.38, 'sub', p.idx, {
        text: rest.join(' '), align: 'center', textGroup: 'title',
      }));
    });
    return out;
  }, true),

  // Horizontal Organization Chart
  Hh('horizontalOrgChart', 'هێڵکاری ڕێکخراوی ئاسۆیی', 'سەرۆک لە ڕاست و بەشەکان بەرەو چەپ.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'left', 0.62);
    branchIndex(placed);
    return [...elbowLines(placed, 'left'), ...placed.map((p) => box(p, 'rect', 'main', p.idx))];
  }),

  // Hierarchy (tree)
  Hh('hierarchyTree', 'پلەبەندی', 'دار: هەر سندوقێک بە هێڵێکی ڕاستەوخۆ بە باوانەکەیەوە.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'down', 0.55);
    branchIndex(placed);
    return [...directLines(placed, 'down'), ...placed.map((p) => box(p, 'roundRect', 'main', p.idx))];
  }),

  // Horizontal Hierarchy
  Hh('horizontalHierarchy', 'پلەبەندی ئاسۆیی', 'دار لە ڕاستەوە بۆ چەپ بە هێڵی ڕاستەوخۆ.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'left', 0.58);
    branchIndex(placed);
    return [...directLines(placed, 'left'), ...placed.map((p) => box(p, 'roundRect', 'main', p.idx))];
  }),

  // Table Hierarchy
  Hh('tableHierarchy', 'پلەبەندی خشتەیی', 'هەر ئاستێک ڕیزێکە، باوان بە پانی منداڵەکانی.', (g, W, H, ctx) => {
    const D = Math.max(...ctx.tree.map(treeDepth));
    const placed = placeTree(ctx.tree, W, H, 'down', 0.9, 1);
    branchIndex(placed);
    const leavesUnit = W / ctx.tree.reduce((s, r) => s + countLeaves(r), 0);
    const rowH = H / D;
    const gap = Math.max(2, Math.min(W, H) * 0.012);
    return placed.map((p) => {
      const span = countLeaves(p.node) * leavesUnit;
      return N('rect', p.cx - span / 2 + gap / 2, p.depth * rowH + gap / 2, span - gap, rowH - gap, p.depth === 0 ? 'main' : 'main', p.idx, {
        text: textOf(p.node), textGroup: `lvl${Math.min(p.depth, 2)}`,
      });
    });
  }),

  // Labeled Hierarchy
  Hh('labeledHierarchy', 'پلەبەندی ناونراو', 'هەر ئاستێک ناوی خۆی هەیە لە لای ڕاست.', (g, W, H, ctx) => {
    const D = Math.max(...ctx.tree.map(treeDepth));
    const labelW = W * 0.16;
    const rowH = H / D;
    const out = [];
    for (let d = 0; d < D; d++) {
      out.push(N('rect', 0, d * rowH + 1, W, rowH - 2, 'bg', 0));
      out.push(N('rect', W - labelW, d * rowH, labelW, rowH, 'text', 0, { text: `ئاستی ${'١٢٣٤٥'[d] || d + 1}`, bold: true, textGroup: 'band', align: 'center' }));
    }
    const placed = placeTree(ctx.tree, W - labelW, H, 'down', 0.56);
    branchIndex(placed);
    return [...out, ...elbowLines(placed, 'down'), ...placed.map((p) => box(p, 'roundRect', 'main', p.idx))];
  }),

  // Circle Hierarchy
  Hh('circleHierarchy', 'پلەبەندی بازنەیی', 'بازنەکان بە هێڵی ڕاستەوخۆ بە یەکەوە بەستراون.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'down', 0.62);
    branchIndex(placed);
    placed.forEach((p) => {
      const d = Math.min(p.w, p.h * 1.15);
      p.w = d;
      p.h = d;
    });
    return [...directLines(placed, 'down'), ...placed.map((p) => box(p, 'ellipse', 'main', p.idx))];
  }),

  // Half Circle Organization Chart
  Hh('halfCircleOrgChart', 'هێڵکاری نیوە بازنەیی', 'ناوەکان لەناو ئەڵقەیەکی ڕەنگاوڕەنگدا.', (g, W, H, ctx) => {
    const placed = placeTree(ctx.tree, W, H, 'down', 0.62);
    branchIndex(placed);
    const out = elbowLines(placed, 'down');
    placed.forEach((p) => {
      out.push(N('ellipse', p.cx - p.w / 2, p.cy - p.h / 2, p.w, p.h, 'ring', p.idx, { lineWidth: 3 }));
      out.push(N('rect', p.cx - p.w * 0.4, p.cy - p.h * 0.3, p.w * 0.8, p.h * 0.6, 'text', p.idx, {
        text: textOf(p.node), align: 'center', textGroup: `lvl${Math.min(p.depth, 2)}`,
      }));
    });
    return out;
  }, true),
];

function countLeaves(node) {
  return node.children.length ? node.children.reduce((s, c) => s + countLeaves(c), 0) : 1;
}
