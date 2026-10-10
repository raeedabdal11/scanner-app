import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { getElementRuns } from './formattedText';
import { renderSvgShape } from './shapeCatalog';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PptPreviewModal = ({ visible, presentation, onClose, fontFamily, onRequestClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    return null;
  }

  const slides = presentation.slides;
  const currentSlide = slides[currentSlideIndex] || slides[0];

  const is43 = presentation.aspectRatio === '4:3';
  const canvasWidth = SCREEN_WIDTH * 0.94;
  const canvasHeight = is43 ? (canvasWidth * 3) / 4 : (canvasWidth * 9) / 16;

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose || onClose}
    >
      <View style={styles.overlay}>

        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            پێشبینینی سڵایدکان ({currentSlideIndex + 1} / {slides.length})
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 16:9 Full Canvas Preview */}
        <View
          style={[
            styles.canvas,
            {
              width: canvasWidth,
              height: canvasHeight,
              backgroundColor: currentSlide.background || '#ffffff',
            },
          ]}
        >
          {(currentSlide.elements || []).map((elem) => {
            const left = (elem.x / 100) * canvasWidth;
            const top = (elem.y / 100) * canvasHeight;
            const elemWidth = (elem.width / 100) * canvasWidth;
            const elemHeight = (elem.height / 100) * canvasHeight;

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
                ]}
              >
                {elem.type === 'text' ? (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        textAlign: elem.textAlign || 'right',
                        writingDirection: elem.writingDirection || 'rtl',
                        lineHeight: ((elem.fontSize || 18) * (canvasWidth / 360)) * (elem.lineSpacing || 1.2),
                      }}
                    >
                      {getElementRuns(elem).map((run, rIdx) => {
                        const runScaledFontSize = (elem.fontSize || 18) * (canvasWidth / 360) * (run.sizeScale || 1.0);
                        const runHighlight = (run.highlight || run.highlightColor) && (run.highlight || run.highlightColor) !== 'transparent'
                          ? (run.highlight || run.highlightColor)
                          : undefined;
                        return (
                          <Text
                            key={`prun_${rIdx}`}
                            style={{
                              fontSize: runScaledFontSize,
                              fontWeight: run.bold ? 'bold' : elem.fontWeight || 'normal',
                              fontStyle: run.italic ? 'italic' : elem.fontStyle || 'normal',
                              textDecorationLine: run.underline ? 'underline' : elem.textDecorationLine || 'none',
                              color: run.color || '#1c1c1e',
                              backgroundColor: runHighlight,
                              fontFamily: fontFamily || undefined,
                            }}
                          >
                            {run.text}
                          </Text>
                        );
                      })}
                    </Text>
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

                      const shapeFontSize = (elem.fontSize || 16) * (canvasWidth / 960);
                      const textColor = elem.textColor || '#000000';
                      const isBold = !!elem.bold;
                      const opacity = elem.opacity !== undefined ? elem.opacity : 1.0;

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

                      return (
                        <React.Fragment>
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }}>
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
                                padding: 2,
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
                  <View style={{ flex: 1 }}>
                    {elem.uri ? (
                      <Image
                        source={{ uri: elem.uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Navigation Controls */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentSlideIndex === 0 && styles.disabledNav]}
            disabled={currentSlideIndex === 0}
            onPress={handlePrev}
          >
            <Text style={styles.navBtnText}>◀️ پێشوو</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentSlideIndex === slides.length - 1 && styles.disabledNav]}
            disabled={currentSlideIndex === slides.length - 1}
            onPress={handleNext}
          >
            <Text style={styles.navBtnText}>داهاتوو ▶️</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 40,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  canvas: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  elementWrapper: {
    position: 'absolute',
    padding: 2,
  },
  navRow: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 20,
  },
  navBtn: {
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  disabledNav: {
    opacity: 0.3,
  },
  navBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
