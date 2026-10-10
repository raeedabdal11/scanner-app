// Usage: node ppt/scripts/exportShapeTest.mjs <out.pptx>
// Exports one slide with one roundRect shape with text through the real exporter.
import { register } from 'node:module';
import { writeFileSync } from 'node:fs';
register('./hooks.mjs', import.meta.url);

const { exportPresentationToPptx } = await import('../pptExporter.js');

const presentation = {
  aspectRatio: '16:9',
  slides: [{
    id: 's1',
    background: '#ffffff',
    elements: [{
      id: 'e1', type: 'shape', shapeType: 'roundRect',
      x: 20, y: 20, width: 40, height: 30, zIndex: 1,
      fill: '#4472C4', outline: { color: '#2F528F', width: 2 },
      opacity: 1, rotation: 0, cornerRadius: 20,
      text: 'سڵاو', textColor: '#FFFFFF', fontSize: 24, bold: false, kurdishFont: 'Tahoma',
    }],
  }],
};

const origLog = console.log;
if (!process.env.VERBOSE) console.log = (...a) => { if (/PPTX-CHECK|Validation|error|Error/.test(String(a[0]))) origLog(...a); };
await exportPresentationToPptx(presentation);
console.log = origLog;
writeFileSync(process.argv[2] || 'shape-test.pptx', globalThis.__pptxOut);
console.log('wrote', process.argv[2], globalThis.__pptxOut.length, 'bytes');
