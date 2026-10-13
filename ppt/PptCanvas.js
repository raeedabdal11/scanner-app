import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  AppState,
} from 'react-native';
import { planPage, splitRuns, SLIDE, measureElementLayout } from './pptFit';
import { getElementRuns, updateTextWithRuns, getDisplayRunsWithSelection } from './formattedText';
import { renderSvgShape } from './shapeCatalog';
import { PptSlideBackground, getSlideBaseColor } from './PptSlideBackground';
import { getDisplayFontFamily } from './fonts';
import { PptTableView } from './PptTableView';
import { PptSmartArtView } from './PptSmartArtView';
import { layoutTable } from './tableModel';
import {
  rotatedBoundsPx,
  buildSnapLines,
  computeResizeGeometry,
  snapResizeGeometry,
  computeSnappedMove,
  snapEngageKeys,
} from './snapGeometry';
import { snapTick } from './snapHaptics';

// Kept for existing imports: the resize math now lives in snapGeometry.js
export { computeResizeGeometry };

// Double tap on an empty slide area (ms, px)
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

// 8 resize handles. sx/sy: which side of the box the handle moves (-1 = left/top, 1 = right/bottom,
// 0 = that axis is untouched). fx/fy: handle position as a fraction of the box size.
const RESIZE_HANDLES = [
  { key: 'tl', sx: -1, sy: -1, fx: 0, fy: 0 },
  { key: 'tc', sx: 0, sy: -1, fx: 0.5, fy: 0 },
  { key: 'tr', sx: 1, sy: -1, fx: 1, fy: 0 },
  { key: 'ml', sx: -1, sy: 0, fx: 0, fy: 0.5 },
  { key: 'mr', sx: 1, sy: 0, fx: 1, fy: 0.5 },
  { key: 'bl', sx: -1, sy: 1, fx: 0, fy: 1 },
  { key: 'bc', sx: 0, sy: 1, fx: 0.5, fy: 1 },
  { key: 'br', sx: 1, sy: 1, fx: 1, fy: 1 },
];
const HANDLE_TOUCH_SIZE = 44;
const HANDLE_MARGIN = HANDLE_TOUCH_SIZE / 2;
function useRenderWhy(name, props) {
  const prevRef = useRef(null);
  useEffect(() => {
    if (prevRef.current) {
      const changed = [];
      for (const key in props) {
        if (prevRef.current[key] !== props[key]) {
          changed.push(key);
        }
      }
      if (changed.length > 0) {
        console.log(`[RENDER-WHY] ${name} changed: ${changed.join(', ')}`);
      } else {
        console.log(`[RENDER-WHY] ${name} re-rendered with identical props`);
      }
    } else {
      console.log(`[RENDER-WHY] ${name} mounted`);
    }
    prevRef.current = props;
  });
}

function renderStyledTextChildren(formattedRuns, scaledBaseSize, fontFamily, elem) {
  const runs = formattedRuns ?? [];
  return runs.map((run, rIdx) => {
    const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
    const runScaledFontSize = scaledBaseSize * runScale;
    const runLineHeight = runScaledFontSize * 1.35;
    const scriptRuns = splitRuns(
      run.text || '',
      run.kurdishFont || run.kuFont || elem?.kurdishFont || 'Tahoma',
      run.englishFont || run.enFont || elem?.englishFont || 'Calibri'
    );
    const runHighlight = (run.highlight || run.highlightColor) && (run.highlight || run.highlightColor) !== 'transparent' ? (run.highlight || run.highlightColor) : undefined;
    const runShadow = (run.shadowColor || run.shadow || run.textShadowColor) && (run.shadowColor || run.shadow || run.textShadowColor) !== 'transparent' ? (run.shadowColor || run.shadow || run.textShadowColor) : undefined;
    const runShadowOffset = run.textShadowOffset || run.shadowOffset || elem?.textShadowOffset || elem?.shadowOffset || { width: 2, height: 2 };
    const runShadowRadius = run.textShadowRadius !== undefined ? run.textShadowRadius : (run.shadowRadius !== undefined ? run.shadowRadius : (elem?.textShadowRadius !== undefined ? elem.textShadowRadius : (elem?.shadowRadius !== undefined ? elem.shadowRadius : 3)));

    return (
      <Text
        key={`trun_${rIdx}`}
        style={{
          fontSize: runScaledFontSize,
          lineHeight: runLineHeight,
          fontWeight: run.bold ? 'bold' : elem?.fontWeight || 'normal',
          fontStyle: run.italic ? 'italic' : elem?.fontStyle || 'normal',
          textDecorationLine: run.underline ? 'underline' : elem?.textDecorationLine || 'none',
          color: run.color || '#1c1c1e',
          backgroundColor: runHighlight,
          textShadowColor: runShadow,
          textShadowOffset: runShadow ? runShadowOffset : { width: 0, height: 0 },
          textShadowRadius: runShadow ? runShadowRadius : 0,
        }}
      >
        {(scriptRuns ?? []).map((sRun, sIdx) => (
          <Text key={`tsrun_${rIdx}_${sIdx}`} style={{ fontFamily: getDisplayFontFamily(sRun.fontFamily) }}>
            {sRun.text}
          </Text>
        ))}
      </Text>
    );
  });
}

const InlineTextInput = React.memo(({
  elem,
  inputRef,
  scaledBaseSize,
  fontFamily,
  formattedRuns,
  controlledSelection,
  setControlledSelection,
  userTouchRef,
  touchTimeoutRef,
  externalIsApplyingStyleRef,
  stickyRangeRef,
  onChangeElement,
  onEndInlineEditing,
  showSoftInputOnFocus = true,
  setShowSoftInputOnFocus,
}) => {
  console.log('[RENDER] TextInput');
  useRenderWhy('TextInput', {
    elemId: elem?.id,
    elemText: elem?.text,
    scaledBaseSize,
    fontFamily,
    controlledSelection,
    formattedRunsLength: formattedRuns?.length,
  });

  const onChangeElementRef = useRef(onChangeElement);
  onChangeElementRef.current = onChangeElement;

  const onEndInlineEditingRef = useRef(onEndInlineEditing);
  onEndInlineEditingRef.current = onEndInlineEditing;

  const handleTouchStart = useCallback(() => {
    if (setShowSoftInputOnFocus) setShowSoftInputOnFocus(true);
    if (userTouchRef) userTouchRef.current = true;
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    touchTimeoutRef.current = setTimeout(() => {
      if (userTouchRef) userTouchRef.current = false;
    }, 500);

    if (externalIsApplyingStyleRef?.current) {
      externalIsApplyingStyleRef.current = false;
      if (setControlledSelection && controlledSelection !== undefined) {
        setControlledSelection(undefined);
      }
      console.log('[GUARD] off (user touch)');
    }
  }, [userTouchRef, touchTimeoutRef, externalIsApplyingStyleRef, setControlledSelection, controlledSelection, setShowSoftInputOnFocus]);

  const handleSelectionChange = useCallback((e) => {
    const sel = e.nativeEvent.selection;
    const isGuardActive = externalIsApplyingStyleRef?.current;
    const saved = stickyRangeRef?.current;

    if (isGuardActive) {
      const textLen = (elem?.text || '').length;
      const isCollapsedAtEnd = sel.start === sel.end && sel.start === textLen;
      const matchesSaved = saved && sel.start === saved.start && sel.end === saved.end;

      if (!userTouchRef?.current && (matchesSaved || isCollapsedAtEnd)) {
        console.log('[SEL] ignored', sel);
        return;
      }

      externalIsApplyingStyleRef.current = false;
      if (setControlledSelection && controlledSelection !== undefined) {
        setControlledSelection(undefined);
      }
      console.log('[GUARD] off (user selection)');
    }

    console.log('[SEL] user', sel);
    if (stickyRangeRef) stickyRangeRef.current = sel;
  }, [elem?.text, externalIsApplyingStyleRef, stickyRangeRef, userTouchRef, setControlledSelection, controlledSelection]);

  const handleChangeText = useCallback((text) => {
    if (externalIsApplyingStyleRef?.current) {
      return;
    }
    const cursorPos = stickyRangeRef?.current?.start ?? text.length;
    if (stickyRangeRef) stickyRangeRef.current = { start: cursorPos, end: cursorPos };
    if (text === elem?.text) return;
    const updated = updateTextWithRuns(elem, text);
    if (onChangeElementRef.current) onChangeElementRef.current(updated);
  }, [elem, externalIsApplyingStyleRef, stickyRangeRef]);

  const handleBlur = useCallback(() => {
    console.log('[BLUR] TextInput blurred, keeping edit state and selection');
    const saved = stickyRangeRef?.current;
    if (saved && inputRef?.current) {
      setTimeout(() => {
        if (inputRef.current?.focus) inputRef.current.focus();
        if (typeof inputRef.current?.setSelection === 'function') {
          inputRef.current.setSelection(saved.start, saved.end);
        } else if (inputRef.current?.setNativeProps) {
          inputRef.current.setNativeProps({ selection: saved });
        }
      }, 50);
    }
  }, [inputRef, stickyRangeRef]);

  const inputStyle = useMemo(() => ({
    flex: 1,
    fontSize: scaledBaseSize,
    fontWeight: elem?.fontWeight || 'normal',
    fontStyle: elem?.fontStyle || 'normal',
    textDecorationLine: elem?.textDecorationLine || 'none',
    textAlign: elem?.textAlign || 'right',
    writingDirection: elem?.writingDirection || 'rtl',
    lineHeight: scaledBaseSize * (elem?.lineSpacing || 1.35),
    fontFamily: elem?.kurdishFont ? getDisplayFontFamily(elem.kurdishFont) : (fontFamily || undefined),
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 4,
    margin: 0,
    textAlignVertical: 'top',
  }), [scaledBaseSize, elem?.fontWeight, elem?.fontStyle, elem?.textDecorationLine, elem?.textAlign, elem?.writingDirection, elem?.lineSpacing, elem?.kurdishFont, elem?.englishFont, fontFamily]);

  return (
    <TextInput
      key={`native_input_${elem?.id}`}
      ref={inputRef}
      style={inputStyle}
      multiline={true}
      autoFocus={true}
      showSoftInputOnFocus={showSoftInputOnFocus}
      selection={controlledSelection}
      onTouchStart={handleTouchStart}
      onSelectionChange={handleSelectionChange}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
    >
      {renderStyledTextChildren(formattedRuns, scaledBaseSize, fontFamily, elem)}
    </TextInput>
  );
}, (prevProps, nextProps) => {
  if (prevProps.elem?.id !== nextProps.elem?.id) return false;
  if (prevProps.elem?.text !== nextProps.elem?.text) return false;
  // Paragraph alignment changes the input's style: re-render (same key, no remount, focus kept)
  if (prevProps.elem?.textAlign !== nextProps.elem?.textAlign) return false;
  if (prevProps.elem?.writingDirection !== nextProps.elem?.writingDirection) return false;
  if (prevProps.scaledBaseSize !== nextProps.scaledBaseSize) return false;
  if (prevProps.fontFamily !== nextProps.fontFamily) return false;
  if (prevProps.controlledSelection !== nextProps.controlledSelection) return false;
  if (prevProps.showSoftInputOnFocus !== nextProps.showSoftInputOnFocus) return false;

  const p = prevProps.formattedRuns ?? [];
  const n = nextProps.formattedRuns ?? [];
  if (p.length !== n.length) return false;

  for (let i = 0; i < p.length; i++) {
    const pr = p[i];
    const nr = n[i];
    if (
      pr.text !== nr.text ||
      pr.bold !== nr.bold ||
      pr.italic !== nr.italic ||
      pr.underline !== nr.underline ||
      pr.color !== nr.color ||
      pr.highlight !== nr.highlight ||
      pr.highlightColor !== nr.highlightColor ||
      pr.sizeScale !== nr.sizeScale ||
      pr.kuFont !== nr.kuFont ||
      pr.enFont !== nr.enFont ||
      pr.kurdishFont !== nr.kurdishFont ||
      pr.englishFont !== nr.englishFont
    ) {
      return false;
    }
  }

  return true;
});

export const PptCanvas = ({
  slide,
  aspectRatio = '16:9',
  selectedElementId,
  editingElementId,
  onSelectElement,
  onStartInlineEditing,
  onEndInlineEditing,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onChangeImageElement,
  fontFamily,
  selRef,
  pendingSelRef,
  pressingRef,
  stickyRangeRef,
  userTouchRef: externalUserTouchRef,
  ignoreSelectionRef,
  inputRef,
  isApplyingStyleRef: externalIsApplyingStyleRef,
  controlledSelection,
  setControlledSelection,
  showSoftInputOnFocus,
  setShowSoftInputOnFocus,
  onCanvasTap,
  onCanvasDoubleTap,
  onShapeDoubleTap,
  selectedTableCell,
  onTableCellTap,
  onSmartArtTap,
  snapEnabled = true,
}) => {
  const localUserTouchRef = React.useRef(false);
  const userTouchRef = externalUserTouchRef || localUserTouchRef;
  const touchTimeoutRef = React.useRef(null);
  const lastShapeTapRef = React.useRef({ id: null, time: 0 });
  // Last tap on an empty slide area (elements and handles take their own touches)
  const lastEmptyTapRef = React.useRef({ time: 0, x: 0, y: 0 });
  // Cell under the finger (set by the cell's onTouchStart, read when the table tap is released)
  const lastTableCellTouchRef = React.useRef(null);
  // Snap ON/OFF, read by the (stable) move / resize responders at gesture time
  const snapEnabledRef = React.useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;

  const is43 = aspectRatio === '4:3';
  const { width: windowWidth } = useWindowDimensions();
  const canvasWidth = windowWidth - 24;
  const canvasHeight = is43 ? (canvasWidth * 3) / 4 : (canvasWidth * 9) / 16;

  // Text boxes stay below a title above them (same rule as the rendered position)
  const titleMinY = (elem, y, list) => {
    if (elem.type !== 'text') return 0;
    const titleElem = (list || []).find(
      (e) => e.id !== elem.id && e.type === 'text' && e.y < y && (e.fontSize >= 20 || e.fontWeight === 'bold')
    );
    return titleElem ? Math.min(90, titleElem.y + titleElem.height + 2) : 0;
  };

  // ---- Move (drag) + tap, with silent snapping ----
  // One responder per element, created once (stable across renders) so a drag never loses its
  // gesture state. While dragging only a local draft position changes (the editor is not
  // re-rendered and no undo step is pushed); the element is committed once on release.
  const [moveDraft, setMoveDraft] = useState(null); // { id, x, y }
  const moveRespondersRef = useRef({});
  const moveGestureRef = useRef(null);
  const moveEnvRef = useRef({});

  // Ends a dragged move: commit the last position once (one undo step), drop the draft
  const endDrag = (g) => {
    setMoveDraft(null);
    const last = g && g.last;
    const element = g && g.element;
    const env = moveEnvRef.current;
    if (g && g.isDragging && last && (last.x !== element.x || last.y !== element.y) && env.onChangeElement) {
      env.onChangeElement({ ...element, x: last.x, y: last.y });
    }
  };

  const finishMove = (id, gestureState, terminated) => {
    const g = moveGestureRef.current;
    if (!g || g.id !== id) {
      // Not the active gesture any more: never leave its draft behind
      setMoveDraft((d) => (d && d.id === id ? null : d));
      return;
    }
    moveGestureRef.current = null;
    const env = moveEnvRef.current;
    const element = g.element;
    if (g.isDragging) {
      endDrag(g);
      return;
    }
    if (terminated) return;
    const dist = Math.hypot(gestureState.dx, gestureState.dy);
    if (dist > 8) return;
    env.onSelectElement(element.id);
    if (element.type === 'text') {
      // A locked text box is only selected (its text cannot be edited)
      if (!element.locked) env.onStartInlineEditing(element.id);
    } else if (element.type === 'image' && !element.uri) {
      env.onChangeImageElement(element);
    } else if (element.type === 'smartart') {
      if (env.onSmartArtTap && g.grantLoc) {
        const ptPerPx = SLIDE.widthPt / env.canvasWidth;
        env.onSmartArtTap(element.id, g.grantLoc.x * ptPerPx, g.grantLoc.y * ptPerPx);
      }
    } else if (element.type === 'table') {
      const t = lastTableCellTouchRef.current;
      if (t && t.elemId === element.id && env.onTableCellTap) env.onTableCellTap(element.id, t.r, t.c);
    } else if (element.type === 'shape') {
      const shapeType = element.shapeType || 'rect';
      if (shapeType !== 'line' && shapeType !== 'arrow') {
        const now = Date.now();
        const lastTap = lastShapeTapRef.current;
        if (lastTap.id === element.id && (now - lastTap.time) < 300) {
          if (env.onShapeDoubleTap) env.onShapeDoubleTap(element);
        }
        lastShapeTapRef.current = { id: element.id, time: now };
      }
    }
  };

  const getMoveResponder = (id) => {
    if (moveRespondersRef.current[id]) return moveRespondersRef.current[id];
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // While another element is dragged / resized, the finger passing over this element must
        // not take the gesture over (the first element would be left half moved)
        const active = moveGestureRef.current;
        if ((active && active.id !== id) || resizeGestureRef.current) return false;
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      // Once the element really moves, keep the gesture until the finger lifts. Before that a
      // scroll may still take it (tap-vs-scroll unchanged).
      onPanResponderTerminationRequest: () => {
        const g = moveGestureRef.current;
        return !(g && g.id === id && g.isDragging);
      },
      onPanResponderGrant: (evt) => {
        const env = moveEnvRef.current;
        const prevGesture = moveGestureRef.current;
        if (prevGesture && prevGesture.id !== id) {
          // Should not happen any more (a drag cannot be taken over), but never leave it half done
          moveGestureRef.current = null;
          endDrag(prevGesture);
        }
        const element = env.byId && env.byId[id];
        if (!element) {
          moveGestureRef.current = null;
          return;
        }
        moveGestureRef.current = {
          id,
          element,
          // finger position inside the element (SmartArt: which shape was tapped)
          grantLoc: evt && evt.nativeEvent ? { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY } : null,
          isDragging: false,
          last: null,
        };
        env.onSelectElement(id);
      },
      onPanResponderMove: (evt, gestureState) => {
        const g = moveGestureRef.current;
        if (!g || g.id !== id || g.element.locked) return;
        if (!g.isDragging && Math.hypot(gestureState.dx, gestureState.dy) <= 8) return;
        const env = moveEnvRef.current;
        const cw = env.canvasWidth;
        const ch = env.canvasHeight;
        const element = g.element;
        if (!g.isDragging) {
          // Drag starts: everything the snapping needs is computed once here
          g.isDragging = true;
          const box = (env.boxes || []).find((b) => b.id === id);
          g.hPx = box ? box.hPx : (element.height / 100) * ch;
          g.minY = titleMinY(element, element.y, env.elements);
          g.lines = snapEnabledRef.current ? buildSnapLines(env.boxes || [], id, cw, ch) : null;
        }
        // Turned OFF meanwhile: no snapping from now on
        if (!snapEnabledRef.current) g.lines = null;
        const { x, y, gx, gy } = computeSnappedMove(
          {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            hPx: g.hPx,
            rotation: element.rotation || 0,
            minY: g.minY,
            cw,
            ch,
            lines: g.lines,
          },
          gestureState.dx,
          gestureState.dy
        );
        // Short haptic tick only when a NEW snap line engages (never while staying snapped)
        const eng = snapEngageKeys(g.snapKeys, gx, gy);
        g.snapKeys = eng.keys;
        if (eng.engaged) snapTick();
        const prev = g.last;
        if (prev && prev.x === x && prev.y === y) return;
        g.last = { x, y };
        setMoveDraft({ id, x, y });
      },
      onPanResponderRelease: (evt, gestureState) => finishMove(id, gestureState, false),
      onPanResponderTerminate: (evt, gestureState) => finishMove(id, gestureState, true),
    });
    moveRespondersRef.current[id] = responder;
    return responder;
  };

  // ---- Unified 8-handle resize (all element types) ----
  // Responders are created once (stable across renders) so an active drag never loses its
  // gesture state. During the drag only a local draft geometry changes; the element is committed
  // once on release => one drag = one undo step.
  const [resizeDraft, setResizeDraft] = useState(null); // { id, x, y, width, height }
  const resizeCtxRef = useRef(null); // selected element + its on-screen geometry (set during render)
  const resizeGestureRef = useRef(null);
  const resizeEnvRef = useRef({});
  resizeEnvRef.current = { onChangeElement, canvasWidth, canvasHeight };

  // Ends a resize (release, terminate, or the safety net): draft dropped, element committed
  const finishResize = () => {
    const g = resizeGestureRef.current;
    resizeGestureRef.current = null;
    setResizeDraft(null);
    if (!g || !g.last) return;
    const r = g.last;
    const elem = g.elem;
    const updated = {
      ...elem,
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: elem.type === 'text' ? Math.ceil(r.height * 10) / 10 : Math.round(r.height * 10) / 10,
    };
    if (!r.keepAspect) {
      updated.aspectRatio = updated.width / Math.max(0.1, updated.height);
    }
    if (elem.type === 'text') {
      // Resizing a text box never changes its font size
      updated.fontMode = 'manual';
      updated.fontSize = Math.round(g.fontPt);
    }
    const env = resizeEnvRef.current;
    if (env.onChangeElement) env.onChangeElement(updated);
  };

  const resizeResponders = useMemo(() => {
    const map = {};
    RESIZE_HANDLES.forEach((handle) => {
      map[handle.key] = PanResponder.create({
        onStartShouldSetPanResponder: () => {
          const ctx = resizeCtxRef.current;
          return !!ctx && !ctx.elem.locked;
        },
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          const ctx = resizeCtxRef.current;
          if (!ctx || ctx.elem.locked) {
            resizeGestureRef.current = null;
            return;
          }
          const env = resizeEnvRef.current;
          resizeGestureRef.current = {
            ...ctx,
            handle,
            cw: env.canvasWidth,
            ch: env.canvasHeight,
            last: null,
            // Candidate snap lines, once per drag (unrotated elements only)
            lines: snapEnabledRef.current && !ctx.rotation
              ? buildSnapLines(moveEnvRef.current.boxes || [], ctx.elem.id, env.canvasWidth, env.canvasHeight)
              : null,
          };
          setResizeDraft({
            id: ctx.elem.id,
            x: ctx.geom.x,
            y: ctx.geom.y,
            width: ctx.geom.w,
            height: ctx.geom.h,
          });
        },
        onPanResponderMove: (evt, gestureState) => {
          const g = resizeGestureRef.current;
          if (!g) return;
          if (!snapEnabledRef.current) g.lines = null;
          const { r, gx, gy } = snapResizeGeometry(g, gestureState.dx, gestureState.dy);
          g.last = r;
          const eng = snapEngageKeys(g.snapKeys, gx, gy);
          g.snapKeys = eng.keys;
          if (eng.engaged) snapTick();
          setResizeDraft({ id: g.elem.id, x: r.x, y: r.y, width: r.width, height: r.height });
        },
        onPanResponderRelease: () => finishResize(),
        onPanResponderTerminate: () => finishResize(),
      });
    });
    return map;
  }, []);

  // Safety net: the last finger lifted (or the touch was cancelled) anywhere on this canvas.
  // A gesture whose release never arrived is finished a moment later (draft dropped, committed).
  const safetyTimerRef = useRef(null);
  const finishAllGestures = () => {
    const g = moveGestureRef.current;
    if (g) {
      moveGestureRef.current = null;
      endDrag(g);
    }
    if (resizeGestureRef.current) finishResize();
  };
  const handleCanvasTouchEnd = (e) => {
    const touches = e && e.nativeEvent && e.nativeEvent.touches;
    if (touches && touches.length > 0) return; // another finger is still down
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      safetyTimerRef.current = null;
      if (moveGestureRef.current || resizeGestureRef.current) finishAllGestures();
    }, 120);
  };

  // App in the background: finish a running gesture; unmount: no timer left
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') finishAllGestures();
    });
    return () => {
      sub.remove();
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  // Layout plan only changes with the slide (not while a drag draft moves)
  const planned = useMemo(() => (slide ? planPage(slide) : null), [slide]);

  if (!slide) {
    return (
      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
        <Text style={{ color: '#888' }}>هیچ سڵایدێک دیاری نەکراوە</Text>
      </View>
    );
  }

  // Layout plan: single source of truth
  const elements = (planned.computedPage && planned.computedPage.elements) || slide.elements || [];
  const splitCount = planned.splitCount || 0;
  resizeCtxRef.current = null;
  // Latest data for the stable move responders (+ every element's on-screen box for snapping)
  const byId = {};
  elements.forEach((e) => { byId[e.id] = e; });
  const boxes = [];
  let selectionBox = null; // on-screen box of the selected element (frame + handles layer)
  moveEnvRef.current = {
    byId,
    elements,
    boxes,
    canvasWidth,
    canvasHeight,
    onSelectElement,
    onStartInlineEditing,
    onChangeElement,
    onChangeImageElement,
    onSmartArtTap,
    onTableCellTap,
    onShapeDoubleTap,
  };
  Object.keys(moveRespondersRef.current).forEach((id) => {
    if (!byId[id]) delete moveRespondersRef.current[id];
  });

  return (
    <View style={styles.container} onTouchEnd={handleCanvasTouchEnd} onTouchCancel={handleCanvasTouchEnd}>
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight, backgroundColor: getSlideBaseColor(slide) },
        ]}
        onPress={(e) => {
          // Second quick tap near the first one on an empty area: add a text box there
          const now = Date.now();
          const tx = e?.nativeEvent?.locationX ?? canvasWidth / 2;
          const ty = e?.nativeEvent?.locationY ?? canvasHeight / 2;
          const last = lastEmptyTapRef.current;
          const isDoubleTap =
            now - last.time < DOUBLE_TAP_MS &&
            Math.abs(tx - last.x) < DOUBLE_TAP_SLOP &&
            Math.abs(ty - last.y) < DOUBLE_TAP_SLOP;
          if (isDoubleTap && onCanvasDoubleTap) {
            lastEmptyTapRef.current = { time: 0, x: 0, y: 0 };
            onCanvasDoubleTap({
              x: Math.max(0, Math.min(100, (tx / canvasWidth) * 100)),
              y: Math.max(0, Math.min(100, (ty / canvasHeight) * 100)),
            });
            return;
          }
          lastEmptyTapRef.current = { time: now, x: tx, y: ty };

          // Single tap: deselect
          if (onCanvasTap) {
            onCanvasTap();
          } else {
            onSelectElement(null);
            if (onEndInlineEditing) onEndInlineEditing();
          }
        }}
      >
        <PptSlideBackground slide={slide} width={canvasWidth} height={canvasHeight} />

        {/* Editor-only hint on an empty slide (PptCleanSlide renders exports, so it never shows there) */}
        {!elements.some((el) => !el.themeDecor) && (
          <View style={styles.emptyHintBox} pointerEvents="none">
            <Text style={styles.emptyHintText}>دوو جار لێبدە بۆ نووسین، یان لە خوارەوە شتێک زیاد بکە</Text>
          </View>
        )}
        {elements.map((elem) => {
          const isSelected = selectedElementId === elem.id;
          const isEditing = editingElementId === elem.id;
          // While this element is dragged it follows the local draft position
          const mDraft = moveDraft && moveDraft.id === elem.id ? moveDraft : null;
          const srcX = mDraft ? mDraft.x : elem.x;
          const srcY = mDraft ? mDraft.y : elem.y;

          const effectiveY = Math.max(srcY, titleMinY(elem, srcY, elements));

          let effectiveHeight = elem.height;
          if (elem.type === 'table') {
            // Rows grow with wrapped text: the table is never shorter than its content
            const tableLay = layoutTable(elem, SLIDE.widthPt, canvasHeight / (canvasWidth / SLIDE.widthPt));
            effectiveHeight = Math.max(elem.height, tableLay.heightPct);
          }
          if (elem.type === 'text' && elem.text && elem.text.trim()) {
            const computedPt = elem.computedFontSize || elem.fontSize || 18;
            const layoutMeas = measureElementLayout(elem, computedPt);
            const neededPercent = Math.ceil((layoutMeas.totalHeightPt / SLIDE.heightPt) * 100);
            if (neededPercent > elem.height) {
              effectiveHeight = Math.min(96 - effectiveY, neededPercent + 2);
            }
          }

          // While a resize handle is dragged, the box follows the live draft geometry
          const draft = resizeDraft && resizeDraft.id === elem.id ? resizeDraft : null;
          const boxX = draft ? draft.x : srcX;
          const boxY = draft ? draft.y : effectiveY;
          const boxW = draft ? draft.width : elem.width;
          const boxH = draft ? draft.height : effectiveHeight;

          const left = (boxX / 100) * canvasWidth;
          const top = (boxY / 100) * canvasHeight;
          const elemWidth = (boxW / 100) * canvasWidth;
          const elemHeight = (boxH / 100) * canvasHeight;

          const dragResponder = getMoveResponder(elem.id);
          boxes.push({ id: elem.id, hPx: elemHeight, ...rotatedBoundsPx(left, top, elemWidth, elemHeight, elem.rotation || 0) });

          const computedPt = elem.computedFontSize || elem.fontSize || 18;
          const scaledBaseSize = computedPt * (canvasWidth / SLIDE.widthPt);

          const formattedRuns = getElementRuns(elem);
          const activeStickyRange = isEditing ? stickyRangeRef?.current : null;
          const displayRuns = getDisplayRunsWithSelection(formattedRuns, activeStickyRange);

          const rotation = elem.rotation || 0;
          const showHandles = isSelected && !elem.locked;
          if (isSelected) {
            selectionBox = { left, top, w: elemWidth, h: elemHeight, rotation, showHandles };
          }
          if (isSelected && !draft) {
            const minY = titleMinY(elem, elem.y, elements);
            resizeCtxRef.current = {
              elem,
              geom: { x: boxX, y: boxY, w: boxW, h: boxH },
              rotation,
              minY,
              fontPt: computedPt,
            };
          }
          const opacity = elem.opacity !== undefined ? elem.opacity : 1.0;
          const borderRadiusPct = elem.borderRadius || 0;
          const borderWidth = elem.border?.width || 0;
          const borderColor = elem.border?.color || 'transparent';
          const crop = elem.crop || { top: 0, bottom: 0, left: 0, right: 0 };
          const cropLeft = crop.left || 0;
          const cropRight = crop.right || 0;
          const cropTop = crop.top || 0;
          const cropBottom = crop.bottom || 0;
          const visibleW = Math.max(0.05, 1 - cropLeft - cropRight);
          const visibleH = Math.max(0.05, 1 - cropTop - cropBottom);
          const calculatedRadius = (borderRadiusPct / 100) * (Math.min(elemWidth, elemHeight) / 2);

          return (
            <View
              key={`elem_wrapper_${elem.id}`}
              style={[
                styles.elementWrapper,
                {
                  left,
                  top,
                  width: elemWidth,
                  height: elemHeight,
                  zIndex: elem.zIndex || 1,
                  transform: rotation ? [{ rotate: `${rotation}deg` }] : [],
                  opacity: elem.type === 'shape' ? 1 : opacity,
                },
              ]}
              {...(isEditing ? {} : dragResponder.panHandlers)}
            >
              {elem.type === 'text' ? (
                <View style={styles.textContainer}>
                  {isEditing ? (
                    <InlineTextInput
                      key={`inline_input_${elem.id}`}
                      elem={elem}
                      inputRef={inputRef}
                      scaledBaseSize={scaledBaseSize}
                      fontFamily={fontFamily}
                      formattedRuns={formattedRuns}
                      controlledSelection={controlledSelection}
                      setControlledSelection={setControlledSelection}
                      userTouchRef={userTouchRef}
                      touchTimeoutRef={touchTimeoutRef}
                      externalIsApplyingStyleRef={externalIsApplyingStyleRef}
                      stickyRangeRef={stickyRangeRef}
                      onChangeElement={onChangeElement}
                      onEndInlineEditing={onEndInlineEditing}
                      showSoftInputOnFocus={showSoftInputOnFocus}
                      setShowSoftInputOnFocus={setShowSoftInputOnFocus}
                    />
                  ) : (
                    <Text
                      style={{
                        textAlign: elem.textAlign || 'right',
                        writingDirection: elem.writingDirection || 'rtl',
                        lineHeight: scaledBaseSize * (elem.lineSpacing || 1.35),
                        paddingHorizontal: 6,
                        paddingVertical: 6,
                        borderRadius: 4,
                      }}
                    >
                      {displayRuns.map((run, rIdx) => {
                        const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
                        const runScaledFontSize = scaledBaseSize * runScale;
                        const runLineHeight = runScaledFontSize * 1.35;
                        const scriptRuns = splitRuns(
                          run.text || '',
                          run.kurdishFont || run.kuFont || elem.kurdishFont || 'Tahoma',
                          run.englishFont || run.enFont || elem.englishFont || 'Calibri'
                        );
                        const hasOwnHighlight = (run.highlight || run.highlightColor) && (run.highlight || run.highlightColor) !== 'transparent';
                        const runHighlight = run.isStickySelected
                          ? (hasOwnHighlight ? (run.highlight || run.highlightColor) : '#3390FF55')
                          : (hasOwnHighlight ? (run.highlight || run.highlightColor) : undefined);
                        const runShadow = (run.shadowColor || run.shadow || run.textShadowColor) && (run.shadowColor || run.shadow || run.textShadowColor) !== 'transparent' ? (run.shadowColor || run.shadow || run.textShadowColor) : undefined;
                        const runShadowOffset = run.textShadowOffset || run.shadowOffset || elem.textShadowOffset || elem.shadowOffset || { width: 2, height: 2 };
                        const runShadowRadius = run.textShadowRadius !== undefined ? run.textShadowRadius : (run.shadowRadius !== undefined ? run.shadowRadius : (elem.textShadowRadius !== undefined ? elem.textShadowRadius : (elem.shadowRadius !== undefined ? elem.shadowRadius : 3)));
                        const isUnderlined = run.isStickySelected && hasOwnHighlight ? true : run.underline;

                        return (
                          <Text
                            key={`frun_${rIdx}`}
                            style={{
                              fontSize: runScaledFontSize,
                              lineHeight: runLineHeight,
                              fontWeight: run.bold ? 'bold' : elem.fontWeight || 'normal',
                              fontStyle: run.italic ? 'italic' : elem.fontStyle || 'normal',
                              textDecorationLine: isUnderlined ? 'underline' : elem.textDecorationLine || 'none',
                              textDecorationColor: run.isStickySelected && hasOwnHighlight ? '#3390FF' : undefined,
                              color: run.color || '#1c1c1e',
                              backgroundColor: runHighlight,
                              textShadowColor: runShadow,
                              textShadowOffset: runShadow ? runShadowOffset : { width: 0, height: 0 },
                              textShadowRadius: runShadow ? runShadowRadius : 0,
                            }}
                          >
                            {scriptRuns.map((sRun, sIdx) => (
                              <Text key={`srun_${rIdx}_${sIdx}`} style={{ fontFamily: getDisplayFontFamily(sRun.fontFamily) }}>
                                {sRun.text}
                              </Text>
                            ))}
                          </Text>
                        );
                      })}
                    </Text>
                  )}
                </View>
              ) : elem.type === 'smartart' ? (
                <PptSmartArtView
                  elem={elem}
                  W={(boxW / 100) * SLIDE.widthPt}
                  H={(boxH / 100) * (canvasHeight / (canvasWidth / SLIDE.widthPt))}
                  scale={canvasWidth / SLIDE.widthPt}
                  showHints
                />
              ) : elem.type === 'table' ? (
                <PptTableView
                  elem={elem}
                  scale={canvasWidth / SLIDE.widthPt}
                  slideHeightPt={canvasHeight / (canvasWidth / SLIDE.widthPt)}
                  selectedCell={
                    isSelected && selectedTableCell && selectedTableCell.elemId === elem.id ? selectedTableCell : null
                  }
                  onCellTouch={(r, c) => {
                    lastTableCellTouchRef.current = { elemId: elem.id, r, c };
                  }}
                />
              ) : elem.type === 'shape' ? (
                <View style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                  {(() => {
                    const shapeType = elem.shapeType || 'rect';
                    const fill = elem.fill && elem.fill !== 'none' && elem.fill !== 'transparent' ? elem.fill : 'transparent';
                    const outline = elem.outline || { color: '#000000', width: 2 };
                    const outlineColor = outline.width > 0 ? (outline.color || '#000000') : 'transparent';
                    const outlineWidth = outline.width || 0;
                    const cornerRadiusPct = elem.cornerRadius !== undefined ? elem.cornerRadius : 20;

                    const shapeFontSize = (elem.fontSize || 16) * (canvasWidth / SLIDE.widthPt);
                    const textColor = elem.textColor || '#000000';
                    const isBold = !!elem.bold;

                    const shapeTextElement = elem.text ? (
                      <Text
                        style={{
                          color: textColor,
                          fontSize: shapeFontSize,
                          fontWeight: isBold ? 'bold' : 'normal',
                          fontFamily: 'Tahoma',
                          textAlign: 'center',
                          writingDirection: 'rtl',
                        }}
                      >
                        {elem.text}
                      </Text>
                    ) : null;

                    return (
                      <React.Fragment>
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity, transform: elem.flipH ? [{ scaleX: -1 }] : undefined }}>
                          {renderSvgShape({
                            shapeType: shapeType,
                            fill: fill,
                            outlineColor: outlineColor,
                            outlineWidth: outlineWidth,
                            cornerRadius: cornerRadiusPct,
                            svgWidth: '100%',
                            svgHeight: '100%',
                          })}
                        </View>
                        {shapeTextElement && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: 4,
                            }}
                          >
                            {shapeTextElement}
                          </View>
                        )}
                      </React.Fragment>
                    );
                  })()}
                </View>
              ) : (
                <View
                  style={[
                    styles.imageContainer,
                    {
                      borderRadius: calculatedRadius,
                      borderWidth: borderWidth,
                      borderColor: borderColor,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {elem.uri ? (
                    <View style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                      <Image
                        source={{ uri: elem.uri }}
                        style={{
                          position: 'absolute',
                          width: `${(1 / visibleW) * 100}%`,
                          height: `${(1 / visibleH) * 100}%`,
                          left: `${-(cropLeft / visibleW) * 100}%`,
                          top: `${-(cropTop / visibleH) * 100}%`,
                        }}
                        resizeMode={elem.fit === 'fit' ? 'contain' : 'cover'}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePlaceholder}
                      onPress={() => onChangeImageElement(elem)}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 2 }}>🖼️</Text>
                      <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                        داگرتنی وێنە
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Lock badge if element is locked */}
              {elem.locked && (
                <View style={styles.lockBadge}>
                  <Text style={{ fontSize: 10 }}>🔒</Text>
                </View>
              )}

            </View>
          );
        })}

        {/* Selection frame + 8 resize handles in their own layer. The layer is the element box
            grown by half a handle on every side, so the frame and the handles are drawn INSIDE
            their own view (never outside a view's bounds: Android only repaints a view's own
            rectangle, so anything drawn outside it could stay on screen as a trace). It rotates
            with the element around the same center and only the handles take touches. */}
        {selectionBox && (
          <View
            pointerEvents="box-none"
            style={[
              styles.selectionLayer,
              {
                left: selectionBox.left - HANDLE_MARGIN,
                top: selectionBox.top - HANDLE_MARGIN,
                width: selectionBox.w + HANDLE_MARGIN * 2,
                height: selectionBox.h + HANDLE_MARGIN * 2,
                transform: selectionBox.rotation ? [{ rotate: `${selectionBox.rotation}deg` }] : [],
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[styles.selectionOutline, { left: HANDLE_MARGIN, top: HANDLE_MARGIN, right: HANDLE_MARGIN, bottom: HANDLE_MARGIN }]}
            />
            {selectionBox.showHandles &&
              RESIZE_HANDLES.map((handle) => (
                <View
                  key={handle.key}
                  style={[
                    styles.handleTouchTarget,
                    {
                      left: HANDLE_MARGIN + handle.fx * selectionBox.w - HANDLE_TOUCH_SIZE / 2,
                      top: HANDLE_MARGIN + handle.fy * selectionBox.h - HANDLE_TOUCH_SIZE / 2,
                    },
                  ]}
                  {...resizeResponders[handle.key].panHandlers}
                >
                  <View style={styles.handleDot} />
                </View>
              ))}
          </View>
        )}

        {/* Live size label while a resize handle is dragged */}
        {resizeDraft && (
          <View style={styles.sizeTooltip} pointerEvents="none">
            <Text style={styles.sizeTooltipText}>
              {`W: ${Math.round(resizeDraft.width)}% H: ${Math.round(resizeDraft.height)}%`}
            </Text>
          </View>
        )}


        {/* Small badge showing extra slides when text splits */}
        {splitCount > 0 && (
          <View style={styles.splitBadge}>
            <Text style={styles.splitBadgeText}>{`+${splitCount} سلاید`}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Selected Element Floating Action Bar */}
      {selectedElementId && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              const elem = elements.find((e) => e.id === selectedElementId);
              if (elem) onChangeElement({ ...elem, zIndex: (elem.zIndex || 1) + 1 });
            }}
          >
            <Text style={styles.actionText}>⬆️ پێشەوە</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              const elem = elements.find((e) => e.id === selectedElementId);
              if (elem) onChangeElement({ ...elem, zIndex: Math.max(1, (elem.zIndex || 1) - 1) });
            }}
          >
            <Text style={styles.actionText}>⬇️ پاشەوە</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onDuplicateElement(selectedElementId)}>
            <Text style={styles.actionText}>📋 کۆپی</Text>
          </TouchableOpacity>

          {elements.find((e) => e.id === selectedElementId)?.type === 'image' && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                const elem = elements.find((e) => e.id === selectedElementId);
                if (elem) onChangeImageElement(elem);
              }}
            >
              <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: 'bold' }}>🖼️ گۆڕینی وێنە</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: '#ff453a22' }]}
            onPress={() => onDeleteElement(selectedElementId)}
          >
            <Text style={{ color: '#ff453a', fontSize: 11, fontWeight: 'bold' }}>🗑️ سڕینەوە</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyHintBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyHintText: {
    color: '#8e8e93',
    opacity: 0.85,
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  // No elevation / shadow: on some Android GPUs an elevated view inside the scroll view was
  // drawn over the toolbars above it (stray frames). A thin border keeps the slide edge visible.
  canvas: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#00000033',
  },
  selectionLayer: {
    position: 'absolute',
    zIndex: 5000,
  },
  elementWrapper: {
    position: 'absolute',
    padding: 0,
  },
  selectionOutline: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: '#8B3A2B',
    borderStyle: 'dashed',
    zIndex: 998,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  handleTouchTarget: {
    position: 'absolute',
    width: HANDLE_TOUCH_SIZE,
    height: HANDLE_TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  handleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B3A2B',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sizeTooltip: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 1000,
  },
  sizeTooltipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  splitBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 100,
  },
  splitBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  actionItem: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  lockBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 100,
  },
});
