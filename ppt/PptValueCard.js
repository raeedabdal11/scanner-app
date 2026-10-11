// Shared value card (same look as the shape toolbar's "قەبارە" cards): title on the
// right, live value in green, -/+ step buttons, a PptSlider and quick preset chips.
// Every button forwards `onPressIn` so the text toolbar can keep the sticky selection.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PptSlider from './PptSlider';

export const PptValueCard = ({
  title,
  valueText,
  dimmed = false,
  value,
  min,
  max,
  step = 1,
  stepAmount = 1,
  onChange,
  chips = [],
  isChipActive,
  onPressIn,
  children,
  style,
}) => {
  const hasSlider = typeof min === 'number' && typeof max === 'number' && !!onChange;
  const clampValue = (v) => Math.max(min, Math.min(max, v));
  const stepLabel = String(stepAmount);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSide}>
          {!!valueText && (
            <Text style={[styles.value, dimmed && styles.valueDimmed]}>{valueText}</Text>
          )}
          {hasSlider && (
            <View style={styles.stepGroup}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPressIn={onPressIn}
                onPress={() => onChange(clampValue(value - stepAmount))}
                hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
              >
                <Text style={styles.stepBtnText}>{`-${stepLabel}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPressIn={onPressIn}
                onPress={() => onChange(clampValue(value + stepAmount))}
                hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
              >
                <Text style={styles.stepBtnText}>{`+${stepLabel}`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {hasSlider && <PptSlider min={min} max={max} step={step} value={value} onChange={onChange} />}

      {chips.length > 0 && (
        <View style={styles.chipRow}>
          {chips.map((chip) => {
            const active = isChipActive ? isChipActive(chip.value) : chip.value === value;
            return (
              <TouchableOpacity
                key={`chip_${chip.value}`}
                style={[styles.chip, active && styles.chipActive]}
                onPressIn={onPressIn}
                onPress={() => onChange(chip.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    color: '#30d158',
    fontSize: 13,
    fontWeight: 'bold',
    minWidth: 36,
    textAlign: 'center',
  },
  valueDimmed: {
    color: '#777777',
  },
  stepGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: '#3a3a3c',
    minWidth: 36,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#8B3A2B',
  },
  chipText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
