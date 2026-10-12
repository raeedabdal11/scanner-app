// Usage: node ppt/scripts/checkShapePrst.mjs [out.pptx]
// Exports one slide with every shape in ALL_SHAPES through the real exporter, unzips the
// PPTX and checks every <a:prstGeom prst="..."> against the OOXML ST_ShapeType names.
// Prints each invalid name (with its shape id) and exits non-zero if any are found.
import { register } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
register('./hooks.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

// ECMA-376 Part 1, ST_ShapeType (all preset geometry names)
const VALID_PRST = new Set(`
line lineInv triangle rtTriangle rect diamond parallelogram trapezoid nonIsoscelesTrapezoid
pentagon hexagon heptagon octagon decagon dodecagon star4 star5 star6 star7 star8 star10 star12
star16 star24 star32 roundRect round1Rect round2SameRect round2DiagRect snipRoundRect snip1Rect
snip2SameRect snip2DiagRect plaque ellipse teardrop homePlate chevron pieWedge pie blockArc donut
noSmoking rightArrow leftArrow upArrow downArrow stripedRightArrow notchedRightArrow bentUpArrow
leftRightArrow upDownArrow leftUpArrow leftRightUpArrow quadArrow leftArrowCallout
rightArrowCallout upArrowCallout downArrowCallout leftRightArrowCallout upDownArrowCallout
quadArrowCallout bentArrow uturnArrow circularArrow leftCircularArrow leftRightCircularArrow
curvedRightArrow curvedLeftArrow curvedUpArrow curvedDownArrow swooshArrow cube can lightningBolt
heart sun moon smileyFace irregularSeal1 irregularSeal2 foldedCorner bevel frame halfFrame corner
diagStripe chord arc leftBracket rightBracket leftBrace rightBrace bracketPair bracePair
straightConnector1 bentConnector2 bentConnector3 bentConnector4 bentConnector5 curvedConnector2
curvedConnector3 curvedConnector4 curvedConnector5 callout1 callout2 callout3 accentCallout1
accentCallout2 accentCallout3 borderCallout1 borderCallout2 borderCallout3 accentBorderCallout1
accentBorderCallout2 accentBorderCallout3 wedgeRectCallout wedgeRoundRectCallout
wedgeEllipseCallout cloudCallout cloud ribbon ribbon2 ellipseRibbon ellipseRibbon2
leftRightRibbon verticalScroll horizontalScroll wave doubleWave plus flowChartProcess
flowChartDecision flowChartInputOutput flowChartPredefinedProcess flowChartInternalStorage
flowChartDocument flowChartMultidocument flowChartTerminator flowChartPreparation
flowChartManualInput flowChartManualOperation flowChartConnector flowChartPunchedCard
flowChartPunchedTape flowChartSummingJunction flowChartOr flowChartCollate flowChartSort
flowChartExtract flowChartMerge flowChartOfflineStorage flowChartOnlineStorage
flowChartMagneticTape flowChartMagneticDisk flowChartMagneticDrum flowChartDisplay
flowChartDelay flowChartAlternateProcess flowChartOffpageConnector actionButtonBlank
actionButtonHome actionButtonHelp actionButtonInformation actionButtonForwardNext
actionButtonBackPrevious actionButtonEnd actionButtonBeginning actionButtonReturn
actionButtonDocument actionButtonSound actionButtonMovie gear6 gear9 funnel mathPlus mathMinus
mathMultiply mathDivide mathEqual mathNotEqual cornerTabs squareTabs plaqueTabs chartX
chartStar chartPlus
`.trim().split(/\s+/));

// shapeCatalog.js is JSX (react-native-svg), so read the shape ids from its source
const catalogSrc = readFileSync(new URL('../shapeCatalog.js', import.meta.url), 'utf8');
const allShapesBlock = catalogSrc.match(/export const ALL_SHAPES = \[([\s\S]*?)\n\];/);
if (!allShapesBlock) {
  console.error('Could not find ALL_SHAPES in shapeCatalog.js');
  process.exit(2);
}
const shapeIds = [...allShapesBlock[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
const duplicateIds = shapeIds.filter((id, i) => shapeIds.indexOf(id) !== i);
if (duplicateIds.length > 0) {
  console.log(`FAIL: duplicate shape ids in ALL_SHAPES: ${duplicateIds.join(', ')}`);
  process.exit(1);
}

// One slide, every shape in a 10-column grid (zIndex keeps the catalog order)
const cols = 10;
const rows = Math.ceil(shapeIds.length / cols);
const elements = shapeIds.map((shapeType, i) => ({
  id: `s_${i}`,
  type: 'shape',
  shapeType,
  x: (i % cols) * (100 / cols) + 0.5,
  y: Math.floor(i / cols) * (100 / rows) + 0.5,
  width: 100 / cols - 1,
  height: 100 / rows - 1,
  zIndex: i + 1,
  fill: '#4472C4',
  outline: { color: '#2F528F', width: 2 },
  opacity: 1,
  rotation: 0,
  cornerRadius: 20,
}));

const presentation = { aspectRatio: '16:9', slides: [{ id: 'all_shapes', background: '#ffffff', elements }] };

const { exportPresentationToPptx } = await import('../pptExporter.js');
const origLog = console.log;
if (!process.env.VERBOSE) console.log = (...a) => { if (/error|Error/.test(String(a[0]))) origLog(...a); };
await exportPresentationToPptx(presentation);
console.log = origLog;

const bytes = globalThis.__pptxOut;
if (!bytes) {
  console.error('Exporter produced no file');
  process.exit(2);
}
if (process.argv[2]) writeFileSync(process.argv[2], bytes);

const zip = await JSZip.loadAsync(bytes);
const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));

let total = 0;
const invalid = [];
const seenShapeIdx = new Set();
for (const f of slideFiles) {
  const xml = await zip.file(f).async('string');
  for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>|<p:sp\s[\s\S]*?<\/p:sp>/g) || []) {
    const prst = (sp.match(/<a:prstGeom[^>]*\bprst="([^"]*)"/) || [])[1];
    if (prst === undefined) continue;
    total++;
    const name = (sp.match(/<p:cNvPr[^>]*\bname="([^"]*)"/) || [])[1] || '';
    const idx = (name.match(/^APP_SHAPE_(\d+)$/) || [])[1];
    if (idx !== undefined) seenShapeIdx.add(Number(idx));
    if (!VALID_PRST.has(prst)) {
      const shapeId = idx !== undefined ? shapeIds[Number(idx)] : `(${name || 'no name'})`;
      invalid.push({ shapeId, prst, file: f });
    }
  }
}

console.log(`shapes in ALL_SHAPES: ${shapeIds.length}`);
console.log(`prstGeom found: ${total} (app shapes matched: ${seenShapeIdx.size})`);
if (seenShapeIdx.size !== shapeIds.length) {
  const missing = shapeIds.filter((_, i) => !seenShapeIdx.has(i));
  console.log(`MISSING in export: ${missing.join(', ')}`);
}
if (invalid.length > 0) {
  for (const it of invalid) console.log(`INVALID prst="${it.prst}" for shape "${it.shapeId}" (${it.file})`);
  console.log(`FAIL: ${invalid.length} invalid preset name(s)`);
  process.exit(1);
}
if (seenShapeIdx.size !== shapeIds.length) {
  console.log('FAIL: some shapes were not exported');
  process.exit(1);
}
console.log('OK: every prstGeom uses a valid ST_ShapeType name');
