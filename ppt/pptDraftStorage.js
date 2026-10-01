import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'ppt_editor_draft_v1';

export const savePptDraft = async (presentation) => {
  try {
    if (!presentation) return;
    const jsonStr = JSON.stringify(presentation);
    await AsyncStorage.setItem(DRAFT_KEY, jsonStr);
  } catch (err) {
    console.log('[PPT Draft] Save error:', err);
  }
};

export const loadPptDraft = async () => {
  try {
    const jsonStr = await AsyncStorage.getItem(DRAFT_KEY);
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.log('[PPT Draft] Load error:', err);
  }
  return null;
};

export const clearPptDraft = async () => {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    console.log('[PPT Draft] Clear error:', err);
  }
};

export const createDefaultPresentation = () => ({
  id: `ppt_${Date.now()}`,
  title: 'پێشاندانی نوێ',
  aspectRatio: '16:9',
  slides: [
    {
      id: `slide_${Date.now()}_1`,
      layout: 'title',
      background: '#ffffff',
      elements: [
        {
          id: `elem_${Date.now()}_1`,
          type: 'text',
          x: 5,
          y: 25,
          width: 90,
          height: 25,
          zIndex: 1,
          text: 'سەردێڕی سەرەکی پاوەرپۆینت',
          fontSize: 28,
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecorationLine: 'none',
          color: '#1c1c1e',
          highlightColor: 'transparent',
          textAlign: 'center',
          writingDirection: 'rtl',
          lineSpacing: 1.2,
          listType: 'none',
        },
        {
          id: `elem_${Date.now()}_2`,
          type: 'text',
          x: 10,
          y: 52,
          width: 80,
          height: 20,
          zIndex: 1,
          text: 'ژێرنووس / ناوی ئامادەکار یان بابەته‌کە',
          fontSize: 18,
          fontWeight: 'normal',
          fontStyle: 'italic',
          textDecorationLine: 'none',
          color: '#555555',
          highlightColor: 'transparent',
          textAlign: 'center',
          writingDirection: 'rtl',
          lineSpacing: 1.2,
          listType: 'none',
        },
      ],
    },
  ],
});
