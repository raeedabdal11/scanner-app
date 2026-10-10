// Node loader hooks so the RN exporter (ppt/pptExporter.js) can run in plain node for debugging.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const STUBS = {
  'expo-file-system': `
    export const Paths = { document: 'mem://document' };
    export const EncodingType = { Base64: 'base64' };
    export class File {
      constructor(dir, name) { this.uri = dir + '/' + name; this._b = null; }
      create() {}
      async write(b) { this._b = b; globalThis.__pptxOut = b; }
      async bytes() { return this._b; }
    }`,
  'expo-image-manipulator': `
    export const SaveFormat = { JPEG: 'jpeg', PNG: 'png' };
    export async function manipulateAsync() { throw new Error('no images in node test'); }`,
};

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) return { url: 'stub:' + specifier, shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL && context.parentURL.includes('/ppt/') && !/\.\w+$/.test(specifier)) {
    return next(specifier + '.js', context);
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith('stub:')) {
    return { format: 'module', source: STUBS[url.slice(5)], shortCircuit: true };
  }
  if (url.startsWith('file:') && /\/ppt\/[^/]+\.js$/.test(url)) {
    const path = fileURLToPath(url);
    let src = readFileSync(path, 'utf8');
    if (path.endsWith('shapeCatalog.js')) {
      // JSX file: only export the preset map the exporter needs.
      const m = src.match(/export const OPENXML_SHAPE_PRST_MAP = \{[\s\S]*?\n\};/);
      src = m[0];
    } else {
      src = `import { createRequire as __cr } from 'node:module'; const require = __cr(${JSON.stringify(url)});\n` + src;
    }
    return { format: 'module', source: src, shortCircuit: true };
  }
  return next(url, context);
}
