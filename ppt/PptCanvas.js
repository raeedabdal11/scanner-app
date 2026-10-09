import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { planPage, splitRuns, SLIDE, measureElementLayout } from './pptFit';
import { getElementRuns, updateTextWithRuns, getDisplayRunsWithSelection } from './formattedText';
import { renderSvgShape } from './shapeCatalog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RESIZE_HANDLES = [
  { key: 'tl', style: { left: -16, top: -16 } },
  { key: 'tc', style: { left: '50%', marginLeft: -16, top: -16 } },
  { key: 'tr', style: { right: -16, top: -16 } },
  { key: 'ml', style: { left: -16, top: '50%', marginTop: -16 } },
  { key: 'mr', style: { right: -16, top: '50%', marginTop: -16 } },
  { key: 'bl', style: { left: -16, bottom: -16 } },
  { key: 'bc', style: { left: '50%', marginLeft: -16, bottom: -16 } },
  { key: 'br', style: { right: -16, bottom: -16 } },
];

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
          <Text key={`tsrun_${rIdx}_${sIdx}`} style={{ fontFamily: sRun.fontFamily }}>
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
    fontFamily: elem?.kurdishFont || elem?.englishFont || fontFamily || undefined,
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
  onShapeDoubleTap,
}) => {
  const [resizingElement, setResizingElement] = useState(null);
  const localUserTouchRef = React.useRef(false);
  const userTouchRef = externalUserTouchRef || localUserTouchRef;
  const touchTimeoutRef = React.useRef(null);
  const lastShapeTapRef = React.useRef({ id: null, time: 0 });

  const is43 = aspectRatio === '4:3';
  const canvasWidth = SCREEN_WIDTH - 24;
  const canvasHeight = is43 ? (canvasWidth * 3) / 4 : (canvasWidth * 9) / 16;

  // Move Element Drag & Tap Handler
  const createMovePanResponder = (element) => {
    let initialX = element.x;
    let initialY = element.y;
    let isDragging = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        onSelectElement(element.id);
        initialX = element.x;
        initialY = element.y;
        isDragging = false;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (element.locked) return;
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        if (dist > 8) {
          isDragging = true;
          const deltaXPercent = (gestureState.dx / canvasWidth) * 100;
          const deltaYPercent = (gestureState.dy / canvasHeight) * 100;

          let minY = 0;
          if (element.type === 'text') {
            const titleElem = (slide.elements || []).find(
              (e) => e.id !== element.id && e.type === 'text' && e.y < element.y && e.fontSize >= 20
            );
            if (titleElem) {
              minY = Math.min(90, titleElem.y + titleElem.height + 2);
            }
          }

          const newX = Math.max(0, Math.min(100 - element.width, initialX + deltaXPercent));
          const newY = Math.max(minY, Math.min(100 - element.height, initialY + deltaYPercent));

          onChangeElement({
            ...element,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        if (!isDragging && dist <= 8) {
          onSelectElement(element.id);
          if (element.type === 'text') {
            onStartInlineEditing(element.id);
          } else if (element.type === 'image' && !element.uri) {
            onChangeImageElement(element);
          } else if (element.type === 'shape') {
            const shapeType = element.shapeType || 'rect';
            if (shapeType !== 'line' && shapeType !== 'arrow') {
              const now = Date.now();
              const lastTap = lastShapeTapRef.current;
              if (lastTap.id === element.id && (now - lastTap.time) < 300) {
                if (onShapeDoubleTap) {
                  onShapeDoubleTap(element);
                }
              }
              lastShapeTapRef.current = { id: element.id, time: now };
            }
          }
        }
      },
    });
  };

  // 8-Way Resize Drag Handler
  const create8WayResizePanResponder = (element, handleKey) => {
    let initialX = element.x;
    let initialY = element.y;
    let initialW = element.width;
    let initialH = element.height;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        initialX = element.x;
        initialY = element.y;
        initialW = element.width;
        initialH = element.height;
        setResizingElement({ id: element.id, width: element.width, height: element.height });
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaXPercent = (gestureState.dx / canvasWidth) * 100;
        const deltaYPercent = (gestureState.dy / canvasHeight) * 100;

        let newX = initialX;
        let newY = initialY;
        let newW = initialW;
        let newH = initialH;

        const MIN_W = 10;
        const MIN_H = 5;

        let minAllowedY = 0;
        if (element.type === 'text') {
          const titleElem = (slide.elements || []).find(
            (e) => e.id !== element.id && e.type === 'text' && e.y < element.y && e.fontSize >= 20
          );
          if (titleElem) {
            minAllowedY = Math.min(90, titleElem.y + titleElem.height + 2);
          }
        }

        if (handleKey.includes('r')) {
          newW = Math.max(MIN_W, Math.min(100 - initialX, initialW + deltaXPercent));
        }
        if (handleKey.includes('l')) {
          const maxLeft = initialX + initialW - MIN_W;
          newX = Math.max(0, Math.min(maxLeft, initialX + deltaXPercent));
          newW = initialW + (initialX - newX);
        }
        if (handleKey.includes('b')) {
          newH = Math.max(MIN_H, Math.min(100 - initialY, initialH + deltaYPercent));
        }
        if (handleKey.includes('t')) {
          const maxTop = initialY + initialH - MIN_H;
          let targetY = initialY + deltaYPercent;
          if (minAllowedY > 0 && targetY < minAllowedY) {
            targetY = minAllowedY;
          }
          newY = Math.max(minAllowedY, Math.min(maxTop, targetY));
          newH = initialH + (initialY - newY);
        }

        // For image elements on corner handles, maintain aspect ratio
        if (element.type === 'image' && (handleKey === 'tl' || handleKey === 'tr' || handleKey === 'bl' || handleKey === 'br')) {
          const aspect = element.aspectRatio || (initialW / initialH) || 1.0;
          newH = Math.max(MIN_H, newW / aspect);
        }

        const updated = {
          ...element,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newW * 10) / 10,
          height: Math.round(newH * 10) / 10,
        };

        setResizingElement({ id: element.id, width: updated.width, height: updated.height });
        onChangeElement(updated);
      },
      onPanResponderRelease: () => {
        setResizingElement(null);
      },
    });
  };

  if (!slide) {
    return (
      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
        <Text style={{ color: '#888' }}>هیچ سڵایدێک دیاری نەکراوە</Text>
      </View>
    );
  }

  // Calculate layout plan using single source of truth
  const planned = planPage(slide);
  const elements = (planned.computedPage && planned.computedPage.elements) || slide.elements || [];
  const splitCount = planned.splitCount || 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight, backgroundColor: slide.background || '#ffffff' },
        ]}
        onPress={() => {
          if (onCanvasTap) {
            onCanvasTap();
          } else {
            onSelectElement(null);
            if (onEndInlineEditing) onEndInlineEditing();
          }
        }}
      >
        {elements.map((elem) => {
          const isSelected = selectedElementId === elem.id;
          const isEditing = editingElementId === elem.id;

          let effectiveY = elem.y;
          if (elem.type === 'text') {
            const titleElem = elements.find(
              (e) => e.id !== elem.id && e.type === 'text' && e.y < elem.y && (e.fontSize >= 20 || e.fontWeight === 'bold')
            );
            if (titleElem) {
              const minTitleBottom = Math.min(90, titleElem.y + titleElem.height + 2);
              if (effectiveY < minTitleBottom) {
                effectiveY = minTitleBottom;
              }
            }
          }

          const left = (elem.x / 100) * canvasWidth;
          const top = (effectiveY / 100) * canvasHeight;
          const elemWidth = (elem.width / 100) * canvasWidth;

          let effectiveHeight = elem.height;
          if (elem.type === 'text' && elem.text && elem.text.trim()) {
            const computedPt = elem.computedFontSize || elem.fontSize || 18;
            const layoutMeas = measureElementLayout(elem, computedPt);
            const neededPercent = Math.ceil((layoutMeas.totalHeightPt / SLIDE.heightPt) * 100);
            if (neededPercent > elem.height) {
              effectiveHeight = Math.min(96 - effectiveY, neededPercent + 2);
            }
          }

          const elemHeight = (effectiveHeight / 100) * canvasHeight;

          const dragResponder = createMovePanResponder(elem);

          const computedPt = elem.computedFontSize || elem.fontSize || 18;
          const scaledBaseSize = computedPt * (canvasWidth / SLIDE.widthPt);

          const formattedRuns = getElementRuns(elem);
          const activeStickyRange = isEditing ? stickyRangeRef?.current : null;
          const displayRuns = getDisplayRunsWithSelection(formattedRuns, activeStickyRange);

          const rotation = elem.rotation || 0;
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
                  opacity,
                },
                isSelected && styles.selectedWrapper,
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
                          run.kurdishFont || elem.kurdishFont || 'Tahoma',
                          run.englishFont || elem.englishFont || 'Calibri'
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
                              <Text key={`srun_${rIdx}_${sIdx}`} style={{ fontFamily: sRun.fontFamily }}>
                                {sRun.text}
                              </Text>
                            ))}
                          </Text>
                        );
                      })}
                    </Text>
                  )}
                </View>
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
                        {renderSvgShape({
                          shapeType: shapeType,
                          fill: fill,
                          outlineColor: outlineColor,
                          outlineWidth: outlineWidth,
                          cornerRadius: cornerRadiusPct,
                          svgWidth: '100%',
                          svgHeight: '100%',
                        })}
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

              {/* Dimension Tooltip Badge when dragging resize */}
              {resizingElement && resizingElement.id === elem.id && (
                <View style={styles.sizeTooltip}>
                  <Text style={styles.sizeTooltipText}>
                    {`W: ${elem.width}% | H: ${elem.height}%`}
                  </Text>
                </View>
              )}

              {/* 8-Way Touch Handles for Selected Element */}
              {isSelected && (
                <>
                  {RESIZE_HANDLES.map((handle) => (
                    <View
                      key={handle.key}
                      style={[styles.handleTouchTarget, handle.style]}
                      {...create8WayResizePanResponder(elem, handle.key).panHandlers}
                    >
                      <View style={styles.handleDot} />
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })}

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
  canvas: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  elementWrapper: {
    position: 'absolute',
    padding: 2,
  },
  selectedWrapper: {
    borderWidth: 1.5,
    borderColor: '#8B3A2B',
    borderStyle: 'dashed',
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
    width: 32,
    height: 32,
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
    top: -24,
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
