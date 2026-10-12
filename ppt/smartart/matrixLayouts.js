// SmartArt "Matrix" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// Quadrant order (RTL): top-right, top-left, bottom-left, bottom-right (counter-clockwise, like the
// cycles). Only the first 4 main items get a quadrant; further items are added to the 4th as lines.
import { N, gapOf, fullText, bullets, lineNode } from './layoutKit';

const M = (id, name, desc, build, approx = false) => ({ id, category: 'matrix', name, desc, build, approx });

// [x, y, textAlign, textValign] of the 4 quadrants for a W x H area at (ox, oy)
const quadrants = (ox, oy, W, H, g) => {
  const qw = (W - g) / 2;
  const qh = (H - g) / 2;
  return [
    { x: ox + W - qw, y: oy, w: qw, h: qh, align: 'right', valign: 'top' },
    { x: ox, y: oy, w: qw, h: qh, align: 'left', valign: 'top' },
    { x: ox, y: oy + H - qh, w: qw, h: qh, align: 'left', valign: 'bottom' },
    { x: ox + W - qw, y: oy + H - qh, w: qw, h: qh, align: 'right', valign: 'bottom' },
  ];
};

// First 4 groups; extra groups fold into the 4th
const fourOf = (groups) => {
  const out = groups.slice(0, 4).map((g) => ({ ...g, children: g.children.slice() }));
  groups.slice(4).forEach((g) => out[3] && out[3].children.push(g.text));
  return out;
};

export const MATRIX_LAYOUTS = [
  // Basic Matrix
  M('basicMatrix', 'ماتریکسی سادە', 'چوار بەش لە چوار چوارگۆشەدا (٢ × ٢).', (groups, W, H) => {
    const g = gapOf(W, H);
    const items = fourOf(groups);
    return quadrants(0, 0, W, H, g).map((q, i) =>
      items[i] ? N('rect', q.x, q.y, q.w, q.h, 'main', i, { text: fullText(items[i]) }) : N('rect', q.x, q.y, q.w, q.h, 'bg', i)
    );
  }),

  // Titled Matrix
  M('titledMatrix', 'ماتریکسی ناونیشاندار', 'ناونیشانێک لە ناوەڕاست و چوار بەش بە دەوریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const title = groups[0];
    const items = fourOf(groups.slice(1));
    const out = quadrants(0, 0, W, H, g).map((q, i) =>
      N('roundRect', q.x, q.y, q.w, q.h, items[i] ? 'main' : 'bg', i + 1, {
        text: items[i] ? fullText(items[i]) : '', align: q.align, valign: q.valign, inset: Math.min(q.w, q.h) * 0.1,
      })
    );
    const tw = W * 0.36;
    const th = H * 0.3;
    out.push(N('roundRect', (W - tw) / 2, (H - th) / 2, tw, th, 'sub', 0, { text: fullText(title), align: 'center', textGroup: 'title' }));
    return out;
  }),

  // Grid Matrix
  M('gridMatrix', 'ماتریکسی تۆڕی', 'دوو تەوەری خاچی و دەق لە چوار بەشەکەدا.', (groups, W, H) => {
    const items = fourOf(groups);
    const out = [
      lineNode(W / 2, 0, W / 2, H, 0, { lineWidth: 2.5 }),
      lineNode(0, H / 2, W, H / 2, 0, { lineWidth: 2.5 }),
    ];
    const g = gapOf(W, H) * 2;
    quadrants(0, 0, W, H, g).forEach((q, i) => {
      if (!items[i]) return;
      out.push(N('rect', q.x + g * 0.2, q.y + g * 0.2, q.w - g * 0.4, q.h - g * 0.4, 'text', i, {
        text: items[i].children.length ? `${items[i].text}\n${bullets(items[i])}` : items[i].text, align: 'center',
      }));
      const dot = Math.min(W, H) * 0.05;
      out.push(N('ellipse', q.x + (q.align === 'right' ? q.w - dot : 0), q.y + (q.valign === 'top' ? 0 : q.h - dot), dot, dot, 'accent', i));
    });
    return out;
  }),

  // Cycle Matrix (matrix version: four quarter-circle wedges around a center, text boxes in the corners)
  M('matrixCycle', 'ماتریکسی بازنەیی', 'چوار چارەکی بازنە لە ناوەڕاست و دەق لە گۆشەکاندا.', (groups, W, H) => {
    const items = fourOf(groups);
    const m = Math.min(W, H);
    const r = m * 0.3;
    const cx = W / 2;
    const cy = H / 2;
    const g = gapOf(W, H) * 0.4;
    // pieWedge = top-left quarter of a circle centred on its bottom-right corner; rotate for the others
    const wedges = [
      { x: cx + g, y: cy - r - g, rot: 90 }, // top-right
      { x: cx - r - g, y: cy - r - g, rot: 0 }, // top-left
      { x: cx - r - g, y: cy + g, rot: 270 }, // bottom-left
      { x: cx + g, y: cy + g, rot: 180 }, // bottom-right
    ];
    const out = [];
    const corner = quadrants(0, 0, W, H, r * 2.2 + g * 2);
    wedges.forEach((wd, i) => {
      out.push(N('pieWedge', wd.x, wd.y, r, r, items[i] ? 'main' : 'bg', i, { rotation: wd.rot }));
      if (items[i]) {
        out.push(N('rect', wd.x + r * 0.12, wd.y + r * 0.3, r * 0.76, r * 0.4, 'label', i, { text: items[i].text, textGroup: 'wedge' }));
        if (items[i].children.length) {
          const c = corner[i];
          out.push(N('roundRect', c.x, c.y, c.w, c.h, 'sub', i, { text: bullets(items[i]), align: c.align, valign: c.valign }));
        }
      }
    });
    return out;
  }, true),
];
