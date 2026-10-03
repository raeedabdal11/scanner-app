import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Platform,
  ToastAndroid,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { PptCanvas } from './PptCanvas';
import { PptTextToolbar } from './PptTextToolbar';
import { PptLayoutPickerModal } from './PptLayoutPickerModal';
import { PptPreviewModal } from './PptPreviewModal';
import { exportPresentationToPptx } from './pptExporter';
import { planPage, countSlides } from './pptFit';
import {
  savePptDraft,
  loadPptDraft,
  clearPptDraft,
  createDefaultPresentation,
} from './pptDraftStorage';

const BACKGROUND_COLORS = [
  '#ffffff',
  '#f8f9fa',
  '#f0f4f8',
  '#fff8e7',
  '#eef9ef',
  '#fef2f2',
  '#1c1c1e',
  '#2c2c2e',
];

// Single Page Card Component for Continuous Document Scroll
const PageCard = ({
  slide,
  index,
  totalPages,
  isSaved,
  vazirmatnFont,
  selectedElementId,
  editingElementId,
  onSelectElement,
  onStartInlineEditing,
  onEndInlineEditing,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onChangeImageElement,
  onSavePage,
  onMovePageUp,
  onMovePageDown,
  onDeletePage,
  onToggleBgPicker,
}) => {
  const planned = planPage(slide);
  const isFull = planned.isFull;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFull && !isSaved) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isFull, isSaved]);

  return (
    <View style={styles.pageCardContainer}>
      {/* Page Header Toolbar */}
      <View style={styles.pageHeaderToolbar}>
        {/* Page Badge */}
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{`پەڕەی ${index + 1}`}</Text>
        </View>

        {/* Page Action Controls (Move Up, Move Down, Background, Delete) */}
        <View style={styles.pageControlsGroup}>
          <TouchableOpacity
            style={[styles.pageControlBtn, index === 0 && styles.disabledPageControl]}
            disabled={index === 0}
            onPress={() => onMovePageUp(index)}
          >
            <Ionicons name="arrow-up" size={15} color={index === 0 ? '#555' : '#ffffff'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pageControlBtn,
              index === totalPages - 1 && styles.disabledPageControl,
            ]}
            disabled={index === totalPages - 1}
            onPress={() => onMovePageDown(index)}
          >
            <Ionicons
              name="arrow-down"
              size={15}
              color={index === totalPages - 1 ? '#555' : '#ffffff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pageControlBtn}
            onPress={() => onToggleBgPicker(slide.id)}
          >
            <Ionicons name="color-palette-outline" size={15} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pageControlBtn, { backgroundColor: '#ff453a22' }]}
            onPress={() => onDeletePage(index)}
          >
            <Ionicons name="trash-outline" size={15} color="#ff453a" />
          </TouchableOpacity>
        </View>

        {/* Save Page Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1, marginLeft: 8 }}>
          <TouchableOpacity
            style={[
              styles.pageSaveBtn,
              isSaved && styles.pageSaveBtnSaved,
              isFull && !isSaved && styles.pageSaveBtnFull,
            ]}
            onPress={() => onSavePage(slide.id)}
          >
            <Ionicons
              name={isSaved ? 'checkmark-circle-outline' : 'save-outline'}
              size={16}
              color="#ffffff"
            />
            <Text style={styles.pageSaveBtnText} numberOfLines={1}>
              {isSaved
                ? 'پاشکەوتکرا'
                : isFull
                ? 'پەڕەکە پڕبوو — پاشکەوتی بکە'
                : 'پاشکەوتکردنی پەڕە'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Thin fill bar */}
      <View style={styles.fillBarTrack}>
        <View
          style={[
            styles.fillBarFill,
            {
              width: `${Math.round((planned.fill || 0) * 100)}%`,
              backgroundColor: isFull ? '#8B3A2B' : '#30d158',
            },
          ]}
        />
      </View>

      {/* Slide Canvas */}
      <PptCanvas
        slide={slide}
        selectedElementId={selectedElementId}
        editingElementId={editingElementId}
        onSelectElement={onSelectElement}
        onStartInlineEditing={onStartInlineEditing}
        onEndInlineEditing={onEndInlineEditing}
        onChangeElement={onChangeElement}
        onDuplicateElement={onDuplicateElement}
        onDeleteElement={onDeleteElement}
        onChangeImageElement={onChangeImageElement}
        fontFamily={vazirmatnFont}
      />
    </View>
  );
};

export const PptEditorModal = ({
  visible,
  onClose,
  onSaveDocument,
  handleShareDoc,
  handleSaveToPhoneDoc,
}) => {
  const [presentation, setPresentation] = useState(createDefaultPresentation());
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [editingElementId, setEditingElementId] = useState(null);

  // Saved state per page e.g. { [pageId]: boolean }
  const [savedPages, setSavedPages] = useState({});

  // Undo / Redo History
  const [history, setHistory] = useState([createDefaultPresentation()]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Modals & Subpanels
  const [layoutPickerVisible, setLayoutPickerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [bgPickerPageId, setBgPickerPageId] = useState(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedExportPageIds, setSelectedExportPageIds] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [createdDoc, setCreatedDoc] = useState(null);

  const scrollViewRef = useRef(null);

  // Font loading status
  let vazirmatnFont = undefined;
  try {
    const { useFonts, Vazirmatn_400Regular } = require('@expo-google-fonts/vazirmatn');
    const [fontsLoaded] = useFonts({ Vazirmatn: Vazirmatn_400Regular });
    if (fontsLoaded) vazirmatnFont = 'Vazirmatn';
  } catch (e) {
    // Fallback if font package is not present
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
        setSelectedPageId(draft.slides[0]?.id || null);
        const initialSaved = {};
        draft.slides.forEach((s) => {
          initialSaved[s.id] = true;
        });
        setSavedPages(initialSaved);
      } else {
        const fresh = createDefaultPresentation();
        setPresentation(fresh);
        setHistory([fresh]);
        setHistoryIndex(0);
        setSelectedPageId(fresh.slides[0]?.id || null);
        const initialSaved = {};
        fresh.slides.forEach((s) => {
          initialSaved[s.id] = false;
        });
        setSavedPages(initialSaved);
      }
    } catch (e) {
      console.log('[PPT Editor] Load draft error:', e);
    }
  };

  // Clear entire PPT draft (Deletes all pages)
  const handleClearDraftPrompt = () => {
    Alert.alert(
      'سڕینەوەی پاوەرپۆینت 🗑️',
      'ئایا دڵنیایت لە سڕینەوەی هەموو پەڕەکان و پاککردنەوەی ئەم پاوەرپۆینتە؟',
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بەڵێ، هەموی بسڕەوە',
          style: 'destructive',
          onPress: async () => {
            await clearPptDraft();
            const emptyPres = { ...presentation, slides: [] };
            setPresentation(emptyPres);
            setHistory([emptyPres]);
            setHistoryIndex(0);
            setSelectedPageId(null);
            setSelectedElementId(null);
            setEditingElementId(null);
            setSavedPages({});
            setCreatedDoc(null);
            if (Platform.OS === 'android') {
              ToastAndroid.show('هەموو پەڕەکان سڕانەوە', ToastAndroid.SHORT);
            }
          },
        },
      ]
    );
  };

  // Push new state to history & mark affected page unsaved
  const pushState = (newPres, affectedPageId = null) => {
    setPresentation(newPres);
    savePptDraft(newPres);

    if (affectedPageId) {
      setSavedPages((prev) => ({ ...prev, [affectedPageId]: false }));
    }

    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newPres);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleSavePage = async (pageId) => {
    try {
      await savePptDraft(presentation);
      setSavedPages((prev) => ({ ...prev, [pageId]: true }));
      if (Platform.OS === 'android') {
        ToastAndroid.show('پەڕەکە پاشکەوتکرا', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.log('[PPT Editor] Save page error:', err);
    }
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

  // BackHandler for Android Hardware Back Button
  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      if (editingElementId !== null) {
        setEditingElementId(null);
        return true;
      }
      if (exportModalVisible) {
        setExportModalVisible(false);
        return true;
      }
      if (layoutPickerVisible) {
        setLayoutPickerVisible(false);
        return true;
      }
      if (previewVisible) {
        setPreviewVisible(false);
        return true;
      }
      if (selectedElementId !== null) {
        setSelectedElementId(null);
        return true;
      }
      if (bgPickerPageId !== null) {
        setBgPickerPageId(null);
        return true;
      }

      Alert.alert(
        'پاوەرپۆینت',
        'ئایا دەتەوێت لە پاوەرپۆینت بچیتە دەرەوە؟ کارەکەت پاشەکەوت کراوە',
        [
          { text: 'نەخێر', style: 'cancel' },
          { text: 'بەڵێ', onPress: () => onClose() },
        ],
        { cancelable: true }
      );
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [
    visible,
    editingElementId,
    exportModalVisible,
    layoutPickerVisible,
    previewVisible,
    selectedElementId,
    bgPickerPageId,
    onClose,
  ]);

  const handleTopClose = () => {
    if (editingElementId !== null) {
      setEditingElementId(null);
      return;
    }
    if (exportModalVisible) {
      setExportModalVisible(false);
      return;
    }
    if (layoutPickerVisible) {
      setLayoutPickerVisible(false);
      return;
    }
    if (previewVisible) {
      setPreviewVisible(false);
      return;
    }
    if (selectedElementId !== null) {
      setSelectedElementId(null);
      return;
    }
    if (bgPickerPageId !== null) {
      setBgPickerPageId(null);
      return;
    }

    Alert.alert(
      'پاوەرپۆینت',
      'ئایا دەتەوێت لە پاوەرپۆینت بچیتە دەرەوە؟ کارەکەت پاشەکەوت کراوە',
      [
        { text: 'نەخێر', style: 'cancel' },
        { text: 'بەڵێ', onPress: () => onClose() },
      ]
    );
  };

  // Add Page (Appends directly BELOW last page in continuous scroll and auto-scrolls down)
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
    pushState(newPres, newSlide.id);

    setSelectedPageId(newSlide.id);
    setSelectedElementId(null);
    setEditingElementId(null);
    setLayoutPickerVisible(false);

    // Auto-scroll to newly appended page
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  // Move Page Up
  const handleMovePageUp = (index) => {
    if (index <= 0) return;
    const newSlides = [...presentation.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index - 1];
    newSlides[index - 1] = temp;

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, temp.id);
  };

  // Move Page Down
  const handleMovePageDown = (index) => {
    if (index >= presentation.slides.length - 1) return;
    const newSlides = [...presentation.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index + 1];
    newSlides[index + 1] = temp;

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, temp.id);
  };

  // Delete Page (Allows deleting any page including the last page)
  const handleDeletePage = (index) => {
    const isLastPage = presentation.slides.length === 1;

    Alert.alert(
      'سڕینەوەی پەڕە 🗑️',
      isLastPage
        ? 'ئایا دڵنیایت لە سڕینەوەی ئەم پەڕەیە؟ دوای سڕینەوە هیچ پەڕەیەک نامێنێت.'
        : `ئایا دڵنیایت لە سڕینەوەی پەڕەی ${index + 1}؟`,
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بەڵێ، بسڕەوە',
          style: 'destructive',
          onPress: async () => {
            const targetPage = presentation.slides[index];
            const newSlides = presentation.slides.filter((_, idx) => idx !== index);
            const newPres = { ...presentation, slides: newSlides };

            if (newSlides.length === 0) {
              await clearPptDraft();
              setPresentation(newPres);
              setHistory([newPres]);
              setHistoryIndex(0);
              setSelectedPageId(null);
              setSelectedElementId(null);
              setEditingElementId(null);
              setSavedPages({});
            } else {
              pushState(newPres);
              if (selectedPageId === targetPage?.id) {
                setSelectedPageId(null);
                setSelectedElementId(null);
                setEditingElementId(null);
              }
            }

            if (Platform.OS === 'android') {
              ToastAndroid.show('پەڕەکە سڕایەوە', ToastAndroid.SHORT);
            }
          },
        },
      ]
    );
  };

  // Change Slide Background Color for specific page
  const handleChangeBackground = (pageId, color) => {
    const newSlides = presentation.slides.map((s) =>
      s.id === pageId ? { ...s, background: color } : s
    );
    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, pageId);
    setBgPickerPageId(null);
  };

  // Update Element in specific page
  const handleUpdateElement = (pageId, updatedElem) => {
    const newSlides = presentation.slides.map((s) => {
      if (s.id !== pageId) return s;
      const newElements = (s.elements || []).map((e) =>
        e.id === updatedElem.id ? updatedElem : e
      );
      return { ...s, elements: newElements };
    });

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, pageId);
  };

  // Duplicate Element
  const handleDuplicateElement = (pageId, elemId) => {
    const newSlides = presentation.slides.map((s) => {
      if (s.id !== pageId) return s;
      const target = (s.elements || []).find((e) => e.id === elemId);
      if (!target) return s;

      const cloned = {
        ...target,
        id: `elem_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
        x: Math.min(80, target.x + 4),
        y: Math.min(80, target.y + 4),
      };

      return { ...s, elements: [...(s.elements || []), cloned] };
    });

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, pageId);
    setSelectedPageId(pageId);
    setSelectedElementId(elemId);
  };

  // Delete Element
  const handleDeleteElement = (pageId, elemId) => {
    const newSlides = presentation.slides.map((s) => {
      if (s.id !== pageId) return s;
      const newElements = (s.elements || []).filter((e) => e.id !== elemId);
      return { ...s, elements: newElements };
    });

    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, pageId);
    setSelectedElementId(null);
    setEditingElementId(null);
  };

  // Change Image Element Source
  const handleChangeImageElement = async (pageId, elem) => {
    try {
      const res = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets?.length > 0) {
        handleUpdateElement(pageId, {
          ...elem,
          uri: res.assets[0].uri,
        });
      }
    } catch (err) {
      console.log('[PPT Editor] Select image error:', err);
    }
  };

  // Selected element object for Text Toolbar
  const selectedPage = presentation.slides.find((s) => s.id === selectedPageId);
  const selectedElement = (selectedPage?.elements || []).find((e) => e.id === selectedElementId);

  // Open Export Preview Bottom-Sheet Modal
  const handleOpenExportPreview = () => {
    if (presentation.slides.length === 0) {
      Alert.alert('ئاگاداری', 'تکایە سەرەتا پەڕەیەکی نوێ بۆ پاوەرپۆینتەکەت زیاد بکە.');
      return;
    }
    setSelectedExportPageIds(presentation.slides.map((s) => s.id));
    setExportModalVisible(true);
  };

  // Toggle page selection in export modal
  const togglePageExportSelection = (pageId) => {
    setSelectedExportPageIds((prev) => {
      if (prev.includes(pageId)) {
        return prev.filter((id) => id !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  // Select / Deselect all pages in export modal
  const toggleSelectAllExport = () => {
    if (selectedExportPageIds.length === presentation.slides.length) {
      setSelectedExportPageIds([]);
    } else {
      setSelectedExportPageIds(presentation.slides.map((s) => s.id));
    }
  };

  // Execute Export to PPTX
  const handleConfirmExport = async () => {
    if (selectedExportPageIds.length === 0) {
      Alert.alert('ئاگاداری', 'تکایە هەڵبژاردنی بۆ ئه‌و په‌ڕانه‌ بکه‌ که‌ ده‌ته‌وێت دروستیان بکه‌یت.');
      return;
    }

    setExporting(true);
    try {
      const result = await exportPresentationToPptx(presentation, selectedExportPageIds);

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
        pages: selectedExportPageIds,
      };

      if (onSaveDocument) {
        onSaveDocument(newDoc);
      }

      setCreatedDoc(newDoc);
      setExportModalVisible(false);

      // Open share sheet immediately
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          dialogTitle: 'هاوبەشکردنی پاوەرپۆینت',
        });
      }
    } catch (err) {
      console.log('[PPT Editor] Export error:', err);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە دروستکردنی پاوەرپۆینت: ' + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  const totalLiveSlides = countSlides(presentation.slides);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Top Control Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleTopClose} style={styles.topBtn}>
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

              <TouchableOpacity style={styles.iconTopBtn} onPress={handleClearDraftPrompt}>
                <Ionicons name="trash-outline" size={16} color="#ff453a" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconTopBtn} onPress={() => setPreviewVisible(true)}>
                <Text style={styles.iconTopText}>▶️</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.exportTopBtn} onPress={handleOpenExportPreview}>
                <Text style={styles.exportTopText}>{`پاوەرپۆینت · ${totalLiveSlides} سلاید`}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Success Box after Export */}
          {createdDoc ? (
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

              <TouchableOpacity
                style={{ backgroundColor: '#ff453a22', width: '100%', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
                onPress={handleClearDraftPrompt}
              >
                <Text style={{ color: '#ff453a', fontSize: 13, fontWeight: 'bold' }}>
                  🗑️ سڕینەوەی ڕەشنووس
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Main Continuous Vertical Document Editor Area */
            <View style={styles.editorArea}>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                {presentation.slides.length === 0 ? (
                  /* Empty State when all pages are deleted */
                  <View style={styles.emptyEditorBox}>
                    <Ionicons name="documents-outline" size={56} color="#8B3A2B" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyEditorTitle}>هیچ پەڕەیەک بەردەست نییە</Text>
                    <Text style={styles.emptyEditorSub}>
                      بۆ دروستکردنی پاوەرپۆینت، پەڕەیەکی نوێ زیاد بکە
                    </Text>
                    <TouchableOpacity
                      style={[styles.addPageBottomBtn, { marginTop: 20 }]}
                      onPress={() => setLayoutPickerVisible(true)}
                    >
                      <Ionicons name="add-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.addPageBottomText}>زیادکردنی پەڕەی نوێ ➕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.documentScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {presentation.slides.map((slide, index) => {
                      const isSaved = !!savedPages[slide.id];
                      return (
                        <React.Fragment key={slide.id || index}>

                          {/* Page Background Picker Strip if active for this page */}
                          {bgPickerPageId === slide.id && (
                            <View style={styles.bgPickerStrip}>
                              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                                ڕەنگی پاشبنەمای پەڕە:
                              </Text>
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8 }}
                              >
                                {BACKGROUND_COLORS.map((col) => (
                                  <TouchableOpacity
                                    key={col}
                                    style={[
                                      styles.bgDot,
                                      { backgroundColor: col },
                                      slide.background === col && styles.bgDotActive,
                                    ]}
                                    onPress={() => handleChangeBackground(slide.id, col)}
                                  />
                                ))}
                              </ScrollView>
                            </View>
                          )}

                          <PageCard
                            slide={slide}
                            index={index}
                            totalPages={presentation.slides.length}
                            isSaved={isSaved}
                            vazirmatnFont={vazirmatnFont}
                            selectedElementId={selectedPageId === slide.id ? selectedElementId : null}
                            editingElementId={selectedPageId === slide.id ? editingElementId : null}
                            onSelectElement={(elemId) => {
                              setSelectedPageId(slide.id);
                              setSelectedElementId(elemId);
                              if (!elemId) setEditingElementId(null);
                            }}
                            onStartInlineEditing={(elemId) => {
                              setSelectedPageId(slide.id);
                              setSelectedElementId(elemId);
                              setEditingElementId(elemId);
                            }}
                            onEndInlineEditing={() => {
                              setEditingElementId(null);
                            }}
                            onChangeElement={(updated) => handleUpdateElement(slide.id, updated)}
                            onDuplicateElement={(elemId) => handleDuplicateElement(slide.id, elemId)}
                            onDeleteElement={(elemId) => handleDeleteElement(slide.id, elemId)}
                            onChangeImageElement={(elem) => handleChangeImageElement(slide.id, elem)}
                            onSavePage={handleSavePage}
                            onMovePageUp={handleMovePageUp}
                            onMovePageDown={handleMovePageDown}
                            onDeletePage={handleDeletePage}
                            onToggleBgPicker={(pId) =>
                              setBgPickerPageId(bgPickerPageId === pId ? null : pId)
                            }
                          />

                          {/* Page Divider between pages */}
                          {index < presentation.slides.length - 1 && (
                            <View style={styles.pageDivider}>
                              <View style={styles.pageDividerLine} />
                              <Text style={styles.pageDividerText}>{`پەڕەی ${index + 2}`}</Text>
                              <View style={styles.pageDividerLine} />
                            </View>
                          )}

                        </React.Fragment>
                      );
                    })}

                    {/* Add New Page Button directly below the document */}
                    <TouchableOpacity
                      style={styles.addPageBottomBtn}
                      onPress={() => setLayoutPickerVisible(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                      <Text style={styles.addPageBottomText}>زیادکردنی پەڕەی نوێ ➕</Text>
                    </TouchableOpacity>

                  </ScrollView>
                )}
              </KeyboardAvoidingView>

              {/* Text Toolbar when text element is selected */}
              {selectedElement && selectedElement.type === 'text' && (
                <PptTextToolbar
                  element={selectedElement}
                  onChangeElement={(updated) => handleUpdateElement(selectedPageId, updated)}
                  onClose={() => {
                    setSelectedElementId(null);
                    setEditingElementId(null);
                  }}
                />
              )}

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

          {/* PowerPoint Preview Before Export Modal */}
          <Modal visible={exportModalVisible} transparent animationType="slide">
            <View style={styles.exportSheetOverlay}>
              <TouchableOpacity
                style={styles.exportBackdrop}
                activeOpacity={1}
                onPress={() => setExportModalVisible(false)}
              />
              <View style={styles.exportSheetBox}>
                <View style={styles.exportSheetHeader}>
                  <Text style={styles.exportSheetTitle}>بەشی پاشەکەوتکردنی پاوەرپۆینت 📊</Text>
                  <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                    <Ionicons name="close" size={22} color="#aaa" />
                  </TouchableOpacity>
                </View>

                {/* Big number count display */}
                {(() => {
                  const selectedPages = presentation.slides.filter((p) =>
                    selectedExportPageIds.includes(p.id)
                  );
                  const totalCreatedSlides = selectedPages.reduce(
                    (acc, p) => acc + planPage(p).slides.length,
                    0
                  );
                  const unsavedSelectedCount = selectedPages.filter(
                    (p) => !savedPages[p.id]
                  ).length;

                  const isAllSelected =
                    selectedExportPageIds.length === presentation.slides.length;

                  return (
                    <View style={{ flex: 1 }}>
                      <View style={styles.exportBigCard}>
                        <Text style={styles.exportBigNum}>{totalCreatedSlides}</Text>
                        <Text style={styles.exportBigSub}>
                          {`سلاید لە ${selectedPages.length} پەڕە`}
                        </Text>
                      </View>

                      {/* Select all checkbox & Clear draft button */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <TouchableOpacity
                          style={styles.selectAllRow}
                          onPress={toggleSelectAllExport}
                        >
                          <Ionicons
                            name={isAllSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color="#8B3A2B"
                          />
                          <Text style={styles.selectAllText}>هەموو پەڕەکان</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.clearSheetBtn}
                          onPress={handleClearDraftPrompt}
                        >
                          <Ionicons name="trash-outline" size={14} color="#ff453a" />
                          <Text style={styles.clearSheetText}>سڕینەوەی تەواوی فۆڵدەر</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Page List */}
                      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
                        {presentation.slides.map((p, idx) => {
                          const isSelected = selectedExportPageIds.includes(p.id);
                          const isSaved = !!savedPages[p.id];
                          const pPlan = planPage(p);
                          const slidesForThisPage = pPlan.slides.length;
                          const isMultiSlide = slidesForThisPage > 1;

                          const titleElem = (p.elements || []).find(
                            (e) => e.type === 'text' && (e.fontSize >= 20 || e.fontWeight === 'bold')
                          );
                          const pageTitle =
                            titleElem && titleElem.text
                              ? titleElem.text.split('\n')[0]
                              : p.layout || `پەڕەی ${idx + 1}`;

                          return (
                            <View
                              key={p.id}
                              style={[
                                styles.pageExportRow,
                                isSelected && styles.pageExportRowSelected,
                              ]}
                            >
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                onPress={() => togglePageExportSelection(p.id)}
                              >
                                <Ionicons
                                  name={isSelected ? 'checkbox' : 'square-outline'}
                                  size={20}
                                  color="#8B3A2B"
                                />

                                <View style={{ flex: 1, marginHorizontal: 8 }}>
                                  <Text style={styles.pageExportTitle} numberOfLines={1}>
                                    {`پەڕەی ${idx + 1}: ${pageTitle}`}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.pageExportStatus,
                                      isSaved ? styles.statusSaved : styles.statusUnsaved,
                                    ]}
                                  >
                                    {isSaved ? 'پاشکەوتکرا' : 'پاشکەوت نەکراوە'}
                                  </Text>
                                </View>
                              </TouchableOpacity>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View
                                  style={[
                                    styles.slideBadgeBox,
                                    isMultiSlide && styles.slideBadgeHighlight,
                                  ]}
                                >
                                  <Text style={styles.slideBadgeText}>
                                    {`${slidesForThisPage} سلاید`}
                                  </Text>
                                </View>

                                {/* Delete page directly from saving list */}
                                <TouchableOpacity
                                  style={styles.pageExportDeleteBtn}
                                  onPress={() => handleDeletePage(idx)}
                                >
                                  <Ionicons name="trash-outline" size={16} color="#ff453a" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>

                      {/* Warning if selected page is unsaved */}
                      {unsavedSelectedCount > 0 && (
                        <View style={styles.unsavedWarningBox}>
                          <Ionicons name="warning-outline" size={16} color="#ff9500" />
                          <Text style={styles.unsavedWarningText}>
                            {`${unsavedSelectedCount} پەڕە هێشتا پاشکەوت نەکراوە`}
                          </Text>
                        </View>
                      )}

                      {/* Action buttons */}
                      <View style={styles.exportSheetActions}>
                        <TouchableOpacity
                          style={styles.cancelExportBtn}
                          onPress={() => setExportModalVisible(false)}
                          disabled={exporting}
                        >
                          <Text style={styles.cancelExportText}>پاشگەزبوونەوە</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.confirmExportBtn}
                          onPress={handleConfirmExport}
                          disabled={exporting || selectedExportPageIds.length === 0}
                        >
                          {exporting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.confirmExportText}>
                              {`دروستکردنی ${totalCreatedSlides} سلاید`}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          </Modal>

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
    fontSize: 14,
    fontWeight: 'bold',
  },
  topActions: {
    flexDirection: 'row',
    gap: 6,
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
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportTopText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  bgPickerStrip: {
    backgroundColor: '#2c2c2e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  bgDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  bgDotActive: {
    borderWidth: 2,
    borderColor: '#8B3A2B',
  },
  editorArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  documentScrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 100,
  },
  emptyEditorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyEditorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyEditorSub: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
  },
  pageCardContainer: {
    backgroundColor: '#141416',
    borderRadius: 14,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  pageHeaderToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pageBadge: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pageBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pageControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  pageControlBtn: {
    backgroundColor: '#2c2c2e',
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledPageControl: {
    opacity: 0.3,
  },
  pageSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  pageSaveBtnFull: {
    backgroundColor: '#8B3A2B',
  },
  pageSaveBtnSaved: {
    backgroundColor: '#2e7d32',
  },
  pageSaveBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fillBarTrack: {
    height: 3,
    backgroundColor: '#2c2c2e',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  fillBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  pageDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  pageDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3a3a3c',
  },
  pageDividerText: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  addPageBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B3A2B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addPageBottomText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
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
  exportSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  exportBackdrop: {
    flex: 1,
  },
  exportSheetBox: {
    height: '75%',
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  exportSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportSheetTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  exportBigCard: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B3A2B',
  },
  exportBigNum: {
    color: '#8B3A2B',
    fontSize: 36,
    fontWeight: 'bold',
  },
  exportBigSub: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 2,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  clearSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff453a22',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  clearSheetText: {
    color: '#ff453a',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pageExportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  pageExportRowSelected: {
    borderColor: '#8B3A2B',
  },
  pageExportTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pageExportStatus: {
    fontSize: 10,
    marginTop: 2,
  },
  statusSaved: {
    color: '#30d158',
  },
  statusUnsaved: {
    color: '#ff9500',
  },
  slideBadgeBox: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slideBadgeHighlight: {
    backgroundColor: '#8B3A2B',
  },
  slideBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pageExportDeleteBtn: {
    backgroundColor: '#ff453a22',
    padding: 6,
    borderRadius: 6,
  },
  unsavedWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff950022',
    borderWidth: 1,
    borderColor: '#ff9500',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  unsavedWarningText: {
    color: '#ff9500',
    fontSize: 11,
    fontWeight: 'bold',
  },
  exportSheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelExportBtn: {
    flex: 1,
    backgroundColor: '#3a3a3c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelExportText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmExportBtn: {
    flex: 2,
    backgroundColor: '#8B3A2B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmExportText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
