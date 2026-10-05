import React, { useState } from 'react';
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
import { PptCropModal } from './PptCropModal';

// Theme Colors for Border Picker Grid
const BORDER_COLORS_GRID = [
  '#ffffff', '#000000', '#1f497d', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b0f0', '#0070c0', '#7030a0',
  '#ff3b30', '#ff9500', '#34c759', '#007aff', '#5856d6', '#af52de', '#8e8e93', '#3a3a3c',
];

export const PptImageToolbar = ({
  selectedElement,
  onPickGallery,
  onPickCamera,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('insert'); // 'insert' | 'style' | 'crop' | 'border' | 'tools'
  const [isCropModalVisible, setIsCropModalVisible] = useState(false);

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
    updateImage({ opacity: clamped });
  };

  // Border Radius Change
  const changeRadius = (rad) => {
    const clamped = Math.max(0, Math.min(50, rad));
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

  // Crop Reset
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
              onPress={() => {
                setActiveSubTab('crop');
                setIsCropModalVisible(true);
              }}
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
          <Text style={styles.sectionTitle}>زیادکردنی وێنەی نوێ بۆ سڵاید:</Text>
          <View style={styles.insertButtonsRow}>
            <TouchableOpacity style={styles.insertActionBtn} onPress={onPickGallery}>
              <Ionicons name="images-outline" size={20} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>گەلەری (چەند دانە)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.insertActionBtn, { backgroundColor: '#1f497d' }]} onPress={onPickCamera}>
              <Ionicons name="camera-outline" size={20} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>کامێرا</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SUB-TAB 2: STYLE & OPACITY & ROTATION ("شێواز و گۆشە") */}
      {isImageSelected && activeSubTab === 'style' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentRow}>
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
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>گۆشەی خڕ (Corners):</Text>
              <View style={styles.chipRow}>
                {[0, 10, 25, 50].map((r) => (
                  <TouchableOpacity
                    key={`rad_${r}`}
                    style={[styles.chipBtn, currentRadius === r && styles.chipBtnActive]}
                    onPress={() => changeRadius(r)}
                  >
                    <Text style={[styles.chipBtnText, currentRadius === r && styles.chipBtnTextActive]}>
                      {`${r}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. Opacity (10 - 100%) */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>ڕوونی (Opacity):</Text>
              <View style={styles.chipRow}>
                {[1.0, 0.8, 0.6, 0.4, 0.2, 0.1].map((op) => (
                  <TouchableOpacity
                    key={`op_${op}`}
                    style={[styles.chipBtn, Math.abs(currentOpacity - op) < 0.05 && styles.chipBtnActive]}
                    onPress={() => changeOpacity(op)}
                  >
                    <Text style={[styles.chipBtnText, Math.abs(currentOpacity - op) < 0.05 && styles.chipBtnTextActive]}>
                      {`${Math.round(op * 100)}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 3: CROP ("بڕین") */}
      {isImageSelected && activeSubTab === 'crop' && (
        <View style={styles.tabContentBox}>
          <View style={styles.cropSubTabRow}>
            <TouchableOpacity style={styles.openCropModalBtn} onPress={() => setIsCropModalVisible(true)}>
              <Ionicons name="crop" size={18} color="#ffffff" />
              <Text style={styles.openCropModalBtnText}>کردنەوەی بڕینی وێنە</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetCropBtn} onPress={resetCrop}>
              <Ionicons name="refresh-outline" size={14} color="#ffffff" />
              <Text style={styles.resetCropText}>بێ بڕین (Reset)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SUB-TAB 4: BORDER ("چوارچێوە") */}
      {isImageSelected && activeSubTab === 'border' && (
        <View style={styles.tabContentBox}>
          <View style={styles.borderWidthRow}>
            <Text style={styles.groupLabel}>ئەستووری چوارچێوە:</Text>
            <View style={styles.chipRow}>
              {[0, 1, 2, 4, 6, 8].map((w) => (
                <TouchableOpacity
                  key={`bw_${w}`}
                  style={[styles.chipBtn, currentBorderWidth === w && styles.chipBtnActive]}
                  onPress={() => setBorderWidth(w)}
                >
                  <Text style={[styles.chipBtnText, currentBorderWidth === w && styles.chipBtnTextActive]}>
                    {w === 0 ? 'بێ چوارچێوە' : `${w}px`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

      {/* Visual Full-Screen Crop Modal */}
      {isImageSelected && selectedElement?.uri && (
        <PptCropModal
          visible={isCropModalVisible}
          imageUri={selectedElement.uri}
          initialCrop={selectedElement.crop}
          onApply={(newCrop) => {
            updateImage({ crop: newCrop });
            setIsCropModalVisible(false);
          }}
          onCancel={() => {
            setIsCropModalVisible(false);
          }}
        />
      )}
    </View>
  );
};

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
  cropSubTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  openCropModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  openCropModalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  resetCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
});
