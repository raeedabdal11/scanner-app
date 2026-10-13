// Element lock ("قفڵکردن"), like PowerPoint's Lock: a locked element can still be selected
// (so it can be unlocked), restyled, duplicated and re-layered, but its position, size, rotation
// and content (text, table cells, SmartArt items, picture) are frozen and it cannot be deleted.

export const LOCKED_MESSAGE = 'ئەم توخمە قفڵکراوە 🔒';

export const isElementLocked = (elem) => !!(elem && elem.locked);

const GEOMETRY_KEYS = ['x', 'y', 'width', 'height', 'rotation', 'flipH', 'flipV'];

// Content that "editing" changes, per element type (styling is not content)
const contentSignature = (elem) => {
  switch (elem.type) {
    case 'text':
      return String(elem.text || '');
    case 'shape':
      return JSON.stringify([elem.shapeType || 'rect', elem.text || '']);
    case 'image':
      return JSON.stringify([elem.uri || '', elem.crop || null]);
    case 'table':
      return JSON.stringify([
        elem.rows, elem.cols, elem.colWidths, elem.rowHeights,
        (elem.cells || []).map((row) => row.map((cell) => [cell.text || '', cell.gridSpan || 1, cell.rowSpan || 1])),
      ]);
    case 'smartart':
      return JSON.stringify([
        elem.layoutId,
        (elem.items || []).map((it) => [it.text || '', it.level || 0, it.image ? it.image.uri : null, it.image ? it.image.crop || null : null]),
      ]);
    default:
      return '';
  }
};

const geometryChanged = (prev, next) =>
  GEOMETRY_KEYS.some((k) => (prev[k] || 0) !== (next[k] || 0));

/**
 * true when `next` would move / resize / rotate / edit the content of the locked element `prev`.
 * Toggling the lock itself, styling and layer order (zIndex) stay allowed.
 */
export const lockBlocksUpdate = (prev, next) => {
  if (!prev || !next || !prev.locked) return false;
  if (geometryChanged(prev, next)) return true;
  return contentSignature(prev) !== contentSignature(next);
};

/** Copy of an element that is never locked (duplicate creates an UNLOCKED copy). */
export const withoutLock = (elem) => ({ ...elem, locked: false });
