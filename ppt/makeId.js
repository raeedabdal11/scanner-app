// One id generator for the whole PowerPoint editor. Date.now() alone repeats when several items
// are created in the same millisecond (layouts, duplicates, multi-image picks), which gives React
// "two children with the same key". A module counter + a random tail makes every id unique.
let idSeq = 0;

export const makeId = (prefix = 'id') => {
  idSeq = (idSeq + 1) % 1679616; // 36^4
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now().toString(36)}_${idSeq.toString(36)}_${rand}`;
};

const idPrefix = (id, fallback) => {
  const m = typeof id === 'string' && id.match(/^([a-z]+)_/i);
  return m ? m[1] : fallback;
};

/**
 * Repairs saved / restored presentations: every slide id and every element id (across the whole
 * deck) must be unique. Later duplicates get a fresh id; nothing visible changes.
 * Returns the SAME object when nothing had to change.
 */
export const ensureUniqueIds = (presentation) => {
  if (!presentation || !Array.isArray(presentation.slides)) return presentation;
  const slideIds = new Set();
  const elemIds = new Set();
  let changed = false;

  const slides = presentation.slides.map((slide) => {
    if (!slide) return slide;
    let next = slide;
    if (!slide.id || slideIds.has(slide.id)) {
      next = { ...next, id: makeId(idPrefix(slide.id, 'slide')) };
      changed = true;
    }
    slideIds.add(next.id);

    let elemsChanged = false;
    const elements = (next.elements || []).map((elem) => {
      if (!elem) return elem;
      if (!elem.id || elemIds.has(elem.id)) {
        elemsChanged = true;
        const fixed = { ...elem, id: makeId(idPrefix(elem.id, 'elem')) };
        elemIds.add(fixed.id);
        return fixed;
      }
      elemIds.add(elem.id);
      return elem;
    });
    if (elemsChanged) {
      next = { ...next, elements };
      changed = true;
    }
    return next;
  });

  if (!changed) return presentation;
  console.log('[PPT ids] repaired duplicate slide / element ids');
  return { ...presentation, slides };
};
