function normalizeStyle(run) {
  const { text, sizeScaleDelta, ...style } = run;
  const cleaned = {};
  for (const key of Object.keys(style)) {
    if (style[key] !== undefined) {
      cleaned[key] = style[key];
    }
  }
  if (cleaned.sizeScale !== undefined) {
    cleaned.sizeScale = Math.round(cleaned.sizeScale * 100) / 100;
    if (cleaned.sizeScale === 1) {
      delete cleaned.sizeScale;
    }
  }
  return cleaned;
}

export const sameStyle = (a, b) => {
  return JSON.stringify(normalizeStyle(a)) === JSON.stringify(normalizeStyle(b));
};

export function mergeRuns(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.text) continue;
    const cleanR = { ...r };
    delete cleanR.sizeScaleDelta;
    if (cleanR.sizeScale !== undefined) {
      cleanR.sizeScale = Math.round(cleanR.sizeScale * 100) / 100;
      if (cleanR.sizeScale === 1) delete cleanR.sizeScale;
    }
    const last = out[out.length - 1];
    if (last && sameStyle(last, cleanR)) {
      last.text += cleanR.text;
    } else {
      out.push(cleanR);
    }
  }
  return out.length ? out : [{ text: '' }];
}

export function applyStyle(runs, start, end, patch) {
  const out = []; let pos = 0;
  for (const r of runs) {
    const a = pos, b = pos + r.text.length; pos = b;
    if (b <= start || a >= end) { out.push(r); continue; }
    const s = Math.max(start, a) - a, e = Math.min(end, b) - a;
    if (s > 0) out.push({ ...r, text: r.text.slice(0, s) });
    const appliedPatch = typeof patch === 'function' ? patch(r) : patch;
    out.push({ ...r, ...appliedPatch, text: r.text.slice(s, e) });
    if (e < r.text.length) out.push({ ...r, text: r.text.slice(e) });
  }
  return mergeRuns(out);
}

const BOUNDARY = /[\s.،؟!:؛()«»\[\],?]/;
export function wordRangeAt(text, pos) {
  let s = pos, e = pos;
  while (s > 0 && !BOUNDARY.test(text[s - 1])) s--;
  while (e < text.length && !BOUNDARY.test(text[e])) e++;
  return { start: s, end: e };
}
