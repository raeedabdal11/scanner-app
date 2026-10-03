import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { CATEGORIES, LAYOUTS } from './layouts';

export const PptLayoutPickerModal = ({ visible, onClose, onSelectLayout }) => {
  const [selectedCategory, setSelectedCategory] = useState('هەموو');

  const isAllCategory = (cat) =>
    cat === 'هەموو' || cat === 'هەمووی' || cat === 'All';

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    const count = LAYOUTS.filter((item) => {
      if (isAllCategory(cat)) return true;
      return item.category === cat;
    }).length;
    console.log(`[PPT Layouts] category: ${cat}, count: ${count}`);
  };

  useEffect(() => {
    if (visible) {
      const count = LAYOUTS.filter((item) => {
        if (isAllCategory(selectedCategory)) return true;
        return item.category === selectedCategory;
      }).length;
      console.log(`[PPT Layouts] category: ${selectedCategory}, count: ${count}`);
    }
  }, [visible, selectedCategory]);

  if (!visible) return null;

  const filteredLayouts = LAYOUTS.filter((item) => {
    if (isAllCategory(selectedCategory)) return true;
    return item.category === selectedCategory;
  });

  const renderMiniPreview = (key) => {
    switch (key) {
      case 'title':
        return (
          <View style={styles.miniTitleBox}>
            <View style={[styles.miniBar, { width: '75%', height: 7, backgroundColor: '#D24726' }]} />
            <View style={[styles.miniBar, { width: '55%', height: 4, backgroundColor: '#888', marginTop: 6 }]} />
          </View>
        );
      case 'section_header':
        return (
          <View style={styles.miniTitleBox}>
            <View style={[styles.miniBar, { width: '80%', height: 8, backgroundColor: '#1c1c1e' }]} />
            <View style={[styles.miniBar, { width: '60%', height: 4, backgroundColor: '#888', marginTop: 6 }]} />
          </View>
        );
      case 'agenda':
        return (
          <View style={styles.miniColBox}>
            <View style={[styles.miniBar, { width: '60%', height: 6, backgroundColor: '#D24726', alignSelf: 'flex-end' }]} />
            <View style={[styles.miniBar, { width: '90%', height: 3, backgroundColor: '#888', marginTop: 5, alignSelf: 'flex-end' }]} />
            <View style={[styles.miniBar, { width: '85%', height: 3, backgroundColor: '#888', marginTop: 3, alignSelf: 'flex-end' }]} />
            <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#888', marginTop: 3, alignSelf: 'flex-end' }]} />
          </View>
        );
      case 'title_bullets':
        return (
          <View style={styles.miniColBox}>
            <View style={[styles.miniBar, { width: '70%', height: 6, backgroundColor: '#1c1c1e', alignSelf: 'flex-end' }]} />
            <View style={[styles.miniBar, { width: '90%', height: 3, backgroundColor: '#888', marginTop: 5, alignSelf: 'flex-end' }]} />
            <View style={[styles.miniBar, { width: '85%', height: 3, backgroundColor: '#888', marginTop: 3, alignSelf: 'flex-end' }]} />
          </View>
        );
      case 'two_columns':
        return (
          <View style={{ flex: 1, width: '100%' }}>
            <View style={[styles.miniBar, { width: '60%', height: 5, backgroundColor: '#1c1c1e', alignSelf: 'center', marginBottom: 6 }]} />
            <View style={styles.miniRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={[styles.miniBar, { width: '90%', height: 3, backgroundColor: '#888' }]} />
                <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#aaa' }]} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={[styles.miniBar, { width: '90%', height: 3, backgroundColor: '#888' }]} />
                <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#aaa' }]} />
              </View>
            </View>
          </View>
        );
      case 'comparison':
        return (
          <View style={{ flex: 1, width: '100%' }}>
            <View style={[styles.miniBar, { width: '50%', height: 5, backgroundColor: '#D24726', alignSelf: 'center', marginBottom: 5 }]} />
            <View style={styles.miniRow}>
              <View style={{ flex: 1, gap: 3, backgroundColor: '#eef9ef', padding: 3, borderRadius: 4 }}>
                <View style={[styles.miniBar, { width: '80%', height: 4, backgroundColor: '#30d158' }]} />
                <View style={[styles.miniBar, { width: '70%', height: 3, backgroundColor: '#888' }]} />
              </View>
              <View style={{ flex: 1, gap: 3, backgroundColor: '#fdeeeed', padding: 3, borderRadius: 4 }}>
                <View style={[styles.miniBar, { width: '80%', height: 4, backgroundColor: '#ff453a' }]} />
                <View style={[styles.miniBar, { width: '70%', height: 3, backgroundColor: '#888' }]} />
              </View>
            </View>
          </View>
        );
      case 'quote':
        return (
          <View style={styles.miniTitleBox}>
            <Text style={{ fontSize: 16, color: '#D24726', fontWeight: 'bold' }}>“ ”</Text>
            <View style={[styles.miniBar, { width: '80%', height: 4, backgroundColor: '#1c1c1e', marginTop: 2 }]} />
            <View style={[styles.miniBar, { width: '50%', height: 3, backgroundColor: '#D24726', marginTop: 4 }]} />
          </View>
        );
      case 'big_statement':
        return (
          <View style={styles.miniTitleBox}>
            <View style={[styles.miniBar, { width: '90%', height: 8, backgroundColor: '#D24726' }]} />
            <View style={[styles.miniBar, { width: '70%', height: 8, backgroundColor: '#D24726', marginTop: 4 }]} />
          </View>
        );
      case 'image_right_text':
        return (
          <View style={styles.miniRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={[styles.miniBar, { width: '90%', height: 4, backgroundColor: '#1c1c1e' }]} />
              <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#aaa' }]} />
            </View>
            <View style={styles.miniImgBlock} />
          </View>
        );
      case 'image_left_text':
        return (
          <View style={styles.miniRow}>
            <View style={styles.miniImgBlock} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={[styles.miniBar, { width: '90%', height: 4, backgroundColor: '#1c1c1e' }]} />
              <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#aaa' }]} />
            </View>
          </View>
        );
      case 'full_image_caption':
        return (
          <View style={{ flex: 1, width: '100%', gap: 4 }}>
            <View style={[styles.miniImgBlock, { flex: 3 }]} />
            <View style={[styles.miniBar, { width: '70%', height: 3, backgroundColor: '#888', alignSelf: 'center' }]} />
          </View>
        );
      case 'image_grid_2':
        return (
          <View style={styles.miniRow}>
            <View style={styles.miniImgBlock} />
            <View style={styles.miniImgBlock} />
          </View>
        );
      case 'image_grid_3':
        return (
          <View style={styles.miniRow}>
            <View style={styles.miniImgBlock} />
            <View style={styles.miniImgBlock} />
            <View style={styles.miniImgBlock} />
          </View>
        );
      case 'image_grid_4':
        return (
          <View style={{ flex: 1, width: '100%', gap: 4 }}>
            <View style={styles.miniRow}>
              <View style={styles.miniImgBlock} />
              <View style={styles.miniImgBlock} />
            </View>
            <View style={styles.miniRow}>
              <View style={styles.miniImgBlock} />
              <View style={styles.miniImgBlock} />
            </View>
          </View>
        );
      case 'image_caption_below':
        return (
          <View style={{ flex: 1, width: '100%', gap: 4 }}>
            <View style={[styles.miniBar, { width: '60%', height: 4, backgroundColor: '#1c1c1e', alignSelf: 'center' }]} />
            <View style={[styles.miniImgBlock, { flex: 1 }]} />
            <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#888', alignSelf: 'center' }]} />
          </View>
        );
      case 'big_numbers':
        return (
          <View style={styles.miniRow}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#30d158' }}>85%</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#007AFF' }}>+50</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#af52de' }}>100K</Text>
            </View>
          </View>
        );
      case 'timeline':
        return (
          <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
            <View style={[styles.miniBar, { width: '100%', height: 2, backgroundColor: '#007AFF', position: 'absolute', top: '50%' }]} />
            <View style={styles.miniRow}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D24726' }} />
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF' }} />
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff9500' }} />
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#30d158' }} />
            </View>
          </View>
        );
      case 'process':
        return (
          <View style={styles.miniRow}>
            <View style={{ flex: 1, height: '100%', backgroundColor: '#D24726', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 8 }}>١</Text>
            </View>
            <View style={{ flex: 1, height: '100%', backgroundColor: '#007AFF', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 8 }}>٢</Text>
            </View>
            <View style={{ flex: 1, height: '100%', backgroundColor: '#30d158', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 8 }}>٣</Text>
            </View>
          </View>
        );
      case 'table':
        return (
          <View style={{ flex: 1, width: '100%', gap: 3 }}>
            <View style={[styles.miniBar, { width: '100%', height: 6, backgroundColor: '#D24726' }]} />
            <View style={[styles.miniBar, { width: '100%', height: 3, backgroundColor: '#ccc' }]} />
            <View style={[styles.miniBar, { width: '100%', height: 3, backgroundColor: '#ccc' }]} />
            <View style={[styles.miniBar, { width: '100%', height: 3, backgroundColor: '#ccc' }]} />
          </View>
        );
      case 'thank_you':
        return (
          <View style={styles.miniTitleBox}>
            <Text style={{ fontSize: 12 }}>🙏</Text>
            <View style={[styles.miniBar, { width: '70%', height: 6, backgroundColor: '#D24726', marginTop: 2 }]} />
            <View style={[styles.miniBar, { width: '50%', height: 3, backgroundColor: '#888', marginTop: 4 }]} />
          </View>
        );
      case 'blank':
      default:
        return <View style={styles.miniBlankBlock} />;
    }
  };

  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.bottomSheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>هەڵبژاردنی نەخشەی سڵایدی نوێ 🎨</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {CATEGORIES.map((cat) => {
              const isActive = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Layouts Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
        >
          <View style={styles.grid}>
            {filteredLayouts.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => onSelectLayout(item)}
              >
                <View style={styles.miniCanvas}>
                  {renderMiniPreview(item.key)}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheetContainer: {
    height: '70%',
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabsWrapper: {
    height: 38,
    marginBottom: 12,
  },
  tabsContent: {
    gap: 8,
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  tabBtnActive: {
    backgroundColor: '#D24726',
    borderColor: '#D24726',
  },
  tabText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#2c2c2e',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 10,
  },
  miniCanvas: {
    width: '100%',
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniTitleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  miniColBox: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  miniRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniImgBlock: {
    flex: 1,
    height: '100%',
    backgroundColor: '#e5e5ea',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  miniBlankBlock: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  miniBar: {
    borderRadius: 2,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 3,
  },
  cardDesc: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
});
