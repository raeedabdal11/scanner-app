import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { PptCanvas } from './PptCanvas';
import { PptTextToolbar } from './PptTextToolbar';
import { PptLayoutPickerModal } from './PptLayoutPickerModal';
import { PptPreviewModal } from './PptPreviewModal';
import { exportPresentationToPptx } from './pptExporter';
import {
  savePptDraft,
  loadPptDraft,
  createDefaultPresentation,
} from './pptDraftStorage';

export const PptEditorModal = ({
  visible,
  onClose,
  onSaveDocument,
  handleShareDoc,
  handleSaveToPhoneDoc,
}) => {
  const [presentation, setPresentation] = useState(createDefaultPresentation());
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [editingElementId, setEditingElementId] = useState(null);

  // Undo / Redo History
  const [history, setHistory] = useState([createDefaultPresentation()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Modals & Statuses
  const [layoutPickerVisible, setLayoutPickerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [createdDoc, setCreatedDoc] = useState(null);

  // Font loading status
  let vazirmatnFont = undefined;
  try {
    const { useFonts, Vazirmatn_400Regular } = require('@expo-google-fonts/vazirmatn');
    const [fontsLoaded] = useFonts({ Vazirmatn: Vazirmatn_400Regular });
    if (fontsLoaded) vazirmatnFont = 'Vazirmatn';
  } catch (e) {
    // Graceful fallback if font package is not yet installed
  }

  // Load draft on open
  useEffect(() => {
    if (visible) {
      loadInitialDraft();
    }
  }, [visible]);

  const loadInitialDraft = async () => {
    try {
      const draft = await loadPptDraft();
      if (draft && draft.slides && draft.slides.length > 0) {
        setPresentation(draft);
        setHistory([draft]);
        setHistoryIndex(0);
        setActiveSlideIndex(0);
      } else {
        const fresh = createDefaultPresentation();
        setPresentation(fresh);
        setHistory([fresh]);
        setHistoryIndex(0);
        setActiveSlideIndex(0);
      }
    } catch (e) {
      console.log('[PPT Editor] Load draft error:', e);
    }
  };

  // Push new state to history & autosave
  const pushState = (newPres) => {
    setPresentation(newPres);
    savePptDraft(newPres);

    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newPres);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setPresentation(prev);
      savePptDraft(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setPresentation(next);
      savePptDraft(next);
    }
  };

  const currentSlide = presentation.slides[activeSlideIndex] || presentation.slides[0];
  const selectedElement = (currentSlide?.elements || []).find((e) => e.id === selectedElementId);

  // Add slide layout
  const handleAddSlidePreset = (preset) => {
    const newElements = preset.createElements();
    const newSlide = {
      id: `slide_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
      layout: preset.key,
      background: '#ffffff',
      elements: newElements,
    };

    const newSlides = [...presentation.slides, newSlide];
    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
    setActiveSlideIndex(newSlides.length - 1);
    setSelectedElementId(null);
    setEditingElementId(null);
    setLayoutPickerVisible(false);
  };

  // Duplicate slide
  const handleDuplicateSlide = (index) => {
    const target = presentation.slides[index];
    if (!target) return;

    const clonedElements = (target.elements || []).map((elem) => ({
      ...elem,
      id: `elem_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
    }));

    const clonedSlide = {
      ...target,
      id: `slide_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
      elements: clonedElements,
    };

    const newSlides = [...presentation.slides];
    newSlides.splice(index + 1, 0, clonedSlide);
    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
    setActiveSlideIndex(index + 1);
  };

  // Delete slide
  const handleDeleteSlide = (index) => {
    if (presentation.slides.length <= 1) {
      Alert.alert('ئاگاداری', 'ناتوانی تاقە سڵایدەکە بسڕیتەوە. لانیکەم دەبێت سڵایدێک هەبێت.');
      return;
    }

    const newSlides = presentation.slides.filter((_, idx) => idx !== index);
    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
    setActiveSlideIndex(Math.max(0, index - 1));
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  // Update Element in current slide
  const handleUpdateElement = (updatedElem) => {
    if (!currentSlide) return;
    const newElements = (currentSlide.elements || []).map((e) =>
      e.id === updatedElem.id ? updatedElem : e
    );

    const newSlides = presentation.slides.map((s, idx) =>
      idx === activeSlideIndex ? { ...s, elements: newElements } : s
    );

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
  };

  // Duplicate Element
  const handleDuplicateElement = (elemId) => {
    if (!currentSlide) return;
    const target = (currentSlide.elements || []).find((e) => e.id === elemId);
    if (!target) return;

    const cloned = {
      ...target,
      id: `elem_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
      x: Math.min(80, target.x + 4),
      y: Math.min(80, target.y + 4),
    };

    const newElements = [...(currentSlide.elements || []), cloned];
    const newSlides = presentation.slides.map((s, idx) =>
      idx === activeSlideIndex ? { ...s, elements: newElements } : s
    );

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
    setSelectedElementId(cloned.id);
  };

  // Delete Element
  const handleDeleteElement = (elemId) => {
    if (!currentSlide) return;
    const newElements = (currentSlide.elements || []).filter((e) => e.id !== elemId);
    const newSlides = presentation.slides.map((s, idx) =>
      idx === activeSlideIndex ? { ...s, elements: newElements } : s
    );

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres);
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  // Change Image Element Source
  const handleChangeImageElement = async (elem) => {
    try {
      const res = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets?.length > 0) {
        handleUpdateElement({
          ...elem,
          uri: res.assets[0].uri,
        });
      }
    } catch (err) {
      console.log('[PPT Editor] Select image error:', err);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە هەڵبژاردنی وێنە.');
    }
  };

  // Export to PPTX
  const handleExportPPTX = async () => {
    setExporting(true);
    try {
      const result = await exportPresentationToPptx(presentation);

      const firstImageElem = (presentation.slides[0]?.elements || []).find((e) => e.type === 'image');
      const now = new Date();
      const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;

      const newDoc = {
        id: Date.now().toString(),
        name: `PPT_${dateStr}`,
        date: new Date().toLocaleDateString('ku-IQ') || new Date().toLocaleDateString(),
        fileUri: result.fileUri,
        type: 'ppt',
        thumbnail: firstImageElem?.uri || null,
        pages: presentation.slides.map((s) => s.id),
      };

      if (onSaveDocument) {
        onSaveDocument(newDoc);
      }

      setCreatedDoc(newDoc);
      Alert.alert('سەرکەوتوو', 'فایلی پاوەرپۆینت بە سەرکەوتوویی دروست کرا ✅');
    } catch (err) {
      console.log('[PPT Editor] Export error:', err);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە دروستکردنی پاوەرپۆینت: ' + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Top Control Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.topBtn}>
              <Text style={{ color: '#888', fontSize: 20, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.titleText}>دروستکەری پاوەرپۆینت 📊</Text>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={[styles.iconTopBtn, historyIndex === 0 && styles.disabledBtn]}
                disabled={historyIndex === 0}
                onPress={handleUndo}
              >
                <Text style={styles.iconTopText}>↩️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconTopBtn, historyIndex === history.length - 1 && styles.disabledBtn]}
                disabled={historyIndex === history.length - 1}
                onPress={handleRedo}
              >
                <Text style={styles.iconTopText}>↪️</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconTopBtn} onPress={() => setPreviewVisible(true)}>
                <Text style={styles.iconTopText}>▶️</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.exportTopBtn} onPress={handleExportPPTX}>
                <Text style={styles.exportTopText}>💾 دروستکردن</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading or Post-Creation View */}
          {exporting ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#D24726" />
              <Text style={styles.loadingText}>خەریکی دروستکردنی فایلی پاوەرپۆینتە... ⏳</Text>
            </View>
          ) : createdDoc ? (
            <View style={styles.successBox}>
              <Text style={{ fontSize: 48, marginBottom: 10 }}>🎉</Text>
              <Text style={styles.successTitle}>پاوەرپۆینت بە سەرکەوتوویی دروست کرا!</Text>
              <Text style={styles.successSub}>📄 {createdDoc.name}.pptx</Text>

              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleShareDoc && handleShareDoc(createdDoc)}
              >
                <Text style={styles.btnTextBold}>📤 هاوبەشکردن (Share)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleSaveToPhoneDoc && handleSaveToPhoneDoc(createdDoc)}
              >
                <Text style={styles.btnTextBold}>💾 پاشەکەوتکردن لە مۆبایل</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.anotherBtn} onPress={() => setCreatedDoc(null)}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  ➕ بەردەوامبوون لە دەستکاریکردن
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Main Interactive Canvas Editor Area */
            <View style={styles.editorArea}>

              {/* Canvas Area */}
              <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                <PptCanvas
                  slide={currentSlide}
                  aspectRatio={presentation.aspectRatio}
                  selectedElementId={selectedElementId}
                  editingElementId={editingElementId}
                  onSelectElement={(id) => {
                    setSelectedElementId(id);
                    if (!id) setEditingElementId(null);
                  }}
                  onStartInlineEditing={(id) => {
                    setSelectedElementId(id);
                    setEditingElementId(id);
                  }}
                  onEndInlineEditing={() => {
                    setEditingElementId(null);
                  }}
                  onChangeElement={handleUpdateElement}
                  onDuplicateElement={handleDuplicateElement}
                  onDeleteElement={handleDeleteElement}
                  onChangeImageElement={handleChangeImageElement}
                  fontFamily={vazirmatnFont}
                />
              </ScrollView>

              {/* Text Toolbar when text element is selected */}
              {selectedElement && selectedElement.type === 'text' && (
                <PptTextToolbar
                  element={selectedElement}
                  onChangeElement={handleUpdateElement}
                  onClose={() => {
                    setSelectedElementId(null);
                    setEditingElementId(null);
                  }}
                />
              )}

              {/* Bottom Thumbnails Strip */}
              <View style={styles.bottomStrip}>
                <TouchableOpacity
                  style={styles.addSlideBtn}
                  onPress={() => setLayoutPickerVisible(true)}
                >
                  <Text style={{ fontSize: 18 }}>➕</Text>
                  <Text style={styles.addSlideText}>سڵایدی نوێ</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  {presentation.slides.map((s, idx) => {
                    const isActive = idx === activeSlideIndex;
                    return (
                      <TouchableOpacity
                        key={s.id || idx}
                        style={[styles.thumbCard, isActive && styles.activeThumbCard]}
                        onPress={() => {
                          setActiveSlideIndex(idx);
                          setSelectedElementId(null);
                          setEditingElementId(null);
                        }}
                      >
                        <Text style={styles.thumbNum}>#{idx + 1}</Text>
                        <View style={styles.thumbMiniBox}>
                          <Text style={{ color: '#888', fontSize: 9 }}>
                            {s.layout || 'Slide'}
                          </Text>
                        </View>
                        <View style={styles.thumbActions}>
                          <TouchableOpacity onPress={() => handleDuplicateSlide(idx)}>
                            <Text style={{ fontSize: 10 }}>📋</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteSlide(idx)}>
                            <Text style={{ fontSize: 10 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

            </View>
          )}

          {/* Sub Modals */}
          <PptLayoutPickerModal
            visible={layoutPickerVisible}
            onClose={() => setLayoutPickerVisible(false)}
            onSelectLayout={handleAddSlidePreset}
          />

          <PptPreviewModal
            visible={previewVisible}
            presentation={presentation}
            onClose={() => setPreviewVisible(false)}
            fontFamily={vazirmatnFont}
          />

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  topBtn: {
    padding: 6,
  },
  titleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconTopBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  iconTopText: {
    fontSize: 14,
  },
  exportTopBtn: {
    backgroundColor: '#D24726',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportTopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  editorArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bottomStrip: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 10,
  },
  addSlideBtn: {
    backgroundColor: '#007AFF22',
    borderColor: '#007AFF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlideText: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  thumbCard: {
    width: 65,
    height: 60,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 4,
    marginRight: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  activeThumbCard: {
    borderColor: '#D24726',
    borderWidth: 2,
  },
  thumbNum: {
    color: '#D24726',
    fontSize: 9,
    fontWeight: 'bold',
  },
  thumbMiniBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },
  successBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    color: '#30d158',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSub: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 20,
  },
  shareBtn: {
    backgroundColor: '#007AFF',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#34c759',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  anotherBtn: {
    backgroundColor: '#3a3a3c',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnTextBold: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
