const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

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

const WORD_TO_DRAWINGML_UNDERLINE = {
  single: 'sng',
  double: 'dbl',
  thick: 'heavy',
  dash: 'dash',
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

async function performPptxSelfCheck(zip, uint8Array, hasNotes = false) {
  const errors = [];

  // 1. First 4 bytes check
  if (!uint8Array || uint8Array.length < 4) {
    errors.push('File buffer is empty or too short');
  } else {
    const b0 = uint8Array[0].toString(16).padStart(2, '0').toUpperCase();
    const b1 = uint8Array[1].toString(16).padStart(2, '0').toUpperCase();
    const b2 = uint8Array[2].toString(16).padStart(2, '0').toUpperCase();
    const b3 = uint8Array[3].toString(16).padStart(2, '0').toUpperCase();
    const header = `${b0} ${b1} ${b2} ${b3}`;
    if (header !== '50 4B 03 04') {
      errors.push(`Invalid ZIP header: ${header} (expected 50 4B 03 04)`);
    }
  }

  const zipPaths = Object.keys(zip.files);

  // 2. No ZIP entry ends with '/'
  for (const p of zipPaths) {
    if (p.endsWith('/')) {
      errors.push(`ZIP entry ends with '/': ${p}`);
    }
  }

  // 3. [Content_Types].xml is the first entry
  if (zipPaths.length === 0 || zipPaths[0] !== '[Content_Types].xml') {
    errors.push(`First ZIP entry is '${zipPaths[0]}', expected '[Content_Types].xml'`);
  }

  // 4. Every <Override> PartName exists, and every relationship Target exists
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });

  const ctFile = zip.file('[Content_Types].xml');
  if (!ctFile) {
    errors.push('[Content_Types].xml missing from package');
  } else {
    const ctXml = await ctFile.async('text');
    const ctDoc = parser.parseFromString(ctXml, 'text/xml');
    const overrides = Array.from(ctDoc.getElementsByTagName('Override'));
    for (const ov of overrides) {
      const pn = ov.getAttribute('PartName');
      if (pn) {
        const normPn = pn.startsWith('/') ? pn.slice(1) : pn;
        if (!zip.file(normPn)) {
          errors.push(`Override PartName does not exist in ZIP: ${pn}`);
        }
      }
    }
  }

  // Check relationship targets in all .rels files
  const relsFiles = zipPaths.filter((p) => p.endsWith('.rels'));
  for (const relsPath of relsFiles) {
    const relsContent = await zip.file(relsPath).async('text');
    const relsDoc = parser.parseFromString(relsContent, 'text/xml');
    const relElems = Array.from(relsDoc.getElementsByTagName('Relationship'));

    let dirPath = '';
    const relsIdx = relsPath.lastIndexOf('/_rels/');
    if (relsIdx !== -1) {
      dirPath = relsPath.substring(0, relsIdx);
    } else if (relsPath.startsWith('_rels/')) {
      dirPath = '';
    }

    for (const rel of relElems) {
      const targetMode = rel.getAttribute('TargetMode');
      if (targetMode === 'External') continue;

      const target = rel.getAttribute('Target');
      if (!target) continue;

      let targetPath = '';
      if (target.startsWith('/')) {
        targetPath = target.slice(1);
      } else if (dirPath) {
        const parts = (dirPath + '/' + target).split('/');
        const stack = [];
        for (const p of parts) {
          if (!p || p === '.') continue;
          if (p === '..') {
            if (stack.length > 0) stack.pop();
          } else {
            stack.push(p);
          }
        }
        targetPath = stack.join('/');
      } else {
        targetPath = target;
      }

      if (!zip.file(targetPath)) {
        errors.push(`Relationship Target in '${relsPath}' does not exist: '${target}' (resolved: '${targetPath}')`);
      }
    }
  }

  // 5. No references to notesSlides/notesMasters remain when notes were removed
  if (!hasNotes) {
    for (const path of zipPaths) {
      if (path.includes('notesSlides') || path.includes('notesMasters')) {
        errors.push(`ZIP still contains notes entry when notes removed: ${path}`);
      }
    }

    if (ctFile) {
      const ctXml = await ctFile.async('text');
      if (ctXml.includes('notesSlides') || ctXml.includes('notesMasters')) {
        errors.push('[Content_Types].xml still references notesSlides/notesMasters when notes removed');
      }
    }

    const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (presRelsFile) {
      const presRelsXml = await presRelsFile.async('text');
      if (presRelsXml.includes('notesMaster') || presRelsXml.includes('notesMasters')) {
        errors.push('ppt/_rels/presentation.xml.rels still references notesMaster when notes removed');
      }
    }

    const presFile = zip.file('ppt/presentation.xml');
    if (presFile) {
      const presXml = await presFile.async('text');
      if (presXml.includes('notesMasterIdLst')) {
        errors.push('ppt/presentation.xml still references notesMasterIdLst when notes removed');
      }
    }

    const slideRelsFiles = zipPaths.filter((p) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(p));
    for (const sRelsPath of slideRelsFiles) {
      const sRelsXml = await zip.file(sRelsPath).async('text');
      if (sRelsXml.includes('notesSlide')) {
        errors.push(`${sRelsPath} still references notesSlide when notes removed`);
      }
    }
  }

  // 6. Check no u="single" anywhere in slide XML
  const slideFiles = zipPaths.filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p));
  for (const sPath of slideFiles) {
    const sXml = await zip.file(sPath).async('text');
    if (sXml.includes('u="single"')) {
      errors.push(`Slide XML '${sPath}' contains invalid u="single" attribute`);
    }
  }

  if (errors.length === 0) {
    console.log('[PPTX-CHECK] OK');
    return { ok: true, errors: [] };
  } else {
    const problemMsg = errors.join('; ');
    console.log(`[PPTX-CHECK] Error: ${problemMsg}`);
    return { ok: false, errors, problemMsg };
  }
}

async function validateAndCheckPptx(filePath, hasNotes = false) {
  console.log(`\n========================================`);
  console.log(`Checking PPTX File: ${filePath}`);
  console.log(`========================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(fileData);

  await performPptxSelfCheck(zip, fileData, hasNotes);
}

async function generateTestPptx() {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const slide = pptx.addSlide();

  // Text with Kurdish and highlight runs
  slide.addText(
    [
      { text: 'ئەمە دەقێکی ', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Calibri', lang: 'ar-IQ' } },
      { text: 'هاینایتکراوە', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Tahoma', highlight: 'FFFF00', lang: 'ar-IQ' } },
      { text: '', options: { fontSize: 20, color: '1C1C1E' } }, // Empty run to test removal
      { text: ' لە ناو ڕستەکەدا.', options: { fontSize: 20, color: '1C1C1E', fontFace: 'Calibri', lang: 'ar-IQ' } },
    ],
    { x: 1, y: 1, w: 8, h: 1.5, align: 'right', rtl: true, lang: 'ar-IQ' }
  );

  const rawUint8Array = await pptx.write({ outputType: 'uint8array', compression: true });

  const zip = await JSZip.loadAsync(rawUint8Array);
  const parser = new DOMParser();

  // 1. Remove notes
  const notesPaths = Object.keys(zip.files).filter(
    (p) => p.startsWith('ppt/notesSlides/') || p.startsWith('ppt/notesMasters/')
  );
  for (const np of notesPaths) {
    zip.remove(np);
  }

  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    const ctXml = await ctFile.async('text');
    const ctDoc = parser.parseFromString(ctXml, 'text/xml');
    const overrideElems = Array.from(ctDoc.getElementsByTagName('Override'));

    for (const overrideElem of overrideElems) {
      const pn = overrideElem.getAttribute('PartName');
      if (pn) {
        const normPn = pn.startsWith('/') ? pn.slice(1).toLowerCase() : pn.toLowerCase();
        if (normPn.startsWith('ppt/notesslides/') || normPn.startsWith('ppt/notesmasters/')) {
          if (overrideElem.parentNode) {
            overrideElem.parentNode.removeChild(overrideElem);
          }
        }
      }
    }
    zip.file('[Content_Types].xml', new XMLSerializer().serializeToString(ctDoc));
  }

  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (presRelsFile) {
    const presRelsXml = await presRelsFile.async('text');
    const presRelsDoc = parser.parseFromString(presRelsXml, 'text/xml');
    const rels = Array.from(presRelsDoc.getElementsByTagName('Relationship'));
    let relsModified = false;
    for (const rel of rels) {
      const type = rel.getAttribute('Type') || '';
      const target = rel.getAttribute('Target') || '';
      if (type.includes('notesMaster') || target.includes('notesMasters') || target.includes('notesMaster')) {
        if (rel.parentNode) {
          rel.parentNode.removeChild(rel);
          relsModified = true;
        }
      }
    }
    if (relsModified) {
      zip.file('ppt/_rels/presentation.xml.rels', new XMLSerializer().serializeToString(presRelsDoc));
    }
  }

  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    const presXml = await presFile.async('text');
    const presDoc = parser.parseFromString(presXml, 'text/xml');
    const lsts = Array.from(presDoc.getElementsByTagName('*')).filter(
      (el) => el.localName === 'notesMasterIdLst' || el.tagName === 'p:notesMasterIdLst'
    );
    let presModified = false;
    for (const lst of lsts) {
      if (lst.parentNode) {
        lst.parentNode.removeChild(lst);
        presModified = true;
      }
    }
    if (presModified) {
      zip.file('ppt/presentation.xml', new XMLSerializer().serializeToString(presDoc));
    }
  }

  const slideRelsPaths = Object.keys(zip.files).filter((p) =>
    /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(p)
  );
  for (const sRelsPath of slideRelsPaths) {
    const sRelsXml = await zip.file(sRelsPath).async('text');
    const sRelsDoc = parser.parseFromString(sRelsXml, 'text/xml');
    const rels = Array.from(sRelsDoc.getElementsByTagName('Relationship'));
    let sRelsModified = false;
    for (const rel of rels) {
      const type = rel.getAttribute('Type') || '';
      const target = rel.getAttribute('Target') || '';
      if (type.includes('notesSlide') || target.includes('notesSlide') || target.includes('notesSlides')) {
        if (rel.parentNode) {
          rel.parentNode.removeChild(rel);
          sRelsModified = true;
        }
      }
    }
    if (sRelsModified) {
      zip.file(sRelsPath, new XMLSerializer().serializeToString(sRelsDoc));
    }
  }

  const appPropsFile = zip.file('docProps/app.xml');
  if (appPropsFile) {
    const appPropsXml = await appPropsFile.async('text');
    const appPropsDoc = parser.parseFromString(appPropsXml, 'text/xml');
    const notesElems = Array.from(appPropsDoc.getElementsByTagName('*')).filter(
      (el) => el.localName === 'Notes' || el.tagName === 'Notes'
    );
    let appModified = false;
    for (const nEl of notesElems) {
      nEl.textContent = '0';
      appModified = true;
    }
    if (appModified) {
      zip.file('docProps/app.xml', new XMLSerializer().serializeToString(appPropsDoc));
    }
  }

  // 2. Process Slide 1 XML
  const IS_ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const slideFile = zip.file('ppt/slides/slide1.xml');
  const xmlText = await slideFile.async('text');
  const slideDoc = parser.parseFromString(xmlText, 'text/xml');

  const pNodes = Array.from(slideDoc.getElementsByTagName('a:p'));
  for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
    const pNode = pNodes[pIdx];

    // Clean duplicate <a:pPr>
    let firstPPrSeen = false;
    let mainPPr = null;
    const pChildren = Array.from(pNode.childNodes);

    for (const child of pChildren) {
      if (child.nodeType === 1 && (child.localName === 'pPr' || child.nodeName === 'a:pPr')) {
        if (!firstPPrSeen) {
          firstPPrSeen = true;
          mainPPr = child;
        } else {
          pNode.removeChild(child);
        }
      }
    }

    // Remove empty text runs
    const rChildren = Array.from(pNode.getElementsByTagName('a:r'));
    for (const rNode of rChildren) {
      const tNodes = rNode.getElementsByTagName('a:t');
      const tText = tNodes.length > 0 ? (tNodes[0].textContent || '') : '';
      if (tNodes.length === 0 || tText === '') {
        if (rNode.parentNode) {
          rNode.parentNode.removeChild(rNode);
        }
      }
    }

    // RTL for Kurdish/Arabic
    const pText = pNode.textContent || '';
    if (IS_ARABIC_REGEX.test(pText)) {
      if (!mainPPr) {
        mainPPr = slideDoc.createElementNS(DRAWINGML_NS, 'a:pPr');
        if (pNode.firstChild) {
          pNode.insertBefore(mainPPr, pNode.firstChild);
        } else {
          pNode.appendChild(mainPPr);
        }
      }
      mainPPr.setAttribute('rtl', '1');
      if (!mainPPr.hasAttribute('algn')) {
        mainPPr.setAttribute('algn', 'r');
      }
    }
  }

  // Set lang & reorder <a:rPr> children
  const remainingRuns = Array.from(slideDoc.getElementsByTagName('a:r'));
  for (const runNode of remainingRuns) {
    const tNodes = runNode.getElementsByTagName('a:t');
    const runText = tNodes.length > 0 ? (tNodes[0].textContent || '') : '';

    let rPrNodes = runNode.getElementsByTagName('a:rPr');
    let rPrNode = rPrNodes.length > 0 ? rPrNodes[0] : null;
    if (!rPrNode) {
      rPrNode = slideDoc.createElementNS(DRAWINGML_NS, 'a:rPr');
      if (runNode.firstChild) {
        runNode.insertBefore(rPrNode, runNode.firstChild);
      } else {
        runNode.appendChild(rPrNode);
      }
    }

    if (IS_ARABIC_REGEX.test(runText)) {
      rPrNode.setAttribute('lang', 'ar-IQ');
      rPrNode.setAttribute('altLang', 'en-US');
    }

    reorderRPrChildren(rPrNode);
  }

  // Safety net: map any Word-style underline values on XML elements to valid DrawingML values
  const elemsWithU = slideDoc.getElementsByTagName('*');
  for (let eIdx = 0; eIdx < elemsWithU.length; eIdx++) {
    const el = elemsWithU[eIdx];
    if (el.hasAttribute('u')) {
      const uVal = el.getAttribute('u');
      if (WORD_TO_DRAWINGML_UNDERLINE[uVal]) {
        el.setAttribute('u', WORD_TO_DRAWINGML_UNDERLINE[uVal]);
      }
    }
  }

  const updatedXml = new XMLSerializer().serializeToString(slideDoc);
  zip.file('ppt/slides/slide1.xml', updatedXml);

  // 3. Clean ZIP repacking
  const newZip = new JSZip();
  const allFilePaths = Object.keys(zip.files).filter((p) => {
    const entry = zip.files[p];
    return entry && !entry.dir && !p.endsWith('/');
  });

  const orderedPaths = [];
  if (allFilePaths.includes('[Content_Types].xml')) {
    orderedPaths.push('[Content_Types].xml');
  }
  if (allFilePaths.includes('_rels/.rels')) {
    orderedPaths.push('_rels/.rels');
  }
  for (const p of allFilePaths) {
    if (p !== '[Content_Types].xml' && p !== '_rels/.rels') {
      orderedPaths.push(p);
    }
  }

  for (const p of orderedPaths) {
    const content = await zip.file(p).async('uint8array');
    newZip.file(p, content, { createFolders: false });
  }

  const finalBuffer = await newZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const testFilePath = path.join(process.cwd(), 'test_highlight.pptx');
  fs.writeFileSync(testFilePath, finalBuffer);
  console.log(`Generated test PPTX at: ${testFilePath}`);

  return { testFilePath, newZip, finalBuffer };
}

async function main() {
  const args = process.argv.slice(2);
  let filePath = args[0];

  if (!filePath) {
    console.log('No file specified. Generating a fresh test PPTX to verify...');
    const { testFilePath, newZip, finalBuffer } = await generateTestPptx();
    await performPptxSelfCheck(newZip, finalBuffer, false);
  } else {
    await validateAndCheckPptx(filePath, false);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
