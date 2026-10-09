import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PptSlider from './PptSlider';

// Theme Colors for Border Picker Grid
const BORDER_COLORS_GRID = [
  '#ffffff', '#000000', '#1f497d', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b0f0', '#0070c0', '#7030a0',
  '#ff3b30', '#ff9500', '#34c759', '#007aff', '#5856d6', '#af52de', '#8e8e93', '#3a3a3c',
];

export const PptImageToolbar = forwardRef(({
  selectedElement,
  onPickGallery,
  onPickCamera,
  onAddShape,
  onOpenShapePicker,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onClose,
}, ref) => {
  const [activeSubTab, setActiveSubTab] = useState('insert'); // 'insert' | 'style' | 'crop' | 'border' | 'tools'
  const [showShapesPanel, setShowShapesPanel] = useState(false);

  // Expose back navigation handlers via ref
  useImperativeHandle(ref, () => ({
    closeSubModal: () => {
      if (showShapesPanel) {
        setShowShapesPanel(false);
        return 'shapes panel';
      }
      return null;
    },
    closeTabPanel: () => {
      if (showShapesPanel) {
        setShowShapesPanel(false);
        return 'shapes panel';
      }
      if (activeSubTab !== 'insert') {
        setActiveSubTab('insert');
        return 'image toolbar tab (' + activeSubTab + ')';
      }
      return null;
    },
  }), [activeSubTab, showShapesPanel]);

  const isImageSelected = selectedElement && selectedElement.type === 'image';

  // Helper to update selected image element
  const updateImage = (patch) => {
    if (!selectedElement) return;
    onChangeElement({
      ...selectedElement,
      ...patch,
    });
  };

  const currentFit = selectedElement?.fit || 'fill';
  const currentOpacity = selectedElement?.opacity !== undefined ? selectedElement.opacity : 1.0;
  const currentRadius = selectedElement?.borderRadius || 0;
  const currentRotation = selectedElement?.rotation || 0;
  const currentBorderWidth = selectedElement?.border?.width || 0;
  const currentBorderColor = selectedElement?.border?.color || '#ffffff';
  const currentCrop = selectedElement?.crop || { top: 0, bottom: 0, left: 0, right: 0 };
  const isLocked = !!selectedElement?.locked;

  // Fit/Fill Toggle
  const toggleFit = (mode) => {
    updateImage({ fit: mode });
  };

  // Opacity Change
  const changeOpacity = (val) => {
    const clamped = Math.max(0.1, Math.min(1.0, Math.round(val * 100) / 100));
    console.log('[PptImageToolbar] changeOpacity rawVal=', val, 'clampedOpacity=', clamped, 'currentElement.opacity=', selectedElement?.opacity);
    updateImage({ opacity: clamped });
  };

  // Border Radius Change
  const changeRadius = (rad) => {
    const clamped = Math.max(0, Math.min(50, rad));
    console.log('[PptImageToolbar] changeRadius rawRad=', rad, 'clampedRadius=', clamped, 'currentElement.borderRadius=', selectedElement?.borderRadius);
    updateImage({ borderRadius: clamped });
  };

  // Rotation Change
  const addRotation = (deg) => {
    let newRot = (currentRotation + deg) % 360;
    if (newRot < 0) newRot += 360;
    updateImage({ rotation: newRot });
  };

  const setRotation = (deg) => {
    updateImage({ rotation: deg });
  };

  // Border Width & Color
  const setBorderWidth = (w) => {
    console.log('[PptImageToolbar] setBorderWidth rawWidth=', w, 'currentElement.border=', selectedElement?.border);
    updateImage({
      border: {
        color: currentBorderColor,
        width: w,
      },
    });
  };

  const setBorderColor = (colorHex) => {
    updateImage({
      border: {
        color: colorHex,
        width: currentBorderWidth > 0 ? currentBorderWidth : 2,
      },
    });
  };

  // Crop Controls
  const handleCropChange = (side, newPctVal) => {
    const topPct = Math.round((currentCrop.top || 0) * 100);
    const bottomPct = Math.round((currentCrop.bottom || 0) * 100);
    const leftPct = Math.round((currentCrop.left || 0) * 100);
    const rightPct = Math.round((currentCrop.right || 0) * 100);

    let clampedPct = Math.max(0, Math.min(45, newPctVal));

    if (side === 'top') {
      const maxAllowed = Math.min(45, 90 - bottomPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'bottom') {
      const maxAllowed = Math.min(45, 90 - topPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'left') {
      const maxAllowed = Math.min(45, 90 - rightPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'right') {
      const maxAllowed = Math.min(45, 90 - leftPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    }

    const newCrop = {
      ...currentCrop,
      [side]: Math.round(clampedPct) / 100,
    };
    updateImage({ crop: newCrop });
  };

  const resetCrop = () => {
    updateImage({ crop: { top: 0, bottom: 0, left: 0, right: 0 } });
  };

  // Lock / Unlock
  const toggleLock = () => {
    const nextLock = !isLocked;
    updateImage({ locked: nextLock });
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        nextLock ? 'وێنەکە قفڵکرا 🔒' : 'قفڵی وێنەکە کرایەوە 🔓',
        ToastAndroid.SHORT
      );
    }
  };

  return (
    <View style={styles.toolbarContainer}>
      {/* Top Header Tabs */}
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'insert' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('insert')}
        >
          <Ionicons name="add-circle-outline" size={15} color={activeSubTab === 'insert' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'insert' && styles.tabHeaderBtnTextActive]}>
            زیادکردن
          </Text>
        </TouchableOpacity>

        {isImageSelected && (
          <>
            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'style' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('style')}
            >
              <Ionicons name="options-outline" size={15} color={activeSubTab === 'style' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'style' && styles.tabHeaderBtnTextActive]}>
                شێواز و گۆشە
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'crop' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('crop')}
            >
              <Ionicons name="crop-outline" size={15} color={activeSubTab === 'crop' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'crop' && styles.tabHeaderBtnTextActive]}>
                بڕین (Crop)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'border' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('border')}
            >
              <Ionicons name="square-outline" size={15} color={activeSubTab === 'border' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'border' && styles.tabHeaderBtnTextActive]}>
                چوارچێوە
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'tools' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('tools')}
            >
              <Ionicons name="build-outline" size={15} color={activeSubTab === 'tools' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'tools' && styles.tabHeaderBtnTextActive]}>
                ئامرازەکان
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* SUB-TAB 1: INSERT MODE ("زیادکردن") */}
      {activeSubTab === 'insert' && (
        <View style={styles.tabContentBox}>
          <Text style={styles.sectionTitle}>زیادکردنی وێنە و شێوەکان بۆ سڵاید:</Text>
          <View style={styles.insertButtonsRow}>
            <TouchableOpacity style={styles.insertActionBtn} onPress={onPickGallery}>
              <Ionicons name="images-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>گەلەری</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.insertActionBtn, { backgroundColor: '#1f497d' }]} onPress={onPickCamera}>
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>کامێرا</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.insertActionBtn,
                { backgroundColor: showShapesPanel ? '#8B3A2B' : '#2c2c2e', borderWidth: 1, borderColor: '#3a3a3c' },
              ]}
              onPress={() => setShowShapesPanel(!showShapesPanel)}
            >
              <Ionicons name="shapes-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>شێوەکان</Text>
            </TouchableOpacity>
          </View>

          {/* Small Panel for Shapes Options */}
          {showShapesPanel && (
            <View style={styles.shapesPanelBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.shapesPanelTitle}>شێوەیەک هەڵبژێرە:</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a84ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onOpenShapePicker) onOpenShapePicker();
                  }}
                >
                  <Ionicons name="grid-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>لیستی گشتی...</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shapesRow}>
                <TouchableOpacity
                  style={[styles.shapeOptionBtn, { backgroundColor: '#0a84ff', borderWidth: 0 }]}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onOpenShapePicker) onOpenShapePicker();
                  }}
                >
                  <Ionicons name="grid-outline" size={18} color="#ffffff" />
                  <Text style={[styles.shapeOptionText, { color: '#ffffff', fontWeight: 'bold' }]}>
                    هەموو شێوەکان
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('rect');
                  }}
                >
                  <View style={styles.shapeIconRect} />
                  <Text style={styles.shapeOptionText}>چوارگۆشە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('roundRect');
                  }}
                >
                  <View style={styles.shapeIconRoundRect} />
                  <Text style={styles.shapeOptionText}>چوارگۆشەی خڕ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('ellipse');
                  }}
                >
                  <View style={styles.shapeIconEllipse} />
                  <Text style={styles.shapeOptionText}>بازنە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('line');
                  }}
                >
                  <View style={styles.shapeIconLine} />
                  <Text style={styles.shapeOptionText}>هێڵ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('arrow');
                  }}
                >
                  <View style={styles.shapeIconArrowRow}>
                    <View style={styles.shapeIconLinePart} />
                    <View style={styles.shapeIconArrowHead} />
                  </View>
                  <Text style={styles.shapeOptionText}>تیر</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('star5');
                  }}
                >
                  <Ionicons name="star" size={18} color="#ffd60a" />
                  <Text style={styles.shapeOptionText}>ئەستێرە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('heart');
                  }}
                >
                  <Ionicons name="heart" size={18} color="#ff3b30" />
                  <Text style={styles.shapeOptionText}>دڵ</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* SUB-TAB 2: STYLE & OPACITY & ROTATION ("شێواز و گۆشە") */}
      {isImageSelected && activeSubTab === 'style' && (
        <View style={styles.tabContentBox}>
          <View style={[styles.scrollContentRow, { flexWrap: 'wrap' }]}>
            {/* 1. Fit / Fill Toggle */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>شێوازی پێشاندان:</Text>
              <View style={styles.togglePair}>
                <TouchableOpacity
                  style={[styles.toggleBtn, currentFit === 'fill' && styles.toggleBtnActive]}
                  onPress={() => toggleFit('fill')}
                >
                  <Text style={[styles.toggleBtnText, currentFit === 'fill' && styles.toggleBtnTextActive]}>
                    پڕکردنەوە (Fill)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, currentFit === 'fit' && styles.toggleBtnActive]}
                  onPress={() => toggleFit('fit')}
                >
                  <Text style={[styles.toggleBtnText, currentFit === 'fit' && styles.toggleBtnTextActive]}>
                    گۆنجاندن (Fit)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Rounded Corners (0 - 50%) */}
            <PptSlider
              label="گۆشەی خڕ (Corners)"
              unit="%"
              min={0}
              max={50}
              step={1}
              value={currentRadius}
              onChange={changeRadius}
              style={{ width: 180 }}
            />

            {/* 3. Opacity (10 - 100%) */}
            <PptSlider
              label="ڕوونی (Opacity)"
              unit="%"
              min={10}
              max={100}
              step={1}
              value={Math.round(currentOpacity * 100)}
              onChange={(val) => changeOpacity(val / 100)}
              style={{ width: 180 }}
            />

            {/* 4. Image Scale / Size Slider (10 - 100%) */}
            <PptSlider
              label="قەبارەی وێنە (Scale)"
              unit="%"
              min={10}
              max={100}
              step={1}
              value={Math.round(selectedElement?.width || 50)}
              onChange={(newWidth) => {
                const currentW = selectedElement?.width || 50;
                const currentH = selectedElement?.height || 30;
                const aspect = currentW / Math.max(1, currentH);
                const newH = Math.max(5, newWidth / aspect);
                console.log('[PptImageToolbar] Image Scale slider val=', newWidth, 'newWidth=', newWidth, 'newH=', newH, 'currentElement.width=', selectedElement?.width);
                updateImage({
                  width: newWidth,
                  height: Math.round(newH * 10) / 10,
                });
              }}
              style={{ width: 180 }}
            />

            {/* 4. Rotation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>سوڕاندن (Rotation):</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(-90)}>
                  <Text style={styles.chipBtnText}>↺ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(90)}>
                  <Text style={styles.chipBtnText}>↻ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.chipBtn, currentRotation === 0 && styles.chipBtnActive]} onPress={() => setRotation(0)}>
                  <Text style={[styles.chipBtnText, currentRotation === 0 && styles.chipBtnTextActive]}>0°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.chipBtn, currentRotation === 180 && styles.chipBtnActive]} onPress={() => setRotation(180)}>
                  <Text style={[styles.chipBtnText, currentRotation === 180 && styles.chipBtnTextActive]}>180°</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* SUB-TAB 3: CROP ("بڕین") */}
      {isImageSelected && activeSubTab === 'crop' && (
        <View style={styles.tabContentBox}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.cropVerticalContainer}
          >
            <View style={styles.cropHeaderRow}>
              <TouchableOpacity style={styles.resetCropBtn} onPress={resetCrop}>
                <Ionicons name="refresh-outline" size={14} color="#ffffff" />
                <Text style={styles.resetCropText}>بێ برین (Reset)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cropSlidersList}>
              <PptSlider
                label="سەرەوە (Top)"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.top || 0) * 100)}
                onChange={(val) => handleCropChange('top', val)}
              />

              <PptSlider
                label="خوارەوە (Bottom)"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.bottom || 0) * 100)}
                onChange={(val) => handleCropChange('bottom', val)}
              />

              <PptSlider
                label="چەپ (Left)"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.left || 0) * 100)}
                onChange={(val) => handleCropChange('left', val)}
              />

              <PptSlider
                label="ڕاست (Right)"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.right || 0) * 100)}
                onChange={(val) => handleCropChange('right', val)}
              />
            </View>
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 4: BORDER ("چوارچێوە") */}
      {isImageSelected && activeSubTab === 'border' && (
        <View style={styles.tabContentBox}>
          <View style={styles.borderWidthRow}>
            <PptSlider
              label="ئەستووری چوارچێوە"
              unit="px"
              min={0}
              max={20}
              step={1}
              value={currentBorderWidth}
              onChange={setBorderWidth}
            />
          </View>

          {currentBorderWidth > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPaletteRow}>
              {BORDER_COLORS_GRID.map((hex) => (
                <TouchableOpacity
                  key={`bclr_${hex}`}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    currentBorderColor.toLowerCase() === hex.toLowerCase() && styles.colorDotActive,
                  ]}
                  onPress={() => setBorderColor(hex)}
                >
                  {currentBorderColor.toLowerCase() === hex.toLowerCase() && (
                    <Text style={{ color: hex === '#ffffff' || hex === '#ffff00' ? '#000' : '#fff', fontSize: 10, fontWeight: 'bold' }}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* SUB-TAB 5: TOOLS ("ئامرازەکان") */}
      {isImageSelected && activeSubTab === 'tools' && (
        <View style={styles.tabContentBox}>
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => onDuplicateElement(selectedElement.id)}>
              <Ionicons name="copy-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>کۆپی</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.toolBtn, isLocked && styles.toolBtnLocked]} onPress={toggleLock}>
              <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={16} color={isLocked ? '#ffcc00' : '#ffffff'} />
              <Text style={styles.toolBtnText}>{isLocked ? 'بکرێتەوە' : 'قفڵکردن'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                updateImage({ zIndex: (selectedElement.zIndex || 1) + 1 });
              }}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>پێشەوە</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                updateImage({ zIndex: Math.max(1, (selectedElement.zIndex || 1) - 1) });
              }}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>پاشەوە</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.toolBtn, { backgroundColor: '#ff453a22' }]} onPress={() => onDeleteElement(selectedElement.id)}>
              <Ionicons name="trash-outline" size={16} color="#ff453a" />
              <Text style={[styles.toolBtnText, { color: '#ff453a' }]}>سڕینەوە</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#141416',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  tabHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    backgroundColor: '#2c2c2e',
  },
  tabHeaderBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  tabHeaderBtnText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabHeaderBtnTextActive: {
    color: '#ffffff',
  },
  tabContentBox: {
    padding: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  insertButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  insertActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B3A2B',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  insertActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scrollContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlGroup: {
    gap: 6,
  },
  groupLabel: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  togglePair: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  toggleBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  chipBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  chipBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipBtnTextActive: {
    color: '#ffffff',
  },
  cropVerticalContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  cropHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },
  cropSlidersList: {
    gap: 6,
  },
  resetCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  resetCropText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  borderWidthRow: {
    marginBottom: 8,
    gap: 6,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#30d158',
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toolBtnLocked: {
    backgroundColor: '#3a3a10',
    borderColor: '#ffcc00',
    borderWidth: 1,
  },
  toolBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shapesPanelBox: {
    marginTop: 10,
    backgroundColor: '#141416',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  shapesPanelTitle: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  shapesRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shapeOptionBtn: {
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    minWidth: 70,
  },
  shapeOptionText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  shapeIconRect: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#1f497d',
  },
  shapeIconRoundRect: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 4,
    backgroundColor: '#1f497d',
  },
  shapeIconEllipse: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 10,
    backgroundColor: '#1f497d',
  },
  shapeIconLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ffffff',
    marginVertical: 6,
  },
  shapeIconArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 22,
    height: 14,
  },
  shapeIconLinePart: {
    flex: 1,
    height: 2,
    backgroundColor: '#ffffff',
  },
  shapeIconArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
  },
});
