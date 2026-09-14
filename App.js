import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  FlatList,
  SafeAreaView,
  Alert,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');
const itemSize = (width - 40) / 2;

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfName, setPdfName] = useState('Document');
  const [modalVisible, setModalVisible] = useState(false);

  // سکانکردنی پەڕە بە شێوازی CamScanner (بڕینەوەی خۆکار و دەستکاری قەراغەکان)
  async function scanDocument() {
    try {
      setLoading(true);
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 10,
        responseType: 'imageFilePath',
        letUserAdjustCrop: true,
      });

      if (scannedImages && scannedImages.length > 0) {
        setPhotos((prevPhotos) => [...prevPhotos, ...scannedImages]);
      }
    } catch (error) {
      console.log('Error scanning document:', error);
      Alert.alert('هەڵە', 'نەتوانرا پرۆسەی سکانکردن ئەنجام بدرێت');
    } finally {
      setLoading(false);
    }
  }

  // هەڵبژاردنی وێنە لە گەلەرییەوە
  async function pickImageFromGallery() {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map((asset) => asset.uri);
        setPhotos((prevPhotos) => [...prevPhotos, ...uris]);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('هەڵە', 'نەتوانرا وێنە لە گەلەری هەڵبژێردرێت');
    }
  }

  // سڕینەوەی وێنە بە کلیککردنی درێژ
  function confirmDeletePhoto(index) {
    Alert.alert(
      'سڕینەوەی وێنە',
      'ئایا دڵنیایت لە سڕینەوەی ئەم پەڕەیە؟',
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بەڵێ، بسڕەوە',
          style: 'destructive',
          onPress: () => {
            setPhotos((prevPhotos) => prevPhotos.filter((_, i) => i !== index));
          },
        },
      ]
    );
  }

  // دروستکردنی فایلی PDF
  async function savePdf() {
    if (photos.length === 0) {
      Alert.alert('هیچ وێنەیەک نییە', 'سەرەتا تکایە پەڕەیەک سکان بکە یان زیاد بکە');
      return;
    }

    try {
      setLoading(true);
      let imagesHtml = '';

      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i];
        try {
          const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
          const base64 = await FileSystem.readAsStringAsync(cleanUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          imagesHtml += `<div style="page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;"><img src="data:image/jpeg;base64,${base64}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>`;
        } catch (e) {
          imagesHtml += `<div style="page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;"><img src="${uri}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>`;
        }
      }

      const html = `<html><body style="margin:0;padding:0;background-color:#ffffff;">${imagesHtml}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });

      setModalVisible(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${pdfName}.pdf`,
        });
      } else {
        Alert.alert('سەرکەوتوو بوو', 'فایلەکە دروستکرا لە: ' + uri);
      }
    } catch (error) {
      console.log('Error creating PDF:', error);
      Alert.alert('هەڵە', 'نەتوانرا فایلی PDF دروست بکرێت');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سکانەری بەڵگەنامە (CamScanner)</Text>
        <Text style={styles.headerSubtitle}>پەڕەکان: {photos.length}</Text>
      </View>

      {photos.length > 0 ? (
        <FlatList
          data={photos}
          numColumns={2}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.thumbContainer}
              onLongPress={() => confirmDeletePhoto(index)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item }} style={styles.thumb} />
              <View style={styles.deleteBadge}>
                <Text style={styles.deleteBadgeText}>✕</Text>
              </View>
              <Text style={styles.pageNumber}>پەڕەی {index + 1}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyText}>هیچ بەڵگەنامەیەک نییە{'\n'}لە ڕێگەی سکانەر یان گەلەرییەوە پەڕە زیاد بکە</Text>
        </View>
      )}

      {/* دوگمەکانی خوارەوە */}
      <View style={styles.bottomControlsContainer}>
        {photos.length > 0 && (
          <TouchableOpacity 
            style={[styles.button, styles.doneButton]} 
            onPress={() => setModalVisible(true)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>دروستکردنی PDF 📄</Text>
          </TouchableOpacity>
        )}

        <View style={styles.rowButtons}>
          <TouchableOpacity 
            style={[styles.smallButton, styles.scanButton]} 
            onPress={scanDocument}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📷 سکانکردن</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.smallButton, styles.galleryButton]} 
            onPress={pickImageFromGallery}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🖼️ گەلەری</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* پەنجەرەی ناونانی PDF */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ناوی فایلی PDF بنووسە</Text>
            <TextInput
              style={styles.input}
              value={pdfName}
              onChangeText={setPdfName}
              placeholder="ناوی فایل..."
              placeholderTextColor="#888"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={savePdf}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'خەریکە...' : 'تەواو و پاشەکەوت'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  grid: {
    padding: 10,
  },
  thumbContainer: {
    width: itemSize,
    height: itemSize * 1.4,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  thumb: {
    width: '100%',
    height: '85%',
    resizeMode: 'cover',
  },
  deleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pageNumber: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomControlsContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  doneButton: {
    backgroundColor: '#34C759',
  },
  scanButton: {
    backgroundColor: '#007AFF',
  },
  galleryButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#121212',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 20,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#555',
  },
  confirmBtn: {
    backgroundColor: '#34C759',
  },
});