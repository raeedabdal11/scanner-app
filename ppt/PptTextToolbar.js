import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';

const TEXT_COLORS = [
  '#1c1c1e',
  '#ffffff',
  '#D24726',
  '#007AFF',
  '#34c759',
  '#ff9500',
  '#af52de',
  '#ff3b30',
  '#ffd60a',
];

const HIGHLIGHT_COLORS = [
  'transparent',
  '#ffff00',
  '#ffc0cb',
  '#add8e6',
  '#90ee90',
  '#ffeb3b',
];

export const PptTextToolbar = ({ element, onChangeElement, onClose }) => {
  const [editTextModal, setEditTextModal] = useState(false);
  const [tempText, setTempText] = useState(element.text || '');

  if (!element || element.type !== 'text') return null;

  const updateProp = (key, value) => {
    onChangeElement({ ...element, [key]: value });
  };

  const toggleBold = () => {
    updateProp('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold');
  };

  const toggleItalic = () => {
    updateProp('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic');
  };

  const toggleUnderline = () => {
    updateProp(
      'textDecorationLine',
      element.textDecorationLine === 'underline' ? 'none' : 'underline'
    );
  };

  const toggleDirection = () => {
    const isRtl = element.writingDirection !== 'ltr';
    const newDir = isRtl ? 'ltr' : 'rtl';
    const newAlign = isRtl ? 'left' : 'right';
    onChangeElement({
      ...element,
      writingDirection: newDir,
      textAlign: newAlign,
    });
  };

  const changeFontSize = (delta) => {
    const current = element.fontSize || 18;
    const updated = Math.max(10, Math.min(72, current + delta));
    updateProp('fontSize', updated);
  };

  const applyBulletList = () => {
    const lines = (element.text || '').split('\n');
    const hasBullets = lines.every((l) => l.trim().startsWith('•') || l.trim() === '');
    const newLines = lines.map((line) => {
      if (hasBullets) {
        return line.replace(/^•\s*/, '');
      } else {
        return line.trim().startsWith('•') ? line : `• ${line}`;
      }
    });
    updateProp('text', newLines.join('\n'));
  };

  const applyNumberedList = () => {
    const lines = (element.text || '').split('\n');
    let count = 1;
    const newLines = lines.map((line) => {
      const clean = line.replace(/^[0-9١-٩]+\.\s*/, '');
      const formatted = `${count}. ${clean}`;
      count++;
      return formatted;
    });
    updateProp('text', newLines.join('\n'));
  };

  return (
    <View style={styles.toolbarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Edit Text Textbox Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setTempText(element.text || '');
            setEditTextModal(true);
          }}
        >
          <Text style={styles.actionBtnText}>✏️ دەستکاری دەق</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* RTL / LTR Direction Toggle */}
        <TouchableOpacity style={styles.iconBtn} onPress={toggleDirection}>
          <Text style={styles.iconBtnText}>
            {element.writingDirection === 'ltr' ? 'LTR (چەپ)' : 'RTL (ڕاست)'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Font Size (+ / -) */}
        <View style={styles.fontSizeBox}>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => changeFontSize(-2)}>
            <Text style={styles.sizeBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.fontSizeText}>{element.fontSize || 18}pt</Text>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => changeFontSize(2)}>
            <Text style={styles.sizeBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Bold, Italic, Underline */}
        <TouchableOpacity
          style={[styles.styleBtn, element.fontWeight === 'bold' && styles.styleBtnActive]}
          onPress={toggleBold}
        >
          <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.styleBtn, element.fontStyle === 'italic' && styles.styleBtnActive]}
          onPress={toggleItalic}
        >
          <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.styleBtn, element.textDecorationLine === 'underline' && styles.styleBtnActive]}
          onPress={toggleUnderline}
        >
          <Text style={[styles.styleBtnText, { textDecorationLine: 'underline' }]}>U</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Alignments */}
        <TouchableOpacity
          style={[styles.styleBtn, element.textAlign === 'right' && styles.styleBtnActive]}
          onPress={() => updateProp('textAlign', 'right')}
        >
          <Text style={styles.styleBtnText}>▶️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.styleBtn, element.textAlign === 'center' && styles.styleBtnActive]}
          onPress={() => updateProp('textAlign', 'center')}
        >
          <Text style={styles.styleBtnText}>⏺️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.styleBtn, element.textAlign === 'left' && styles.styleBtnActive]}
          onPress={() => updateProp('textAlign', 'left')}
        >
          <Text style={styles.styleBtnText}>◀️</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Bullet and Numbered Lists */}
        <TouchableOpacity style={styles.iconBtn} onPress={applyBulletList}>
          <Text style={styles.iconBtnText}>• خاڵبەندی</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={applyNumberedList}>
          <Text style={styles.iconBtnText}>١. ڕیزبەندی</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Color Palette */}
        <Text style={styles.sectionLabel}>ڕەنگ:</Text>
        {TEXT_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              element.color === color && styles.colorDotActive,
            ]}
            onPress={() => updateProp('color', color)}
          />
        ))}

        <View style={styles.divider} />

        {/* Highlight Color */}
        <Text style={styles.sectionLabel}>سێبەر:</Text>
        {HIGHLIGHT_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.highlightDot,
              { backgroundColor: color === 'transparent' ? '#333' : color },
              element.highlightColor === color && styles.colorDotActive,
            ]}
            onPress={() => updateProp('highlightColor', color)}
          >
            {color === 'transparent' && <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>}
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* Edit Text Modal */}
      <Modal visible={editTextModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>نوسینی دەق ✍️</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={tempText}
              onChangeText={setTempText}
              placeholder="دەقەکەت لێرە بنووسە..."
              placeholderTextColor="#777"
              textAlign={element.writingDirection === 'ltr' ? 'left' : 'right'}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditTextModal(false)}
              >
                <Text style={styles.modalBtnText}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  updateProp('text', tempText);
                  setEditTextModal(false);
                }}
              >
                <Text style={styles.modalBtnText}>جێگیرکردن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingVertical: 8,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#3a3a3c',
    marginHorizontal: 4,
  },
  actionBtn: {
    backgroundColor: '#D24726',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  iconBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  iconBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fontSizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  sizeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sizeBtnText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontSizeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  styleBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#007AFF',
  },
  styleBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 11,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#555',
  },
  highlightDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#30d158',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1c1c1e',
    width: '90%',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#3a3a3c',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#D24726',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
