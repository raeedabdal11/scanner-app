// SmartArt "Process" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// Flows run RIGHT to LEFT: item 0 is on the right, arrows point left, chevrons are mirrored (flipH).
import { N, gapOf, rtlSlots, colSlots, bullets, fullText, boxArrowRow, rtlBoxArrowX } from './layoutKit';

const P = (id, name, desc, build, approx = false) => ({ id, category: 'process', name, desc, build, approx });

// Row of boxes (right to left) with left-pointing arrows between them
const boxRow = (groups, W, H, y, bh, shape = 'roundRect', idxStart = 0, textOf = fullText) => {
  const n = groups.length;
  const g = gapOf(W, H);
  const { bw, aw } = boxArrowRow(n, W, g);
  const out = [];
  groups.forEach((gr, i) => {
    const { x, arrowX } = rtlBoxArrowX(i, W, bw, aw, g);
    out.push(N(shape, x, y, bw, bh, 'main', idxStart + i, { text: textOf(gr) }));
    if (i < n - 1) out.push(N('leftArrow', arrowX, y + bh * 0.32, aw, bh * 0.36, 'connector', idxStart + i));
  });
  return { nodes: out, bw, aw, g };
};

// Snake / bending rows: returns per item { x, y, w, h, rowIdx, dir }
const bendingGrid = (n, W, H, rtlEveryRow) => {
  const perRow = n <= 3 ? n : n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3);
  const rows = Math.ceil(n / perRow);
  const g = gapOf(W, H);
  const { bw, aw } = boxArrowRow(perRow, W, g);
  const rowGap = g * 4;
  const bh = Math.min((H - (rows - 1) * rowGap) / rows, bw * 0.75);
  const cells = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const k = i % perRow;
    const ltr = !rtlEveryRow && r % 2 === 1;
    const step = bw + aw + 2 * g;
    const x = ltr ? k * step : W - bw - k * step;
    cells.push({ x, y: r * (bh + rowGap), w: bw, h: bh, r, k, ltr, aw, g, rowGap, perRow });
  }
  return cells;
};

export const PROCESS_LAYOUTS = [
  // Basic Process
  P('basicProcess', 'پڕۆسەی سادە', 'هەنگاوەکان بە ڕیز لە ڕاستەوە بۆ چەپ بە تیر.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H);
    const { bw } = boxArrowRow(n, W, g);
    const bh = Math.min(H, bw * 0.8);
    return boxRow(groups, W, H, (H - bh) / 2, bh, 'rect').nodes;
  }),

  // Basic Chevron Process
  P('basicChevronProcess', 'پڕۆسەی شێوە V', 'هەنگاوەکان لە شێوەی تیری نووکدار.', (groups, W, H) => {
    const n = groups.length;
    const w = W / (n - 0.18 * (n - 1));
    const h = Math.min(H, w * 0.55);
    return groups.map((gr, i) =>
      N('chevron', W - w - i * w * 0.82, (H - h) / 2, w, h, 'main', i, { text: gr.text, flipH: true, inset: w * 0.18 })
    );
  }),

  // Closed Chevron Process
  P('closedChevronProcess', 'پڕۆسەی تیری داخراو', 'هەنگاوەکان لە شێوەی تیری پێنجگۆشەیی.', (groups, W, H) => {
    const g = gapOf(W, H) * 0.6;
    const slots = rtlSlots(groups.length, W, g);
    const h = Math.min(H, slots[0].w * 0.6);
    return slots.map((s, i) =>
      N('homePlate', s.x, (H - h) / 2, s.w, h, 'main', i, { text: groups[i].text, flipH: true, inset: s.w * 0.12 })
    );
  }),

  // Continuous Block Process
  P('continuousBlockProcess', 'پڕۆسەی بلۆکی بەردەوام', 'هەنگاوەکان لەسەر تیرێکی گەورەی بەردەوام.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [N('leftArrow', 0, H * 0.08, W, H * 0.84, 'connector', 0)];
    rtlSlots(groups.length, W * 0.86, g, W * 0.07).forEach((s, i) => {
      out.push(N('roundRect', s.x, H * 0.3, s.w, H * 0.4, 'main', i, { text: groups[i].text }));
    });
    return out;
  }),

  // Step Up Process
  P('stepUpProcess', 'پڕۆسەی پلەی سەرکەوتوو', 'هەنگاوەکان وەک پەیژە بەرەو سەرەوە دەچن.', (groups, W, H) => {
    const g = gapOf(W, H);
    const n = groups.length;
    return rtlSlots(n, W, g).map((s, i) => {
      const h = H * (0.35 + (0.65 * (i + 1)) / n);
      return N('rect', s.x, H - h, s.w, h, 'main', i, { text: fullText(groups[i]), valign: 'top' });
    });
  }, true),

  // Step Down Process
  P('stepDownProcess', 'پڕۆسەی پلەی دابەزین', 'هەنگاوەکان بە لار بەرەو خوارەوە و چەپ.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H);
    const h = (H - (n - 1) * g * 0.6) / n;
    const w = Math.min(W * 0.45, Math.max(W * 0.25, W / (n * 0.6)));
    const out = [];
    groups.forEach((gr, i) => {
      const x = n > 1 ? (W - w) * (1 - i / (n - 1)) : (W - w) / 2;
      const y = i * (h + g * 0.6);
      out.push(N('roundRect', x, y, w, h, 'main', i, { text: gr.text }));
      if (gr.children.length) {
        out.push(N('rect', Math.max(0, x - w * 1.05), y, w, h, 'text', i, { text: bullets(gr) }));
      }
    });
    return out;
  }, true),

  // Alternating Flow
  P('alternatingFlow', 'ڕەوتی ئاڵوگۆڕ', 'هەنگاوەکان بە نۆرە لە سەرەوە و خوارەوەی تیرێک.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [N('leftArrow', 0, H * 0.42, W, H * 0.16, 'connector', 0)];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      const top = i % 2 === 0;
      out.push(N('roundRect', s.x, top ? H * 0.04 : H * 0.6, s.w, H * 0.36, 'main', i, { text: fullText(groups[i]) }));
    });
    return out;
  }, true),

  // Basic Bending Process
  P('basicBendingProcess', 'پڕۆسەی چەماوەی سادە', 'هەنگاوەکان لە چەند ڕیزێکدا، ڕیزەکان پێچ دەکەنەوە.', (groups, W, H) => {
    const cells = bendingGrid(groups.length, W, H, false);
    const out = [];
    cells.forEach((c, i) => {
      out.push(N('rect', c.x, c.y, c.w, c.h, 'main', i, { text: fullText(groups[i]) }));
      const next = cells[i + 1];
      if (!next) return;
      if (next.r === c.r) {
        const ax = c.ltr ? c.x + c.w + c.g : c.x - c.g - c.aw;
        out.push(N(c.ltr ? 'rightArrow' : 'leftArrow', ax, c.y + c.h * 0.32, c.aw, c.h * 0.36, 'connector', i));
      } else {
        const ah = c.rowGap - 2 * c.g;
        out.push(N('downArrow', c.x + c.w * 0.4, c.y + c.h + c.g, c.w * 0.2, ah, 'connector', i));
      }
    });
    return out;
  }),

  // Vertical Process
  P('verticalProcess', 'پڕۆسەی ستوونی', 'هەنگاوەکان لە سەرەوە بۆ خوارەوە بە تیر.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H) * 0.6;
    const bh = (H - (n - 1) * 2 * g) / (n + 0.4 * (n - 1));
    const ah = bh * 0.4;
    const bw = W * 0.7;
    const out = [];
    groups.forEach((gr, i) => {
      const y = i * (bh + ah + 2 * g);
      out.push(N('roundRect', (W - bw) / 2, y, bw, bh, 'main', i, { text: fullText(gr) }));
      if (i < n - 1) out.push(N('downArrow', W / 2 - bw * 0.08, y + bh + g, bw * 0.16, ah, 'connector', i));
    });
    return out;
  }),

  // Vertical Chevron List
  P('verticalChevronList', 'لیستی تیری ستوونی', 'تیری بەرەو خوارەوە لە ڕاست و ڕوونکردنەوە لە چەپ.', (groups, W, H) => {
    const n = groups.length;
    const out = [];
    const slotH = H / n;
    const cw = Math.min(W * 0.24, slotH * 1.4);
    groups.forEach((gr, i) => {
      const y = i * slotH;
      const vh = slotH * 1.12; // visual height (overlapping the next chevron like PowerPoint)
      const cx = W - cw / 2;
      const cy = y + vh / 2 - slotH * 0.06;
      // Chevron points right; rotated 90° it points down. Its own box is (vh x cw) before rotation.
      out.push(N('chevron', cx - vh / 2, cy - cw / 2, vh, cw, 'main', i, { rotation: 90 }));
      out.push(N('rect', W - cw, y + slotH * 0.15, cw, slotH * 0.7, 'label', i, { text: gr.text }));
      out.push(N('rect', 0, y + slotH * 0.06, W - cw - gapOf(W, H), slotH * 0.88, 'sub', i, { text: bullets(gr) }));
    });
    return out;
  }),

  // Basic Timeline
  P('basicTimeline', 'هێڵی کاتی سادە', 'خاڵەکان لەسەر هێڵێکی کات، دەق بە نۆرە سەرەوە و خوارەوە.', (groups, W, H) => {
    const out = [N('leftArrow', 0, H * 0.43, W, H * 0.14, 'connector', 0)];
    const slots = rtlSlots(groups.length, W * 0.92, gapOf(W, H), W * 0.02);
    slots.forEach((s, i) => {
      const d = Math.min(H * 0.1, s.w * 0.4);
      out.push(N('ellipse', s.x + s.w / 2 - d / 2, H * 0.5 - d / 2, d, d, 'accent', i));
      const top = i % 2 === 0;
      out.push(N('rect', s.x, top ? 0 : H * 0.6, s.w, H * 0.4, 'text', i, {
        text: fullText(groups[i]), align: 'center', valign: top ? 'bottom' : 'top',
      }));
    });
    return out;
  }),

  // Circle Accent Timeline
  P('circleAccentTimeline', 'هێڵی کاتی بازنەیی', 'بازنەی گەورە لەسەر هێڵێک و ڕوونکردنەوە لە ژێریدا.', (groups, W, H) => {
    const out = [N('rect', 0, H * 0.3 - 1.5, W, 3, 'connector', 0)];
    rtlSlots(groups.length, W, gapOf(W, H)).forEach((s, i) => {
      const d = Math.min(s.w * 0.85, H * 0.5);
      out.push(N('ellipse', s.x + (s.w - d) / 2, H * 0.3 - d / 2, d, d, 'main', i, { text: groups[i].text }));
      out.push(N('rect', s.x, H * 0.3 + d / 2 + 2, s.w, H * 0.7 - d / 2 - 2, 'text', i, {
        text: bullets(groups[i]), align: 'center', valign: 'top',
      }));
    });
    return out;
  }, true),

  // Upward Arrow
  P('upwardArrow', 'تیری بەرەو سەرەوە', 'هەنگاوەکان لەسەر تیرێکی بەرزبووەوە بەرەو چەپ.', (groups, W, H) => {
    const n = groups.length;
    // leftArrow rotated clockwise: its tip rises to the upper-left (right-to-left growth)
    const out = [N('leftArrow', W * 0.02, H * 0.52, W * 0.96, H * 0.24, 'connector', 0, { rotation: 18 })];
    const slots = rtlSlots(n, W * 0.82, gapOf(W, H), W * 0.08);
    slots.forEach((s, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const cx = s.x + s.w / 2;
      const cy = H * (0.78 - 0.38 * t);
      const d = Math.min(H * 0.1, s.w * 0.45);
      out.push(N('ellipse', cx - d / 2, cy - d / 2, d, d, 'accent', i));
      out.push(N('rect', s.x, Math.max(0, cy - d / 2 - H * 0.32), s.w, H * 0.3, 'text', i, {
        text: fullText(groups[i]), align: 'center', valign: 'bottom',
      }));
    });
    return out;
  }, true),

  // Process Arrows
  P('processArrows', 'تیرەکانی پڕۆسە', 'هەر هەنگاوێک سندوقێکە بە تیرێکی بەرەو خوارەوە.', (groups, W, H) => {
    const g = gapOf(W, H);
    return rtlSlots(groups.length, W, g).map((s, i) =>
      N('downArrowCallout', s.x, 0, s.w, H, 'main', i, { text: fullText(groups[i]), valign: 'top', inset: s.w * 0.08 })
    );
  }, true),

  // Accent Process
  P('accentProcess', 'پڕۆسەی نیشانەدار', 'هەنگاوی سەرەکی لە سەرەوە و وردەکارییەکان لە ژێریدا.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H) * 2;
    const out = [];
    const slots = rtlSlots(n, W, g * 1.6);
    slots.forEach((s, i) => {
      out.push(N('rect', s.x, 0, s.w, H * 0.3, 'main', i, { text: groups[i].text }));
      out.push(N('rect', s.x, H * 0.33, s.w, H * 0.67, 'sub', i, { text: bullets(groups[i]), valign: 'top' }));
      if (i < n - 1) {
        const gapW = g * 1.6;
        out.push(N('leftArrow', s.x - gapW * 0.85, H * 0.09, gapW * 0.7, H * 0.12, 'connector', i));
      }
    });
    return out;
  }),

  // Segmented Process (like)
  P('segmentedProcess', 'پڕۆسەی بەشکراو', 'هەر هەنگاوێک و بەشەکانی، ستوونی بە تیر.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H) * 0.6;
    const slotH = (H - (n - 1) * g * 4) / n;
    const out = [];
    groups.forEach((gr, i) => {
      const y = i * (slotH + g * 4);
      const hasKids = gr.children.length > 0;
      out.push(N('rect', 0, y, W, hasKids ? slotH * 0.5 : slotH, 'main', i, { text: gr.text }));
      if (hasKids) {
        rtlSlots(gr.children.length, W, g).forEach((c, k) => {
          out.push(N('rect', c.x, y + slotH * 0.52, c.w, slotH * 0.48, 'sub', i, { text: gr.children[k] }));
        });
      }
      if (i < n - 1) out.push(N('downArrow', W / 2 - g * 2, y + slotH + g * 0.5, g * 4, g * 3, 'connector', i));
    });
    return out;
  }, true),

  // Repeating Bending Process
  P('repeatingBendingProcess', 'پڕۆسەی چەماوەی دووبارە', 'هەموو ڕیزەکان لە ڕاستەوە دەست پێدەکەن.', (groups, W, H) => {
    const cells = bendingGrid(groups.length, W, H, true);
    const out = [];
    cells.forEach((c, i) => {
      out.push(N('rect', c.x, c.y, c.w, c.h, 'main', i, { text: fullText(groups[i]) }));
      const next = cells[i + 1];
      if (!next) return;
      if (next.r === c.r) {
        out.push(N('leftArrow', c.x - c.g - c.aw, c.y + c.h * 0.32, c.aw, c.h * 0.36, 'connector', i));
      } else {
        // Back to the right edge for the next row: a bar across the gap + a down arrow
        const barY = c.y + c.h + c.rowGap * 0.35;
        const x1 = c.x + c.w / 2;
        const x2 = next.x + next.w / 2;
        out.push(N('rect', x1, barY, x2 - x1, Math.max(2, c.rowGap * 0.12), 'connector', i));
        out.push(N('downArrow', x2 - c.w * 0.08, barY, c.w * 0.16, c.rowGap * 0.6, 'connector', i));
      }
    });
    return out;
  }, true),

  // Equation
  P('equation', 'هاوکێشە', 'بەشەکان بە کۆ، و ئەنجام لە کۆتایی.', (groups, W, H) => {
    const n = Math.max(2, groups.length);
    const items = groups.length >= 2 ? groups : [groups[0], { text: '', children: [] }];
    const g = gapOf(W, H);
    const opRatio = 0.45;
    const d = Math.min(H * 0.9, (W - (2 * n - 2) * g) / (n + opRatio * (n - 1)));
    const op = d * opRatio;
    const y = (H - d) / 2;
    const out = [];
    let x = W;
    items.forEach((gr, i) => {
      x -= d;
      out.push(N('ellipse', x, y, d, d, 'main', i, { text: fullText(gr), inset: d * 0.15 }));
      if (i < n - 1) {
        x -= g + op;
        out.push(N(i === n - 2 ? 'mathEqual' : 'mathPlus', x, y + (d - op) / 2, op, op, 'connector', i));
        x -= g;
      }
    });
    return out;
  }),

  // Funnel
  P('funnel', 'قیف', 'چەند بەشێک دەچنە ناو قیفێک و ئەنجامێک دەردەچێت.', (groups, W, H) => {
    const inputs = groups.length > 1 ? groups.slice(0, -1) : groups;
    const result = groups.length > 1 ? groups[groups.length - 1] : { text: '', children: [] };
    const g = gapOf(W, H);
    const out = [];
    const fw = W * 0.6;
    const fx = (W - fw) / 2;
    const d = Math.min(H * 0.24, (fw - (inputs.length - 1) * g) / inputs.length);
    rtlSlots(inputs.length, inputs.length * d + (inputs.length - 1) * g, g, (W - (inputs.length * d + (inputs.length - 1) * g)) / 2)
      .forEach((s, i) => {
        out.push(N('ellipse', s.x, 0, d, d, 'main', i, { text: inputs[i].text, textGroup: 'inputs' }));
      });
    // trapezoid has its narrow side up: rotated 180° it becomes a funnel
    out.push(N('trapezoid', fx, d + g, fw, H * 0.3, 'connector', 0, { rotation: 180 }));
    out.push(N('downArrow', W / 2 - W * 0.04, d + g + H * 0.3, W * 0.08, H * 0.12, 'connector', 0));
    out.push(N('roundRect', W * 0.3, d + g + H * 0.44, W * 0.4, H - (d + g + H * 0.44), 'main', inputs.length, { text: fullText(result) }));
    return out;
  }, true),
];
