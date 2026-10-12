// SmartArt "List" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// build(groups, W, H) -> raw nodes (see layoutKit). groups = [{ text, children: [text] }]
import { N, gapOf, rtlSlots, colSlots, gridDims, bullets, fullText } from './layoutKit';

const L = (id, name, desc, build, approx = false) => ({ id, category: 'list', name, desc, build, approx });

export const LIST_LAYOUTS = [
  // Basic Block List
  L('basicBlockList', 'لیستی بلۆکی سادە', 'زانیاری لە چەند بلۆکێکی یەکسان، ڕیز بە ڕیز.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H);
    const { cols, rows } = gridDims(n, W, H);
    const cw = (W - (cols - 1) * g) / cols;
    const ch = (H - (rows - 1) * g) / rows;
    return groups.map((gr, i) => {
      const r = Math.floor(i / cols);
      const k = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const offset = (W - (inRow * cw + (inRow - 1) * g)) / 2;
      return N('rect', W - offset - (k + 1) * cw - k * g, r * (ch + g), cw, ch, 'main', i, { text: fullText(gr) });
    });
  }),

  // Vertical Bullet List
  L('verticalBulletList', 'لیستی خاڵداری ستوونی', 'سەردێڕی ڕەنگاوڕەنگ و خاڵەکان لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const gr = groups[i];
      const hh = gr.children.length ? s.h * 0.42 : s.h;
      out.push(N('roundRect', 0, s.y, W, hh, 'main', i, { text: gr.text }));
      if (gr.children.length) {
        out.push(N('rect', 0, s.y + hh, W, s.h - hh, 'text', i, { text: bullets(gr), inset: 3 }));
      }
    });
    return out;
  }),

  // Horizontal Bullet List
  L('horizontalBulletList', 'لیستی خاڵداری ئاسۆیی', 'ستوونی سەردێڕ و خاڵەکانی لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      out.push(N('rect', s.x, 0, s.w, H * 0.3, 'main', i, { text: groups[i].text }));
      out.push(N('rect', s.x, H * 0.3, s.w, H * 0.7, 'sub', i, { text: bullets(groups[i]), valign: 'top' }));
    });
    return out;
  }),

  // Vertical Box List
  L('verticalBoxList', 'لیستی سندوقی ستوونی', 'سەردێڕێک لەسەر گۆشەی سندوقێکی ڕووناک.', (groups, W, H) => {
    const g = gapOf(W, H) * 1.5;
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      out.push(N('rect', 0, s.y + s.h * 0.22, W, s.h * 0.78, 'sub', i, { text: bullets(groups[i]), valign: 'bottom' }));
      out.push(N('roundRect', W * 0.42, s.y, W * 0.55, s.h * 0.44, 'main', i, { text: groups[i].text }));
    });
    return out;
  }),

  // Vertical Block List
  L('verticalBlockList', 'لیستی بلۆکی ستوونی', 'بلۆکی سەرەکی لە ڕاست و ڕوونکردنەوە لە چەپ.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const bw = W * 0.32;
      out.push(N('rect', W - bw, s.y, bw, s.h, 'main', i, { text: groups[i].text }));
      out.push(N('rect', 0, s.y, W - bw - g, s.h, 'sub', i, { text: bullets(groups[i]) }));
    });
    return out;
  }),

  // Lined List (Stacked List)
  L('linedList', 'لیستی هێڵدار', 'سەردێڕ و ڕوونکردنەوە بە هێڵێکی جیاکەرەوە.', (groups, W, H) => {
    const out = [];
    colSlots(groups.length, H, 0).forEach((s, i) => {
      out.push(N('rect', W * 0.6, s.y, W * 0.4, s.h - 3, 'text', i, { text: groups[i].text, bold: true }));
      out.push(N('rect', 0, s.y, W * 0.58, s.h - 3, 'text', i, { text: bullets(groups[i]), textGroup: 'textSub' }));
      out.push(N('rect', 0, s.y + s.h - 2.5, W, 2.5, 'accent', i));
    });
    return out;
  }),

  // Grouped List
  L('groupedList', 'لیستی کۆمەڵکراو', 'هەر گرووپێک لە پشتەوەیەکی ڕووناک لەگەڵ خاڵەکانی.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      const gr = groups[i];
      out.push(N('roundRect', s.x, 0, s.w, H, 'bg', i, { cornerRadius: 6 }));
      out.push(N('rect', s.x, 0, s.w, H * 0.24, 'text', i, { text: gr.text, bold: true, align: 'center' }));
      const kids = gr.children.length ? gr.children : [];
      colSlots(Math.max(1, kids.length), H * 0.72, g, H * 0.25).forEach((c, k) => {
        if (kids[k] !== undefined) {
          out.push(N('roundRect', s.x + s.w * 0.08, c.y, s.w * 0.84, c.h, 'main', i, { text: kids[k], textGroup: 'kids' }));
        }
      });
    });
    return out;
  }),

  // Table List
  L('tableList', 'لیستی خشتەیی', 'سەردێڕێکی گشتی و ستوونەکان لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const top = groups[0];
    const cols = groups.length > 1 ? groups.slice(1) : top.children.map((t) => ({ text: t, children: [] }));
    const out = [N('rect', 0, 0, W, H * 0.3, 'main', 0, { text: top.text })];
    if (cols.length) {
      rtlSlots(cols.length, W, g).forEach((s, i) => {
        out.push(N('rect', s.x, H * 0.3 + g, s.w, H * 0.62 - g, 'sub', i + 1, { text: fullText(cols[i]) }));
      });
    }
    out.push(N('rect', 0, H * 0.95, W, H * 0.05, 'accent', 0));
    return out;
  }),

  // Trapezoid List
  L('trapezoidList', 'لیستی تراپیزی', 'زانیاری لەناو شێوەی تراپیزی لە تەنیشت یەک.', (groups, W, H) => {
    const g = gapOf(W, H);
    return rtlSlots(groups.length, W, g).map((s, i) =>
      N('trapezoid', s.x, 0, s.w, H, 'main', i, { text: fullText(groups[i]), inset: s.w * 0.18 })
    );
  }),

  // Pyramid List-like stacked bars
  L('stackedBarsList', 'لیستی ستوونە پلەدار', 'شریتی سەریەک کە بەرەو خوارەوە پانتر دەبن.', (groups, W, H) => {
    const g = gapOf(W, H) * 0.6;
    const n = groups.length;
    return colSlots(n, H, g).map((s, i) => {
      const w = W * (0.4 + (0.6 * (i + 1)) / n);
      return N('rect', (W - w) / 2, s.y, w, s.h, 'main', i, { text: groups[i].text });
    });
  }, true),

  // Vertical Accent List (picture-less)
  L('verticalAccentList', 'لیستی ستوونی بە نیشانە', 'شریتێکی ڕەنگاوڕەنگ لە ڕاستی هەر خاڵێک.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const bar = Math.max(4, W * 0.035);
      out.push(N('rect', W - bar, s.y, bar, s.h, 'accent', i));
      out.push(N('rect', 0, s.y, W - bar - g * 0.5, s.h, 'sub', i, { text: fullText(groups[i]) }));
    });
    return out;
  }),

  // Hierarchy List (simple)
  L('hierarchyList', 'لیستی پلەبەندی', 'سەرۆکی گرووپ و بەشەکانی لە ژێریدا بە هێڵێک.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g * 1.5).forEach((s, i) => {
      const gr = groups[i];
      out.push(N('roundRect', s.x, 0, s.w, H * 0.28, 'main', i, { text: gr.text }));
      const kids = gr.children;
      if (kids.length) {
        const slots = colSlots(kids.length, H * 0.68, g, H * 0.32);
        const lineX = s.x + s.w - s.w * 0.08;
        const last = slots[slots.length - 1];
        out.push(N('rect', lineX - 1.5, H * 0.28, 3, last.y + last.h / 2 - H * 0.28, 'connector', i));
        slots.forEach((c, k) => {
          out.push(N('rect', s.x, c.y, s.w * 0.84, c.h, 'sub', i, { text: kids[k], align: 'center' }));
          out.push(N('rect', s.x + s.w * 0.84, c.y + c.h / 2 - 1.5, lineX - (s.x + s.w * 0.84), 3, 'connector', i));
        });
      }
    });
    return out;
  }),

  // Square Accent List
  L('squareAccentList', 'لیستی چوارگۆشەی نیشانەدار', 'چوارگۆشەیەکی بچووک لە تەنیشت هەر سەردێڕێک.', (groups, W, H) => {
    const g = gapOf(W, H) * 1.5;
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      const sq = Math.min(H * 0.12, s.w * 0.18);
      out.push(N('rect', s.x + s.w - sq, H * 0.06, sq, sq, 'accent', i));
      out.push(N('rect', s.x, 0, s.w - sq - 3, H * 0.24, 'text', i, { text: groups[i].text, bold: true }));
      out.push(N('rect', s.x, H * 0.25, s.w, 2, 'accent', i));
      out.push(N('rect', s.x, H * 0.28, s.w, H * 0.72, 'text', i, { text: bullets(groups[i]), valign: 'top', textGroup: 'textSub' }));
    });
    return out;
  }),

  // Segmented / Column List
  L('columnList', 'لیستی ستوونەکان', 'هەر خاڵێک ستوونێکی بەرز بە سەردێڕ و خاڵەکانی.', (groups, W, H) => {
    const g = gapOf(W, H);
    return rtlSlots(groups.length, W, g).map((s, i) =>
      N('roundRect', s.x, 0, s.w, H, 'main', i, { text: fullText(groups[i]), valign: 'top', cornerRadius: 8 })
    );
  }),

  // Tabbed List-like
  L('tabbedList', 'لیستی تابدار', 'تابێکی ڕەنگاوڕەنگ لە ڕاست و ناوەڕۆک لە چەپ.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const tw = W * 0.3;
      out.push(N('rect', 0, s.y, W - tw + 2, s.h, 'sub', i, { text: bullets(groups[i]) }));
      out.push(N('roundRect', W - tw, s.y, tw, s.h * 0.7, 'main', i, { text: groups[i].text }));
    });
    return out;
  }, true),

  // Horizontal Picture-less Label List
  L('horizontalLabelList', 'لیستی لەیبڵی ئاسۆیی', 'لەیبڵ لە سەرەوە و ڕوونکردنەوە لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      out.push(N('rect', s.x, 0, s.w, H * 0.2, 'text', i, { text: groups[i].text, bold: true, align: 'center' }));
      out.push(N('rect', s.x, H * 0.21, s.w, H * 0.04, 'accent', i));
      out.push(N('rect', s.x, H * 0.27, s.w, H * 0.73, 'sub', i, { text: bullets(groups[i]), valign: 'top' }));
    });
    return out;
  }),
];
