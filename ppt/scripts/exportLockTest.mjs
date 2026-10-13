// Usage: node ppt/scripts/exportLockTest.mjs [out.pptx]
// Exports locked elements through the real exporter and validates the PPTX XML:
//  slide 1: locked text box, locked shape, locked picture, locked table + one UNLOCKED shape
//  slide 2: locked SmartArt (group + its shapes)
// Checks the lock elements (a:spLocks / a:picLocks / a:graphicFrameLocks / a:grpSpLocks), that each
// one is the FIRST child of its non-visual properties (schema order), and that the XML parses.
// Also checks the editor-side lock / snap / alignment helpers (elementLock.js, snapGeometry.js).
import { register, createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
register('./hooks.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const T = await import('../tableModel.js');
const SA = await import('../smartart/engine.js');
const L = await import('../elementLock.js');
const G = await import('../snapGeometry.js');

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const lockedText = {
  id: 'txt1', type: 'text', x: 5, y: 5, width: 40, height: 14, zIndex: 1, locked: true,
  text: 'دەقی قفڵکراو', fontMode: 'auto', textAlign: 'right', writingDirection: 'rtl', maxFontPt: 24,
};
const lockedShape = {
  id: 'shp1', type: 'shape', shapeType: 'roundRect', x: 55, y: 5, width: 30, height: 20, zIndex: 2, locked: true,
  fill: '#4472C4', outline: { color: '#2F528F', width: 2 }, opacity: 1, rotation: 0, cornerRadius: 20,
  text: 'شێوە', textColor: '#FFFFFF', fontSize: 18,
};
const freeShape = {
  id: 'shp2', type: 'shape', shapeType: 'ellipse', x: 70, y: 70, width: 15, height: 15, zIndex: 3, locked: false,
  fill: '#ed7d31', outline: { color: '#000000', width: 0 }, opacity: 1, rotation: 0,
};
const lockedPicture = {
  id: 'img1', type: 'image', uri: PNG_1PX, x: 5, y: 40, width: 20, height: 30, zIndex: 4, locked: true,
  aspectRatio: 1, rotation: 0, fit: 'fill', crop: { top: 0, bottom: 0, left: 0, right: 0 },
  borderRadius: 0, border: { color: 'transparent', width: 0 }, opacity: 1,
};
let lockedTable = T.createTableElement({ rows: 2, cols: 2, x: 40, y: 40, width: 40, zIndex: 5 });
lockedTable = { ...T.setCellText(lockedTable, 1, 0, 'خانە'), locked: true };
const lockedSmartArt = {
  ...SA.createSmartArtElement({ items: [{ text: 'یەک' }, { text: 'دوو' }, { text: 'سێ' }] }),
  locked: true,
};

const presentation = {
  aspectRatio: '16:9',
  slides: [
    { id: 's1', background: '#ffffff', elements: [lockedText, lockedShape, freeShape, lockedPicture, lockedTable] },
    { id: 's2', background: '#ffffff', elements: [lockedSmartArt] },
  ],
};

const origLog = console.log;
if (!process.env.VERBOSE) console.log = (...a) => { if (/PPTX-CHECK|Validation|error|Error/.test(String(a[0]))) origLog(...a); };
const { exportPresentationToPptx } = await import('../pptExporter.js');
await exportPresentationToPptx(presentation);
console.log = origLog;

const bytes = globalThis.__pptxOut;
if (!bytes) {
  console.error('FAIL: exporter produced no file');
  process.exit(2);
}
if (process.argv[2]) writeFileSync(process.argv[2], bytes);
const zip = await JSZip.loadAsync(bytes);
const slideXml = async (n) => zip.file(`ppt/slides/slide${n}.xml`).async('string');
const [x1, x2] = [await slideXml(1), await slideXml(2)];

const count = (xml, re) => (xml.match(re) || []).length;
const parseErrors = (xml) => {
  const errors = [];
  new DOMParser({ onError: (level, msg) => { if (level !== 'warning') errors.push(String(msg).split('\n')[0]); } })
    .parseFromString(xml, 'application/xml');
  return errors;
};

// The <p:sp> / <p:pic> whose <p:cNvPr name> matches
const blockByName = (xml, tag, nameRe) => {
  const blocks = xml.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g')) || [];
  return blocks.find((b) => nameRe.test((b.match(/<p:cNvPr [^>]*name="([^"]*)"/) || [])[1] || '')) || '';
};
// Every lock element must be the first child of its parent (only extLst may follow)
const locksFirst = (xml) => {
  const pairs = [
    ['p:cNvSpPr', 'a:spLocks'],
    ['p:cNvPicPr', 'a:picLocks'],
    ['p:cNvGrpSpPr', 'a:grpSpLocks'],
    ['p:cNvGraphicFramePr', 'a:graphicFrameLocks'],
  ];
  return pairs.every(([parent, lock]) => {
    const blocks = xml.match(new RegExp(`<${parent}\\b[^>]*[^/]>[\\s\\S]*?<\\/${parent}>`, 'g')) || [];
    return blocks.every((b) => {
      if (!b.includes(`<${lock}`)) return true;
      const inner = b.replace(/^<[^>]*>/, '');
      return inner.startsWith(`<${lock} `) && count(b, new RegExp(`<${lock}\\b`, 'g')) === 1;
    });
  });
};

const SP_LOCK = '<a:spLocks noMove="1" noResize="1" noRot="1" noChangeAspect="0" noSelect="0"/>';
const textSp = blockByName(x1, 'p:sp', /^Locked Text \d+$/);
const shapeSp = blockByName(x1, 'p:sp', /^APP_SHAPE_0$/);
const freeSp = blockByName(x1, 'p:sp', /^APP_SHAPE_1$/);
const pic = blockByName(x1, 'p:pic', /^Locked Picture \d+$/);

const checks = [
  ['slide 1: locked text box has spLocks first in cNvSpPr', /<p:cNvSpPr(?: txBox="1")?>/.test(textSp) && textSp.includes(`${SP_LOCK}</p:cNvSpPr>`)],
  ['slide 1: locked shape has spLocks in cNvSpPr', shapeSp.includes(`<p:cNvSpPr>${SP_LOCK}</p:cNvSpPr>`)],
  ['slide 1: unlocked shape has no lock', !!freeSp && !freeSp.includes('Locks')],
  ['slide 1: locked picture has picLocks (move/resize/rotate, aspect kept)', /<p:cNvPicPr><a:picLocks noMove="1" noResize="1" noRot="1" noChangeAspect="1" noSelect="0"\/><\/p:cNvPicPr>/.test(pic)],
  ['slide 1: locked table has graphicFrameLocks noMove/noResize', /<a:graphicFrameLocks noGrp="1" noMove="1" noResize="1"\/>/.test(x1)],
  ['slide 1: exactly 2 spLocks + 1 picLocks', count(x1, /<a:spLocks\b/g) === 2 && count(x1, /<a:picLocks\b/g) === 1],
  ['slide 2: locked SmartArt group has grpSpLocks', /<p:cNvGrpSpPr><a:grpSpLocks noUngrp="1" noMove="1" noResize="1" noRot="1" noChangeAspect="0" noSelect="0"\/><\/p:cNvGrpSpPr>/.test(x2)],
  ['slide 2: every SmartArt shape is locked', count(x2, /<p:sp>/g) > 0 && count(x2, /<a:spLocks\b/g) === count(x2, /<p:sp>/g)],
  ['all: lock element is the first child (schema order)', [x1, x2].every(locksFirst)],
  ['all: no leftover APP_LOCK marker', ![x1, x2].some((x) => x.includes('APP_LOCK_'))],
  ['all: slide XML parses without errors', [x1, x2].every((x) => parseErrors(x).length === 0)],
];

// ---- editor-side helpers (lock rules, alignment, snapping)
const moved = { ...lockedShape, x: lockedShape.x + 5 };
const restyled = { ...lockedShape, fill: '#ff0000' };
const unlocked = { ...lockedShape, locked: false };
const tableEdited = T.setCellText(lockedTable, 0, 0, 'گۆڕاو');
const aligned = G.alignElementToSlide({ ...freeShape, x: 10, y: 10 }, 'right', 405);
const centered = G.alignElementToSlide({ ...freeShape, x: 10, y: 10 }, 'center', 405);
const wide = G.alignElementToSlide({ ...freeShape, lockAspect: false }, 'matchWidth', 405);
const lines = G.buildSnapLines([{ id: 'a', l: 100, cx: 150, r: 200, t: 50, cy: 75, b: 100 }], 'b', 400, 225);
checks.push(
  ['lock: a locked element cannot be moved', L.lockBlocksUpdate(lockedShape, moved) === true],
  ['lock: a locked element can be restyled / unlocked', !L.lockBlocksUpdate(lockedShape, restyled) && !L.lockBlocksUpdate(lockedShape, unlocked)],
  ['lock: locked table cells cannot be edited', L.lockBlocksUpdate(lockedTable, tableEdited) === true],
  ['lock: duplicate copy is unlocked', L.withoutLock(lockedShape).locked === false],
  ['align: right = physical right edge (x + width = 100)', Math.abs(aligned.x + aligned.width - 100) < 0.11],
  ['align: center on slide', Math.abs(centered.x + centered.width / 2 - 50) < 0.11 && Math.abs(centered.y + centered.height / 2 - 50) < 0.11],
  ['align: match slide width', wide.x === 0 && wide.width === 100],
  ['snap: slide center + element edges are candidates', lines.xs.includes(200) && lines.xs.includes(150) && lines.ys.includes(112.5)],
  ['snap: nearest line within 6px', (G.nearestSnap([196], lines.xs) || {}).line === 200 && G.nearestSnap([190], [200]) === null],
  ['snap: rotation 44 -> 45, 40 stays', G.snapRotation(44) === 45 && G.snapRotation(40) === 40 && G.snapRotation(358) === 0],
);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
const errs = [x1, x2].flatMap(parseErrors);
if (errs.length) console.log('XML errors:', errs.slice(0, 5).join(' | '));
if (failed) {
  if (process.env.VERBOSE) console.log(textSp, '\n', shapeSp, '\n', pic);
  console.log(`FAIL: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('OK: locked elements exported with PowerPoint locks');
