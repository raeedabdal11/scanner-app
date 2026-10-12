// Usage: node ppt/scripts/exportTableTest.mjs [out.pptx]
// Exports 3 slides with tables through the real exporter and validates the PPTX XML:
//  1) 5x4 table, gallery style "medium1_1", header + total row + first column + banded rows/cols,
//     a 2x2 merge and a 1x3 merge (gridSpan / rowSpan / hMerge / vMerge), a cell gradient,
//     a transparent cell, Kurdish + escaped text, multi-line cell
//  2) 3x3 table, "modern_gradient" style, dashed border preset, table shadow + background
//  3) an OLD saved table (first table version: styleKey "primary", old style field names)
import { register, createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
register('./hooks.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const T = await import('../tableModel.js');

// ---- slide 1
let t1 = T.createTableElement({ rows: 5, cols: 4, x: 5, y: 5, width: 90, zIndex: 2 });
t1 = T.applyTableStyle(t1, T.getTableStyleByKey('medium1_1'));
['totalRow', 'firstCol', 'bandRows', 'bandCols'].forEach((k) => { t1 = T.setTableOption(t1, k, true); });
const texts = [
  ['ناو', 'تەمەن', 'شار', 'تێبینی'],
  ['ئاراس', '٢٥', 'هەولێر', 'باش'],
  ['شیلان', '٣١', 'سلێمانی\nبازاڕ', ''],
  ['Ali & <Co>', '40', 'دهۆک', ''],
  ['کۆ', '', '', '٩٦'],
];
texts.forEach((row, r) => row.forEach((t, c) => { t1 = T.setCellText(t1, r, c, t); }));
t1 = T.mergeCells(t1, { r1: 2, c1: 2, r2: 3, c2: 3 }); // 2x2
t1 = T.mergeCells(t1, { r1: 4, c1: 0, r2: 4, c2: 2 }); // 1x3 (total row label)
t1 = T.setCellsProps(t1, { r1: 1, c1: 0, r2: 1, c2: 0 }, { fill: '#ffc000', fill2: '#c00000', color: '#000000', bold: true, align: 'center' });
t1 = T.setCellsProps(t1, { r1: 1, c1: 1, r2: 1, c2: 1 }, { fill: '#0070c0', fillAlpha: 50, valign: 'top', dir: 'ltr', pad: 8 });

// ---- slide 2
let t2 = T.createTableElement({ rows: 3, cols: 3, x: 10, y: 10, width: 80, zIndex: 1 });
t2 = T.applyTableStyle(t2, T.getTableStyleByKey('modern_gradient'));
t2 = T.applyBorderPreset(t2, { r1: 1, c1: 0, r2: 2, c2: 2 }, 'inside', { color: '#ff0000', width: 2, dash: 'dash' });
t2 = { ...t2, shadow: { offset: 3, blur: 6, opacity: 0.4, color: '#000000' }, bgFill: '#fff2cc' };

// ---- slide 3: old saved data
const legacy = {
  id: 'legacy_tbl', type: 'table', x: 10, y: 10, width: 80, height: 30, zIndex: 1, rotation: 0,
  rows: 2, cols: 2, colWidths: [0.5, 0.5], rowHeights: [0.5, 0.5],
  cells: [[{ text: 'سەردێڕ' }, { text: 'دوو' }], [{ text: 'یەک', fill: '#00ff00' }, { text: '' }]],
  headerRow: true, bandRows: true, styleKey: 'primary',
  style: { headerFill: '#4472c4', headerTextColor: '#ffffff', bodyFill: '#dae3f3', altRowFill: '#b4c7e7', bodyTextColor: '#1c1c1e', borderColor: '#ffffff', borderWidth: 1 },
  fontSize: 14, kurdishFont: 'Tahoma',
};

const presentation = {
  aspectRatio: '16:9',
  slides: [
    { id: 's1', background: '#ffffff', elements: [t1] },
    { id: 's2', background: '#ffffff', elements: [t2] },
    { id: 's3', background: '#ffffff', elements: [legacy] },
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
const [x1, x2, x3] = [await slideXml(1), await slideXml(2), await slideXml(3)];

const count = (xml, re) => (xml.match(re) || []).length;
const parseErrors = (xml) => {
  const errors = [];
  new DOMParser({ onError: (level, msg) => { if (level !== 'warning') errors.push(String(msg).split('\n')[0]); } })
    .parseFromString(xml, 'application/xml');
  return errors;
};

// <a:tcPr> children must follow the schema order
const TCPR_ORDER = { lnL: 1, lnR: 2, lnT: 3, lnB: 4, lnTlToBr: 5, lnBlToTr: 6, cell3D: 7, noFill: 8, solidFill: 8, gradFill: 8, blipFill: 8, pattFill: 8, grpFill: 8, headers: 9, extLst: 10 };
const tcPrOrderOk = (xml) => {
  // Opening tags only (covered merge cells use an empty self-closing <a:tcPr/>)
  const blocks = xml.match(/<a:tcPr\b(?:[^>]*[^/>])?>[\s\S]*?<\/a:tcPr>/g) || [];
  return blocks.every((block) => {
    const inner = block.replace(/^<a:tcPr[^>]*>/, '').replace(/<\/a:tcPr>$/, '');
    // top-level children only: strip nested content of each child
    const names = [];
    let depth = 0;
    for (const m of inner.matchAll(/<(\/?)a:([A-Za-z0-9]+)([^>]*?)(\/?)>/g)) {
      const [, close, name, , selfClose] = m;
      if (close) { depth--; continue; }
      if (depth === 0) names.push(name);
      if (!selfClose) depth++;
    }
    let last = 0;
    return names.every((n) => {
      const o = TCPR_ORDER[n];
      if (!o || o < last) return false;
      last = o;
      return true;
    });
  });
};
const gridMatchesExt = (xml) => {
  const cols = [...xml.matchAll(/<a:gridCol w="(\d+)"\/>/g)].reduce((s, m) => s + Number(m[1]), 0);
  const ext = xml.match(/<p:graphicFrame>[\s\S]*?<a:ext cx="(\d+)"/);
  return ext && Number(ext[1]) === cols;
};
const noDecimals = (xml) => !/<a:(?:gridCol w|tr h)="\d+\.\d+"/.test(xml) && !/ (?:marL|marR|marT|marB|w|dist|blurRad)="\d+\.\d+"/.test(xml);

const checks = [
  ['slide 1: one <a:tbl>', count(x1, /<a:tbl>/g) === 1],
  ['slide 1: 5 <a:tr>', count(x1, /<a:tr\b/g) === 5],
  ['slide 1: 20 <a:tc> (covered cells included)', count(x1, /<a:tc\b/g) === 20],
  ['slide 1: 4 <a:gridCol>', count(x1, /<a:gridCol\b/g) === 4],
  ['slide 1: 2x2 merge anchor gridSpan="2" rowSpan="2"', /<a:tc gridSpan="2" rowSpan="2">/.test(x1)],
  ['slide 1: 1x3 merge anchor gridSpan="3"', /<a:tc gridSpan="3">/.test(x1)],
  ['slide 1: hMerge cells = 4', count(x1, /<a:tc[^>]*hMerge="1"/g) === 4],
  ['slide 1: vMerge cells = 2', count(x1, /<a:tc[^>]*vMerge="1"/g) === 2],
  ['slide 1: merged text joined', x1.includes('<a:t>سلێمانی</a:t>') && x1.includes('<a:t>بازاڕ</a:t>')],
  ['slide 1: header/total/first col/band flags in tblPr', /<a:tblPr firstRow="1" lastRow="1" firstCol="0" lastCol="1" bandRow="1" bandCol="1"/.test(x1)],
  ['slide 1: gradient cell fill', /<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="FFC000"\/>/.test(x1)],
  ['slide 1: 50% transparent cell', x1.includes('<a:srgbClr val="0070C0"><a:alpha val="50000"/></a:srgbClr>')],
  ['slide 1: top anchor + 8pt margins', /marL="101600" marR="101600" marT="101600" marB="101600" anchor="t"/.test(x1)],
  ['slide 1: LTR cell paragraph', /<a:pPr algn="r" rtl="0"\/>/.test(x1)],
  ['slide 1: Kurdish runs lang="ar-IQ"', /<a:rPr lang="ar-IQ"[^>]*>[\s\S]*?<\/a:rPr><a:t>ناو<\/a:t>/.test(x1)],
  ['slide 1: special characters escaped', x1.includes('Ali &amp; &lt;Co&gt;')],
  ['slide 2: gradient header (style)', count(x2, /<a:gradFill/g) === 3],
  ['slide 2: dashed inside borders', count(x2, /<a:prstDash val="dash"\/>/g) > 0],
  ['slide 2: table background + shadow in tblPr', /<a:tblPr[^>]*><a:solidFill><a:srgbClr val="FFF2CC"\/><\/a:solidFill><a:effectLst><a:outerShdw/.test(x2)],
  ['slide 3: old table migrated (header 4472C4, cell override 00FF00)', x3.includes('<a:srgbClr val="4472C4"/>') && x3.includes('<a:srgbClr val="00FF00"/>')],
  ['all: <a:tcPr> children in schema order', [x1, x2, x3].every(tcPrOrderOk)],
  ['all: gridCol widths add up to the frame width', [x1, x2, x3].every(gridMatchesExt)],
  ['all: integer EMU sizes only', [x1, x2, x3].every(noDecimals)],
  ['all: no leftover APP_TABLE placeholder', ![x1, x2, x3].some((x) => x.includes('APP_TABLE_'))],
  ['all: slide XML parses without errors', [x1, x2, x3].every((x) => parseErrors(x).length === 0)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
const errs = [x1, x2, x3].flatMap(parseErrors);
if (errs.length) console.log('XML errors:', errs.slice(0, 5).join(' | '));
console.log(`gallery styles: ${T.buildTableStyles().length}`);
if (failed) {
  console.log(`FAIL: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('OK: tables exported as real PowerPoint tables');
