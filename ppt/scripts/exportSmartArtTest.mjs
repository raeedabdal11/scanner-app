// Usage: node ppt/scripts/exportSmartArtTest.mjs [out.pptx]
// Exports one slide for EVERY implemented SmartArt layout (5 items, some with sub-items) through
// the real exporter, then checks each slide: one <p:grpSp> with a valid group transform, one child
// <p:sp> per engine node, every prst a valid ST_ShapeType, no negative / non-integer EMU,
// rtl="1" + lang="ar-IQ" text, no leftover placeholder, and that the slide XML parses.
process.removeAllListeners('warning');
import { register, createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
register('./hooks.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

// ECMA-376 Part 1, ST_ShapeType
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

const E = await import('../smartart/engine.js');

// Tiny embedded sample PNG (1x1) for the picture slots; w / h metadata drives the crop maths
const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const items = [
  { text: 'پلاندانان', level: 0, image: { uri: SAMPLE_PNG, w: 800, h: 600, crop: 'center' } },
  { text: 'کۆکردنەوەی زانیاری', level: 1 },
  { text: 'دیزاین', level: 0, image: { uri: SAMPLE_PNG, w: 600, h: 900, crop: 'top' } },
  { text: 'جێبەجێکردن', level: 0 },
  { text: 'تاقیکردنەوە', level: 1 },
  { text: 'وردەکاری', level: 2 },
  { text: 'هەڵسەنگاندن', level: 0 },
  { text: 'Launch & <Review>', level: 0 },
];
const styles = E.SMARTART_STYLES.map((s) => s.key);
const schemes = E.COLOR_SCHEMES.map((s) => s.key);

const slides = E.SMARTART_LAYOUTS.map((layout, i) => {
  const el = E.createSmartArtElement({ layoutId: layout.id, items, x: 5, y: 8, width: 90, height: 84 });
  return {
    id: `s_${layout.id}`,
    background: '#ffffff',
    // rotate through styles / color schemes so every one is exported at least once
    elements: [{ ...el, style: styles[i % styles.length], colorScheme: schemes[i % schemes.length] }],
  };
});

// Last slide: "گۆڕین بۆ شێوە" (convert to ordinary shapes) of a mirrored chevron process
const chevrons = E.createSmartArtElement({ layoutId: 'basicChevronProcess', items, x: 5, y: 20, width: 90, height: 40 });
const converted = E.smartArtToShapes(chevrons, 405);
const picSmart = E.createSmartArtElement({ layoutId: 'pictureCaptionList', items, x: 5, y: 10, width: 90, height: 80 });
const convertedPics = E.smartArtToShapes(picSmart, 405);
// A brand-new SmartArt: empty items only, exported without any text or hint
const emptySmart = E.createSmartArtElement({ layoutId: 'basicProcess', x: 5, y: 10, width: 90, height: 60 });
const allSlides = [
  ...slides,
  { id: 's_empty', background: '#ffffff', elements: [emptySmart] },
  { id: 's_converted', background: '#ffffff', elements: converted },
  { id: 's_converted_pics', background: '#ffffff', elements: convertedPics },
];

const origLog = console.log;
// (node only: the stubbed image manipulator always "fails" and the exporter uses the data URI as is)
if (!process.env.VERBOSE) console.log = (...a) => { const t = String(a[0]); if (/PPTX-CHECK|Validation|error|Error/.test(t) && !/Image manipulation error/.test(t)) origLog(...a); };
const { exportPresentationToPptx } = await import('../pptExporter.js');
await exportPresentationToPptx({ aspectRatio: '16:9', slides: allSlides });
console.log = origLog;

const bytes = globalThis.__pptxOut;
if (!bytes) {
  console.error('FAIL: exporter produced no file');
  process.exit(2);
}
if (process.argv[2]) writeFileSync(process.argv[2], bytes);
const zip = await JSZip.loadAsync(bytes);

const failures = [];
let shapeTotal = 0;
let alphaTotal = 0;
let lineTotal = 0;
let picTotal = 0;
for (let i = 0; i < slides.length; i++) {
  const layout = E.SMARTART_LAYOUTS[i];
  const xml = await zip.file(`ppt/slides/slide${i + 1}.xml`).async('string');
  const fail = (msg) => failures.push(`${layout.id}: ${msg}`);

  const groups = xml.match(/<p:grpSp>[\s\S]*<\/p:grpSp>/g) || [];
  if ((xml.match(/<p:grpSp>/g) || []).length !== 1) fail('expected exactly one <p:grpSp>');
  const grp = groups[0] || '';
  if (!/<p:nvGrpSpPr><p:cNvPr id="\d+" name="[^"]+"\/><p:cNvGrpSpPr\/><p:nvPr\/><\/p:nvGrpSpPr>/.test(grp)) fail('bad nvGrpSpPr');
  const gx = grp.match(/<p:grpSpPr><a:xfrm><a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/><a:chOff x="(\d+)" y="(\d+)"\/><a:chExt cx="(\d+)" cy="(\d+)"\/><\/a:xfrm><\/p:grpSpPr>/);
  if (!gx) fail('bad group transform (off / ext / chOff / chExt)');

  const el = slides[i].elements[0];
  const nodes = E.buildSmartArtNodes(el, (el.width / 100) * 720, (el.height / 100) * 405);
  const sps = grp.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
  const pics = grp.match(/<p:pic>[\s\S]*?<\/p:pic>/g) || [];
  if (sps.length + pics.length !== nodes.length) fail(`children ${sps.length + pics.length} != engine nodes ${nodes.length}`);
  const expectedPics = nodes.filter((nd) => nd.isPicture && nd.image).length;
  if (pics.length !== expectedPics) fail(`pictures ${pics.length} != image slots ${expectedPics}`);
  if (pics.length) {
    const rels = await zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`).async('string');
    for (const pic of pics) {
      const rid = (pic.match(/<a:blip r:embed="([^"]+)"\/>/) || [])[1];
      const rel = rid && rels.match(new RegExp(`<Relationship Id="${rid}" Type="[^"]*/image" Target="\\.\\./media/([^"]+)"/>`));
      if (!rel) fail(`picture without an image relationship (${rid})`);
      else if (!zip.file(`ppt/media/${rel[1]}`)) fail(`missing media file ${rel[1]}`);
      const sr = pic.match(/<a:srcRect l="(\d+)" t="(\d+)" r="(\d+)" b="(\d+)"\/>/);
      if (!sr || sr.slice(1).some((v) => Number(v) > 100000)) fail('bad srcRect');
      if (!/<a:prstGeom prst="(rect|roundRect|ellipse)"/.test(pic)) fail('picture without rect / roundRect / ellipse geometry');
    }
    picTotal += pics.length;
  }
  shapeTotal += sps.length;

  for (const m of xml.matchAll(/<a:prstGeom prst="([^"]*)"/g)) {
    if (!VALID_PRST.has(m[1])) fail(`invalid prst "${m[1]}"`);
  }
  for (const m of grp.matchAll(/ (x|y|cx|cy)="([^"]*)"/g)) {
    if (!/^\d+$/.test(m[2])) fail(`negative / non-integer EMU ${m[1]}="${m[2]}"`);
  }
  if (!/<a:pPr algn="[a-z]+" rtl="1"\/>/.test(grp)) fail('no rtl="1" paragraphs');
  for (const m of grp.matchAll(/<a:alpha val="([^"]*)"\/>/g)) {
    if (!/^\d+$/.test(m[1]) || Number(m[1]) > 100000) fail(`invalid alpha val="${m[1]}"`);
  }
  const alphaFill = /<a:solidFill><a:srgbClr val="[0-9A-F]{6}"><a:alpha val="\d+"\/><\/a:srgbClr><\/a:solidFill>/g;
  if (/Venn$/.test(layout.id) && !(grp.match(alphaFill) || []).length) fail('Venn without semi-transparent fill');
  if (layout.category === 'hierarchy' && !/^(tableHierarchy)$/.test(layout.id) && !/<a:prstGeom prst="line"/.test(grp)) fail('hierarchy without connector lines');
  alphaTotal += (grp.match(alphaFill) || []).length;
  lineTotal += (grp.match(/<a:prstGeom prst="line"/g) || []).length;
  if (!/<a:rPr lang="ar-IQ"/.test(grp)) fail('no lang="ar-IQ" runs');
  if (xml.includes('APP_SMARTART_')) fail('placeholder left in the slide');
  const errors = [];
  new DOMParser({ onError: (level, msg) => { if (level !== 'warning') errors.push(String(msg).split('\n')[0]); } })
    .parseFromString(xml, 'application/xml');
  if (errors.length) fail(`XML errors: ${errors.slice(0, 2).join(' | ')}`);
}

{
  // Picture layout converted to shapes: its images become ordinary picture elements
  const xml = await zip.file(`ppt/slides/slide${allSlides.length}.xml`).async('string');
  const imgCount = convertedPics.filter((e) => e.type === 'image').length;
  const picCount = (xml.match(/<p:pic>/g) || []).length;
  if (!imgCount || picCount !== imgCount) failures.push(`convert pictures: ${picCount} <p:pic>, expected ${imgCount}`);
  console.log(`convert to shapes (pictures): ${imgCount} image elements -> ${picCount} <p:pic>`);
}
{
  const xml = await zip.file(`ppt/slides/slide${allSlides.length - 1}.xml`).async('string');
  const chevronCount = (xml.match(/<a:prstGeom prst="chevron"/g) || []).length;
  const flipped = (xml.match(/<a:xfrm[^>]*flipH="1"/g) || []).length;
  if (chevronCount !== converted.length) failures.push(`convert to shapes: ${chevronCount} chevrons, expected ${converted.length}`);
  if (flipped !== converted.length) failures.push(`convert to shapes: ${flipped} flipH shapes, expected ${converted.length}`);
  if (xml.includes('<p:grpSp>')) failures.push('convert to shapes: still a group');
  console.log(`convert to shapes: ${chevronCount} independent chevron shapes, ${flipped} mirrored (flipH)`);
}

// ---- empty items / hints / migration (no PPTX needed)
{
  const bad = E.SMARTART_LAYOUTS.filter((l) => {
    const el = E.createSmartArtElement({ layoutId: l.id });
    return el.items.length !== E.defaultItemCount(l.id)
      || el.items.some((it) => it.text !== '' || it.isPlaceholder !== true || (it.level || 0) !== 0);
  });
  if (bad.length) failures.push(`new SmartArt not empty: ${bad.map((l) => l.id).join(', ')}`);
  console.log(`new SmartArt: ${E.SMARTART_LAYOUTS.length - bad.length}/${E.SMARTART_LAYOUTS.length} layouts start with empty top-level items only`);

  const xml = await zip.file(`ppt/slides/slide${slides.length + 1}.xml`).async('string');
  const texts = (xml.match(/<a:t>[^<]*<\/a:t>/g) || []);
  if (!xml.includes('<p:grpSp>')) failures.push('empty SmartArt: no group exported');
  if (texts.length) failures.push(`empty SmartArt exported text: ${texts.slice(0, 3).join(' ')}`);
  if (xml.includes(E.SMARTART_HINT)) failures.push('hint text leaked into the PPTX');
  console.log(`empty SmartArt export: ${(xml.match(/<p:sp>/g) || []).length} shapes, ${texts.length} text runs`);

  const W = (emptySmart.width / 100) * 720;
  const H = (emptySmart.height / 100) * 405;
  const hinted = E.buildSmartArtNodes(emptySmart, W, H, { hints: true }).filter((nd) => nd.isHint);
  const plain = E.buildSmartArtNodes(emptySmart, W, H).filter((nd) => nd.text);
  if (hinted.length !== emptySmart.items.length || hinted.some((nd, k) => nd.itemIndex !== k)) failures.push('canvas hints / item index wrong');
  if (plain.length) failures.push('hint visible outside the editing canvas');
  console.log(`canvas hints: ${hinted.length} faint "${E.SMARTART_HINT}" guides (editing canvas only)`);

  const old = [
    { id: 'a', text: 'یەکەم', level: 0 },
    { id: 'b', text: 'خاڵێک', level: 1 },
    { id: 'c', text: 'دەقی خۆم', level: 0 },
    { id: 'd', text: 'دووەم', level: 0, edited: true },
    { id: 'e', text: 'بەشی یەک', level: 1 },
  ];
  const pres = E.migratePresentationSmartArt({ slides: [{ id: 's', elements: [{ id: 'x', type: 'smartart', items: old }] }] });
  const got = pres.slides[0].elements[0].items.map((it) => `${it.id}:${it.text}${it.isPlaceholder ? '(empty)' : ''}`).join(' | ');
  const want = 'a:(empty) | c:دەقی خۆم | d:دووەم';
  if (got !== want) failures.push(`migration: got "${got}", want "${want}"`);
  console.log(`migration of old samples: ${got}`);
}

const perCat = {};
E.SMARTART_LAYOUTS.forEach((l) => { perCat[l.category] = (perCat[l.category] || 0) + 1; });
console.log(`layouts exported: ${slides.length} (${Object.entries(perCat).map(([k, v]) => `${k} ${v}`).join(', ')})`);
console.log(`shapes exported: ${shapeTotal} (straight lines: ${lineTotal}, semi-transparent fills: ${alphaTotal}, pictures: ${picTotal})`);
console.log(`styles used: ${styles.length}, color schemes used: ${Math.min(schemes.length, slides.length)} of ${schemes.length}`);
if (failures.length) {
  failures.slice(0, 30).forEach((f) => console.log(`FAIL ${f}`));
  console.log(`FAIL: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log('OK: every SmartArt slide is a valid group of ordinary shapes');
