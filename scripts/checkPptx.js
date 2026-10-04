const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const TAG_ORDER = {
  ln: 10,
  solidfill: 20,
  gradfill: 20,
  blipfill: 20,
  pattfill: 20,
  nofill: 20,
  effectlst: 30,
  highlight: 40,
  ulntx: 50,
  uln: 50,
  ufilltx: 60,
  ufill: 60,
  latin: 70,
  ea: 80,
  cs: 90,
  sym: 100,
  hlinkclick: 110,
  hlinkmouseover: 110,
  rtl: 120,
  extlst: 130,
};

function normalizeHex(colorStr, defaultHex = null) {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'none') {
    return defaultHex;
  }
  let hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return defaultHex;
  }
  return hex.toUpperCase();
}

function getCleanTagName(node) {
  const name = node.localName || node.tagName || node.nodeName || '';
  return name.replace(/^[^:]+:/, '').toLowerCase();
}

function reorderRPrChildren(rPrNode) {
  const children = [];
  for (let i = 0; i < rPrNode.childNodes.length; i++) {
    const child = rPrNode.childNodes[i];
    if (child.nodeType === 1) { // Element node
      children.push(child);
    }
  }

  children.sort((a, b) => {
    const tagA = getCleanTagName(a);
    const tagB = getCleanTagName(b);
    const orderA = TAG_ORDER[tagA] || 999;
    const orderB = TAG_ORDER[tagB] || 999;
    return orderA - orderB;
  });

  while (rPrNode.firstChild) {
    rPrNode.removeChild(rPrNode.firstChild);
  }

  for (const child of children) {
    rPrNode.appendChild(child);
  }
}

async function validateAndCheckPptx(filePath) {
  console.log(`\n========================================`);
  console.log(`Checking PPTX File: ${filePath}`);
  console.log(`========================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(filePath);
  const first4 = Array.from(fileData.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
  const isZipHeader = first4 === '50 4B 03 04';
  console.log(`Header check: First 4 bytes = ${first4} ${isZipHeader ? '✅ (Valid ZIP PK)' : '❌ (INVALID)'}`);

  const zip = await JSZip.loadAsync(fileData);
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (msg) => { throw new Error(msg); },
      fatalError: (msg) => { throw new Error(msg); },
    },
  });

  console.log(`\n1. Validating XML/rels parts with DOMParser...`);
  const zipFiles = Object.keys(zip.files);
  let xmlPartErrors = 0;

  for (const partName of zipFiles) {
    if (zip.files[partName].dir) continue;
    const lowerName = partName.toLowerCase();
    if (lowerName.endsWith('.xml') || lowerName.endsWith('.rels')) {
      const content = await zip.file(partName).async('text');
      try {
        const doc = parser.parseFromString(content, 'text/xml');
        const parserErrors = doc.getElementsByTagName('parsererror');
        if (parserErrors && parserErrors.length > 0) {
          console.error(`  ❌ [XML Error] ${partName}: ${parserErrors[0].textContent}`);
          xmlPartErrors++;
        }
      } catch (err) {
        console.error(`  ❌ [XML Parse Exception] ${partName}: ${err.message}`);
        xmlPartErrors++;
      }
    }
  }

  if (xmlPartErrors === 0) {
    console.log(`  ✅ All XML/rels parts parsed cleanly with DOMParser.`);
  }

  console.log(`\n2. Validating [Content_Types].xml completeness...`);
  const ctFile = zip.file('[Content_Types].xml');
  let contentTypeErrors = 0;

  if (!ctFile) {
    console.error(`  ❌ [Content_Types].xml is MISSING in ZIP!`);
    contentTypeErrors++;
  } else {
    const ctXml = await ctFile.async('text');
    const ctDoc = parser.parseFromString(ctXml, 'text/xml');

    const defaults = new Set();
    const defaultElems = ctDoc.getElementsByTagName('Default');
    for (let i = 0; i < defaultElems.length; i++) {
      const ext = defaultElems[i].getAttribute('Extension');
      if (ext) defaults.add(ext.toLowerCase());
    }

    const overrides = new Set();
    const overrideElems = ctDoc.getElementsByTagName('Override');
    for (let i = 0; i < overrideElems.length; i++) {
      const pn = overrideElems[i].getAttribute('PartName');
      if (pn) {
        const normalizedPn = pn.startsWith('/') ? pn.slice(1).toLowerCase() : pn.toLowerCase();
        overrides.add(normalizedPn);
      }
    }

    for (const partName of zipFiles) {
      if (zip.files[partName].dir) continue;
      if (partName === '[Content_Types].xml') continue;

      const normalizedPart = partName.toLowerCase();
      const dotIdx = normalizedPart.lastIndexOf('.');
      const ext = dotIdx !== -1 ? normalizedPart.slice(dotIdx + 1) : '';

      const hasExtensionDefault = defaults.has(ext);
      const hasOverride = overrides.has(normalizedPart);

      if (!hasExtensionDefault && !hasOverride) {
        console.error(`  ❌ Missing [Content_Types].xml entry for part: ${partName}`);
        contentTypeErrors++;
      }
    }

    if (contentTypeErrors === 0) {
      console.log(`  ✅ [Content_Types].xml covers all parts in the ZIP.`);
    }
  }

  console.log(`\n3. Inspecting <a:rPr> child element orders in slide XMLs...`);
  const slideFiles = zipFiles.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name));

  let totalRPrsChecked = 0;
  let validOrderRPrs = 0;

  for (const slideFile of slideFiles) {
    console.log(`  📄 Slide: ${slideFile}`);
    const xml = await zip.file(slideFile).async('text');
    const slideDoc = parser.parseFromString(xml, 'text/xml');

    const runNodes = slideDoc.getElementsByTagName('a:r');
    for (let i = 0; i < runNodes.length; i++) {
      const runNode = runNodes[i];
      const tNodes = runNode.getElementsByTagName('a:t');
      const runText = tNodes.length > 0 ? tNodes[0].textContent : '(empty)';

      const rPrNodes = runNode.getElementsByTagName('a:rPr');
      if (rPrNodes.length === 0) continue;

      const rPrNode = rPrNodes[0];
      const childTagNames = [];

      for (let j = 0; j < rPrNode.childNodes.length; j++) {
        const child = rPrNode.childNodes[j];
        if (child.nodeType === 1) { // Element node
          const tag = getCleanTagName(child);
          childTagNames.push(tag);
        }
      }

      if (childTagNames.length === 0) continue;

      totalRPrsChecked++;

      let isOrderValid = true;
      let prevRank = -1;
      for (const tag of childTagNames) {
        const rank = TAG_ORDER[tag] || 999;
        if (rank < prevRank) {
          isOrderValid = false;
          break;
        }
        prevRank = rank;
      }

      if (isOrderValid) validOrderRPrs++;

      console.log(`    Run #${i + 1} "${runText}": children = [ ${childTagNames.map((t) => 'a:' + t).join(', ')} ] -> ${isOrderValid ? '✅ VALID ORDER' : '❌ INVALID ORDER'}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY:`);
  console.log(`- Header Check          : ${isZipHeader ? '✅ PASS (50 4B 03 04)' : '❌ FAIL'}`);
  console.log(`- XML Parts Parse Check : ${xmlPartErrors === 0 ? '✅ PASS' : '❌ FAIL (' + xmlPartErrors + ' errors)'}`);
  console.log(`- Content Types Check   : ${contentTypeErrors === 0 ? '✅ PASS' : '❌ FAIL (' + contentTypeErrors + ' errors)'}`);
  console.log(`- <a:rPr> Child Orders  : ${validOrderRPrs} / ${totalRPrsChecked} valid`);
  console.log(`========================================\n`);
}

async function generateTestPptx() {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const slide = pptx.addSlide();

  // Partial highlight run
  slide.addText(
    [
      { text: 'ئەمە دەقێکی ', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Calibri' } },
      { text: 'هاینایتکراوە', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Tahoma', highlight: 'FFFF00' } },
      { text: ' لە ناو ڕستەکەدا.', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Calibri' } },
    ],
    { x: 1, y: 1, w: 8, h: 1.5, align: 'right', rtl: true }
  );

  // Whole-box highlight run
  slide.addText(
    [
      { text: 'هەموی هاینایتکراوە', options: { fontSize: 24, color: '1C1C1E', fontFace: 'Tahoma', highlight: '00FFFF' } },
    ],
    { x: 1, y: 3, w: 8, h: 1.5, align: 'right', rtl: true, fill: { color: '00FFFF' } }
  );

  const rawUint8Array = await pptx.write({ outputType: 'uint8array', compression: true });

  const zip = await JSZip.loadAsync(rawUint8Array);
  const slideFile = zip.file('ppt/slides/slide1.xml');
  const xmlText = await slideFile.async('text');

  const parser = new DOMParser();
  const slideDoc = parser.parseFromString(xmlText, 'text/xml');

  const highlightMap = {
    'هاینایتکراوە': { highlight: 'FFFF00', shadow: '808080' },
    'هەموی هاینایتکراوە': { highlight: '00FFFF', shadow: null },
  };

  const runNodes = slideDoc.getElementsByTagName('a:r');
  for (let i = 0; i < runNodes.length; i++) {
    const runNode = runNodes[i];
    const tNodes = runNode.getElementsByTagName('a:t');
    const runText = tNodes.length > 0 ? tNodes[0].textContent : '';

    let item = null;
    for (const [k, v] of Object.entries(highlightMap)) {
      if (runText.includes(k) || k.includes(runText)) {
        item = v;
        break;
      }
    }

    if (!item) continue;

    let rPrNode = null;
    const rPrNodes = runNode.getElementsByTagName('a:rPr');
    if (rPrNodes.length > 0) {
      rPrNode = rPrNodes[0];
    } else {
      rPrNode = slideDoc.createElement('a:rPr');
      if (tNodes.length > 0) {
        runNode.insertBefore(rPrNode, tNodes[0]);
      } else {
        runNode.appendChild(rPrNode);
      }
    }

    if (item.highlight) {
      let hlNode = null;
      const hlNodes = rPrNode.getElementsByTagName('a:highlight');
      if (hlNodes.length > 0) {
        hlNode = hlNodes[0];
      } else {
        hlNode = slideDoc.createElement('a:highlight');
        rPrNode.appendChild(hlNode);
      }
      let clrNode = null;
      const clrNodes = hlNode.getElementsByTagName('a:srgbClr');
      if (clrNodes.length > 0) {
        clrNode = clrNodes[0];
      } else {
        clrNode = slideDoc.createElement('a:srgbClr');
        hlNode.appendChild(clrNode);
      }
      clrNode.setAttribute('val', normalizeHex(item.highlight, 'FFFF00'));
    }

    if (item.shadow) {
      let effNode = null;
      const effNodes = rPrNode.getElementsByTagName('a:effectLst');
      if (effNodes.length > 0) {
        effNode = effNodes[0];
      } else {
        effNode = slideDoc.createElement('a:effectLst');
        rPrNode.appendChild(effNode);
      }
      let shdwNode = null;
      const shdwNodes = effNode.getElementsByTagName('a:outerShdw');
      if (shdwNodes.length > 0) {
        shdwNode = shdwNodes[0];
      } else {
        shdwNode = slideDoc.createElement('a:outerShdw');
        shdwNode.setAttribute('blurRad', '25400');
        shdwNode.setAttribute('dist', '12700');
        shdwNode.setAttribute('dir', '2700000');
        shdwNode.setAttribute('algn', 'tl');
        effNode.appendChild(shdwNode);
      }
      let clrNode = null;
      const clrNodes = shdwNode.getElementsByTagName('a:srgbClr');
      if (clrNodes.length > 0) {
        clrNode = clrNodes[0];
      } else {
        clrNode = slideDoc.createElement('a:srgbClr');
        shdwNode.appendChild(clrNode);
      }
      clrNode.setAttribute('val', normalizeHex(item.shadow, '000000'));
    }

    reorderRPrChildren(rPrNode);
  }

  const updatedXml = new XMLSerializer().serializeToString(slideDoc);
  zip.file('ppt/slides/slide1.xml', updatedXml);

  const finalBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const testFilePath = path.join(process.cwd(), 'test_highlight.pptx');
  fs.writeFileSync(testFilePath, finalBuffer);
  console.log(`Generated test PPTX at: ${testFilePath}`);
  return testFilePath;
}

async function main() {
  const args = process.argv.slice(2);
  let filePath = args[0];

  if (!filePath) {
    console.log('No file specified. Generating a fresh test PPTX with highlighted runs to verify...');
    filePath = await generateTestPptx();
  }

  await validateAndCheckPptx(filePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
