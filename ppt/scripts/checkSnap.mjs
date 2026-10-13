// Usage: node ppt/scripts/checkSnap.mjs
// Feeds the REAL snapping functions used by the canvas (snapGeometry.js: computeSnappedMove,
// snapResizeGeometry, snapEngageKeys, snapRotation) with elements near the slide's left / right
// edge, horizontal center, top / bottom edge, vertical center and next to another element, and
// prints the snapped x and y. Canvas size = Redmi Note 11 Pro (392.7 dp window - 24 => 368.7 x
// 207.4 px, 16:9). Snapping is silent (no guide lines); "on" = the snap lines the element sits on.
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);

const G = await import('../snapGeometry.js');

const cw = 392.7 - 24;
const ch = (cw * 9) / 16;
const px = (pct, axis) => Math.round(((pct / 100) * (axis === 'x' ? cw : ch)) * 10) / 10;
const r1 = (v) => Math.round(v * 10) / 10;

// Another element on the slide: a shape at x 60..80 %, y 10..30 %
const other = { id: 'other', ...G.rotatedBoundsPx(px(60, 'x'), px(10, 'y'), px(20, 'x'), px(20, 'y'), 0) };
const linesFor = (snapOn) => (snapOn ? G.buildSnapLines([other], 'drag', cw, ch) : null);
const elem = (x, y, w = 15, h = 20) => ({ x, y, width: w, height: h, rotation: 0, minY: 0, cw, ch });

let failed = 0;
const near = (a, b) => Math.abs(a - b) < 0.051;
const report = (label, ok, text) => {
  if (!ok) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(56)} ${text}`);
};

console.log(`canvas ${cw.toFixed(1)} x ${ch.toFixed(1)} px, threshold ${G.SNAP_THRESHOLD_PX} px`);
console.log(`X snap lines: ${JSON.stringify(linesFor(true).xs)}  (slide 0 / center / right + other element left / center / right)`);
console.log(`Y snap lines: ${JSON.stringify(linesFor(true).ys)}  (slide 0 / middle / bottom + other element top / middle / bottom)\n`);

// move(label, element, dx, dy, expected { x?, y? }, snapOn)
const move = (label, e, dx, dy, expect, snapOn = true) => {
  const r = G.computeSnappedMove({ ...e, lines: linesFor(snapOn) }, dx, dy);
  const ok = (expect.x === undefined || near(r.x, expect.x)) && (expect.y === undefined || near(r.y, expect.y));
  report(`move: ${label}`, ok, `-> x ${r.x}%, y ${r.y}%  on X ${JSON.stringify(r.gx.map(r1))} Y ${JSON.stringify(r.gy.map(r1))}`);
  return r;
};

console.log('-- X axis (horizontal)');
move('left edge 4 px from slide left edge', elem(5, 50), -px(5, 'x') + 4, 0, { x: 0, y: 50 });
move('right edge 4 px from slide right edge', elem(80, 50), px(5, 'x') - 4, 0, { x: 85, y: 50 });
move('center 3 px from slide horizontal center', elem(40, 50), px(2.5, 'x') + 3, 0, { x: 42.5, y: 50 });
move('left edge 3 px from other element right edge', elem(70, 50), px(10, 'x') + 3, 0, { x: 80 });
move('right edge 3 px from other element left edge', elem(40, 50), px(5, 'x') - 3, 0, { x: 45 });
move('center 4 px from other element center', elem(50, 50), px(12.5, 'x') - 4, 0, { x: 62.5 });
move('8 px from every X line: no snap', elem(20, 50), 8, 0, { x: r1(20 + (8 / cw) * 100) });
console.log('-- Y axis (vertical)');
move('top edge 4 px from slide top', elem(20, 5), 0, -px(5, 'y') + 4, { x: 20, y: 0 });
move('bottom edge 4 px from slide bottom', elem(20, 75), 0, px(5, 'y') - 4, { x: 20, y: 80 });
move('middle 3 px from slide vertical center', elem(20, 38), 0, px(2, 'y') + 3, { x: 20, y: 40 });
move('top edge 4 px from other element bottom', elem(20, 25), 0, px(5, 'y') + 4, { y: 30 });
console.log('-- both axes / OFF');
move('near the slide center on X and Y', elem(41, 41), px(1.5, 'x') + 4, -px(1, 'y') - 3, { x: 42.5, y: 40 });
move('OFF: 4 px from slide left edge stays put', elem(5, 50), -px(5, 'x') + 4, 0, { x: r1((4 / cw) * 100) }, false);
move('OFF: near the slide center stays put', elem(40, 38), px(2.5, 'x') + 5, px(2, 'y') + 3, { x: r1(42.5 + (5 / cw) * 100), y: r1(40 + (3 / ch) * 100) }, false);

console.log('-- resize (handles)');
const handles = { ml: { sx: -1, sy: 0 }, mr: { sx: 1, sy: 0 }, tc: { sx: 0, sy: -1 }, bc: { sx: 0, sy: 1 }, br: { sx: 1, sy: 1 }, tl: { sx: -1, sy: -1 } };
const resize = (label, type, handle, geom, dx, dy, expect, snapOn = true) => {
  const g = { handle: handles[handle], elem: { type, text: '' }, geom, rotation: 0, minY: 0, fontPt: 18, cw, ch, lines: linesFor(snapOn) };
  const { r } = G.snapResizeGeometry(g, dx, dy);
  const ok = Object.entries(expect).every(([k, v]) => near({ x: r.x, y: r.y, w: r.width, h: r.height }[k], v));
  report(`resize ${handle} (${type}): ${label}`, ok, `-> x ${r1(r.x)} y ${r1(r.y)} w ${r1(r.width)} h ${r1(r.height)}`);
};
resize('right edge 4 px from slide right', 'shape', 'mr', { x: 30, y: 40, w: 60, h: 20 }, px(10, 'x') - 4, 0, { x: 30, w: 70 });
resize('left edge 4 px from other element left', 'image', 'ml', { x: 65, y: 40, w: 20, h: 20 }, -px(5, 'x') + 4, 0, { x: 60, w: 25 });
resize('top edge 3 px from slide middle', 'table', 'tc', { x: 10, y: 55, w: 30, h: 30 }, 0, -px(5, 'y') + 3, { y: 50, h: 35 });
resize('bottom edge 4 px from slide bottom', 'text', 'bc', { x: 10, y: 40, w: 30, h: 50 }, 0, px(10, 'y') - 4, { y: 40, h: 60 });
resize('corner: right edge 4 px from slide center', 'smartart', 'br', { x: 10, y: 50, w: 35, h: 30 }, px(5, 'x') - 4, 0, { x: 10, w: 40 });
resize('corner: left edge 3 px from slide left', 'shape', 'tl', { x: 5, y: 50, w: 30, h: 30 }, -px(5, 'x') + 3, 0, { x: 0, w: 35 });
resize('OFF: right edge 4 px from slide right stays put', 'shape', 'mr', { x: 30, y: 40, w: 60, h: 20 }, px(10, 'x') - 4, 0, { w: 70 - (4 / cw) * 100 }, false);

console.log('-- haptic tick (once per NEW snap line)');
let keys = [];
const step = (label, e, dx, dy, expectTick, snapOn = true) => {
  const r = G.computeSnappedMove({ ...e, lines: linesFor(snapOn) }, dx, dy);
  const eng = G.snapEngageKeys(keys, r.gx, r.gy);
  keys = eng.keys;
  report(`tick: ${label}`, eng.engaged === expectTick, `-> ${eng.engaged ? 'TICK' : 'silent'} (on ${JSON.stringify(eng.keys)})`);
};
const base = elem(10, 47); // x 10..25 %, y 47..67 %: far from every line
const toCenter = cw / 2 - px(17.5, 'x'); // finger move that puts its center on the slide center
step('free move, no snap line', base, 20, 0, false);
step('reaches the slide center: tick', base, toCenter + 3, 0, true);
step('still on the center line: no repeat', base, toCenter + 1, 0, false);
step('leaves every line', base, 20, 0, false);
step('back on the center line: tick again', base, toCenter - 2, 0, true);
keys = [];
step('OFF: near the center, never a tick', base, toCenter + 3, 0, false, false);

console.log('-- rotation (0 / 45 / 90 / 135 / 180 ... within 3 degrees)');
[[44, 45], [41, 41], [88, 90], [133.5, 135], [182, 180], [358, 0], [10, 10]].forEach(([inp, exp]) => {
  const got = G.snapRotation(inp);
  report(`rotation ${inp} deg`, got === exp, `-> ${got} deg`);
});
G.setSnapEnabled(false);
report('rotation OFF: 44 deg stays 44', G.snapRotation(44) === 44, `-> ${G.snapRotation(44)} deg`);
G.setSnapEnabled(true);

if (failed) {
  console.log(`\nFAIL: ${failed} case(s)`);
  process.exit(1);
}
console.log('\nOK: X and Y snap the same way (move + resize), one tick per new snap, OFF disables all');
