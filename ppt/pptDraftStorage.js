import AsyncStorage from '@react-native-async-storage/async-storage';
import { LAYOUTS } from './layouts';

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

export const createDefaultPresentation = () => {
  const titleLayout = LAYOUTS.find((l) => l.key === 'title') || LAYOUTS[0];
  const initialElements = titleLayout ? titleLayout.createElements() : [];

  return {
    id: `ppt_${Date.now()}`,
    title: 'پێشاندانی نوێ',
    aspectRatio: '16:9',
    slides: [
      {
        id: `slide_${Date.now()}_1`,
        layout: 'title',
        background: '#ffffff',
        elements: initialElements,
      },
    ],
  };
};
