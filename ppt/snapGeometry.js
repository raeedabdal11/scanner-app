// Snapping ("چەسپاندن") and alignment ("ڕێکخستن") math, shared by the canvas and the toolbars.
// Positions are slide percent (x, y, width, height of the element box) unless named *Px.
import { SLIDE, measureElementLayout } from './pptFit';
import { layoutTable } from './tableModel';

export const SNAP_THRESHOLD_PX = 6;
export const ROTATION_SNAP_STEP = 45;
export const ROTATION_SNAP_DEG = 3;

// Snap on/off: remembered for the whole app session (module state survives closing the editor)
let snapEnabled = true;
export const getSnapEnabled = () => snapEnabled;
export const setSnapEnabled = (on) => {
  snapEnabled = !!on;
};

/** Height the element really takes on the slide (%): text grows with its lines, a table with its rows. */
export function getDisplayHeightPct(elem, slideHeightPt = SLIDE.heightPt) {
  const h = elem.height || 0;
  if (elem.type === 'table') {
    return Math.max(h, layoutTable(elem, SLIDE.widthPt, slideHeightPt).heightPct);
  }
  if (elem.type === 'text' && elem.text && elem.text.trim()) {
    const pt = elem.computedFontSize || elem.fontSize || 18;
    const needed = Math.ceil((measureElementLayout(elem, pt).totalHeightPt / SLIDE.heightPt) * 100);
    if (needed > h) return needed + 2;
  }
  return h;
}

/**
 * Axis-aligned bounds (px) of a box given in px, rotated around its center by `rotation` degrees.
 * Returns { l, t, r, b, cx, cy, w, h }.
 */
export function rotatedBoundsPx(leftPx, topPx, wPx, hPx, rotation = 0) {
  const th = ((rotation || 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(th));
  const s = Math.abs(Math.sin(th));
  const w = wPx * c + hPx * s;
  const h = wPx * s + hPx * c;
  const cx = leftPx + wPx / 2;
  const cy = topPx + hPx / 2;
  return { l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2, cx, cy, w, h };
}

/**
 * Candidate snap lines (px), computed once when a drag starts: slide edges + center and the
 * edges / centers of every other element. `boxes` = [{ id, l, t, r, b, cx, cy }].
 */
export function buildSnapLines(boxes, excludeId, cw, ch) {
  const xs = [0, cw / 2, cw];
  const ys = [0, ch / 2, ch];
  boxes.forEach((bx) => {
    if (bx.id === excludeId) return;
    xs.push(bx.l, bx.cx, bx.r);
    ys.push(bx.t, bx.cy, bx.b);
  });
  const uniq = (arr) => Array.from(new Set(arr.map((v) => Math.round(v * 10) / 10)));
  return { xs: uniq(xs), ys: uniq(ys) };
}

/** Nearest line to any of `features` within `threshold`: { offset, line } or null. */
export function nearestSnap(features, lines, threshold = SNAP_THRESHOLD_PX) {
  let best = null;
  features.forEach((f) => {
    lines.forEach((line) => {
      const d = line - f;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.offset))) best = { offset: d, line };
    });
  });
  return best;
}

/** Every line that one of `features` lies on (after snapping): the active snap targets. */
export function linesTouching(features, lines, eps = 0.75) {
  const out = [];
  lines.forEach((line) => {
    if (features.some((f) => Math.abs(line - f) <= eps)) out.push(line);
  });
  return out;
}

/** Rotation snapping: 0 / 45 / 90 / 135 ... within ROTATION_SNAP_DEG (when snapping is on). */
export function snapRotation(deg) {
  let d = Number(deg) || 0;
  if (!snapEnabled) return d;
  const nearest = Math.round(d / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
  if (Math.abs(d - nearest) <= ROTATION_SNAP_DEG) d = nearest;
  return ((d % 360) + 360) % 360;
}

const round1 = (v) => Math.round(v * 10) / 10;

const keepsAspect = (elem) =>
  !!(elem.lockAspect ?? elem.keepAspect) && (elem.type === 'image' || elem.type === 'table' || elem.type === 'shape');

/**
 * Alignment relative to the slide. action: 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' |
 * 'bottom' | 'center' | 'matchWidth' | 'matchHeight'. "left" / "right" are PHYSICAL sides.
 * The rotated bounding box is aligned (like PowerPoint). Returns the patched element.
 */
export function alignElementToSlide(elem, action, slideHeightPt = SLIDE.heightPt) {
  const aspect = SLIDE.widthPt / slideHeightPt; // px per % ratio: 1% of height = (1/aspect)% of width in pt
  let x = elem.x || 0;
  let y = elem.y || 0;
  let w = elem.width || 0;
  let h = getDisplayHeightPct(elem, slideHeightPt);
  const patch = {};

  if (action === 'matchWidth' || action === 'matchHeight') {
    if (action === 'matchWidth') {
      const nw = 100;
      if (keepsAspect(elem) && w > 0) h = Math.min(100, (h * nw) / w);
      w = nw;
    } else {
      const nh = 100;
      if (keepsAspect(elem) && h > 0) w = Math.min(100, (w * nh) / h);
      h = nh;
    }
    patch.width = round1(w);
    patch.height = round1(h);
    patch.aspectRatio = keepsAspect(elem) ? elem.aspectRatio : w / Math.max(0.1, h);
    if (action === 'matchWidth') {
      x = 0;
      y = Math.max(0, Math.min(100 - h, y));
    } else {
      y = 0;
      x = Math.max(0, Math.min(100 - w, x));
    }
    patch.x = round1(x);
    patch.y = round1(y);
    return { ...elem, ...patch };
  }

  // Rotated bounds in a 100 x (100 / aspect) unit space, so rotation uses true proportions
  const b = rotatedBoundsPx(x, y / aspect, w, h / aspect, elem.rotation || 0);
  const halfW = (b.r - b.l) / 2;
  const halfH = ((b.b - b.t) / 2) * aspect; // back to height %
  let cx = x + w / 2;
  let cy = y + h / 2;
  if (action === 'left') cx = halfW;
  else if (action === 'right') cx = 100 - halfW;
  else if (action === 'hcenter') cx = 50;
  else if (action === 'top') cy = halfH;
  else if (action === 'bottom') cy = 100 - halfH;
  else if (action === 'vmiddle') cy = 50;
  else if (action === 'center') {
    cx = 50;
    cy = 50;
  }
  return { ...elem, x: round1(cx - w / 2), y: round1(cy - h / 2) };
}

// ---------------------------------------------------------------- resize (8 handles)

const MIN_ELEM_PERCENT = 5;

/**
 * Shared resize math for every element type (text, image, shape).
 * g: gesture snapshot { handle, elem, geom: {x,y,w,h} in %, rotation, minY, fontPt, cw, ch }
 * (dx, dy): finger movement in screen px. Works in the element's own (rotated) axes and keeps the
 * opposite side / corner fixed on screen. Returns { x, y, width, height, keepAspect } in %.
 */
export function computeResizeGeometry(g, dx, dy) {
  const { handle, elem, geom, cw, ch } = g;
  const { sx, sy } = handle;
  const W0 = (geom.w / 100) * cw;
  const H0 = (geom.h / 100) * ch;
  const cx0 = (geom.x / 100) * cw + W0 / 2;
  const cy0 = (geom.y / 100) * ch + H0 / 2;
  const th = ((g.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);

  // Finger movement in the element's local axes
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const isCorner = sx !== 0 && sy !== 0;
  const keepAspect =
    (elem.type === 'image' && (isCorner || !!(elem.lockAspect ?? elem.keepAspect))) ||
    (elem.type === 'table' && !!elem.lockAspect);
  const minW = (MIN_ELEM_PERCENT / 100) * cw;
  const minH = (MIN_ELEM_PERCENT / 100) * ch;
  const hasText = elem.type === 'text' && elem.text && elem.text.trim();

  const textMinHeightPx = (wPx) => {
    if (!hasText) return 0;
    const meas = measureElementLayout({ ...elem, width: (wPx / cw) * 100 }, g.fontPt);
    const neededPercent = Math.ceil((meas.totalHeightPt / SLIDE.heightPt) * 100) + 2;
    return (neededPercent / 100) * ch;
  };

  const sizeFor = (tx, ty) => {
    const mx = lx * tx;
    const my = ly * ty;
    let w = W0;
    let h = H0;
    if (keepAspect) {
      let s;
      if (isCorner) {
        // Project the drag onto the box diagonal
        s = 1 + (sx * mx * W0 + sy * my * H0) / (W0 * W0 + H0 * H0);
      } else if (sx !== 0) {
        s = (W0 + sx * mx) / W0;
      } else {
        s = (H0 + sy * my) / H0;
      }
      s = Math.max(s, minW / W0, minH / H0);
      w = W0 * s;
      h = H0 * s;
    } else {
      if (sx !== 0) w = Math.max(minW, W0 + sx * mx);
      if (sy !== 0) h = Math.max(minH, H0 + sy * my);
    }
    // Text: width re-wraps, font size stays; height never smaller than the text needs
    if (hasText) h = Math.max(h, textMinHeightPx(w));

    // Opposite side/corner stays fixed on screen (local anchor rotated into screen space).
    // A text box that auto-grows from a left/right handle keeps its top edge fixed.
    const vy = sy !== 0 ? sy : (hasText && h !== H0 ? 1 : 0);
    const ax = (-sx * W0) / 2;
    const ay = (-vy * H0) / 2;
    const anchorX = cx0 + ax * cos - ay * sin;
    const anchorY = cy0 + ax * sin + ay * cos;
    const bx = (-sx * w) / 2;
    const by = (-vy * h) / 2;
    const ncx = anchorX - (bx * cos - by * sin);
    const ncy = anchorY - (bx * sin + by * cos);

    return {
      x: ((ncx - w / 2) / cw) * 100,
      y: ((ncy - h / 2) / ch) * 100,
      width: (w / cw) * 100,
      height: (h / ch) * 100,
      keepAspect,
    };
  };

  const EPS = 0.05;
  const inside = (r) =>
    r.x >= -EPS &&
    r.y >= (g.minY || 0) - EPS &&
    r.x + r.width <= 100 + EPS &&
    r.y + r.height <= 100 + EPS;

  const full = sizeFor(1, 1);
  if (inside(full) || !inside(sizeFor(0, 0))) return full;

  // Keep the element inside the slide: shrink the drag per local axis as little as needed
  const maxT = (fn) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (inside(fn(mid))) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const tx = inside(sizeFor(1, 0)) ? 1 : maxT((t) => sizeFor(t, 0));
  const ty = inside(sizeFor(tx, 1)) ? 1 : maxT((t) => sizeFor(tx, t));
  return sizeFor(tx, ty);
}

/**
 * Resize with snapping: the moving edge(s) snap to the candidate lines (px). The finger delta
 * is corrected and the geometry recomputed, so text auto-height / aspect rules still apply.
 * Unrotated elements only. Returns { r, gx, gy } (gx / gy: snap lines the edges sit on).
 */
export function snapResizeGeometry(g, dx, dy) {
  let r = computeResizeGeometry(g, dx, dy);
  if (!g.lines) return { r, gx: [], gy: [] };
  const { sx, sy } = g.handle;
  const { cw, ch } = g;
  const edgeX = (rr) => ((sx < 0 ? rr.x : rr.x + rr.width) / 100) * cw;
  const edgeY = (rr) => ((sy < 0 ? rr.y : rr.y + rr.height) / 100) * ch;
  let axes = [];
  if (sx !== 0) axes.push('x');
  if (sy !== 0) axes.push('y');
  if (r.keepAspect && axes.length === 2) {
    // Width and height move together: snap only the edge that is closer to a line
    const snX = nearestSnap([edgeX(r)], g.lines.xs, SNAP_THRESHOLD_PX);
    const snY = nearestSnap([edgeY(r)], g.lines.ys, SNAP_THRESHOLD_PX);
    if (snX && (!snY || Math.abs(snX.offset) <= Math.abs(snY.offset))) axes = ['x'];
    else if (snY) axes = ['y'];
    else axes = [];
  }
  let ddx = dx;
  let ddy = dy;
  axes.forEach((ax) => {
    const isX = ax === 'x';
    const edge = isX ? edgeX(r) : edgeY(r);
    const sn = nearestSnap([edge], isX ? g.lines.xs : g.lines.ys, SNAP_THRESHOLD_PX);
    if (!sn) return;
    // How far the edge moves per finger pixel on this axis (1 for a plain resize)
    const probe = isX ? computeResizeGeometry(g, ddx + 1, ddy) : computeResizeGeometry(g, ddx, ddy + 1);
    const k = (isX ? edgeX(probe) : edgeY(probe)) - edge;
    if (Math.abs(k) < 0.05) return;
    if (isX) ddx += sn.offset / k;
    else ddy += sn.offset / k;
    r = computeResizeGeometry(g, ddx, ddy);
  });
  return {
    r,
    gx: sx !== 0 ? linesTouching([edgeX(r)], g.lines.xs) : [],
    gy: sy !== 0 ? linesTouching([edgeY(r)], g.lines.ys) : [],
  };
}

export const sameLines = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------------------------------------------------------------- move

/**
 * One drag step of a move, with snapping. The X axis and the Y axis follow exactly the same
 * steps (snap the left / center / right, resp. top / middle / bottom of the rotated bounds to the
 * nearest candidate line within the threshold, then keep the box inside the slide).
 * m: { x, y, width, height (slide %), hPx (on-screen height), rotation, minY (%), cw, ch, lines }
 * (dx, dy): finger movement in px. Returns { x, y (rounded %), gx, gy (snap lines the element sits on, px) }.
 */
export function computeSnappedMove(m, dx, dy, threshold = SNAP_THRESHOLD_PX) {
  const { cw, ch, lines } = m;
  const wPx = (m.width / 100) * cw;
  const hPx = m.hPx !== undefined ? m.hPx : (m.height / 100) * ch;
  const rot = m.rotation || 0;
  const minY = m.minY || 0;
  let leftPx = (m.x / 100) * cw + dx;
  let topPx = (Math.max(minY, m.y) / 100) * ch + dy;
  if (lines) {
    const b = rotatedBoundsPx(leftPx, topPx, wPx, hPx, rot);
    const snX = nearestSnap([b.l, b.cx, b.r], lines.xs, threshold);
    const snY = nearestSnap([b.t, b.cy, b.b], lines.ys, threshold);
    if (snX) leftPx += snX.offset;
    if (snY) topPx += snY.offset;
  }
  const newX = Math.max(0, Math.min(100 - m.width, (leftPx / cw) * 100));
  const newY = Math.max(minY, Math.min(100 - m.height, (topPx / ch) * 100));
  let gx = [];
  let gy = [];
  if (lines) {
    const fb = rotatedBoundsPx((newX / 100) * cw, (newY / 100) * ch, wPx, hPx, rot);
    gx = linesTouching([fb.l, fb.cx, fb.r], lines.xs);
    gy = linesTouching([fb.t, fb.cy, fb.b], lines.ys);
  }
  return { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10, gx, gy };
}

// ---------------------------------------------------------------- snap engage (haptic tick)

/**
 * Which snap lines the element touches now (gx: X lines, gy: Y lines, px) and whether one of
 * them is NEW compared with the previous move (prevKeys). Staying on the same line is not new;
 * leaving every line resets, so snapping to it again later counts as new.
 * Returns { keys, engaged }.
 */
export function snapEngageKeys(prevKeys, gx, gy) {
  const keys = [...(gx || []).map((x) => `x${x}`), ...(gy || []).map((y) => `y${y}`)];
  const prev = prevKeys || [];
  const engaged = keys.some((k) => !prev.includes(k));
  return { keys, engaged };
}
