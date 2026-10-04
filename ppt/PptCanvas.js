import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  Pressable,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { planPage, splitRuns, SLIDE, measureElementLayout } from './pptFit';
import { getElementRuns, updateTextWithRuns, getDisplayRunsWithSelection } from './formattedText';

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
  selState,
  setSelState,
  isApplyingStyleRef: externalIsApplyingStyleRef,
  controlledSelection,
}) => {
  const [resizingElement, setResizingElement] = useState(null);
  const localUserTouchRef = React.useRef(false);
  const userTouchRef = externalUserTouchRef || localUserTouchRef;
  const touchTimeoutRef = React.useRef(null);

  const is43 = aspectRatio === '4:3';
  const canvasWidth = SCREEN_WIDTH - 24;
  const canvasHeight = is43 ? (canvasWidth * 3) / 4 : (canvasWidth * 9) / 16;

  // Move Element Drag Handler - only captures gestures when element is selected & moved
  const createMovePanResponder = (element, isSelected) => {
    let initialX = element.x;
    let initialY = element.y;
    let isDragging = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!isSelected) return false;
        if (editingElementId === element.id) return false;
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8;
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: () => {
        initialX = element.x;
        initialY = element.y;
        isDragging = false;
      },
      onPanResponderMove: (evt, gestureState) => {
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
      onPanResponderRelease: () => {
        isDragging = false;
      },
      onPanResponderTerminate: () => {
        isDragging = false;
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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => true,
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
          onSelectElement(null);
          if (onEndInlineEditing) onEndInlineEditing();
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

          const dragResponder = createMovePanResponder(elem, isSelected);

          const computedPt = elem.computedFontSize || elem.fontSize || 18;
          const scaledBaseSize = computedPt * (canvasWidth / SLIDE.widthPt);

          const formattedRuns = getElementRuns(elem);
          const activeStickyRange = isEditing ? stickyRangeRef?.current : null;
          const displayRuns = getDisplayRunsWithSelection(formattedRuns, activeStickyRange);

          return (
            <View
              key={elem.id}
              style={[
                styles.elementWrapper,
                {
                  left,
                  top,
                  width: elemWidth,
                  height: elemHeight,
                  zIndex: elem.zIndex || 1,
                },
                isSelected && styles.selectedWrapper,
              ]}
              {...(isEditing ? {} : dragResponder.panHandlers)}
            >
              {elem.type === 'text' ? (
                <View style={styles.textContainer}>
                  {isEditing ? (
                    <TextInput
                      ref={inputRef}
                      style={{
                        flex: 1,
                        fontSize: scaledBaseSize,
                        fontWeight: elem.fontWeight || 'normal',
                        fontStyle: elem.fontStyle || 'normal',
                        textDecorationLine: elem.textDecorationLine || 'none',
                        textAlign: elem.textAlign || 'right',
                        writingDirection: elem.writingDirection || 'rtl',
                        lineHeight: scaledBaseSize * (elem.lineSpacing || 1.35),
                        fontFamily: elem.kurdishFont || elem.englishFont || fontFamily || undefined,
                        paddingHorizontal: 6,
                        paddingVertical: 6,
                        borderRadius: 4,
                        margin: 0,
                        textAlignVertical: 'top',
                      }}
                      multiline={true}
                      scrollEnabled={false}
                      autoFocus={true}
                      selection={controlledSelection}
                      onSelectionChange={(e) => {
                        if (externalIsApplyingStyleRef?.current) {
                          return;
                        }
                        const sel = e.nativeEvent.selection;
                        console.log('[SEL] user', sel);
                        if (stickyRangeRef) stickyRangeRef.current = sel;
                        if (setSelState) setSelState(sel);
                      }}
                      onChangeText={(text) => {
                        if (externalIsApplyingStyleRef?.current) {
                          return;
                        }
                        const cursorPos = stickyRangeRef?.current?.start ?? text.length;
                        if (stickyRangeRef) stickyRangeRef.current = { start: cursorPos, end: cursorPos };
                        if (text === elem.text) return;
                        const updated = updateTextWithRuns(elem, text);
                        onChangeElement(updated);
                      }}
                      onBlur={() => {
                        if (onEndInlineEditing) onEndInlineEditing();
                      }}
                    >
                      {formattedRuns.map((run, rIdx) => {
                        const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
                        const runScaledFontSize = scaledBaseSize * runScale;
                        const runLineHeight = runScaledFontSize * 1.35;
                        const scriptRuns = splitRuns(
                          run.text || '',
                          run.kurdishFont || run.kuFont || elem.kurdishFont || 'Tahoma',
                          run.englishFont || run.enFont || elem.englishFont || 'Calibri'
                        );
                        const runHighlight = (run.highlight || run.highlightColor) && (run.highlight || run.highlightColor) !== 'transparent' ? (run.highlight || run.highlightColor) : undefined;
                        const runShadow = (run.shadowColor || run.shadow || run.textShadowColor) && (run.shadowColor || run.shadow || run.textShadowColor) !== 'transparent' ? (run.shadowColor || run.shadow || run.textShadowColor) : undefined;
                        const runShadowOffset = run.textShadowOffset || run.shadowOffset || elem.textShadowOffset || elem.shadowOffset || { width: 2, height: 2 };
                        const runShadowRadius = run.textShadowRadius !== undefined ? run.textShadowRadius : (run.shadowRadius !== undefined ? run.shadowRadius : (elem.textShadowRadius !== undefined ? elem.textShadowRadius : (elem.shadowRadius !== undefined ? elem.shadowRadius : 3)));

                        return (
                          <Text
                            key={`trun_${rIdx}`}
                            style={{
                              fontSize: runScaledFontSize,
                              lineHeight: runLineHeight,
                              fontWeight: run.bold ? 'bold' : elem.fontWeight || 'normal',
                              fontStyle: run.italic ? 'italic' : elem.fontStyle || 'normal',
                              textDecorationLine: run.underline ? 'underline' : elem.textDecorationLine || 'none',
                              color: run.color || '#1c1c1e',
                              backgroundColor: runHighlight,
                              textShadowColor: runShadow,
                              textShadowOffset: runShadow ? runShadowOffset : { width: 0, height: 0 },
                              textShadowRadius: runShadow ? runShadowRadius : 0,
                            }}
                          >
                            {scriptRuns.map((sRun, sIdx) => (
                              <Text key={`tsrun_${rIdx}_${sIdx}`} style={{ fontFamily: sRun.fontFamily }}>
                                {sRun.text}
                              </Text>
                            ))}
                          </Text>
                        );
                      })}
                    </TextInput>
                  ) : (
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        onSelectElement(elem.id);
                        onStartInlineEditing(elem.id);
                      }}
                    >
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
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.imageContainer}>
                  {elem.uri ? (
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => {
                        onSelectElement(elem.id);
                      }}
                    >
                      <Image
                        source={{ uri: elem.uri }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePlaceholder}
                      onPress={() => {
                        onSelectElement(elem.id);
                        onChangeImageElement(elem);
                      }}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 2 }}>🖼️</Text>
                      <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                        داگرتنی وێنە
                      </Text>
                    </TouchableOpacity>
                  )}
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
});
