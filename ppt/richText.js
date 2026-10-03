export const sameStyle = (a, b) => {
  const { text: _a, ...sa } = a; const { text: _b, ...sb } = b;
  return JSON.stringify(sa) === JSON.stringify(sb);
};
export function mergeRuns(runs) {
  const out = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last, r)) last.text += r.text; else out.push({ ...r });
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
    out.push({ ...r, ...patch, text: r.text.slice(s, e) });
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
