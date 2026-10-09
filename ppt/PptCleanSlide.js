import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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
            ) : elem.type === 'shape' ? (
              <React.Fragment>
                {(() => {
                  const shapeType = elem.shapeType || 'rect';
                  const fill = elem.fill && elem.fill !== 'none' && elem.fill !== 'transparent' ? elem.fill : 'transparent';
                  const outline = elem.outline || { color: '#000000', width: 2 };
                  const outlineColor = outline.width > 0 ? (outline.color || '#000000') : 'transparent';
                  const outlineWidth = outline.width || 0;
                  const cornerRadiusPct = elem.cornerRadius !== undefined ? elem.cornerRadius : 20;
                  const shapeRadius = (cornerRadiusPct / 100) * (Math.min(elemWidth, elemHeight) / 2);

                  const shapeFontSize = (elem.fontSize || 16) * (canvasWidth / SLIDE.widthPt);
                  const textColor = elem.textColor || '#000000';
                  const isBold = !!elem.bold;

                  const shapeTextElement = elem.text ? (
                    <Text
                      style={{
                        color: textColor,
                        fontSize: shapeFontSize,
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontFamily: fontFamily || 'Tahoma',
                        textAlign: 'center',
                        writingDirection: 'rtl',
                      }}
                    >
                      {elem.text}
                    </Text>
                  ) : null;

                  if (shapeType === 'rect') {
                    return (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: fill,
                          borderWidth: outlineWidth,
                          borderColor: outlineColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          padding: 2,
                        }}
                      >
                        {shapeTextElement}
                      </View>
                    );
                  } else if (shapeType === 'roundRect') {
                    return (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: fill,
                          borderRadius: shapeRadius,
                          borderWidth: outlineWidth,
                          borderColor: outlineColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          padding: 2,
                        }}
                      >
                        {shapeTextElement}
                      </View>
                    );
                  } else if (shapeType === 'ellipse') {
                    return (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: fill,
                          borderRadius: 9999,
                          borderWidth: outlineWidth,
                          borderColor: outlineColor,
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          padding: 2,
                        }}
                      >
                        {shapeTextElement}
                      </View>
                    );
                  } else if (shapeType === 'line') {
                    const lineThickness = outlineWidth || 2;
                    const lineColor = outline.color || '#000000';
                    return (
                      <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ width: '100%', height: lineThickness, backgroundColor: lineColor }} />
                      </View>
                    );
                  } else if (shapeType === 'arrow') {
                    const lineThickness = outlineWidth || 2;
                    const lineColor = outline.color || '#000000';
                    const headSize = Math.max(8, lineThickness * 3);
                    return (
                      <View style={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, height: lineThickness, backgroundColor: lineColor }} />
                        <View style={{ width: 0, height: 0, borderTopWidth: headSize / 2, borderBottomWidth: headSize / 2, borderLeftWidth: headSize, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: lineColor }} />
                      </View>
                    );
                  }
                  return null;
                })()}
              </React.Fragment>
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function renderSlideToHtml(slide, width = 960, height = 540, fontFamily = 'Tahoma', slideIndex = 0) {
  const canvasWidth = width;
  const canvasHeight = height;

  const elements = [...(slide?.elements || [])].sort(
    (a, b) => (a.zIndex || 1) - (b.zIndex || 1)
  );

  let embeddedImageCount = 0;
  const elementHtmls = [];

  for (const elem of elements) {
    const uncroppedLeft = (elem.x / 100) * canvasWidth;
    const uncroppedTop = (elem.y / 100) * canvasHeight;
    const uncroppedWidth = (elem.width / 100) * canvasWidth;

    let effectiveHeight = elem.height;
    if (elem.type === 'text' && elem.text && elem.text.trim()) {
      const computedPt = elem.computedFontSize || elem.fontSize || 18;
      const layoutMeas = measureElementLayout(elem, computedPt);
      const neededPercent = Math.ceil((layoutMeas.totalHeightPt / SLIDE.heightPt) * 100);
      if (neededPercent > elem.height) {
        effectiveHeight = Math.min(96 - (uncroppedTop / canvasHeight) * 100, neededPercent + 2);
      }
    }

    const uncroppedHeight = (effectiveHeight / 100) * canvasHeight;

    const rotation = elem.rotation || 0;
    const opacity = elem.opacity !== undefined ? elem.opacity : 1.0;
    const zIndex = elem.zIndex || 1;
    const borderRadiusPct = elem.borderRadius || 0;
    const borderWidth = elem.border?.width || 0;
    const borderColor = elem.border?.color || 'transparent';

    if (elem.type === 'text') {
      const computedPt = elem.computedFontSize || elem.fontSize || 18;
      const scaledBaseSize = computedPt * (canvasWidth / SLIDE.widthPt);
      const formattedRuns = getElementRuns(elem);

      const runsHtml = formattedRuns.map((run) => {
        const runScale = run.sizeScale !== undefined ? run.sizeScale : 1.0;
        const runFontSize = scaledBaseSize * runScale;
        const scriptRuns = splitRuns(
          run.text || '',
          run.kurdishFont || run.kuFont || elem.kurdishFont || fontFamily || 'Tahoma',
          run.englishFont || run.enFont || elem.englishFont || fontFamily || 'Calibri'
        );
        const runHighlight = (run.highlight || run.highlightColor) && (run.highlight || run.highlightColor) !== 'transparent' ? run.highlight || run.highlightColor : undefined;
        const shadowColorStr = run.shadowColor || run.shadow || run.textShadowColor || elem.shadowColor || elem.shadow || elem.textShadowColor;
        const runShadow = shadowColorStr && shadowColorStr !== 'transparent' && shadowColorStr !== 'none' ? shadowColorStr : undefined;
        const offset = run.textShadowOffset || run.shadowOffset || elem.textShadowOffset || elem.shadowOffset || { width: 2, height: 2 };
        const radius = run.textShadowRadius !== undefined ? run.textShadowRadius : (run.shadowRadius !== undefined ? run.shadowRadius : (elem.textShadowRadius !== undefined ? elem.textShadowRadius : (elem.shadowRadius !== undefined ? elem.shadowRadius : 3)));
        const textShadowCss = runShadow ? `${offset.width || 2}pt ${offset.height || 2}pt ${radius}pt ${runShadow}` : 'none';

        return scriptRuns.map((sRun) => `
          <span style="
            font-size: ${runFontSize.toFixed(2)}pt;
            font-weight: ${run.bold ? 'bold' : elem.fontWeight || 'normal'};
            font-style: ${run.italic ? 'italic' : elem.fontStyle || 'normal'};
            text-decoration: ${run.underline ? 'underline' : elem.textDecorationLine || 'none'};
            color: ${run.color || '#1c1c1e'};
            ${runHighlight ? `background-color: ${runHighlight};` : ''}
            ${runShadow ? `text-shadow: ${textShadowCss};` : ''}
            font-family: '${sRun.fontFamily}', sans-serif;
          ">${escapeHtml(sRun.text)}</span>
        `).join('');
      }).join('');

      elementHtmls.push(`
        <div style="
          position: absolute;
          left: ${uncroppedLeft.toFixed(2)}pt;
          top: ${uncroppedTop.toFixed(2)}pt;
          width: ${uncroppedWidth.toFixed(2)}pt;
          height: ${uncroppedHeight.toFixed(2)}pt;
          z-index: ${zIndex};
          transform: rotate(${rotation}deg);
          opacity: ${opacity};
          padding: 2pt;
          box-sizing: border-box;
        ">
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 6pt;
            box-sizing: border-box;
            text-align: ${elem.textAlign || 'right'};
            direction: ${elem.writingDirection || 'rtl'};
            line-height: ${(elem.lineSpacing || 1.35)};
            word-break: break-word;
            white-space: pre-wrap;
          ">
            ${runsHtml}
          </div>
        </div>
      `);
    } else if (elem.type === 'shape') {
      const shapeType = elem.shapeType || 'rect';
      const fill = elem.fill && elem.fill !== 'none' && elem.fill !== 'transparent' ? elem.fill : 'transparent';
      const outline = elem.outline || { color: '#000000', width: 2 };
      const outlineColor = outline.width > 0 ? (outline.color || '#000000') : 'transparent';
      const outlineWidth = outline.width || 0;
      const cornerRadiusPct = elem.cornerRadius !== undefined ? elem.cornerRadius : 20;

      let shapeContentHtml = '';

      const shapeTextHtml = elem.text ? `
        <span style="
          color: ${elem.textColor || '#000000'};
          font-size: ${(elem.fontSize || 16).toFixed(2)}pt;
          font-weight: ${elem.bold ? 'bold' : 'normal'};
          font-family: 'Tahoma', sans-serif;
          word-break: break-word;
          white-space: pre-wrap;
          text-align: center;
          width: 100%;
        ">${escapeHtml(elem.text)}</span>
      ` : '';

      if (shapeType === 'rect') {
        shapeContentHtml = `
          <div style="
            width: 100%;
            height: 100%;
            background-color: ${fill};
            border: ${outlineWidth}pt solid ${outlineColor};
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            padding: 4pt;
          " dir="rtl">${shapeTextHtml}</div>
        `;
      } else if (shapeType === 'roundRect') {
        const shapeRadius = (cornerRadiusPct / 100) * (Math.min(uncroppedWidth, uncroppedHeight) / 2);
        shapeContentHtml = `
          <div style="
            width: 100%;
            height: 100%;
            background-color: ${fill};
            border-radius: ${shapeRadius.toFixed(2)}pt;
            border: ${outlineWidth}pt solid ${outlineColor};
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            padding: 4pt;
          " dir="rtl">${shapeTextHtml}</div>
        `;
      } else if (shapeType === 'ellipse') {
        shapeContentHtml = `
          <div style="
            width: 100%;
            height: 100%;
            background-color: ${fill};
            border-radius: 50%;
            border: ${outlineWidth}pt solid ${outlineColor};
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
            padding: 4pt;
          " dir="rtl">${shapeTextHtml}</div>
        `;
      } else if (shapeType === 'line') {
        const lineThickness = outlineWidth || 2;
        const lineColor = outline.color || '#000000';
        shapeContentHtml = `
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 100%;
              height: ${lineThickness}pt;
              background-color: ${lineColor};
            "></div>
          </div>
        `;
      } else if (shapeType === 'arrow') {
        const lineThickness = outlineWidth || 2;
        const lineColor = outline.color || '#000000';
        const headSize = Math.max(8, lineThickness * 3);
        shapeContentHtml = `
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            flex-direction: row;
          ">
            <div style="
              flex: 1;
              height: ${lineThickness}pt;
              background-color: ${lineColor};
            "></div>
            <div style="
              width: 0;
              height: 0;
              border-top: ${(headSize / 2).toFixed(2)}pt solid transparent;
              border-bottom: ${(headSize / 2).toFixed(2)}pt solid transparent;
              border-left: ${headSize.toFixed(2)}pt solid ${lineColor};
            "></div>
          </div>
        `;
      }

      elementHtmls.push(`
        <div style="
          position: absolute;
          left: ${uncroppedLeft.toFixed(2)}pt;
          top: ${uncroppedTop.toFixed(2)}pt;
          width: ${uncroppedWidth.toFixed(2)}pt;
          height: ${uncroppedHeight.toFixed(2)}pt;
          z-index: ${zIndex};
          transform: rotate(${rotation}deg);
          opacity: ${opacity};
          box-sizing: border-box;
        ">
          ${shapeContentHtml}
        </div>
      `);
    } else if (elem.type === 'image' && elem.uri) {
      const crop = elem.crop || { top: 0, bottom: 0, left: 0, right: 0 };
      const cropLeft = crop.left || 0;
      const cropRight = crop.right || 0;
      const cropTop = crop.top || 0;
      const cropBottom = crop.bottom || 0;
      const visibleW = Math.max(0.05, 1 - cropLeft - cropRight);
      const visibleH = Math.max(0.05, 1 - cropTop - cropBottom);

      const left = uncroppedLeft + cropLeft * uncroppedWidth;
      const top = uncroppedTop + cropTop * uncroppedHeight;
      const elemWidth = uncroppedWidth * visibleW;
      const elemHeight = uncroppedHeight * visibleH;

      const calculatedRadius = (borderRadiusPct / 100) * (Math.min(elemWidth, elemHeight) / 2);
      const fit = elem.fit === 'fit' ? 'contain' : 'cover';

      let base64Uri = null;
      if (elem.uri.startsWith('data:')) {
        base64Uri = elem.uri;
      } else {
        try {
          const rawBase64 = await FileSystem.readAsStringAsync(elem.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Uri = `data:image/jpeg;base64,${rawBase64}`;
        } catch (err) {
          console.log('[PDF Export] Failed to read image as Base64:', elem.uri, err?.message || err);
        }
      }

      if (base64Uri) {
        embeddedImageCount++;
        elementHtmls.push(`
          <div style="
            position: absolute;
            left: ${left.toFixed(2)}pt;
            top: ${top.toFixed(2)}pt;
            width: ${elemWidth.toFixed(2)}pt;
            height: ${elemHeight.toFixed(2)}pt;
            z-index: ${zIndex};
            transform: rotate(${rotation}deg);
            opacity: ${opacity};
            border-radius: ${calculatedRadius.toFixed(2)}pt;
            border: ${borderWidth}pt solid ${borderColor};
            overflow: hidden;
            box-sizing: border-box;
          ">
            <div style="
              position: relative;
              width: 100%;
              height: 100%;
              overflow: hidden;
            ">
              <img src="${base64Uri}" style="
                position: absolute;
                width: ${((1 / visibleW) * 100).toFixed(2)}%;
                height: ${((1 / visibleH) * 100).toFixed(2)}%;
                left: ${(-(cropLeft / visibleW) * 100).toFixed(2)}%;
                top: ${(-(cropTop / visibleH) * 100).toFixed(2)}%;
                object-fit: ${fit};
              " />
            </div>
          </div>
        `);
      }
    }
  }

  console.log(`[PDF Export] Embedded ${embeddedImageCount} images for slide ${slideIndex + 1}`);

  return `
    <div class="slide-page" style="background-color: ${slide?.background || '#ffffff'};">
      ${elementHtmls.join('')}
    </div>
  `;
}

