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
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { PptCanvas } from './PptCanvas';
import { PptCleanSlide } from './PptCleanSlide';
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
import { getElementRuns } from './formattedText';

// Professional PowerPoint Slide Background Color Matrices
const PPT_THEME_BG_COLORS = [
  ['#ffffff', '#f8f9fa', '#f0f4f8', '#fff8e7', '#eef9ef', '#fef2f2', '#f3f0ff', '#f5f5f7', '#e5e5ea', '#1c1c1e'],
  ['#000000', '#111827', '#1f2937', '#111111', '#0f172a', '#1e1b4b', '#064e3b', '#451a03', '#881337', '#312e81'],
  ['#000000', '#ffffff', '#1f497d', '#eeece1', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
  ['#7f7f7f', '#f2f2f2', '#c6d9f1', '#d8d8d8', '#dce6f1', '#f2dcdb', '#eaf1dd', '#e5e0ec', '#d1eef4', '#fde9d9'],
  ['#595959', '#d9d9d9', '#8db4e2', '#bfbfbf', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#a6d9e8', '#fbd5b5'],
];

const STANDARD_BG_COLORS = [
  '#ffffff',
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0',
];

const PASTEL_BG_COLORS = [
  '#f8fafc',
  '#f1f5f9',
  '#f0fdf4',
  '#fefce8',
  '#fef2f2',
  '#faf5ff',
  '#f0f9ff',
  '#fff7ed',
  '#fdf2f8',
  '#18181b',
];

const SPECTRUM_BG_COLORS = [
  ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#32ade6', '#007aff', '#5856d6', '#af52de'],
  ['#ff2d55', '#a2845e', '#8e8e93', '#aeaeb2', '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7', '#8b3a2b', '#5c2217'],
  ['#b02a1e', '#d97706', '#b45309', '#15803d', '#0f766e', '#0369a1', '#1d4ed8', '#4338ca', '#6b21a8', '#831843'],
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
  selRef,
  pendingSelRef,
  pressingRef,
  stickyRangeRef,
  userTouchRef,
  ignoreSelectionRef,
  inputRef,
  selState,
  setSelState,
  isApplyingStyleRef,
  controlledSelection,
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
        selRef={selRef}
        pendingSelRef={pendingSelRef}
        pressingRef={pressingRef}
        stickyRangeRef={stickyRangeRef}
        userTouchRef={userTouchRef}
        ignoreSelectionRef={ignoreSelectionRef}
        inputRef={inputRef}
        selState={selState}
        setSelState={setSelState}
        isApplyingStyleRef={isApplyingStyleRef}
        controlledSelection={controlledSelection}
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

  const selRef = useRef(null);
  const pendingSelRef = useRef(null);
  const pressingRef = useRef(false);
  const stickyRangeRef = useRef({ start: 0, end: 0 });
  const userTouchRef = useRef(false);
  const ignoreSelectionRef = useRef(false);
  const inputRef = useRef(null);
  const [selState, setSelState] = useState(undefined);
  const isApplyingStyleRef = useRef(false);
  const [controlledSelection, setControlledSelection] = useState(undefined);

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
  const [exportingFormat, setExportingFormat] = useState(null); // null | 'pptx' | 'pdf'
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [currentOffscreenSlide, setCurrentOffscreenSlide] = useState(null);
  const offscreenSlideRef = useRef(null);
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
  };

  // Apply Slide Background Color to all pages
  const handleApplyBackgroundToAll = (color) => {
    const newSlides = presentation.slides.map((s) => ({
      ...s,
      background: color,
    }));
    const newPres = { ...presentation, slides: newSlides };
    pushState(newPres, bgPickerPageId);
    if (Platform.OS === 'android') {
      ToastAndroid.show('ڕەنگی پاشبنەما بۆ هەموو پەڕەکان جێگیرکرا', ToastAndroid.SHORT);
    }
  };

  // Update Element in specific page
  const handleUpdateElement = (pageId, updatedElem) => {
    let elemToSave = updatedElem;
    if (elemToSave.type === 'text' && elemToSave.color) {
      const { color: _c, ...rest } = elemToSave;
      elemToSave = rest;
    }
    const newSlides = presentation.slides.map((s) => {
      if (s.id !== pageId) return s;
      const newElements = (s.elements || []).map((e) =>
        e.id === elemToSave.id ? elemToSave : e
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
  const handleConfirmExportPptx = async () => {
    if (selectedExportPageIds.length === 0) {
      Alert.alert('ئاگاداری', 'تکایە هەڵبژاردنی بۆ ئه‌و په‌ڕانه‌ بکه‌ که‌ ده‌ته‌وێت دروستیان بکه‌یت.');
      return;
    }

    setExporting(true);
    setExportingFormat('pptx');
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
      console.log('[PPT Editor] Export PPTX error:', err);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە دروستکردنی پاوەرپۆینت: ' + (err.message || err));
    } finally {
      setExporting(false);
      setExportingFormat(null);
    }
  };

  // Execute Export to PDF (exact look render)
  const handleConfirmExportPdf = async () => {
    if (selectedExportPageIds.length === 0) {
      Alert.alert('ئاگاداری', 'تکایە هەڵبژاردنی بۆ ئه‌و په‌ڕانه‌ بکه‌ که‌ ده‌ته‌وێت دروستیان بکه‌یت.');
      return;
    }

    setExporting(true);
    setExportingFormat('pdf');
    try {
      const targetPages = presentation.slides.filter((s) =>
        selectedExportPageIds.includes(s.id)
      );

      const allSlidesToRender = [];
      for (const pageData of targetPages) {
        const planned = planPage(pageData);
        const generatedSlides = planned.slides || [pageData];
        allSlidesToRender.push(...generatedSlides);
      }

      setExportProgress({ current: 0, total: allSlidesToRender.length });

      const capturedImageUris = [];

      for (let i = 0; i < allSlidesToRender.length; i++) {
        const slideObj = allSlidesToRender[i];
        setCurrentOffscreenSlide(slideObj);
        setExportProgress({ current: i + 1, total: allSlidesToRender.length });

        await new Promise((resolve) => setTimeout(resolve, 180));

        if (offscreenSlideRef.current) {
          const imageUri = await captureRef(offscreenSlideRef, {
            format: 'png',
            quality: 1.0,
            result: 'data-uri',
          });
          capturedImageUris.push(imageUri);
        }
      }

      setCurrentOffscreenSlide(null);

      const is43 = presentation.aspectRatio === '4:3';
      const widthPt = 960;
      const heightPt = is43 ? 720 : 540;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page {
    size: ${widthPt}pt ${heightPt}pt;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    width: ${widthPt}pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }
  .slide-page {
    width: ${widthPt}pt;
    height: ${heightPt}pt;
    page-break-after: always;
    page-break-inside: avoid;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    background-color: #ffffff;
  }
  .slide-page:last-child {
    page-break-after: auto;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
</head>
<body>
  ${capturedImageUris.map((uri) => `<div class="slide-page"><img src="${uri}" /></div>`).join('')}
</body>
</html>
      `;

      const { uri: pdfUri } = await Print.printToFileAsync({
        html: htmlContent,
        width: widthPt,
        height: heightPt,
      });

      const firstImageElem = (presentation.slides[0]?.elements || []).find((e) => e.type === 'image');
      const now = new Date();
      const dateStr = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getTime()}`;

      const newDoc = {
        id: Date.now().toString(),
        name: `PDF_${dateStr}`,
        date: new Date().toLocaleDateString('ku-IQ') || new Date().toLocaleDateString(),
        fileUri: pdfUri,
        type: 'pdf',
        thumbnail: firstImageElem?.uri || null,
        pages: selectedExportPageIds,
      };

      if (onSaveDocument) {
        onSaveDocument(newDoc);
      }

      setCreatedDoc(newDoc);
      setExportModalVisible(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'هاوبەشکردنی PDF',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (pdfErr) {
      console.log('[PPT Editor] Export PDF error:', pdfErr);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە دروستکردنی PDF: ' + (pdfErr.message || pdfErr));
    } finally {
      setExporting(false);
      setExportingFormat(null);
      setCurrentOffscreenSlide(null);
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
                    keyboardShouldPersistTaps="always"
                  >
                    {presentation.slides.map((slide, index) => {
                      const isSaved = !!savedPages[slide.id];
                      return (
                        <React.Fragment key={slide.id || index}>

                          {/* Professional Slide Background Picker Panel if active for this page */}
                          {bgPickerPageId === slide.id && (
                            <View style={styles.bgPickerPanel}>
                              <View style={styles.bgPickerHeader}>
                                <Text style={styles.bgPickerTitle}>
                                  🎨 ڕەنگی پاشبنەمای پەڕەی {index + 1} (Slide Background)
                                </Text>
                                <TouchableOpacity onPress={() => setBgPickerPageId(null)}>
                                  <Text style={styles.bgPickerCloseBtn}>✕</Text>
                                </TouchableOpacity>
                              </View>

                              {/* Quick Presets Row */}
                              <Text style={styles.bgSectionTitle}>ڕەنگە خێرا و پرۆفیشناڵەکان (Quick Presets):</Text>
                              <View style={styles.presetChipRow}>
                                <TouchableOpacity
                                  style={[
                                    styles.presetChip,
                                    (slide.background || '#ffffff') === '#ffffff' && styles.presetChipActive,
                                  ]}
                                  onPress={() => handleChangeBackground(slide.id, '#ffffff')}
                                >
                                  <View style={[styles.presetDot, { backgroundColor: '#ffffff' }]} />
                                  <Text style={styles.presetChipText}>سپی (White)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.presetChip,
                                    slide.background === '#1c1c1e' && styles.presetChipActive,
                                  ]}
                                  onPress={() => handleChangeBackground(slide.id, '#1c1c1e')}
                                >
                                  <View style={[styles.presetDot, { backgroundColor: '#1c1c1e' }]} />
                                  <Text style={styles.presetChipText}>تاریک (Dark)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.presetChip,
                                    slide.background === '#fff8e7' && styles.presetChipActive,
                                  ]}
                                  onPress={() => handleChangeBackground(slide.id, '#fff8e7')}
                                >
                                  <View style={[styles.presetDot, { backgroundColor: '#fff8e7' }]} />
                                  <Text style={styles.presetChipText}>که‌ن (Cream)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.presetChip,
                                    slide.background === '#1f497d' && styles.presetChipActive,
                                  ]}
                                  onPress={() => handleChangeBackground(slide.id, '#1f497d')}
                                >
                                  <View style={[styles.presetDot, { backgroundColor: '#1f497d' }]} />
                                  <Text style={styles.presetChipText}>شینی پاوەرپۆینت</Text>
                                </TouchableOpacity>
                              </View>

                              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                {/* 1. PowerPoint Theme Colors Grid */}
                                <Text style={styles.bgSectionTitle}>ڕەنگەکانی تێمی پاوەرپۆینت (PowerPoint Theme Colors)</Text>
                                <View style={styles.bgGridBox}>
                                  {PPT_THEME_BG_COLORS.map((row, rIdx) => (
                                    <View key={`bg_theme_row_${rIdx}`} style={styles.bgGridRow}>
                                      {row.map((hex, cIdx) => (
                                        <TouchableOpacity
                                          key={`bg_theme_${rIdx}_${cIdx}`}
                                          style={[
                                            styles.bgSquare,
                                            { backgroundColor: hex },
                                            (slide.background || '#ffffff') === hex && styles.bgSquareActive,
                                          ]}
                                          onPress={() => handleChangeBackground(slide.id, hex)}
                                        >
                                          {(slide.background || '#ffffff') === hex && (
                                            <Text
                                              style={{
                                                color: hex === '#ffffff' || hex === '#eeece1' || hex === '#f2f2f2' ? '#000' : '#fff',
                                                fontSize: 10,
                                                fontWeight: 'bold',
                                              }}
                                            >
                                              ✓
                                            </Text>
                                          )}
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  ))}
                                </View>

                                {/* 2. Standard Colors */}
                                <Text style={[styles.bgSectionTitle, { marginTop: 10 }]}>ڕەنگە ستانداردەکان (Standard Colors)</Text>
                                <View style={styles.bgStandardRow}>
                                  {STANDARD_BG_COLORS.map((hex) => (
                                    <TouchableOpacity
                                      key={`bg_std_${hex}`}
                                      style={[
                                        styles.bgSquare,
                                        { backgroundColor: hex },
                                        (slide.background || '#ffffff') === hex && styles.bgSquareActive,
                                      ]}
                                      onPress={() => handleChangeBackground(slide.id, hex)}
                                    >
                                      {(slide.background || '#ffffff') === hex && (
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                                      )}
                                    </TouchableOpacity>
                                  ))}
                                </View>

                                {/* 3. Pastel & Light Backgrounds */}
                                <Text style={[styles.bgSectionTitle, { marginTop: 10 }]}>پاشبنەمای کاڵ و پاستێلەکان (Pastel & Light Backgrounds)</Text>
                                <View style={styles.bgStandardRow}>
                                  {PASTEL_BG_COLORS.map((hex) => (
                                    <TouchableOpacity
                                      key={`bg_pastel_${hex}`}
                                      style={[
                                        styles.bgSquare,
                                        { backgroundColor: hex },
                                        (slide.background || '#ffffff') === hex && styles.bgSquareActive,
                                      ]}
                                      onPress={() => handleChangeBackground(slide.id, hex)}
                                    >
                                      {(slide.background || '#ffffff') === hex && (
                                        <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                                      )}
                                    </TouchableOpacity>
                                  ))}
                                </View>

                                {/* 4. Full Color Spectrum Grid */}
                                <Text style={[styles.bgSectionTitle, { marginTop: 10 }]}>پانیی ڕەنگە پرۆفیشناڵەکان (Full Color Spectrum)</Text>
                                <View style={styles.bgGridBox}>
                                  {SPECTRUM_BG_COLORS.map((row, rIdx) => (
                                    <View key={`bg_spec_row_${rIdx}`} style={styles.bgGridRow}>
                                      {row.map((hex, cIdx) => (
                                        <TouchableOpacity
                                          key={`bg_spec_${rIdx}_${cIdx}`}
                                          style={[
                                            styles.bgSquare,
                                            { backgroundColor: hex },
                                            (slide.background || '#ffffff') === hex && styles.bgSquareActive,
                                          ]}
                                          onPress={() => handleChangeBackground(slide.id, hex)}
                                        >
                                          {(slide.background || '#ffffff') === hex && (
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                                          )}
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  ))}
                                </View>
                              </ScrollView>

                              {/* Apply to All Slides Button */}
                              <TouchableOpacity
                                style={styles.applyAllBtn}
                                onPress={() => handleApplyBackgroundToAll(slide.background || '#ffffff')}
                              >
                                <Ionicons name="copy-outline" size={14} color="#ffffff" />
                                <Text style={styles.applyAllText}>🌐 جێگیرکردنی ئەم ڕەنگە بۆ هەموو پەڕەکان (Apply to All Slides)</Text>
                              </TouchableOpacity>
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
                              if (elemId !== selectedElementId) {
                                stickyRangeRef.current = { start: 0, end: 0 };
                              }
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
                            selRef={selRef}
                            pendingSelRef={pendingSelRef}
                            pressingRef={pressingRef}
                            stickyRangeRef={stickyRangeRef}
                            userTouchRef={userTouchRef}
                            ignoreSelectionRef={ignoreSelectionRef}
                            inputRef={inputRef}
                            selState={selState}
                            setSelState={setSelState}
                            isApplyingStyleRef={isApplyingStyleRef}
                            controlledSelection={controlledSelection}
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
                  selRef={selRef}
                  pendingSelRef={pendingSelRef}
                  pressingRef={pressingRef}
                  stickyRangeRef={stickyRangeRef}
                  userTouchRef={userTouchRef}
                  ignoreSelectionRef={ignoreSelectionRef}
                  inputRef={inputRef}
                  selState={selState}
                  setSelState={setSelState}
                  isApplyingStyleRef={isApplyingStyleRef}
                  controlledSelection={controlledSelection}
                  setControlledSelection={setControlledSelection}
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
                          disabled={!!exportingFormat}
                        >
                          <Text style={styles.cancelExportText}>داخستن</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.exportPdfBtn}
                          onPress={handleConfirmExportPdf}
                          disabled={!!exportingFormat || selectedExportPageIds.length === 0}
                        >
                          {exportingFormat === 'pdf' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <ActivityIndicator size="small" color="#ffffff" />
                              <Text style={styles.confirmExportText}>{`PDF (${exportProgress.current}/${exportProgress.total})`}</Text>
                            </View>
                          ) : (
                            <Text style={styles.confirmExportText}>PDF 📄</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.confirmExportBtn}
                          onPress={handleConfirmExportPptx}
                          disabled={!!exportingFormat || selectedExportPageIds.length === 0}
                        >
                          {exportingFormat === 'pptx' ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.confirmExportText}>PPTX 📊</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          </Modal>

          {/* Offscreen Slide Container for high-res PDF export capture */}
          <View
            style={{
              position: 'absolute',
              left: -9999,
              top: -9999,
              width: presentation.aspectRatio === '4:3' ? 1024 : 1280,
              height: presentation.aspectRatio === '4:3' ? 768 : 720,
              opacity: currentOffscreenSlide ? 1 : 0,
            }}
            pointerEvents="none"
          >
            {currentOffscreenSlide && (
              <PptCleanSlide
                ref={offscreenSlideRef}
                slide={currentOffscreenSlide}
                aspectRatio={presentation.aspectRatio}
                width={presentation.aspectRatio === '4:3' ? 1024 : 1280}
                height={presentation.aspectRatio === '4:3' ? 768 : 720}
                fontFamily={vazirmatnFont}
              />
            )}
          </View>

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
  bgPickerPanel: {
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  bgPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bgPickerTitle: {
    color: '#8B3A2B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bgPickerCloseBtn: {
    color: '#aaaaaa',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 2,
  },
  bgSectionTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'right',
  },
  presetChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  presetChipActive: {
    borderColor: '#8B3A2B',
    backgroundColor: '#3a3a3c',
  },
  presetDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  presetChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bgGridBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    gap: 4,
  },
  bgGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bgStandardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
  },
  bgSquare: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgSquareActive: {
    borderWidth: 2.5,
    borderColor: '#30d158',
  },
  applyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B3A2B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  applyAllText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
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
    justifyContent: 'center',
  },
  cancelExportText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  exportPdfBtn: {
    flex: 1.2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmExportBtn: {
    flex: 1.2,
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
