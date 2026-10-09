import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHAPE_CATEGORIES, ALL_SHAPES, renderSvgShape } from './shapeCatalog';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 48) / 3;

export function PptShapePickerModal({ visible, onClose, onSelectShape, title = "شێوەکانی پاورپۆینت" }) {
  const [selectedCategory, setSelectedCategory] = useState('lines_arrows');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShapes = ALL_SHAPES.filter((shape) => {
    const matchesCategory = searchQuery ? true : shape.category === selectedCategory;
    const matchesSearch = searchQuery
      ? shape.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shape.id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#8e8e93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="گەڕان بۆ شێوەکان..."
              placeholderTextColor="#8e8e93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              writingDirection="rtl"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#8e8e93" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          {!searchQuery && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {SHAPE_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Shape Grid */}
          <ScrollView contentContainerStyle={styles.gridContainer}>
            {filteredShapes.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>هیچ شێوەیەک نەدۆزرایەوە</Text>
              </View>
            ) : (
              <View style={styles.gridRow}>
                {filteredShapes.map((shape) => (
                  <TouchableOpacity
                    key={shape.id}
                    style={styles.shapeTile}
                    onPress={() => {
                      onSelectShape(shape.id);
                      onClose();
                    }}
                  >
                    <View style={styles.svgPreviewContainer}>
                      {renderSvgShape({
                        shapeType: shape.id,
                        fill: '#1f497d',
                        outlineColor: '#ffffff',
                        outlineWidth: 1.5,
                        cornerRadius: 15,
                        svgWidth: '100%',
                        svgHeight: '100%',
                      })}
                    </View>
                    <Text style={styles.shapeTileName} numberOfLines={2}>
                      {shape.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'right',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2c2c2e',
    marginHorizontal: 4,
  },
  categoryTabActive: {
    backgroundColor: '#0a84ff',
  },
  categoryTabText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  shapeTile: {
    width: GRID_ITEM_WIDTH,
    height: 100,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    margin: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  svgPreviewContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shapeTileName: {
    color: '#dddddd',
    fontSize: 11,
    textAlign: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 15,
  },
});
