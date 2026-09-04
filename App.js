import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>پێویستمان بە ڕێگەدانی کامێرایە</Text>
          <TouchableOpacity style={styles.mainButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>ڕێگە بدە</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const result = await cameraRef.current.takePictureAsync();
        setCurrentPhoto(result.uri);
      } catch (error) {
        console.log("Error taking picture:", error);
      }
    }
  }

  function retake() {
    setCurrentPhoto(null);
  }

  function acceptAndContinue() {
    if (currentPhoto) {
      setPhotos([...photos, currentPhoto]);
      setCurrentPhoto(null);
    }
  }

  function deletePhoto(index) {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  }

  if (currentPhoto) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: currentPhoto }} style={styles.preview} />
        <View style={styles.reviewButtonsContainer}>
          <TouchableOpacity style={styles.buttonSecondary} onPress={retake}>
            <Text style={styles.buttonText}>دووبارە بگرەوە</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonPrimary} onPress={acceptAndContinue}>
            <Text style={styles.buttonText}>بەردەوامبە</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {photos.length > 0 ? (
          <View style={styles.thumbStrip}>
            <FlatList
              data={photos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity onLongPress={() => deletePhoto(index)}>
                  <Image source={{ uri: item }} style={styles.thumb} />
                </TouchableOpacity>
              )}
            />
            <Text style={styles.countText}>{photos.length} وێنە</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.bottomControlsContainer}>
          {photos.length > 0 && (
            <TouchableOpacity style={styles.doneButton} onPress={() => alert('ئەپەکە ئامادەیە!')}>
              <Text style={styles.doneButtonText}>تەواو ({photos.length})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.captureButtonOuter} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  camera: { 
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  thumbStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 15,
  },
  thumb: {
    width: 45,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  countText: { 
    color: '#fff', 
    marginLeft: 10, 
    fontWeight: 'bold',
    fontSize: 14 
  },
  bottomControlsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 25,
    justifyContent: 'flex-end',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  doneButton: {
    marginBottom: 15,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 5,
  },
  doneButtonText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16 
  },
  preview: { 
    flex: 1, 
    resizeMode: 'contain' 
  },
  reviewButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#000',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  buttonSecondary: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    textAlign: 'center' 
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: { 
    textAlign: 'center', 
    color: '#fff', 
    fontSize: 16,
    marginBottom: 20 
  },
  mainButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  }
});