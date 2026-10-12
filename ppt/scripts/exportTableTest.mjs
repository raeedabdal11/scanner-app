// Usage: node ppt/scripts/exportTableTest.mjs [out.pptx]
// Exports one slide with a 4x3 table (Kurdish text, a multi-line cell, cell overrides) through the
// real exporter, unzips it and checks: one <a:tbl>, 4 <a:tr>, 12 <a:tc>, 3 <a:gridCol>, RTL table,
// ar-IQ runs, integer EMUs, no leftover placeholder, and that every slide XML parses cleanly.
import { register, createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
register('./hooks.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const { createTableElement, setCellText, setCellProps } = await import('../tableModel.js');

let table = createTableElement({ rows: 4, cols: 3, x: 10, y: 15, width: 80, zIndex: 2 });
const texts = [
  ['ناو', 'تەمەن', 'شار'],
  ['ئاراس', '٢٥', 'هەولێر'],
  ['شیلان', '٣١', 'سلێمانی\nبازاڕ'],
  ['Ali & <Co>', '40', 'دهۆک'],
];
texts.forEach((row, r) => row.forEach((t, c) => { table = setCellText(table, r, c, t); }));
table = setCellProps(table, [{ r: 1, c: 0 }], { fill: '#ffc000', color: '#000000', bold: true, align: 'center' });

const presentation = {
  aspectRatio: '16:9',
  slides: [{
    id: 's1',
    background: '#ffffff',
    elements: [
      { id: 't1', type: 'text', x: 5, y: 2, width: 90, height: 10, zIndex: 1, text: 'خشتەی تاقیکردنەوە',
        fontMode: 'auto', fontWeight: 'bold', textAlign: 'right', writingDirection: 'rtl' },
      table,
    ],
  }],
};

const origLog = console.log;
if (!process.env.VERBOSE) console.log = (...a) => { if (/PPTX-CHECK|Validation|error|Error/.test(String(a[0]))) origLog(...a); };
await exportPresentationToPptxSafe();
console.log = origLog;

async function exportPresentationToPptxSafe() {
  const { exportPresentationToPptx } = await import('../pptExporter.js');
  await exportPresentationToPptx(presentation);
}

const bytes = globalThis.__pptxOut;
if (!bytes) {
  console.error('FAIL: exporter produced no file');
  process.exit(2);
}
if (process.argv[2]) writeFileSync(process.argv[2], bytes);

const zip = await JSZip.loadAsync(bytes);
const xml = await zip.file('ppt/slides/slide1.xml').async('string');

const errors = [];
const parser = new DOMParser({
  onError: (level, msg) => { if (level !== 'warning') errors.push(String(msg).split('\n')[0]); },
});
parser.parseFromString(xml, 'application/xml');

const count = (re) => (xml.match(re) || []).length;
const checks = [
  ['<a:tbl> count = 1', count(/<a:tbl>/g) === 1],
  ['<a:tr> count = 4', count(/<a:tr\b/g) === 4],
  ['<a:tc> count = 12', count(/<a:tc>/g) === 12],
  ['<a:gridCol> count = 3', count(/<a:gridCol\b/g) === 3],
  ['graphicFrame uses the table graphicData uri', xml.includes('graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"')],
  ['table is RTL (<a:tblPr rtl="1">)', /<a:tblPr rtl="1"/.test(xml)],
  ['Kurdish runs are lang="ar-IQ"', /<a:rPr lang="ar-IQ"[^>]*>[\s\S]*?<\/a:rPr><a:t>ناو<\/a:t>/.test(xml)],
  ['multi-line cell = 2 paragraphs', /<a:t>سلێمانی<\/a:t><\/a:r><\/a:p><a:p>/.test(xml)],
  ['cell override fill FFC000', xml.includes('<a:srgbClr val="FFC000"/></a:solidFill></a:tcPr>')],
  ['special characters escaped', xml.includes('Ali &amp; &lt;Co&gt;')],
  ['integer EMU sizes only', !/<a:(?:gridCol w|tr h)="\d+\.\d+"/.test(xml) && !/<a:ext cx="[^"]*\./.test(xml)],
  ['no leftover APP_TABLE placeholder', !xml.includes('APP_TABLE_')],
  ['slide XML parses without errors', errors.length === 0],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
if (errors.length) console.log('XML errors:', errors.slice(0, 5).join(' | '));
if (failed) {
  console.log(`FAIL: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('OK: table exported as a real PowerPoint table');
