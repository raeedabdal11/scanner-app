// "ڕێکخستن" panel shared by every element toolbar (text, image, shape, table, SmartArt):
// lock / unlock + alignment relative to the slide. "چەپ" = physical left, "ڕاست" = physical right,
// so the buttons are laid out left-to-right exactly as they move the element.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ToastAndroid, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LOCKED_MESSAGE } from './elementLock';
import { alignElementToSlide } from './snapGeometry';

const H_ALIGN = [
  { key: 'left', label: 'چەپ', icon: 'format-horizontal-align-left' },
  { key: 'hcenter', label: 'ناوەڕاست', icon: 'format-horizontal-align-center' },
  { key: 'right', label: 'ڕاست', icon: 'format-horizontal-align-right' },
];
const V_ALIGN = [
  { key: 'top', label: 'سەرەوە', icon: 'format-vertical-align-top' },
  { key: 'vmiddle', label: 'ناوەڕاست', icon: 'format-vertical-align-center' },
  { key: 'bottom', label: 'خوارەوە', icon: 'format-vertical-align-bottom' },
];
const SLIDE_FIT = [
  { key: 'center', label: 'ناوەڕاستی سلاید', icon: 'image-filter-center-focus' },
  { key: 'matchWidth', label: 'پانی سلاید', icon: 'arrow-expand-horizontal' },
  { key: 'matchHeight', label: 'بەرزی سلاید', icon: 'arrow-expand-vertical' },
];

const notify = (msg) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
};

/** 🔒 "قفڵکردن" / "کردنەوەی قفڵ" — the same button in every toolbar. */
export const PptLockButton = ({ element, onChangeElement, style }) => {
  if (!element) return null;
  const isLocked = !!element.locked;
  return (
    <TouchableOpacity
      style={[styles.lockBtn, isLocked && styles.lockBtnOn, style]}
      onPress={() => {
        onChangeElement({ ...element, locked: !isLocked });
        notify(isLocked ? 'قفڵ کرایەوە 🔓' : 'قفڵکرا 🔒');
      }}
      accessibilityLabel={isLocked ? 'کردنەوەی قفڵ' : 'قفڵکردن'}
    >
      <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={16} color={isLocked ? '#ffcc00' : '#ffffff'} />
      <Text style={[styles.lockBtnText, isLocked && styles.lockBtnTextOn]}>
        {isLocked ? '🔒 کردنەوەی قفڵ' : 'قفڵکردن'}
      </Text>
    </TouchableOpacity>
  );
};

const AlignRow = ({ title, items, disabled, onPick }) => (
  <View style={styles.group}>
    <Text style={styles.groupTitle}>{title}</Text>
    <View style={styles.row}>
      {items.map((it) => (
        <TouchableOpacity
          key={it.key}
          style={[styles.alignBtn, disabled && styles.alignBtnDisabled]}
          onPress={() => onPick(it.key)}
          accessibilityLabel={it.label}
        >
          <MaterialCommunityIcons name={it.icon} size={20} color={disabled ? '#636366' : '#ffffff'} />
          <Text style={[styles.alignBtnText, disabled && styles.alignBtnTextDisabled]} numberOfLines={1}>
            {it.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export const PptArrangePanel = ({ element, onChangeElement, slideHeightPt = 405 }) => {
  if (!element) return null;
  const isLocked = !!element.locked;
  const pick = (action) => {
    if (isLocked) {
      notify(LOCKED_MESSAGE);
      return;
    }
    onChangeElement(alignElementToSlide(element, action, slideHeightPt));
  };
  return (
    <View style={styles.panel}>
      <View style={styles.lockRow}>
        <PptLockButton element={element} onChangeElement={onChangeElement} />
        {isLocked && (
          <Text style={styles.lockHint}>جووڵاندن، قەبارە، سوڕاندن، دەستکاری و سڕینەوە ناکرێت</Text>
        )}
      </View>
      <AlignRow title="ئاسۆیی (بەپێی سلاید)" items={H_ALIGN} disabled={isLocked} onPick={pick} />
      <AlignRow title="ستوونی (بەپێی سلاید)" items={V_ALIGN} disabled={isLocked} onPick={pick} />
      <AlignRow title="سلاید" items={SLIDE_FIT} disabled={isLocked} onPick={pick} />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    padding: 10,
    gap: 8,
  },
  lockRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  lockHint: {
    flex: 1,
    color: '#ffcc00',
    fontSize: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  lockBtnOn: {
    backgroundColor: '#3a3a10',
    borderColor: '#ffcc00',
  },
  lockBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  lockBtnTextOn: {
    color: '#ffcc00',
  },
  group: {
    gap: 4,
  },
  groupTitle: {
    color: '#aaaaaa',
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Physical left-to-right order on purpose (چەپ on the left, ڕاست on the right)
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  alignBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    gap: 2,
  },
  alignBtnDisabled: {
    opacity: 0.5,
  },
  alignBtnText: {
    color: '#ffffff',
    fontSize: 10,
  },
  alignBtnTextDisabled: {
    color: '#8e8e93',
  },
});
