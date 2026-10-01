import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export const LAYOUT_PRESETS = [
  {
    key: 'title',
    title: 'سەردێڕی سەرەکی (Title)',
    desc: 'سەردێڕی سەرەکی و ژێرنووس بۆ پەڕەی دەستپێک',
    createElements: () => [
      {
        id: `elem_${Date.now()}_1`,
        type: 'text',
        x: 5,
        y: 28,
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
      },
      {
        id: `elem_${Date.now()}_2`,
        type: 'text',
        x: 10,
        y: 55,
        width: 80,
        height: 20,
        zIndex: 1,
        text: 'ژێرنووس یان کورتەی بابەتەکەت لێرە بنووسە',
        fontSize: 18,
        fontWeight: 'normal',
        fontStyle: 'italic',
        textDecorationLine: 'none',
        color: '#555555',
        highlightColor: 'transparent',
        textAlign: 'center',
        writingDirection: 'rtl',
        lineSpacing: 1.2,
      },
    ],
  },
  {
    key: 'title_text',
    title: 'سەردێڕ و دەق (Title + Text)',
    desc: 'سەردێڕ لە سەرەوە و دەقی سەرەکی لە خوارەوە',
    createElements: () => [
      {
        id: `elem_${Date.now()}_1`,
        type: 'text',
        x: 5,
        y: 8,
        width: 90,
        height: 18,
        zIndex: 1,
        text: 'سەردێڕی بابەتەکە',
        fontSize: 22,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: '#1c1c1e',
        highlightColor: 'transparent',
        textAlign: 'right',
        writingDirection: 'rtl',
        lineSpacing: 1.2,
      },
      {
        id: `elem_${Date.now()}_2`,
        type: 'text',
        x: 5,
        y: 28,
        width: 90,
        height: 65,
        zIndex: 1,
        text: '• خاڵی یەکەمی ڕوونکردنەوەی بابەتەکە\n• خاڵی دووەمی زانیارییەکان\n• لێرە دەتوانی دەقی تێروتەسەل یان زانیارییەکان بنووسی.',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: '#333333',
        highlightColor: 'transparent',
        textAlign: 'right',
        writingDirection: 'rtl',
        lineSpacing: 1.3,
      },
    ],
  },
  {
    key: 'image_text',
    title: 'وێنە و دەق (Image + Text)',
    desc: 'وێنە لەلایەک و دەق لەلایەکی تر',
    createElements: () => [
      {
        id: `elem_${Date.now()}_1`,
        type: 'text',
        x: 5,
        y: 8,
        width: 90,
        height: 15,
        zIndex: 1,
        text: 'سەردێڕی بابەتەکە',
        fontSize: 22,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: '#1c1c1e',
        highlightColor: 'transparent',
        textAlign: 'right',
        writingDirection: 'rtl',
      },
      {
        id: `elem_${Date.now()}_2`,
        type: 'text',
        x: 50,
        y: 26,
        width: 45,
        height: 68,
        zIndex: 1,
        text: '• وەسف و شیکردنەوەی پەیوەندیدار بە وێنەکەوە\n• نووسینی شیکاری و خاڵە گرنگەکان.',
        fontSize: 15,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: '#333333',
        highlightColor: 'transparent',
        textAlign: 'right',
        writingDirection: 'rtl',
      },
      {
        id: `elem_${Date.now()}_3`,
        type: 'image',
        x: 5,
        y: 26,
        width: 42,
        height: 68,
        zIndex: 1,
        uri: null,
      },
    ],
  },
  {
    key: 'full_image',
    title: 'تەواوی وێنە (Full Image)',
    desc: 'وێنەیەکی گەورە بە شێوەی سەرانسەری لەسەر سڵاید',
    createElements: () => [
      {
        id: `elem_${Date.now()}_1`,
        type: 'image',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
        zIndex: 1,
        uri: null,
      },
    ],
  },
  {
    key: 'two_images',
    title: 'دوو وێنە (Two Images)',
    desc: 'دوو وێنە تەنیشت یەک بۆ بەراوردکردن',
    createElements: () => [
      {
        id: `elem_${Date.now()}_1`,
        type: 'text',
        x: 5,
        y: 5,
        width: 90,
        height: 12,
        zIndex: 1,
        text: 'بەراوردکردنی دوو وێنە',
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: '#1c1c1e',
        highlightColor: 'transparent',
        textAlign: 'center',
        writingDirection: 'rtl',
      },
      {
        id: `elem_${Date.now()}_2`,
        type: 'image',
        x: 5,
        y: 22,
        width: 43,
        height: 70,
        zIndex: 1,
        uri: null,
      },
      {
        id: `elem_${Date.now()}_3`,
        type: 'image',
        x: 52,
        y: 22,
        width: 43,
        height: 70,
        zIndex: 1,
        uri: null,
      },
    ],
  },
  {
    key: 'blank',
    title: 'بەتاڵ (Blank)',
    desc: 'سڵایدێکی سپی و بەتاڵ بەبێ هیچ بەشێک',
    createElements: () => [],
  },
];

export const PptLayoutPickerModal = ({ visible, onClose, onSelectLayout }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>هەڵبژاردنی نه‌خشەی سڵایدی نوێ 🎨</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {LAYOUT_PRESETS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.card}
                  onPress={() => onSelectLayout(item)}
                >
                  {/* Visual Layout Miniature */}
                  <View style={styles.miniCanvas}>
                    {item.key === 'title' && (
                      <View style={styles.miniTitleBox}>
                        <View style={[styles.miniBar, { width: '70%', height: 6, backgroundColor: '#D24726' }]} />
                        <View style={[styles.miniBar, { width: '50%', height: 4, backgroundColor: '#888', marginTop: 6 }]} />
                      </View>
                    )}
                    {item.key === 'title_text' && (
                      <View style={styles.miniTitleTextBox}>
                        <View style={[styles.miniBar, { width: '80%', height: 5, backgroundColor: '#D24726' }]} />
                        <View style={[styles.miniBar, { width: '90%', height: 3, backgroundColor: '#aaa', marginTop: 5 }]} />
                        <View style={[styles.miniBar, { width: '85%', height: 3, backgroundColor: '#aaa', marginTop: 3 }]} />
                        <View style={[styles.miniBar, { width: '70%', height: 3, backgroundColor: '#aaa', marginTop: 3 }]} />
                      </View>
                    )}
                    {item.key === 'image_text' && (
                      <View style={styles.miniRow}>
                        <View style={styles.miniImgBlock} />
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={[styles.miniBar, { width: '90%', height: 4, backgroundColor: '#D24726' }]} />
                          <View style={[styles.miniBar, { width: '80%', height: 3, backgroundColor: '#aaa' }]} />
                          <View style={[styles.miniBar, { width: '70%', height: 3, backgroundColor: '#aaa' }]} />
                        </View>
                      </View>
                    )}
                    {item.key === 'full_image' && (
                      <View style={styles.miniFullImgBlock} />
                    )}
                    {item.key === 'two_images' && (
                      <View style={styles.miniRow}>
                        <View style={styles.miniImgBlock} />
                        <View style={styles.miniImgBlock} />
                      </View>
                    )}
                    {item.key === 'blank' && (
                      <View style={styles.miniBlankBlock} />
                    )}
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  card: {
    width: '48%',
    backgroundColor: '#2c2c2e',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  miniCanvas: {
    width: '100%',
    height: 75,
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
  miniTitleTextBox: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  miniRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    gap: 6,
    alignItems: 'center',
  },
  miniImgBlock: {
    flex: 1,
    height: '100%',
    backgroundColor: '#3a3a3c',
    borderRadius: 4,
  },
  miniFullImgBlock: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3a3a3c',
    borderRadius: 4,
  },
  miniBlankBlock: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  miniBar: {
    borderRadius: 2,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
