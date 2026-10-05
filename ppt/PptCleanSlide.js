import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SLIDE, measureElementLayout, splitRuns } from './pptFit';
import { getElementRuns } from './formattedText';

export const PptCleanSlide = React.forwardRef(({
  slide,
  aspectRatio = '16:9',
  width = 1280,
  height = 720,
  fontFamily,
}, ref) => {
  const canvasWidth = width;
  const canvasHeight = height;

  const elements = [...(slide?.elements || [])].sort(
    (a, b) => (a.zIndex || 1) - (b.zIndex || 1)
  );

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.slideCanvas,
        {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: slide?.background || '#ffffff',
        },
      ]}
    >
      {elements.map((elem) => {
        const left = (elem.x / 100) * canvasWidth;
        const top = (elem.y / 100) * canvasHeight;
        const elemWidth = (elem.width / 100) * canvasWidth;

        let effectiveHeight = elem.height;
        if (elem.type === 'text' && elem.text && elem.text.trim()) {
          const computedPt = elem.computedFontSize || elem.fontSize || 18;
          const layoutMeas = measureElementLayout(elem, computedPt);
          const neededPercent = Math.ceil((layoutMeas.totalHeightPt / SLIDE.heightPt) * 100);
          if (neededPercent > elem.height) {
            effectiveHeight = Math.min(96 - (top / canvasHeight) * 100, neededPercent + 2);
          }
        }

        const elemHeight = (effectiveHeight / 100) * canvasHeight;

        const computedPt = elem.computedFontSize || elem.fontSize || 18;
        const scaledBaseSize = computedPt * (canvasWidth / SLIDE.widthPt);
        const formattedRuns = getElementRuns(elem);

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
            key={elem.id}
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
            ]}
          >
            {elem.type === 'text' ? (
              <View style={styles.textContainer}>
                <Text
                  style={{
                    textAlign: elem.textAlign || 'right',
                    writingDirection: elem.writingDirection || 'rtl',
                    lineHeight: scaledBaseSize * (elem.lineSpacing || 1.35),
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                  }}
                >
                  {formattedRuns.map((run, rIdx) => {
                    const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
                    const runScaledFontSize = scaledBaseSize * runScale;
                    const runLineHeight = runScaledFontSize * 1.35;
                    const scriptRuns = splitRuns(
                      run.text || '',
                      run.kurdishFont || run.kuFont || elem.kurdishFont || fontFamily || 'Tahoma',
                      run.englishFont || run.enFont || elem.englishFont || fontFamily || 'Calibri'
                    );
                    const runHighlight =
                      (run.highlight || run.highlightColor) &&
                      (run.highlight || run.highlightColor) !== 'transparent'
                        ? run.highlight || run.highlightColor
                        : undefined;

                    const shadowColorStr =
                      run.shadowColor ||
                      run.shadow ||
                      run.textShadowColor ||
                      elem.shadowColor ||
                      elem.shadow ||
                      elem.textShadowColor;

                    const runShadow =
                      shadowColorStr && shadowColorStr !== 'transparent' && shadowColorStr !== 'none'
                        ? shadowColorStr
                        : undefined;

                    const offset =
                      run.textShadowOffset ||
                      run.shadowOffset ||
                      elem.textShadowOffset ||
                      elem.shadowOffset ||
                      { width: 2, height: 2 };

                    const radius =
                      run.textShadowRadius !== undefined
                        ? run.textShadowRadius
                        : run.shadowRadius !== undefined
                        ? run.shadowRadius
                        : elem.textShadowRadius !== undefined
                        ? elem.textShadowRadius
                        : elem.shadowRadius !== undefined
                        ? elem.shadowRadius
                        : 3;

                    return (
                      <Text
                        key={`frun_${rIdx}`}
                        style={{
                          fontSize: runScaledFontSize,
                          lineHeight: runLineHeight,
                          fontWeight: run.bold ? 'bold' : elem.fontWeight || 'normal',
                          fontStyle: run.italic ? 'italic' : elem.fontStyle || 'normal',
                          textDecorationLine: run.underline ? 'underline' : elem.textDecorationLine || 'none',
                          color: run.color || '#1c1c1e',
                          backgroundColor: runHighlight,
                          textShadowColor: runShadow,
                          textShadowOffset: runShadow ? offset : { width: 0, height: 0 },
                          textShadowRadius: runShadow ? radius : 0,
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
              </View>
            ) : elem.type === 'image' && elem.uri ? (
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
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  slideCanvas: {
    position: 'relative',
    overflow: 'hidden',
  },
  elementWrapper: {
    position: 'absolute',
    padding: 2,
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
});
