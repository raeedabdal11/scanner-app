import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  FlatList,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Linking,
  Clipboard,
  PanResponder,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentScanner from 'react-native-document-scanner-plugin';
import ImagePicker from 'react-native-image-crop-picker';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { inpaintImage } from './inpaint';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { processAndSaveSignatureImage, mergeSignatures, recolorSignature } from './signatureHelper';
import SignatureCropper from './SignatureCropper';
import { performOnDeviceOCR } from './ocrHelper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { PptEditorModal } from './ppt';

// Firebase Setup
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA0xGTOWPRykyjoPAJ4sno5ydzAeDa3Paw",
  authDomain: "scanner-vip.firebaseapp.com",
  databaseURL: "https://scanner-vip-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "scanner-vip",
  storageBucket: "scanner-vip.appspot.com",
  messagingSenderId: "559439968239",
  appId: "1:559439968239:web:66eb33d5110d0b7eb8e81a"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const { width, height } = Dimensions.get('window');

const SIGNATURE_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Pen Blue', hex: '#0B2E8A' },
  { name: 'Blue', hex: '#1565C0' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Red', hex: '#C62828' },
  { name: 'Dark Red', hex: '#7F0000' },
  { name: 'Green', hex: '#1B5E20' },
  { name: 'Purple', hex: '#4A148C' },
  { name: 'Brown', hex: '#4E342E' },
  { name: 'Gray', hex: '#424242' },
  { name: 'Gold', hex: '#B8860B' },
  { name: 'White', hex: '#FFFFFF' },
];

// --- Global Helper Components ---
const ToolIcon = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.toolItem} onPress={onPress}>
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      {typeof icon === 'string' ? (
        <Text style={{fontSize: 24}}>{icon}</Text>
      ) : (
        icon
      )}
    </View>
    <Text style={styles.toolLabel}>{label}</Text>
  </TouchableOpacity>
);

const BenefitItem = ({ icon, label, sub }) => (
  <View style={styles.benefitItem}>
     <View style={styles.benefitIconBox}><Text style={{fontSize: 20}}>{icon}</Text></View>
     <Text style={styles.benefitLabel}>{label}</Text>
     <Text style={styles.benefitSub}>{sub}</Text>
  </View>
);

const SettingItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
     <Text style={{color: '#ccc', fontSize: 18}}>〉</Text>
     <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text style={styles.settingLabel}>{label}</Text>
        <View style={styles.settingIconBox}><Text style={{fontSize: 18}}>{icon}</Text></View>
     </View>
  </TouchableOpacity>
);

export default function App() {
  const [fontsLoaded] = useFonts({
    Dtpkn0ms: require('./assets/font/Dtpkn0ms.ttf'),
    Dtpkn0s: require('./assets/font/Dtpkn0s.ttf'),
    Dtpkn0sn: require('./assets/font/Dtpkn0sn.ttf'),
    PgKnask: require('./assets/font/PgKnask.ttf'),
    Pgdnaskh: require('./assets/font/Pgdnaskh.ttf'),
    ShBaibwnKurdish: require('./assets/font/ShBaibwnKurdish.ttf'),
    ShBnaushKurdish: require('./assets/font/ShBnaushKurdish.ttf'),
    ShHalalaKurdish: require('./assets/font/ShHalalaKurdish.ttf'),
    ShHeroKurdish: require('./assets/font/ShHeroKurdish.ttf'),
    ShKhaldarKurdish: require('./assets/font/ShKhaldarKurdish.ttf'),
    ShKhunchaKurdish: require('./assets/font/ShKhunchaKurdish.ttf'),
    ShKnerKurdish: require('./assets/font/ShKnerKurdish.ttf'),
    ShNergzKurdish: require('./assets/font/ShNergzKurdish.ttf'),
    ShReihanKurdish: require('./assets/font/ShReihanKurdish.ttf'),
    ShSamikKurdish: require('./assets/font/ShSamikKurdish.ttf'),
    ShSharifKurdish: require('./assets/font/ShSharifKurdish.ttf'),
    ShShamamKurdish: require('./assets/font/ShShamamKurdish.ttf'),
    ShShilanKurdish: require('./assets/font/ShShilanKurdish.ttf'),
    ShShlerKurdish: require('./assets/font/ShShlerKurdish.ttf'),
    ShSunbulKurdish: require('./assets/font/ShSunbulKurdish.ttf'),
    ShSusanKurdish: require('./assets/font/ShSusanKurdish.ttf'),
    ShYasmeenKurdish: require('./assets/font/ShYasmeenKurdish.ttf'),
  });

  // --- States ---
  const [currentScreen, setCurrentScreen] = useState('home');
  const [documents, setDocuments] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [freeUseCount, setFreeUseCount] = useState(0);

  const [vipModalVisible, setVipModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [idModalVisible, setIdModalVisible] = useState(false);
  const [transModalVisible, setTransModalVisible] = useState(false);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [passInputVisible, setPassInputVisible] = useState(false);

  const [selectedHomeDoc, setSelectedHomeDoc] = useState(null);
  const [homeDocMenuVisible, setHomeDocMenuVisible] = useState(false);

  const [secretCode, setSecretCode] = useState('');
  const [idCategory, setIdCategory] = useState('ناسنامە');
  const [transInput, setTransInput] = useState('');
  const [transOutput, setTransOutput] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [ocrText, setOcrText] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetDoc, setTargetDoc] = useState(null);
  const [enteredPass, setPassToCheck] = useState('');

  // Smart Local Inpaint Erase Logic States
  const [eraseImage, setEraseImage] = useState(null);
  const [imageHistory, setImageHistory] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [brushSize, setBrushSize] = useState(30);
  const [inpainting, setInpainting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [eraseProgress, setEraseProgress] = useState({ current: 0, total: 0 });
  const [imageLayout, setImageLayout] = useState({ width: width, height: height * 0.6 });
  const [imageNatSize, setImageNatSize] = useState({ width: 1000, height: 1000 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const eraseImageRef = useRef(null);
  const imageLayoutRef = useRef({ width: width, height: height * 0.6 });
  const imageNatSizeRef = useRef({ width: 1000, height: 1000 });
  const brushSizeRef = useRef(30);
  const inpaintingRef = useRef(false);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const gestureTypeRef = useRef(null);
  const initialPinchDistanceRef = useRef(null);
  const initialZoomRef = useRef(1);
  const initialPinchCenterRef = useRef(null);
  const initialPanRef = useRef({ x: 0, y: 0 });
  const drawTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0 });

  // Signature Feature States & 3 New Features (Crop, Colors, Rotate)
  const [signingDoc, setSigningDoc] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [savedSignatures, setSavedSignatures] = useState([]);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [sigStrokes, setSigStrokes] = useState([]);
  const [sigCurrentStroke, setSigCurrentStroke] = useState([]);
  const [sigColor, setSigColor] = useState('#000000');
  const [sigThickness, setSigThickness] = useState(4);
  const [signingLayout, setSigningLayout] = useState({ width: width, height: height * 0.6 });
  const sigViewShotRef = useRef(null);

  const [activeSigId, setActiveSigId] = useState(null);
  const [activeSigColorPicker, setActiveSigColorPicker] = useState(null);
  const [lastChosenColor, setLastChosenColor] = useState('#000000');
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [croppingSig, setCroppingSig] = useState(null);
  const [cropRect, setCropRect] = useState({ x: 20, y: 20, width: 250, height: 150 });
  const [sigNatSize, setSigNatSize] = useState({ width: 500, height: 300 });
  const [activePanel, setActivePanel] = useState(null);

  // On-Device OCR States
  const [ocrImageUri, setOcrImageUri] = useState(null);
  const [ocrLang, setOcrLang] = useState('ckb');
  const [ocrProgressText, setOcrProgressText] = useState('');
  const [ocrProcessing, setOcrProcessing] = useState(false);

  // PPT Tool State
  const [pptEditorVisible, setPptEditorVisible] = useState(false);

  useEffect(() => { eraseImageRef.current = eraseImage; }, [eraseImage]);
  useEffect(() => { imageLayoutRef.current = imageLayout; }, [imageLayout]);
  useEffect(() => { imageNatSizeRef.current = imageNatSize; }, [imageNatSize]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { inpaintingRef.current = inpainting; }, [inpainting]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { currentStrokeRef.current = currentStroke; }, [currentStroke]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const savedDocs = await AsyncStorage.getItem('saved_documents');
      if (savedDocs) setDocuments(JSON.parse(savedDocs));
      const vipStatus = await AsyncStorage.getItem('is_vip');
      if (vipStatus === 'true') setIsVip(true);
      const count = await AsyncStorage.getItem('free_use_count');
      if (count) setFreeUseCount(parseInt(count));
      await AsyncStorage.removeItem('ppt_active_state');
    } catch (e) {}
  };

  const resetVipStatus = async () => {
    setIsVip(false);
    setFreeUseCount(0);
    await AsyncStorage.setItem('is_vip', 'false');
    await AsyncStorage.setItem('free_use_count', '0');
    Alert.alert("زانیاری", "باری VIP لادرا ✅");
  };

  const checkPremiumLimit = async () => {
    if (isVip) return true;
    if (freeUseCount < 2) {
      const newCount = freeUseCount + 1;
      setFreeUseCount(newCount);
      await AsyncStorage.setItem('free_use_count', newCount.toString());
      return true;
    }
    setVipModalVisible(true);
    return false;
  };

  // --- Document Export Helpers ---
  const getDocumentRealFile = async (doc) => {
    if (!doc) throw new Error("بەڵگەنامە نەدۆزرایەوە.");

    const isPpt = doc.type === 'ppt' || doc.name?.toLowerCase().includes('ppt');
    const isTextDoc = doc.type === 'text' || (doc.pages && doc.pages.length > 0 && typeof doc.pages[0] === 'object' && doc.pages[0]?.type === 'text');

    const cleanName = (doc.name || 'document').replace(/[/\\?%*:|"<>]/g, '_');

    if (isTextDoc) {
      const fullText = doc.pages
        .map(p => (typeof p === 'object' && p?.text ? p.text : String(p)))
        .join('\n\n');
      const filename = cleanName.endsWith('.txt') ? cleanName : `${cleanName}.txt`;
      const cacheUri = `${FileSystem.cacheDirectory}${Date.now()}_${filename}`;
      await FileSystem.writeAsStringAsync(cacheUri, fullText, { encoding: FileSystem.EncodingType.UTF8 });
      return {
        fileUri: cacheUri,
        filename: filename,
        mimeType: 'text/plain',
        extension: 'txt'
      };
    }

    if (isPpt) {
      const mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      let fileUri = doc.fileUri || doc.uri;
      if (!fileUri && doc.pages && doc.pages.length > 0) {
        fileUri = typeof doc.pages[0] === 'string' ? doc.pages[0] : doc.pages[0]?.uri;
      }
      const ext = fileUri?.toLowerCase().endsWith('.ppt') ? 'ppt' : 'pptx';
      const filename = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;
      return {
        fileUri,
        filename,
        mimeType: mime,
        extension: ext
      };
    }

    if (doc.fileUri || doc.pdfUri) {
      const fileUri = doc.fileUri || doc.pdfUri;
      const isPdf = fileUri.toLowerCase().endsWith('.pdf');
      const ext = isPdf ? 'pdf' : (fileUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg');
      const mime = isPdf ? 'application/pdf' : (ext === 'png' ? 'image/png' : 'image/jpeg');
      const filename = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;
      return { fileUri, filename, mimeType: mime, extension: ext };
    }

    if (doc.pages && doc.pages.length === 1 && typeof doc.pages[0] === 'string') {
      const imgUri = doc.pages[0];
      const isPng = imgUri.toLowerCase().endsWith('.png');
      const ext = isPng ? 'png' : 'jpg';
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const filename = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;
      return { fileUri: imgUri, filename, mimeType: mime, extension: ext };
    }

    if (doc.pages && doc.pages.length > 0) {
      const htmlPages = doc.pages.map(p => {
        const imgUri = typeof p === 'string' ? p : p?.uri;
        return `<div style="page-break-after:always; height:100vh; display:flex; justify-content:center; align-items:center;"><img src="${imgUri}" style="max-width:100%; max-height:100%; object-fit:contain;" /></div>`;
      }).join('');
      const htmlContent = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:#fff;}</style></head><body>${htmlPages}</body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      const filename = cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
      return {
        fileUri: pdfUri,
        filename,
        mimeType: 'application/pdf',
        extension: 'pdf'
      };
    }

    throw new Error("فایلەکە نەدۆزرایەوە یان هیچ پەڕەیەکی تێدا نییە.");
  };

  const handleShareDoc = async (doc) => {
    try {
      const { fileUri, mimeType } = await getDocumentRealFile(doc);
      if (!fileUri) {
        Alert.alert("هەڵە", "فایلەکە نەدۆزرایەوە.");
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("ئاگاداری", "سیستەمی هاوبەشکردن لەسەر ئەم ئامێرە ئامادە نییە.");
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType });
    } catch (err) {
      console.log('[Home Export] Share error:', err);
      Alert.alert("هەڵە", "کێشەیەک ڕوویدا لە کاتی هاوبەشکردنی فایلەکە.");
    }
  };

  const handleSaveToPhoneDoc = async (doc) => {
    try {
      const { fileUri, filename, mimeType } = await getDocumentRealFile(doc);
      if (!fileUri) {
        Alert.alert("هەڵە", "فایلەکە نەدۆزرایەوە.");
        return;
      }

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          return;
        }

        const fileData = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          mimeType
        );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(createdUri, fileData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Alert.alert("سەرکەوتوو", "فایلەکە بە سەرکەوتوویی لە مۆبایلەکەدا پاشەکەوت کرا ✅");
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert("ئاگاداری", "سیستەمی هاوبەشکردن لەسەر ئەم ئامێرە ئامادە نییە.");
          return;
        }
        await Sharing.shareAsync(fileUri, { mimeType, UTI: mimeType });
        Alert.alert("سەرکەوتوو", "فایلەکە بە سەرکەوتوویی بۆ فایلەکانی مۆبایل ڕەوانە کرا ✅");
      }
    } catch (err) {
      console.log('[Home Export] Save to Phone error:', err);
      Alert.alert("هەڵە", "کێشەیەک ڕوویدا لە کاتی پاشەکەوتکردنی فایلەکە لەسەر مۆبایل.");
    }
  };

  // --- Handlers ---
  const startScan = async () => {
    try {
      const res = await DocumentScanner.scanDocument({ maxNumDocuments: 10, responseType: 'imageFilePath', letUserAdjustCrop: true });
      if (res.scannedImages?.length > 0) {
        const newDoc = {id: Date.now().toString(), name: "سکان_" + Date.now(), date: new Date().toLocaleDateString(), pages: res.scannedImages, thumbnail: res.scannedImages[0], password: ''};
        setDocuments([newDoc, ...documents]);
        await AsyncStorage.setItem('saved_documents', JSON.stringify([newDoc, ...documents]));
        setEditingDoc(newDoc);
        setCurrentScreen('edit');
      }
    } catch (e) {}
  };

  const startIDScan = async () => {
    setIdModalVisible(false);
    const needsTwoSides = idCategory === 'ناسنامە' || idCategory === 'مۆڵەت' || idCategory === 'کارتی بانکی';
    try {
      const frontRes = await DocumentScanner.scanDocument({ maxNumDocuments: 1, responseType: 'imageFilePath', letUserAdjustCrop: true });
      if (frontRes.scannedImages?.length > 0) {
        if (needsTwoSides) {
          Alert.alert("قۆناغی دووەم", "تکایە ئێستا وێنەی پشتەوە بگرە", [
            { text: "باشە", onPress: async () => {
              const backRes = await DocumentScanner.scanDocument({ maxNumDocuments: 1, responseType: 'imageFilePath', letUserAdjustCrop: true });
              if (backRes.scannedImages?.length > 0) saveIDDoc([frontRes.scannedImages[0], backRes.scannedImages[0]]);
            }}
          ]);
        } else { saveIDDoc([frontRes.scannedImages[0]]); }
      }
    } catch (e) {}
  };

  const saveIDDoc = async (pages) => {
    const newIdDoc = { id: Date.now().toString(), name: idCategory + "_" + Date.now(), date: new Date().toLocaleDateString(), pages: pages, thumbnail: pages[0], password: '', type: 'id_card' };
    const updatedDocs = [newIdDoc, ...documents];
    setDocuments(updatedDocs);
    await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
    Alert.alert("سەرکەوتوو", "ناسنامەکە پاشەکەوت کرا ✅");
  };

  const handleOCR = async () => {
    if (!(await checkPremiumLimit())) return;
    setToolsModalVisible(false);

    Alert.alert(
      "خوێنەرەوەی دەق (OCR)",
      "تکایە سەرچاوەی وێنەکە هەڵبژێرە:",
      [
        {
          text: "کامێرا 📷",
          onPress: () => pickImageForOCR(true),
        },
        {
          text: "گالێری 🖼️",
          onPress: () => pickImageForOCR(false),
        },
        {
          text: "پاشگەزبوونەوە",
          style: "cancel",
        },
      ]
    );
  };

  const pickImageForOCR = async (useCamera) => {
    try {
      let imageUri = null;

      try {
        if (useCamera) {
          const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
          if (permission.granted) {
            const res = await ExpoImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 1,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              imageUri = res.assets[0].uri;
            }
          }
        } else {
          const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
          if (permission.granted) {
            const res = await ExpoImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 1,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              imageUri = res.assets[0].uri;
            }
          }
        }
      } catch (expoErr) {
        console.log("ExpoImagePicker error/fallback:", expoErr);
      }

      if (!imageUri) {
        const options = {
          cropping: true,
          freeStyleCropEnabled: true,
          enableRotationGesture: true,
          compressImageQuality: 1,
        };

        const image = useCamera
          ? await ImagePicker.openCamera(options)
          : await ImagePicker.openPicker(options);

        if (image && image.path) {
          imageUri = image.path;
        }
      }

      if (!imageUri) return;

      // Crop screen to allow user to crop out faces, logos, and background noise
      try {
        const cropped = await ImagePicker.openCropper({
          path: imageUri.startsWith('file://') ? imageUri : 'file://' + imageUri,
          freeStyleCropEnabled: true,
          enableRotationGesture: true,
          compressImageQuality: 1,
        });
        if (cropped && cropped.path) {
          imageUri = cropped.path;
        }
      } catch (cropCancel) {
        console.log("Crop screen cancelled or bypassed, using initial image.");
      }

      setOcrImageUri(imageUri);
      setOcrText('');
      setOcrModalVisible(true);
      startOCRRecognition(imageUri, ocrLang);
    } catch (e) {
      console.log("OCR Image Picker cancelled or error:", e);
    }
  };

  const recropImageForOCR = async () => {
    if (!ocrImageUri) return;
    try {
      const cropped = await ImagePicker.openCropper({
        path: ocrImageUri.startsWith('file://') ? ocrImageUri : 'file://' + ocrImageUri,
        freeStyleCropEnabled: true,
        enableRotationGesture: true,
        compressImageQuality: 1,
      });

      if (cropped && cropped.path) {
        setOcrImageUri(cropped.path);
        setOcrText('');
        startOCRRecognition(cropped.path, ocrLang);
      }
    } catch (e) {
      console.log("Recrop cancelled:", e);
    }
  };

  const startOCRRecognition = async (imgUri = ocrImageUri, lang = ocrLang) => {
    if (!imgUri) return;
    try {
      setOcrProcessing(true);
      const text = await performOnDeviceOCR(imgUri, lang, (status) => {
        setOcrProgressText(status);
      });
      if (text && text.trim().length > 0) {
        setOcrText(text);
      } else {
        setOcrText('');
        Alert.alert("زانیاری", "هیچ دەقێک نەدۆزرایەوە. تکایە وێنەیەکی ڕوونتر بگرە و تەنها دەقەکە ببڕە");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      Alert.alert("هەڵە", "نەتوانرا خوێندنەوەی دەق ئەنجام بپڕێدرێت: " + (err?.message || err));
    } finally {
      setOcrProcessing(false);
      setOcrProgressText('');
    }
  };

  const handleSignature = async () => {
    if (!(await checkPremiumLimit())) return;
    setToolsModalVisible(false);
    try {
      const res = await ExpoImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) {
        const docUri = res.assets[0].uri;
        setSigningDoc({
          id: Date.now().toString(),
          name: "واژۆکراو_" + Date.now(),
          date: new Date().toLocaleDateString(),
          pages: [docUri],
          thumbnail: docUri,
          password: ''
        });
        setSignatures([]);
        const saved = await AsyncStorage.getItem('saved_signatures');
        if (saved) {
          setSavedSignatures(JSON.parse(saved));
        } else {
          setSavedSignatures([]);
        }
        setCurrentScreen('signing');
      }
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا وێنە هەڵبژێردرێت");
    }
  };

  const saveAndUseSignature = async (sigUri) => {
    const updatedSaved = [sigUri, ...savedSignatures];
    setSavedSignatures(updatedSaved);
    await AsyncStorage.setItem('saved_signatures', JSON.stringify(updatedSaved));

    let uriToUse = sigUri;
    if (lastChosenColor !== '#000000') {
      uriToUse = await recolorSignature(sigUri, lastChosenColor);
    }

    const newSig = {
      id: Date.now().toString(),
      uri: uriToUse,
      x: (signingLayout.width / 2) - 75,
      y: (signingLayout.height / 2) - 50,
      width: 150,
      height: 100,
      baseWidth: 150,
      baseHeight: 100,
      rotation: 0,
      color: lastChosenColor,
      opacity: 1.0,
    };
    setSignatures(prev => [...prev, newSig]);
    setSignatureModalVisible(false);
    setSigStrokes([]);
  };

  const cropBoxStartRectRef = useRef({ x: 20, y: 20, width: 250, height: 150 });

  const createCropHandlePanResponder = (handleType) => {
    let startX = 0, startY = 0, startW = 0, startH = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startX = cropRect.x;
        startY = cropRect.y;
        startW = cropRect.width;
        startH = cropRect.height;
      },
      onPanResponderMove: (evt, gs) => {
        const containerW = width * 0.85;
        const containerH = 280;
        const minSize = 40;

        setCropRect(() => {
          let x = startX;
          let y = startY;
          let w = startW;
          let h = startH;

          if (handleType.includes('l')) {
            const newX = Math.max(0, Math.min(startX + startW - minSize, startX + gs.dx));
            w = startW + (startX - newX);
            x = newX;
          }
          if (handleType.includes('r')) {
            w = Math.max(minSize, Math.min(containerW - startX, startW + gs.dx));
          }
          if (handleType.includes('t')) {
            const newY = Math.max(0, Math.min(startY + startH - minSize, startY + gs.dy));
            h = startH + (startY - newY);
            y = newY;
          }
          if (handleType.includes('b')) {
            h = Math.max(minSize, Math.min(containerH - startY, startH + gs.dy));
          }

          return { x, y, width: w, height: h };
        });
      },
      onPanResponderRelease: () => {},
    });
  };

  const openCropModal = (sig) => {
    setCroppingSig(sig);
    const containerW = width * 0.85;
    const containerH = 280;
    Image.getSize(sig.uri, (w, h) => {
      setSigNatSize({ width: w, height: h });
      setCropRect({ x: 20, y: 20, width: containerW - 40, height: containerH - 40 });
    }, () => {
      setSigNatSize({ width: 500, height: 300 });
      setCropRect({ x: 20, y: 20, width: containerW - 40, height: containerH - 40 });
    });
    setCropModalVisible(true);
  };

  const handleApplyCrop = async () => {
    if (!croppingSig) return;
    try {
      const containerW = width * 0.85;
      const containerH = 280;
      const scaleX = sigNatSize.width / containerW;
      const scaleY = sigNatSize.height / containerH;

      const originX = Math.max(0, Math.floor(cropRect.x * scaleX));
      const originY = Math.max(0, Math.floor(cropRect.y * scaleY));
      const cropW = Math.min(sigNatSize.width - originX, Math.floor(cropRect.width * scaleX));
      const cropH = Math.min(sigNatSize.height - originY, Math.floor(cropRect.height * scaleY));

      if (cropW > 10 && cropH > 10) {
        const manip = await ImageManipulator.manipulateAsync(
          croppingSig.uri,
          [{ crop: { originX, originY, width: cropW, height: cropH } }],
          { format: ImageManipulator.SaveFormat.PNG, base64: true }
        );
        if (manip.uri) {
          setSignatures(prev => prev.map(s => s.id === croppingSig.id ? { ...s, uri: manip.uri } : s));
        }
      }
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا واژۆ بڕدرێت");
    } finally {
      setCropModalVisible(false);
      setCroppingSig(null);
    }
  };

  const handleFinishDrawingSignature = async () => {
    try {
      if (sigStrokes.length === 0) {
        Alert.alert("هەڵە", "تکایە سەرەتا واژۆ بکە");
        return;
      }
      const uri = await sigViewShotRef.current.capture();
      if (uri) {
        await saveAndUseSignature(uri);
      }
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا واژۆ تۆمار بکرێت");
    }
  };

  const handleImportSignatureImage = async () => {
    try {
      const res = await ExpoImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) {
        const processedUri = await processAndSaveSignatureImage(res.assets[0].uri);
        if (processedUri) {
          await saveAndUseSignature(processedUri);
        }
      }
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا وێنەی واژۆ بهێنرێت");
    }
  };

  const finishSigning = async () => {
    if (!signingDoc) return;
    try {
      setLoading(true);
      const finalUri = await mergeSignatures(
        signingDoc.pages[0],
        signatures,
        signingLayout.width,
        signingLayout.height
      );

      const completedDoc = {
        ...signingDoc,
        pages: [finalUri],
        thumbnail: finalUri
      };

      const updatedDocs = [completedDoc, ...documents];
      setDocuments(updatedDocs);
      await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
      Alert.alert("سەرکەوتوو", "واژۆ و پاشەکەوت کردن سەرکەوتوو بوو ✅");
      setCurrentScreen('home');
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا واژۆکان تێکەڵ ببن");
    } finally {
      setLoading(false);
    }
  };

  const renderSigStroke = (pts, key, color, thickness) => {
    if (!pts || pts.length === 0) return null;
    return (
      <React.Fragment key={key}>
        {pts.map((pt, i) => (
          <View
            key={`spt-${key}-${i}`}
            style={{
              position: 'absolute',
              left: pt.x - thickness / 2,
              top: pt.y - thickness / 2,
              width: thickness,
              height: thickness,
              borderRadius: thickness / 2,
              backgroundColor: color,
            }}
          />
        ))}
        {pts.map((pt, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1];
          const dx = pt.x - prev.x;
          const dy = pt.y - prev.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) return null;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const cx = (prev.x + pt.x) / 2;
          const cy = (prev.y + pt.y) / 2;
          return (
            <View
              key={`sseg-${key}-${i}`}
              style={{
                position: 'absolute',
                left: cx - dist / 2,
                top: cy - thickness / 2,
                width: dist,
                height: thickness,
                borderRadius: thickness / 2,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
      </React.Fragment>
    );
  };

  const sigPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setSigCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setSigCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setSigCurrentStroke((current) => {
          if (current.length > 0) {
            setSigStrokes((prev) => [...prev, current]);
          }
          return [];
        });
      },
    })
  ).current;

  const createShapeHandlePanResponder = (handleType, sigItem) => {
    let startX = 0, startY = 0, startW = 0, startH = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startX = sigItem.x;
        startY = sigItem.y;
        startW = sigItem.width;
        startH = sigItem.height;
        setActiveSigId(sigItem.id);
      },
      onPanResponderMove: (evt, gs) => {
        const minW = 25;
        const minH = 20;
        let x = startX;
        let y = startY;
        let w = startW;
        let h = startH;

        if (handleType.includes('l')) {
          const maxDx = startW - minW;
          const dx = Math.min(gs.dx, maxDx);
          x = startX + dx;
          w = startW - dx;
        }
        if (handleType.includes('r')) {
          w = Math.max(minW, startW + gs.dx);
        }
        if (handleType.includes('t')) {
          const maxDy = startH - minH;
          const dy = Math.min(gs.dy, maxDy);
          y = startY + dy;
          h = startH - dy;
        }
        if (handleType.includes('b')) {
          h = Math.max(minH, startH + gs.dy);
        }

        setSignatures(prev => prev.map(s => s.id === sigItem.id ? { ...s, x, y, width: Math.round(w), height: Math.round(h) } : s));
      },
      onPanResponderRelease: () => {},
    });
  };

  const renderSigning = () => {
    return (
      <View style={[styles.flex1, {backgroundColor: '#000'}]} onTouchStart={() => { setActiveSigId(null); setActiveSigColorPicker(null); }}>
        <View style={styles.eraseHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Text style={{color: '#fff', fontSize: 22}}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.eraseTitle}>واژۆکردنی بەڵگە ✍️</Text>
          <TouchableOpacity onPress={finishSigning} style={styles.saveEraseBtn}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>پاشەکەوتکردن</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setSigningLayout({ width: w, height: h });
          }}
        >
          <Image
            source={{ uri: signingDoc?.pages[0] }}
            style={{ width: signingLayout.width, height: signingLayout.height }}
            resizeMode="contain"
          />

          {signatures.map((sig) => {
            const isSelected = activeSigId === sig.id;
            const panResponderSig = PanResponder.create({
              onStartShouldSetPanResponder: () => true,
              onMoveShouldSetPanResponder: () => true,
              onPanResponderGrant: () => {
                setActiveSigId(sig.id);
                setActiveSigColorPicker(null);
              },
              onPanResponderMove: (evt, gs) => {
                setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, x: s.x + gs.dx, y: s.y + gs.dy } : s));
              },
              onPanResponderRelease: () => {},
            });

            return (
              <View
                key={sig.id}
                style={[
                  {
                    position: 'absolute',
                    left: sig.x,
                    top: sig.y,
                    width: sig.width,
                    height: sig.height,
                    opacity: sig.opacity !== undefined ? sig.opacity : 1.0,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#007AFF' : 'rgba(0,122,255,0.4)',
                    backgroundColor: isSelected ? 'rgba(0,122,255,0.05)' : 'transparent',
                    transform: [{ rotate: `${sig.rotation || 0}deg` }]
                  }
                ]}
                {...panResponderSig.panHandlers}
              >
                <Image source={{ uri: sig.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />

                <TouchableOpacity
                  style={{position: 'absolute', top: -16, right: -16, backgroundColor: '#ff3b30', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 35, elevation: 5}}
                  onPress={() => setSignatures(prev => prev.filter(s => s.id !== sig.id))}
                >
                  <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>✕</Text>
                </TouchableOpacity>

                {isSelected && (
                  <>
                    {/* Top Edge Handle (Vertical Top) */}
                    <View
                      style={[styles.shapeHandle, { top: -12, left: '50%', marginLeft: -12 }]}
                      {...createShapeHandlePanResponder('t', sig).panHandlers}
                    >
                      <View style={styles.handleDot} />
                    </View>

                    {/* Bottom Edge Handle (Vertical Bottom) */}
                    <View
                      style={[styles.shapeHandle, { bottom: -12, left: '50%', marginLeft: -12 }]}
                      {...createShapeHandlePanResponder('b', sig).panHandlers}
                    >
                      <View style={styles.handleDot} />
                    </View>

                    {/* Left Edge Handle (Horizontal Left) */}
                    <View
                      style={[styles.shapeHandle, { left: -12, top: '50%', marginTop: -12 }]}
                      {...createShapeHandlePanResponder('l', sig).panHandlers}
                    >
                      <View style={styles.handleDot} />
                    </View>

                    {/* Right Edge Handle (Horizontal Right) */}
                    <View
                      style={[styles.shapeHandle, { right: -12, top: '50%', marginTop: -12 }]}
                      {...createShapeHandlePanResponder('r', sig).panHandlers}
                    >
                      <View style={styles.handleDot} />
                    </View>

                    {/* Top-Left Corner Handle */}
                    <View
                      style={[styles.shapeHandle, { top: -12, left: -12 }]}
                      {...createShapeHandlePanResponder('tl', sig).panHandlers}
                    >
                      <View style={styles.handleDotCorner} />
                    </View>

                    {/* Top-Right Corner Handle */}
                    <View
                      style={[styles.shapeHandle, { top: -12, right: -12 }]}
                      {...createShapeHandlePanResponder('tr', sig).panHandlers}
                    >
                      <View style={styles.handleDotCorner} />
                    </View>

                    {/* Bottom-Left Corner Handle */}
                    <View
                      style={[styles.shapeHandle, { bottom: -12, left: -12 }]}
                      {...createShapeHandlePanResponder('bl', sig).panHandlers}
                    >
                      <View style={styles.handleDotCorner} />
                    </View>

                    {/* Bottom-Right Corner Handle */}
                    <View
                      style={[styles.shapeHandle, { bottom: -12, right: -12 }]}
                      {...createShapeHandlePanResponder('br', sig).panHandlers}
                    >
                      <View style={styles.handleDotCorner} />
                    </View>

                    {/* Directional Resizing Quick Buttons */}
                    <View style={{position: 'absolute', bottom: -28, right: -5, flexDirection: 'row', zIndex: 35, gap: 4}}>
                      <TouchableOpacity
                        style={{backgroundColor: '#007AFF', paddingHorizontal: 7, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', elevation: 4}}
                        onPress={() => setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, height: s.height + 15 } : s))}
                      >
                        <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>+بەرزایی</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{backgroundColor: '#007AFF', paddingHorizontal: 7, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', elevation: 4}}
                        onPress={() => setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, height: Math.max(20, s.height - 15) } : s))}
                      >
                        <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>-بەرزایی</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{backgroundColor: '#34c759', paddingHorizontal: 7, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', elevation: 4}}
                        onPress={() => setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, width: s.width + 15 } : s))}
                      >
                        <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>+پانی</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{backgroundColor: '#34c759', paddingHorizontal: 7, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', elevation: 4}}
                        onPress={() => setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, width: Math.max(25, s.width - 15) } : s))}
                      >
                        <Text style={{color: '#fff', fontSize: 11, fontWeight: 'bold'}}>-پانی</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* ALWAYS SHOW "ADD SIGNATURE" FOOTER */}
        <View style={styles.eraseFooter}>
          <TouchableOpacity
            style={{backgroundColor: '#007AFF', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: signatures.length > 0 ? 10 : 0}}
            onPress={() => setSignatureModalVisible(true)}
          >
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>➕ زیادکردنی ئیمزا / شێوە</Text>
          </TouchableOpacity>

          {/* BOTTOM TOOLBAR WHEN SIGNATURES EXIST */}
          {signatures.length > 0 && (
            <View style={{marginTop: 5}}>

              {activePanel === 'color' && (
                <View style={styles.panelContainer}>
                  <Text style={{color: '#ffd60a', fontSize: 13, fontWeight: 'bold', marginBottom: 6, textAlign: 'right'}}>ڕەنگی مەڕەکەب هەڵبژێرە:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {SIGNATURE_COLORS.map(c => (
                      <TouchableOpacity
                        key={c.hex}
                        style={{width: 35, height: 35, borderRadius: 17.5, backgroundColor: c.hex, margin: 4, borderWidth: 2, borderColor: '#fff'}}
                        onPress={async () => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            setLastChosenColor(c.hex);
                            const recoloredUri = await recolorSignature(targetSig.uri, c.hex);
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, uri: recoloredUri, color: c.hex } : s));
                          }
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {activePanel === 'rotate' && (
                <View style={styles.panelContainer}>
                  <Text style={{color: '#ffd60a', fontSize: 13, fontWeight: 'bold', marginBottom: 6, textAlign: 'right'}}>سوڕاندنەوە (Rotation):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                    <TouchableOpacity
                      style={styles.panelBtn}
                      onPress={() => {
                        const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                        if (targetSig) {
                          setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, rotation: ((s.rotation || 0) - 90 + 360) % 360 } : s));
                        }
                      }}
                    >
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>⟲ ٩٠° چەپ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.panelBtn}
                      onPress={() => {
                        const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                        if (targetSig) {
                          setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s));
                        }
                      }}
                    >
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>⟳ ٩٠° ڕاست</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.panelBtn}
                      onPress={() => {
                        const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                        if (targetSig) {
                          setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, rotation: ((s.rotation || 0) - 15 + 360) % 360 } : s));
                        }
                      }}
                    >
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>⟲ ١٥°</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.panelBtn}
                      onPress={() => {
                        const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                        if (targetSig) {
                          setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, rotation: ((s.rotation || 0) + 15) % 360 } : s));
                        }
                      }}
                    >
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>⟳ ١٥°</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.panelBtn}
                      onPress={() => {
                        const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                        if (targetSig) {
                          setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, rotation: 0 } : s));
                        }
                      }}
                    >
                      <Text style={{color: '#ff3b30', fontWeight: 'bold'}}>ڕێککردنەوە (0°)</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              {activePanel === 'size' && (
                <View style={styles.panelContainer}>
                  <Text style={{color: '#ffd60a', fontSize: 13, fontWeight: 'bold', marginBottom: 8, textAlign: 'right'}}>
                    قەبارە و گۆڕینی ئاسۆیی و ستوونی (Height & Width Scaling):
                  </Text>

                  {/* 1. HEIGHT / VERTICAL CONTROL */}
                  <View style={{marginBottom: 10}}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textAlign: 'right'}}>
                      بەرزایی / Height (ستوونی):
                    </Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                      <TouchableOpacity
                        style={styles.panelBtn}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const newH = Math.max(20, targetSig.height - 15);
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, height: newH } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>➖ کەمکردنی بەرزایی</Text>
                      </TouchableOpacity>

                      <Text style={{color: '#ffd60a', fontSize: 13, fontWeight: 'bold'}}>
                        {Math.round((signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1])?.height || 100)}px
                      </Text>

                      <TouchableOpacity
                        style={styles.panelBtn}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const newH = targetSig.height + 15;
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, height: newH } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>➕ زیادکردنی بەرزایی</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 2. WIDTH / HORIZONTAL CONTROL */}
                  <View style={{marginBottom: 10}}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textAlign: 'right'}}>
                      پانی / Width (ئاسۆیی):
                    </Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                      <TouchableOpacity
                        style={[styles.panelBtn, {backgroundColor: '#34c759'}]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const newW = Math.max(25, targetSig.width - 15);
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, width: newW } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>➖ کەمکردنی پانی</Text>
                      </TouchableOpacity>

                      <Text style={{color: '#34c759', fontSize: 13, fontWeight: 'bold'}}>
                        {Math.round((signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1])?.width || 150)}px
                      </Text>

                      <TouchableOpacity
                        style={[styles.panelBtn, {backgroundColor: '#34c759'}]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const newW = targetSig.width + 15;
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, width: newW } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>➕ زیادکردنی پانی</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3. BOTH / PROPORTIONAL SCALING */}
                  <View style={{marginBottom: 10}}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textAlign: 'right'}}>
                      پێکەوە / Both (هاوسەنگ):
                    </Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                      <TouchableOpacity
                        style={[styles.panelBtn, {backgroundColor: '#5856D6'}]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const ratio = targetSig.width / targetSig.height;
                            const newW = Math.max(25, targetSig.width - 20);
                            const newH = Math.max(20, newW / ratio);
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, width: Math.round(newW), height: Math.round(newH) } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>➖ بچووککردنەوەی هەردوو لا</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.panelBtn, {backgroundColor: '#5856D6'}]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const ratio = targetSig.width / targetSig.height;
                            const newW = targetSig.width + 20;
                            const newH = newW / ratio;
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, width: Math.round(newW), height: Math.round(newH) } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>➕ گەورەکردنی هەردوو لا</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6, paddingTop: 4}}>
                    {[
                      { label: '50%', factor: 0.5 },
                      { label: '75%', factor: 0.75 },
                      { label: '100%', factor: 1.0 },
                      { label: '125%', factor: 1.25 },
                      { label: '150%', factor: 1.5 },
                      { label: '200%', factor: 2.0 },
                    ].map(item => (
                      <TouchableOpacity
                        key={`sig_scale_${item.label}`}
                        style={[styles.panelBtn, {backgroundColor: '#3a3a3c'}]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            const baseW = targetSig.baseWidth || 150;
                            const baseH = targetSig.baseHeight || 100;
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, width: Math.round(baseW * item.factor), height: Math.round(baseH * item.factor) } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {activePanel === 'opacity' && (
                <View style={styles.panelContainer}>
                  <Text style={{color: '#ffd60a', fontSize: 13, fontWeight: 'bold', marginBottom: 6, textAlign: 'right'}}>
                    ڕوونی (Opacity): {Math.round(((signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1])?.opacity ?? 1.0) * 100)}%
                  </Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map(val => (
                      <TouchableOpacity
                        key={`sig_op_${val}`}
                        style={[
                          styles.panelBtn,
                          ((signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1])?.opacity ?? 1.0) === val && {backgroundColor: '#007AFF'}
                        ]}
                        onPress={() => {
                          const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                          if (targetSig) {
                            setSignatures(prev => prev.map(s => s.id === targetSig.id ? { ...s, opacity: val } : s));
                          }
                        }}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>{Math.round(val * 100)}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 5}}>
                <TouchableOpacity style={styles.toolBarItem} onPress={() => {
                  const targetSig = signatures.find(s => s.id === activeSigId) || signatures[signatures.length - 1];
                  if (targetSig) openCropModal(targetSig);
                  setActivePanel(null);
                }}>
                  <Text style={{fontSize: 20}}>✂️</Text>
                  <Text style={styles.toolBarText}>بڕین</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBarItem} onPress={() => setActivePanel(activePanel === 'color' ? null : 'color')}>
                  <Text style={{fontSize: 20}}>🎨</Text>
                  <Text style={styles.toolBarText}>ڕەنگ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBarItem} onPress={() => setActivePanel(activePanel === 'rotate' ? null : 'rotate')}>
                  <Text style={{fontSize: 20}}>🔄</Text>
                  <Text style={styles.toolBarText}>سوڕانەوە</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBarItem} onPress={() => setActivePanel(activePanel === 'size' ? null : 'size')}>
                  <Text style={{fontSize: 20}}>📏</Text>
                  <Text style={styles.toolBarText}>قەبارە</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBarItem} onPress={() => setActivePanel(activePanel === 'opacity' ? null : 'opacity')}>
                  <Text style={{fontSize: 20}}>💧</Text>
                  <Text style={styles.toolBarText}>ڕوونی</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleLock = async () => {
    if (!(await checkPremiumLimit())) return;
    setToolsModalVisible(false);
    setLockModalVisible(true);
  };

  const handlePPT = () => {
    setToolsModalVisible(false);
    setPptEditorVisible(true);
  };

  const handleSmartEraseInit = async () => {
    setToolsModalVisible(false);
    try {
      const image = await ImagePicker.openPicker({ width: 1000, height: 1500, cropping: true });
      const imgPath = image.path;
      setEraseImage(imgPath);
      setImageHistory([imgPath]);
      setStrokes([]);
      setCurrentStroke([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      Image.getSize(imgPath, (w, h) => {
        setImageNatSize({ width: w, height: h });
      });
      setCurrentScreen('smart_erase');
    } catch (e) {}
  };

  const handleTranslateAction = async () => {
    if (!transInput) return Alert.alert("هەڵە", "تکایە دەقێک بنووسە");
    setLoading(true);
    try {
      const target = targetLang === 'ku' ? 'ckb' : targetLang;
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(transInput)}`);
      const data = await response.json();
      if (data && data[0]) {
        let result = "";
        data[0].forEach(part => { if (part[0]) result += part[0]; });
        setTransOutput(result);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const activateVipOnline = async () => {
    if (!secretCode) return Alert.alert("کۆد بنووسە");
    try {
      setLoading(true);
      const snap = await get(ref(db, secretCode.trim()));
      if (snap.exists()) {
        setIsVip(true);
        await AsyncStorage.setItem('is_vip', 'true');
        await remove(ref(db, secretCode.trim()));
        setVipModalVisible(false);
        Alert.alert("پیرۆزە!", "وەشانی پڕۆ چالاک کرا ✅");
      } else { Alert.alert("هەڵە", "کۆدەکە هەڵەیە"); }
    } catch (e) {} finally { setLoading(false); }
  };

  const calculateRelativePoint = (touchX, touchY, currentZoom = zoomRef.current, currentPan = panRef.current) => {
    const containerW = imageLayoutRef.current.width || width;
    const containerH = imageLayoutRef.current.height || (height * 0.6);
    const imgW = imageNatSizeRef.current.width || 1000;
    const imgH = imageNatSizeRef.current.height || 1000;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;

    const Cx = containerW / 2;
    const Cy = containerH / 2;

    const unzoomedX = (touchX - Cx - currentPan.x) / currentZoom + displayW / 2;
    const unzoomedY = (touchY - Cy - currentPan.y) / currentZoom + displayH / 2;

    return {
      x: Math.max(0, Math.min(displayW, unzoomedX)),
      y: Math.max(0, Math.min(displayH, unzoomedY)),
      displayW,
      displayH
    };
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes((prev) => prev.slice(0, -1));
    } else if (imageHistory.length > 1) {
      const newHistory = imageHistory.slice(0, -1);
      setImageHistory(newHistory);
      setEraseImage(newHistory[newHistory.length - 1]);
    }
  };

  const handleClearAll = () => {
    setStrokes([]);
  };

  const handleEraseAllStrokes = async () => {
    if (strokesRef.current.length === 0 || inpaintingRef.current) return;

    try {
      setInpainting(true);
      const strokesToProcess = [...strokesRef.current];
      setEraseProgress({ current: 1, total: strokesToProcess.length });

      let currentUri = eraseImageRef.current;

      const containerW = imageLayoutRef.current.width || width;
      const containerH = imageLayoutRef.current.height || (height * 0.6);
      const imgW = imageNatSizeRef.current.width || 1000;
      const imgH = imageNatSizeRef.current.height || 1000;

      const scale = Math.min(containerW / imgW, containerH / imgH);
      const displayW = imgW * scale;
      const displayH = imgH * scale;

      for (let i = 0; i < strokesToProcess.length; i++) {
        setEraseProgress({ current: i + 1, total: strokesToProcess.length });
        const strokePts = strokesToProcess[i];

        const newUri = await inpaintImage(
          currentUri,
          strokePts,
          brushSizeRef.current,
          displayW,
          displayH,
          (progress) => setDownloadProgress(progress)
        );

        if (newUri) {
          currentUri = newUri;
        }
      }

      setEraseImage(currentUri);
      setImageHistory((prev) => [...prev, currentUri]);
      setStrokes([]);
    } catch (err) {
      const errorMsg = err?.message || "نەتوانرا سڕینەوەی وێنەکە ئەنجام بیدرێت";
      Alert.alert("هەڵە", errorMsg);
    } finally {
      setInpainting(false);
      setDownloadProgress(null);
      setEraseProgress({ current: 0, total: 0 });
    }
  };

  // Smart Erase Logic
  const finishSmartErase = async () => {
    if (!eraseImage) {
      setCurrentScreen('home');
      return;
    }

    try {
      setLoading(true);

      const newDoc = {
        id: Date.now().toString(),
        name: "خێرا_سڕاوە_" + Date.now(),
        date: new Date().toLocaleDateString(),
        pages: [eraseImage],
        thumbnail: eraseImage,
        password: ''
      };

      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);
      await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
      setImageHistory([]);
      setStrokes([]);
      setCurrentStroke([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      Alert.alert("سەرکەوتوو", "نووسینەکە بە تەواوی سڕایەوە و پاشەکەوت کرا! 🚀");
    } catch (e) {
      Alert.alert("هەڵە", "نەتوانرا پاشەکەوت بکرێت");
    } finally {
      setLoading(false);
      setCurrentScreen('home');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !inpaintingRef.current,
      onMoveShouldSetPanResponder: () => !inpaintingRef.current,
      onPanResponderGrant: (evt) => {
        if (inpaintingRef.current) return;

        if (drawTimerRef.current) {
          clearTimeout(drawTimerRef.current);
          drawTimerRef.current = null;
        }

        const touches = evt.nativeEvent.touches || [];

        if (touches.length >= 2) {
          gestureTypeRef.current = 'zoom_pan';
          currentStrokeRef.current = [];
          setCurrentStroke([]);

          const p1 = touches[0];
          const p2 = touches[1];
          const dist = Math.hypot(p1.pageX - p2.pageX, p1.pageY - p2.pageY);
          initialPinchDistanceRef.current = dist > 0 ? dist : 1;
          initialZoomRef.current = zoomRef.current;
          initialPinchCenterRef.current = {
            x: (p1.pageX + p2.pageX) / 2,
            y: (p1.pageY + p2.pageY) / 2
          };
          initialPanRef.current = { ...panRef.current };
        } else if (touches.length === 1) {
          if (gestureTypeRef.current === 'disabled_until_all_up' || gestureTypeRef.current === 'zoom_pan') {
            return;
          }

          const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
          gestureTypeRef.current = 'pending_draw';
          touchStartPosRef.current = { x: locationX, y: locationY, pageX, pageY };

          drawTimerRef.current = setTimeout(() => {
            if (gestureTypeRef.current === 'pending_draw') {
              gestureTypeRef.current = 'draw';
              const rel = calculateRelativePoint(
                touchStartPosRef.current.x,
                touchStartPosRef.current.y,
                zoomRef.current,
                panRef.current
              );
              currentStrokeRef.current = [{ x: rel.x, y: rel.y }];
              setCurrentStroke([{ x: rel.x, y: rel.y }]);
            }
          }, 120);
        }
      },
      onPanResponderMove: (evt) => {
        if (inpaintingRef.current) return;
        const touches = evt.nativeEvent.touches || [];

        if (touches.length >= 2) {
          if (drawTimerRef.current) {
            clearTimeout(drawTimerRef.current);
            drawTimerRef.current = null;
          }

          currentStrokeRef.current = [];
          setCurrentStroke([]);

          if (gestureTypeRef.current !== 'zoom_pan') {
            gestureTypeRef.current = 'zoom_pan';
            const p1 = touches[0];
            const p2 = touches[1];
            const dist = Math.hypot(p1.pageX - p2.pageX, p1.pageY - p2.pageY);
            initialPinchDistanceRef.current = dist > 0 ? dist : 1;
            initialZoomRef.current = zoomRef.current;
            initialPinchCenterRef.current = {
              x: (p1.pageX + p2.pageX) / 2,
              y: (p1.pageY + p2.pageY) / 2
            };
            initialPanRef.current = { ...panRef.current };
            return;
          }

          const p1 = touches[0];
          const p2 = touches[1];
          const dist = Math.hypot(p1.pageX - p2.pageX, p1.pageY - p2.pageY);
          const initDist = initialPinchDistanceRef.current || 1;
          const scaleRatio = dist / initDist;

          let newZoom = initialZoomRef.current * scaleRatio;
          newZoom = Math.max(1, Math.min(5, newZoom));

          const currentCenter = {
            x: (p1.pageX + p2.pageX) / 2,
            y: (p1.pageY + p2.pageY) / 2
          };

          const deltaX = currentCenter.x - (initialPinchCenterRef.current?.x || currentCenter.x);
          const deltaY = currentCenter.y - (initialPinchCenterRef.current?.y || currentCenter.y);

          let newPanX = initialPanRef.current.x + deltaX;
          let newPanY = initialPanRef.current.y + deltaY;

          const containerW = imageLayoutRef.current.width || width;
          const containerH = imageLayoutRef.current.height || (height * 0.6);

          if (newZoom <= 1) {
            newPanX = 0;
            newPanY = 0;
          } else {
            const maxPanX = (containerW * (newZoom - 1)) / 2 + 50;
            const maxPanY = (containerH * (newZoom - 1)) / 2 + 50;
            newPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
            newPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));
          }

          zoomRef.current = newZoom;
          panRef.current = { x: newPanX, y: newPanY };
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        } else if (touches.length === 1) {
          if (gestureTypeRef.current === 'zoom_pan' || gestureTypeRef.current === 'disabled_until_all_up') {
            gestureTypeRef.current = 'disabled_until_all_up';
            return;
          }

          const { locationX, locationY, pageX, pageY } = evt.nativeEvent;

          if (gestureTypeRef.current === 'pending_draw') {
            const dx = pageX - touchStartPosRef.current.pageX;
            const dy = pageY - touchStartPosRef.current.pageY;
            const distMoved = Math.hypot(dx, dy);

            if (distMoved >= 8) {
              if (drawTimerRef.current) {
                clearTimeout(drawTimerRef.current);
                drawTimerRef.current = null;
              }
              gestureTypeRef.current = 'draw';

              const relStart = calculateRelativePoint(
                touchStartPosRef.current.x,
                touchStartPosRef.current.y,
                zoomRef.current,
                panRef.current
              );
              const relCurrent = calculateRelativePoint(locationX, locationY, zoomRef.current, panRef.current);

              currentStrokeRef.current = [{ x: relStart.x, y: relStart.y }, { x: relCurrent.x, y: relCurrent.y }];
              setCurrentStroke([...currentStrokeRef.current]);
            }
          } else if (gestureTypeRef.current === 'draw') {
            const rel = calculateRelativePoint(locationX, locationY, zoomRef.current, panRef.current);
            currentStrokeRef.current = [...currentStrokeRef.current, { x: rel.x, y: rel.y }];
            setCurrentStroke([...currentStrokeRef.current]);
          }
        }
      },
      onPanResponderRelease: (evt) => {
        if (inpaintingRef.current) return;

        if (drawTimerRef.current) {
          clearTimeout(drawTimerRef.current);
          drawTimerRef.current = null;
        }

        const remainingTouches = (evt && evt.nativeEvent && evt.nativeEvent.touches) || [];

        if (gestureTypeRef.current === 'draw') {
          const strokePts = [...currentStrokeRef.current];
          currentStrokeRef.current = [];
          setCurrentStroke([]);

          if (strokePts.length > 0) {
            setStrokes((prev) => [...prev, strokePts]);
          }
        } else {
          currentStrokeRef.current = [];
          setCurrentStroke([]);
        }

        if (remainingTouches.length > 0) {
          gestureTypeRef.current = 'disabled_until_all_up';
        } else {
          gestureTypeRef.current = null;
          initialPinchDistanceRef.current = null;
          initialPinchCenterRef.current = null;

          if (zoomRef.current <= 1) {
            setPan({ x: 0, y: 0 });
            panRef.current = { x: 0, y: 0 };
          }
        }
      },
      onPanResponderTerminate: (evt) => {
        if (drawTimerRef.current) {
          clearTimeout(drawTimerRef.current);
          drawTimerRef.current = null;
        }

        currentStrokeRef.current = [];
        setCurrentStroke([]);

        const remainingTouches = (evt && evt.nativeEvent && evt.nativeEvent.touches) || [];
        if (remainingTouches.length > 0) {
          gestureTypeRef.current = 'disabled_until_all_up';
        } else {
          gestureTypeRef.current = null;
          initialPinchDistanceRef.current = null;
          initialPinchCenterRef.current = null;
        }
      }
    })
  ).current;

  // --- Screens Rendering ---
  const renderHome = () => (
    <View style={styles.flex1}>
      <View style={styles.header}>
        <Text style={styles.logo}>Scanner<Text style={{color: '#007AFF'}}>Pro</Text></Text>
        <TouchableOpacity style={[styles.proBtn, {backgroundColor: isVip ? '#34C759' : '#ffd60a'}]} onPress={() => setVipModalVisible(true)} onLongPress={resetVipStatus} delayLongPress={2000}>
           <Text style={styles.proText}>{isVip ? "VIP ACTIVE" : "⭐ GO PRO"}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 120}}>
        <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15}}>نوێترین سکانەکان</Text>
        {documents.slice(0, 3).map(doc => {
          const thumbUri = (typeof doc.thumbnail === 'string' && doc.thumbnail) ? doc.thumbnail : ((typeof doc.pages?.[0] === 'string' ? doc.pages[0] : doc.pages?.[0]?.uri) || 'https://cdn-icons-png.flaticon.com/512/337/337946.png');
          return (
            <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => { if(doc.password) { setTargetDoc(doc); setPassInputVisible(true); } else { setEditingDoc(doc); setCurrentScreen('edit'); }}}>
              <Image source={{ uri: thumbUri }} style={styles.docThumb} />
              <View style={{flex: 1, marginLeft: 15}}><Text style={styles.docName}>{doc.name}</Text></View>
              <TouchableOpacity
                style={{paddingHorizontal: 10, paddingVertical: 5}}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setSelectedHomeDoc(doc);
                  setHomeDocMenuVisible(true);
                }}
              >
                <Text style={{color: '#fff', fontSize: 22, fontWeight: 'bold'}}>⋮</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {documents.length > 3 && <TouchableOpacity style={{alignItems: 'center', marginTop: 10}} onPress={() => setCurrentScreen('files')}><Text style={{color: '#007AFF'}}>بینینی هەمووی 〉</Text></TouchableOpacity>}
      </ScrollView>
      {renderBottomTab()}
    </View>
  );

  const renderFiles = () => (
    <View style={styles.flex1}>
      <View style={styles.header}><Text style={styles.logo}>هەموو <Text style={{color: '#ffd60a'}}>فایلەکان</Text></Text></View>
      <View style={styles.searchContainer}><TextInput style={styles.searchInput} placeholder="گەڕان..." placeholderTextColor="#888" value={searchQuery} onChangeText={setSearchQuery}/></View>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 120}}>
        {documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(doc => {
          const thumbUri = (typeof doc.thumbnail === 'string' && doc.thumbnail) ? doc.thumbnail : ((typeof doc.pages?.[0] === 'string' ? doc.pages[0] : doc.pages?.[0]?.uri) || 'https://cdn-icons-png.flaticon.com/512/337/337946.png');
          return (
            <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => { if(doc.password) { setTargetDoc(doc); setPassInputVisible(true); } else { setEditingDoc(doc); setCurrentScreen('edit'); }}}>
              <Image source={{ uri: thumbUri }} style={styles.docThumb} />
              <View style={{flex: 1, marginLeft: 15}}><Text style={styles.docName}>{doc.name}</Text><Text style={{color: '#8e8e93', fontSize: 11}}>{doc.date}</Text></View>
              <TouchableOpacity onPress={() => { const f = documents.filter(d => d.id !== doc.id); setDocuments(f); AsyncStorage.setItem('saved_documents', JSON.stringify(f)); }}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {renderBottomTab()}
    </View>
  );

  const renderProfile = () => (
    <View style={[styles.flex1, {backgroundColor: '#f8f9fa'}]}>
      <ScrollView>
        <View style={styles.profileHeader}>
          <View style={styles.userInfoRow}><View style={{flex: 1}}><Text style={styles.userEmail}>CSG***@camscanner.com</Text><View style={styles.freeBadge}><Text style={styles.freeBadgeText}>{isVip ? "هەژماری پڕۆ 👑" : "هەژماری بێبەرامبەر 👑"}</Text></View></View><View style={styles.userAvatar}><Text style={{fontSize: 30}}>👤</Text></View></View>
          <TouchableOpacity style={styles.premiumCard} onPress={() => setVipModalVisible(true)}><Text style={styles.premTitle}>{isVip ? "پڕۆ چالاکە ✨" : "نوێکردنەوەی پڕۆ"}</Text></TouchableOpacity>
        </View>
        <View style={styles.benefitsSection}><View style={styles.benefitsRow}><BenefitItem icon="📚" label="کتێب" sub="١٠ ماوە" /><BenefitItem icon="🚫" label="بێ ڕیکلام" sub={isVip ? "چالاکە" : "داخراوە"} /><BenefitItem icon="📝" label="دەق" sub={isVip ? "بێسنور" : "٠/٢ ماوە"} /><BenefitItem icon="☁️" label="هەوری" sub="٢٩٪ پڕە" /></View></View>
        <View style={styles.settingsList}><SettingItem icon="📋" label="سکانکردن" onPress={() => setCurrentScreen('home')} /></View>
      </ScrollView>
      {renderBottomTab()}
    </View>
  );

  const renderSingleStroke = (strokePoints, strokeIndex, color) => {
    if (!strokePoints || strokePoints.length === 0) return null;
    const currentBrushSize = brushSize / zoom;

    return (
      <React.Fragment key={strokeIndex}>
        {strokePoints.map((pt, i) => (
          <View
            key={`pt-${strokeIndex}-${i}`}
            style={{
              position: 'absolute',
              left: pt.x - currentBrushSize / 2,
              top: pt.y - currentBrushSize / 2,
              width: currentBrushSize,
              height: currentBrushSize,
              borderRadius: currentBrushSize / 2,
              backgroundColor: color,
            }}
          />
        ))}
        {strokePoints.map((pt, i) => {
          if (i === 0) return null;
          const prev = strokePoints[i - 1];
          const dx = pt.x - prev.x;
          const dy = pt.y - prev.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 1) return null;

          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          const cx = (prev.x + pt.x) / 2;
          const cy = (prev.y + pt.y) / 2;

          return (
            <View
              key={`seg-${strokeIndex}-${i}`}
              style={{
                position: 'absolute',
                left: cx - distance / 2,
                top: cy - currentBrushSize / 2,
                width: distance,
                height: currentBrushSize,
                borderRadius: currentBrushSize / 2,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
      </React.Fragment>
    );
  };

  const renderSmartErase = () => {
    const containerW = imageLayout.width || width;
    const containerH = imageLayout.height || (height * 0.6);
    const imgW = imageNatSize.width || 1000;
    const imgH = imageNatSize.height || 1000;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;

    const offsetX = (containerW - displayW) / 2;
    const offsetY = (containerH - displayH) / 2;

    const hasStrokes = strokes.length > 0;
    const undoAvailable = strokes.length > 0 || imageHistory.length > 1;

    return (
      <View style={[styles.flex1, {backgroundColor: '#000'}]}>
        <View style={styles.eraseHeader}>
          <TouchableOpacity onPress={() => { setZoom(1); setPan({ x: 0, y: 0 }); zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; setImageHistory([]); setStrokes([]); setCurrentStroke([]); setCurrentScreen('home'); }}>
            <Text style={{color: '#fff', fontSize: 22}}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.eraseTitle}>سڕینەوەی دەق ✨</Text>

          <TouchableOpacity onPress={finishSmartErase} style={styles.saveEraseBtn}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>پاشەکەوتکردن</Text>
          </TouchableOpacity>
        </View>

        {/* IMAGE CANVAS CONTAINER WITH ONLAYOUT */}
        <View
          style={{flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setImageLayout({ width: w, height: h });
          }}
        >
          <View
            style={{
              width: containerW,
              height: containerH,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000',
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: zoom }
              ]
            }}
          >
            {/* BASE FULL DOCUMENT IMAGE */}
            <Image
              source={{ uri: eraseImage }}
              style={{ width: containerW, height: containerH }}
              resizeMode="contain"
            />

            {/* SELECTION OVERLAY LAYER FOR DRAWN STROKES */}
            <View
              style={{
                position: 'absolute',
                left: offsetX,
                top: offsetY,
                width: displayW,
                height: displayH,
                overflow: 'hidden'
              }}
              pointerEvents="none"
            >
              {strokes.map((strokePts, index) =>
                renderSingleStroke(strokePts, `stroke-${index}`, 'rgba(255, 0, 0, 0.3)')
              )}

              {currentStroke.length > 0 &&
                renderSingleStroke(currentStroke, 'current-stroke', 'rgba(255, 0, 0, 0.3)')
              }
            </View>
          </View>

          {/* TOUCH OVERLAY */}
          <View
            style={StyleSheet.absoluteFill}
            {...panResponder.panHandlers}
          />

          {/* RESET ZOOM BUTTON */}
          {(zoom > 1 || pan.x !== 0 || pan.y !== 0) && (
            <TouchableOpacity
              style={styles.resetZoomBtn}
              onPress={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                zoomRef.current = 1;
                panRef.current = { x: 0, y: 0 };
              }}
            >
              <Text style={styles.resetZoomText}>🔍 ڕێکخستنەوە ({zoom.toFixed(1)}x)</Text>
            </TouchableOpacity>
          )}

          {/* INPAINTING / DOWNLOAD LOADING INDICATOR */}
          {(inpainting || downloadProgress !== null) && (
            <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 20}]}>
              <ActivityIndicator size="large" color="#3DBB8F" />
              {downloadProgress !== null ? (
                <View style={{alignItems: 'center', marginTop: 12}}>
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>داگرتنی مۆدێلی AI...</Text>
                  <Text style={{color: '#3DBB8F', fontWeight: 'bold', marginTop: 6, fontSize: 18}}>
                    %{Math.round(downloadProgress * 100)}
                  </Text>
                </View>
              ) : (
                <View style={{alignItems: 'center', marginTop: 12}}>
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>خەریکی سڕینەوە لەسەر پیکسڵەکانە...</Text>
                  {eraseProgress.total > 0 && (
                    <Text style={{color: '#3DBB8F', fontWeight: 'bold', marginTop: 6, fontSize: 16}}>
                      ({eraseProgress.current} لە {eraseProgress.total})
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* BOTTOM TOOLBAR */}
        <View style={styles.eraseFooter}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15}}>
            {/* CLEAR ALL STROKES */}
            <TouchableOpacity
              onPress={handleClearAll}
              disabled={!hasStrokes || inpainting}
              style={[styles.eraseBtn, (!hasStrokes || inpainting) && {opacity: 0.4}]}
            >
              <Text style={{color: '#ff3b30', fontWeight: 'bold', fontSize: 13}}>🗑️ پاککردنەوە</Text>
            </TouchableOpacity>

            {/* UNDO LAST STROKE */}
            <TouchableOpacity
              onPress={handleUndo}
              disabled={!undoAvailable || inpainting}
              style={[styles.eraseBtn, (!undoAvailable || inpainting) && {opacity: 0.4}]}
            >
              <Text style={{color: '#007AFF', fontWeight: 'bold', fontSize: 13}}>
                ↩️ پاشگەزبوونەوە {hasStrokes ? `(${strokes.length})` : ''}
              </Text>
            </TouchableOpacity>

            {/* ERASE ACTION BUTTON */}
            <TouchableOpacity
              onPress={handleEraseAllStrokes}
              disabled={!hasStrokes || inpainting}
              style={[
                styles.actionEraseBtn,
                (!hasStrokes || inpainting) ? {backgroundColor: '#555'} : {backgroundColor: '#3DBB8F'}
              ]}
            >
              <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>
                🪄 سڕینەوە {hasStrokes ? `(${strokes.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 5}}>
            <Text style={{color: '#333', fontWeight: 'bold', fontSize: 13}}>قەبارەی فرچە: {brushSize === 15 ? 'بچووک' : brushSize === 30 ? 'ناوەەند' : 'گەورە'}</Text>
            <View style={{flexDirection: 'row'}}>
              {[
                { label: 'بچووک', size: 15 },
                { label: 'ناوەەند', size: 30 },
                { label: 'گەورە', size: 50 }
              ].map(item => (
                <TouchableOpacity
                  key={item.size}
                  onPress={() => setBrushSize(item.size)}
                  style={[
                    styles.brushSizeBtn,
                    brushSize === item.size && styles.brushSizeBtnActive
                  ]}
                >
                  <Text style={[styles.brushSizeText, brushSize === item.size && {color: '#fff'}]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEdit = () => (
    <View style={styles.flex1}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => setCurrentScreen('home')}><Text style={{color: '#fff'}}>⬅️</Text></TouchableOpacity>
        <Text style={styles.navTitle}>{editingDoc?.name || "بەڵگە"}</Text>
        <TouchableOpacity onPress={() => { const idx = documents.findIndex(d => d.id === editingDoc.id); let newDocs = [...documents]; if (idx > -1) newDocs[idx] = editingDoc; else newDocs = [editingDoc, ...newDocs]; setDocuments(newDocs); AsyncStorage.setItem('saved_documents', JSON.stringify(newDocs)); setCurrentScreen('home'); }}><Text style={{color: '#34C759', fontWeight: 'bold'}}>Save</Text></TouchableOpacity>
      </View>
      <FlatList data={editingDoc?.pages || []} keyExtractor={(_, i) => i.toString()} renderItem={({ item }) => {
          if (typeof item === 'object' && item?.type === 'text') {
            return (
              <View style={[styles.pageCard, { backgroundColor: '#fff', padding: 20, minHeight: 200, justifyContent: 'flex-start' }]}>
                <Text style={{ color: '#000', fontSize: 16, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' }}>
                  {item.text}
                </Text>
              </View>
            );
          }
          const imgUri = typeof item === 'string' ? item : item?.uri;
          return (
            <View style={styles.pageCard}><Image source={{ uri: imgUri }} style={styles.editImg} /></View>
          );
        }}
      />
    </View>
  );

  const renderPptModal = () => (
    <>
      <Modal visible={pptModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#1c1c1e', width: '95%', height: '90%', borderRadius: 24, padding: 18 }}>

            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#007AFF', fontSize: 18, fontWeight: 'bold' }}>دروستکەری پاوەرپۆینت (PPT) 📊</Text>
              <TouchableOpacity onPress={() => setPptModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#888', fontSize: 22, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Loading Indicator during PPT generation */}
            {pptGenerating ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2c2c2e', borderRadius: 16, padding: 20 }}>
                <ActivityIndicator size="large" color="#D24726" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
                  خەریکی دروستکردنی فایلی پاوەرپۆینتە... ⏳
                </Text>
              </View>
            ) : pptCreatedDoc ? (
              /* Post-Creation Card: Share & Save */
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2c2c2e', borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 48, marginBottom: 10 }}>🎉</Text>
                <Text style={{ color: '#30d158', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                  پاوەرپۆینت بە سەرکەوتوویی دروست کرا!
                </Text>
                <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
                  📄 {pptCreatedDoc.name}.pptx
                </Text>

                {/* Action Buttons */}
                <TouchableOpacity
                  style={{ backgroundColor: '#007AFF', width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                  onPress={() => handleShareDoc(pptCreatedDoc)}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>📤 هاوبەشکردن (Share)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#34c759', width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 15 }}
                  onPress={() => handleSaveToPhoneDoc(pptCreatedDoc)}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>💾 پاشەکەوتکردن لە مۆبایل</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#3a3a3c', width: '100%', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 10 }}
                  onPress={() => setPptCreatedDoc(null)}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>➕ دروستکردنی پاوەرپۆینتێکی تر</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ padding: 10 }}
                  onPress={() => setPptModalVisible(false)}
                >
                  <Text style={{ color: '#ff453a', fontSize: 15, fontWeight: 'bold' }}>داخستن</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Main Form / Slide List View */
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

                {/* Aspect Ratio Options */}
                <View style={{ backgroundColor: '#2c2c2e', padding: 12, borderRadius: 14, marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' }}>
                    قەبارەی پەڕە (Aspect Ratio):
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        backgroundColor: pptLayout === '16:9' ? '#D24726' : '#3a3a3c',
                      }}
                      onPress={() => setPptLayout('16:9')}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>16:9 (پان / Widescreen)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        backgroundColor: pptLayout === '4:3' ? '#D24726' : '#3a3a3c',
                      }}
                      onPress={() => setPptLayout('4:3')}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>4:3 (ئاسایی / Standard)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title Slide Option */}
                <View style={{ backgroundColor: '#2c2c2e', padding: 12, borderRadius: 14, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => setPptIncludeTitle(!pptIncludeTitle)}
                  >
                    <Text style={{ color: pptIncludeTitle ? '#30d158' : '#aaa', fontSize: 18 }}>
                      {pptIncludeTitle ? '☑️' : '⏹️'}
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                      پەڕەی سەردێڕی سەرەکی (Title Slide)
                    </Text>
                  </TouchableOpacity>

                  {pptIncludeTitle && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      <TextInput
                        style={{ backgroundColor: '#1c1c1e', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'right' }}
                        placeholder="سەردێڕی سەرەکی (Kurdish/Arabic)..."
                        placeholderTextColor="#777"
                        value={pptTitleText}
                        onChangeText={setPptTitleText}
                      />
                      <TextInput
                        style={{ backgroundColor: '#1c1c1e', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'right' }}
                        placeholder="ژێرنووس / ناوی ئامادەکار..."
                        placeholderTextColor="#777"
                        value={pptSubtitleText}
                        onChangeText={setPptSubtitleText}
                      />
                    </View>
                  )}
                </View>

                {/* Add Slides Action Grid */}
                <Text style={{ color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' }}>
                  زێدەکردنی سڵاید لە:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={{ flex: 1, minWidth: '45%', backgroundColor: '#007AFF22', borderColor: '#007AFF', borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={addPptImagesFromGallery}
                  >
                    <Text style={{ fontSize: 16 }}>🖼️</Text>
                    <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>گەلەری</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, minWidth: '45%', backgroundColor: '#34c75922', borderColor: '#34c759', borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={addPptImagesFromCamera}
                  >
                    <Text style={{ fontSize: 16 }}>📷</Text>
                    <Text style={{ color: '#34c759', fontWeight: 'bold', fontSize: 13 }}>کامێرا</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, minWidth: '45%', backgroundColor: '#af52de22', borderColor: '#af52de', borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => setPptDocPickerVisible(true)}
                  >
                    <Text style={{ fontSize: 16 }}>📁</Text>
                    <Text style={{ color: '#af52de', fontWeight: 'bold', fontSize: 13 }}>بەڵگەنامەکان</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, minWidth: '45%', backgroundColor: '#ff950022', borderColor: '#ff9500', borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    onPress={() => setPptTextModalVisible(true)}
                  >
                    <Text style={{ fontSize: 16 }}>📝</Text>
                    <Text style={{ color: '#ff9500', fontWeight: 'bold', fontSize: 13 }}>پەڕەی دەق (OCR)</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected Slides List Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#888', fontSize: 12 }}>{pptSlides.length} سڵاید</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>لیستی سڵایدەکان</Text>
                </View>

                {/* Empty state */}
                {pptSlides.length === 0 ? (
                  <View style={{ backgroundColor: '#2c2c2e', padding: 20, borderRadius: 14, alignItems: 'center', marginVertical: 10 }}>
                    <Text style={{ color: '#888', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
                      هیچ سڵایدێک زێدە نەکراوە. دوگمەکانی سەرەوە بەکاربێنە بۆ زێدەکردنی وێنە یان دەق.
                    </Text>
                  </View>
                ) : (
                  pptSlides.map((slide, idx) => (
                    <View
                      key={slide.id || idx}
                      style={{ backgroundColor: '#2c2c2e', padding: 10, borderRadius: 12, marginBottom: 8 }}
                    >
                      {/* Slide Top Info */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            disabled={idx === 0}
                            onPress={() => movePptSlideUp(idx)}
                            style={{ backgroundColor: '#3a3a3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12 }}>▲ سەرەوە</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={idx === pptSlides.length - 1}
                            onPress={() => movePptSlideDown(idx)}
                            style={{ backgroundColor: '#3a3a3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, opacity: idx === pptSlides.length - 1 ? 0.3 : 1 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12 }}>▼ خوارەوە</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deletePptSlide(slide.id)}
                            style={{ backgroundColor: '#ff453a22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                          >
                            <Text style={{ color: '#ff453a', fontSize: 12, fontWeight: 'bold' }}>🗑️ سڕینەوە</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: '#D24726', fontWeight: 'bold', fontSize: 13 }}>
                          {slide.type === 'image' ? '📸 وێنە' : '📝 دەق'} #{idx + 1}
                        </Text>
                      </View>

                      {/* Content Thumbnail */}
                      {slide.type === 'image' && slide.uri ? (
                        <Image
                          source={{ uri: slide.uri }}
                          style={{ width: '100%', height: 110, borderRadius: 8, backgroundColor: '#1c1c1e' }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={{ backgroundColor: '#1c1c1e', padding: 10, borderRadius: 8 }}>
                          {slide.title ? (
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'right', marginBottom: 4 }}>
                              {slide.title}
                            </Text>
                          ) : null}
                          {slide.text ? (
                            <Text style={{ color: '#ccc', fontSize: 12, textAlign: 'right' }} numberOfLines={3}>
                              {slide.text}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  ))
                )}

                {/* Bottom Generate Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#D24726',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    marginTop: 15,
                    marginBottom: 30,
                  }}
                  onPress={handleCreatePPT}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>دروستکردنی PPT 🚀</Text>
                </TouchableOpacity>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Document Picker Modal for PPT */}
      <Modal visible={pptDocPickerVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#1c1c1e', width: '90%', maxHeight: '80%', borderRadius: 20, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>هەڵبژاردنی بەڵگەنامە</Text>
              <TouchableOpacity onPress={() => setPptDocPickerVisible(false)}>
                <Text style={{ color: '#888', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {documents.length === 0 ? (
                <Text style={{ color: '#888', textAlign: 'center', padding: 20 }}>هیچ بەڵگەنامەیەک نەدۆزرایەوە.</Text>
              ) : (
                documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={{ backgroundColor: '#2c2c2e', padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => importPptFromDoc(doc)}
                  >
                    <Text style={{ color: '#888', fontSize: 12 }}>{doc.pages?.length || 1} پەڕە</Text>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{doc.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Text Slide Modal for PPT */}
      <Modal visible={pptTextModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#1c1c1e', width: '92%', borderRadius: 20, padding: 18 }}>
            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 12 }}>
              زێدەکردنی سڵایدی دەق 📝
            </Text>
            <TextInput
              style={{ backgroundColor: '#2c2c2e', color: '#fff', borderRadius: 10, padding: 12, fontSize: 14, textAlign: 'right', marginBottom: 10 }}
              placeholder="سەردێڕی سڵاید (دڵخواز)..."
              placeholderTextColor="#777"
              value={pptTextTitle}
              onChangeText={setPptTextTitle}
            />
            <TextInput
              style={{ backgroundColor: '#2c2c2e', color: '#fff', borderRadius: 10, padding: 12, fontSize: 14, textAlign: 'right', height: 120, textAlignVertical: 'top', marginBottom: 15 }}
              placeholder="دەقی سڵاید (دەتوانی دەقی کۆپیکراوی OCR لێرە بنووسی یان پەیست بکەی)..."
              placeholderTextColor="#777"
              multiline
              value={pptTextBody}
              onChangeText={setPptTextBody}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#3a3a3c', padding: 12, borderRadius: 10, alignItems: 'center' }}
                onPress={() => setPptTextModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#D24726', padding: 12, borderRadius: 10, alignItems: 'center' }}
                onPress={addPptTextSlide}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>زێدەکردن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderBottomTab = () => (
    <View style={styles.bottomTabContainer}>
      <View style={styles.tabItems}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setCurrentScreen('home')}><Text style={[styles.tabIcon, currentScreen === 'home' && {color: '#007AFF'}]}>🏠</Text><Text style={styles.tabText}>سەرەکی</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setCurrentScreen('files')}><Text style={[styles.tabIcon, currentScreen === 'files' && {color: '#ffd60a'}]}>📁</Text><Text style={styles.tabText}>فایلەکان</Text></TouchableOpacity>
        <View style={{width: 80}} />
        <TouchableOpacity style={styles.tabBtn} onPress={() => setToolsModalVisible(true)}><Text style={styles.tabIcon}>🛠️</Text><Text style={styles.tabText}>ئامرازەکان</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setCurrentScreen('profile')}><Text style={[styles.tabIcon, currentScreen === 'profile' && {color: '#007AFF'}]}>👤</Text><Text style={styles.tabText}>من</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.centerFab} onPress={startScan}><View style={styles.innerFab}><Text style={{fontSize: 30}}>📷</Text></View></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaProvider><View style={styles.container}><StatusBar barStyle="light-content" /><SafeAreaView style={styles.flex1}>
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'files' && renderFiles()}
      {currentScreen === 'profile' && renderProfile()}
      {currentScreen === 'smart_erase' && renderSmartErase()}
      {currentScreen === 'signing' && renderSigning()}
      {currentScreen === 'edit' && renderEdit()}

      {/* TOOLS MODAL */}
      <Modal visible={toolsModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.toolsFullBox}><ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>ئامرازەکان</Text><TouchableOpacity onPress={() => setToolsModalVisible(false)}><Text style={{color: '#888'}}>✕</Text></TouchableOpacity></View>
        <View style={styles.toolsGrid}>
          <ToolIcon icon="📝" label="دەق" color="#E8F5E9" onPress={handleOCR} />
          <ToolIcon icon="✍️" label="ئیمزا" color="#FFF3E0" onPress={handleSignature} />
          <ToolIcon icon="🪄" label="سڕینەوە" color="#F3E5F5" onPress={handleSmartEraseInit} />
          <ToolIcon icon="🔐" label="قفڵ" color="#E3F2FD" onPress={handleLock} />
          <ToolIcon icon={<MaterialCommunityIcons name="file-powerpoint-box" size={28} color="#D24726" />} label="PPT" color="#FFEBE6" onPress={handlePPT} />
          <ToolIcon icon="🌐" label="وەرگێڕان" color="#E1F5FE" onPress={() => { setToolsModalVisible(false); setTransModalVisible(true); }} />
        </View>
        <Text style={styles.sectionTitle}>سکانی زیرەک</Text>
        <View style={styles.toolsGrid}><ToolIcon icon="🪪" label="ناسنامە" color="#E1F5FE" onPress={() => { setToolsModalVisible(false); setIdModalVisible(true); }} /><ToolIcon icon="📚" label="کتێب" color="#F3E5F5" onPress={startScan} /></View>
        <TouchableOpacity onPress={() => setToolsModalVisible(false)} style={styles.closeBtn}><Text style={{color: '#fff', fontWeight: 'bold'}}>داخستن</Text></TouchableOpacity>
      </ScrollView></View></View></Modal>

      {/* Other Modals */}
      <Modal visible={vipModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.vipFullBox}><ScrollView contentContainerStyle={{alignItems: 'center'}}><Text style={styles.vipHeaderTitle}>Scanner Pro VIP ⭐</Text><View style={styles.fibInfoCard}><Text style={{color: '#fff'}}>FIB: 0750 715 9851</Text></View><TextInput style={styles.codeIn} placeholder="کۆد..." placeholderTextColor="#555" value={secretCode} onChangeText={setSecretCode} /><TouchableOpacity style={styles.actBtn} onPress={activateVipOnline}><Text style={{color: '#fff', fontWeight: 'bold'}}>چالاککردن</Text></TouchableOpacity><TouchableOpacity onPress={() => setVipModalVisible(false)} style={{marginTop: 20}}><Text style={{color: '#fff'}}>✕</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={transModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.transBox}><Text style={styles.transTitle}>وەرگێڕی پڕۆ 🌐</Text><View style={styles.langRow}><TouchableOpacity style={[styles.langBtn, targetLang === 'en' && styles.langBtnActive]} onPress={() => setTargetLang('en')}><Text style={styles.langText}>EN</Text></TouchableOpacity><TouchableOpacity style={[styles.langBtn, targetLang === 'ar' && styles.langBtnActive]} onPress={() => setTargetLang('ar')}><Text style={styles.langText}>AR</Text></TouchableOpacity><TouchableOpacity style={[styles.langBtn, targetLang === 'ku' && styles.langBtnActive]} onPress={() => setTargetLang('ku')}><Text style={styles.langText}>KU</Text></TouchableOpacity></View><TextInput style={styles.transIn} placeholder="لێرە بنووسە..." placeholderTextColor="#888" multiline value={transInput} onChangeText={setTransInput} textAlign="right" autoFocus /><TouchableOpacity style={styles.actBtn} onPress={handleTranslateAction}><Text style={{color: '#fff', fontWeight: 'bold'}}>ئێستا وەریگێڕە</Text></TouchableOpacity><View style={styles.resBox}><ScrollView><Text style={{color: '#000', fontSize: 16, textAlign: 'right'}}>{transOutput || "ئەنجام..."}</Text></ScrollView>{transOutput !== '' && (<TouchableOpacity onPress={() => { Clipboard.setString(transOutput); Alert.alert("کۆپی کرا"); }} style={{alignSelf: 'flex-start', padding: 5}}><Text style={{color: '#007AFF', fontSize: 12}}>📋 کۆپی کردن</Text></TouchableOpacity>)}</View><TouchableOpacity onPress={() => { setTransModalVisible(false); setTransOutput(''); }} style={{marginTop: 15}}><Text style={{color: '#ff3b30', textAlign: 'center', fontWeight: 'bold'}}>داخستن</Text></TouchableOpacity></View></View></Modal>
      {/* PROFESSIONAL ON-DEVICE OCR MODAL */}
      <Modal visible={ocrModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={{backgroundColor: '#1c1c1e', width: '94%', height: '88%', borderRadius: 30, padding: 20, justifyContent: 'space-between'}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
              <Text style={{color: '#007AFF', fontSize: 18, fontWeight: 'bold'}}>خوێنەرەوەی دەق (OCR) 🔎</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <TouchableOpacity
                  style={{backgroundColor: '#007AFF22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8}}
                  onPress={recropImageForOCR}
                >
                  <Text style={{color: '#007AFF', fontSize: 13, fontWeight: 'bold'}}>✂️ بڕینەوە</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOcrModalVisible(false)}>
                  <Text style={{color: '#888', fontSize: 22}}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Language Selector Row */}
            <View style={{flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#2c2c2e', padding: 8, borderRadius: 15, marginBottom: 12}}>
              {[
                { key: 'ckb', label: 'کوردی (Sorani)' },
                { key: 'ara', label: 'عەرەبی' },
                { key: 'eng', label: 'English' }
              ].map((l) => (
                <TouchableOpacity
                  key={l.key}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: ocrLang === l.key ? '#007AFF' : 'transparent'
                  }}
                  onPress={() => {
                    setOcrLang(l.key);
                    if (ocrImageUri) startOCRRecognition(ocrImageUri, l.key);
                  }}
                >
                  <Text style={{color: '#fff', fontSize: 13, fontWeight: 'bold'}}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Progress Indicator */}
            {ocrProcessing ? (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', borderRadius: 20, padding: 20}}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{color: '#fff', fontSize: 15, fontWeight: 'bold', marginTop: 15, textAlign: 'center'}}>
                  {ocrProgressText || 'خەریکی خوێندنەوەی دەقە...'}
                </Text>
              </View>
            ) : (
              /* Editable Result TextInput */
              <View style={{flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 12}}>
                <TextInput
                  style={{
                    flex: 1,
                    color: '#000',
                    fontSize: 16,
                    textAlign: ocrLang === 'eng' ? 'left' : 'right',
                    writingDirection: ocrLang === 'eng' ? 'ltr' : 'rtl',
                    textAlignVertical: 'top'
                  }}
                  multiline
                  value={ocrText}
                  onChangeText={setOcrText}
                  placeholder={ocrText ? '' : 'هیچ دەقێک نەدۆزرایەوە. تکایە وێنەیەکی ڕوونتر بگرە و تەنها دەقەکە ببڕە'}
                  placeholderTextColor="#888"
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8}}>
              <TouchableOpacity
                style={{backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flex: 1, alignItems: 'center'}}
                onPress={() => {
                  if (ocrText) {
                    Clipboard.setString(ocrText);
                    Alert.alert("سەرکەوتوو", "دەقەکە کۆپی کرا ✅");
                  }
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>📋 کۆپی کردن</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{backgroundColor: '#34C759', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flex: 1, alignItems: 'center'}}
                onPress={async () => {
                  try {
                    if (!ocrText || !ocrText.trim()) {
                      Alert.alert("ئاگاداری", "تکایە سەرەتا دەقێک بنووسە یان سکان بکە.");
                      return;
                    }
                    const filename = `scan-text-${Date.now()}.txt`;
                    const txtUri = `${FileSystem.cacheDirectory}${filename}`;
                    await FileSystem.writeAsStringAsync(txtUri, ocrText, { encoding: FileSystem.EncodingType.UTF8 });
                    await Sharing.shareAsync(txtUri, { mimeType: 'text/plain' });
                  } catch (err) {
                    console.log('[OCR Buttons] TXT Share Error:', err);
                    Alert.alert("هەڵە", "کێشەیەک ڕوویدا لە کاتی هاوبەشکردنی دەقەکە.");
                  }
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>📤 هاوبەشکردن / TXT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{backgroundColor: '#AF52DE', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flex: 1, alignItems: 'center'}}
                onPress={async () => {
                  try {
                    if (!ocrText || !ocrText.trim()) {
                      Alert.alert("ئاگاداری", "تکایە سەرەتا دەقێک بنووسە یان سکان بکە.");
                      return;
                    }
                    const textPage = { type: 'text', text: ocrText };
                    let updatedDocs = [];

                    if (editingDoc) {
                      const updatedDoc = {
                        ...editingDoc,
                        pages: [...(editingDoc.pages || []), textPage]
                      };
                      setEditingDoc(updatedDoc);
                      const otherDocs = documents.filter(d => d.id !== updatedDoc.id);
                      updatedDocs = [updatedDoc, ...otherDocs];
                      setDocuments(updatedDocs);
                      await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
                      Alert.alert("سەرکەوتوو", "دەقەکە وەکو پەڕەیەکی نوێ بۆ بەڵگەنامەکە زیاد کرا ✅");
                    } else {
                      const todayDate = new Date().toLocaleDateString();
                      const newDoc = {
                        id: Date.now().toString(),
                        name: "بەڵگە_" + todayDate,
                        date: todayDate,
                        pages: [textPage],
                        thumbnail: 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
                        password: ''
                      };
                      setEditingDoc(newDoc);
                      updatedDocs = [newDoc, ...documents];
                      setDocuments(updatedDocs);
                      await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
                      Alert.alert("سەرکەوتوو", "بەڵگەنامەیەکی نوێ دروستکرا و دەقەکەی بۆ زیاد کرا ✅");
                    }
                  } catch (err) {
                    console.log('[OCR Buttons] Add to Doc Error:', err);
                    Alert.alert("هەڵە", "کێشەیەک ڕوویدا لە کاتی زیادکردنی دەقەکە بۆ بەڵگەنامە.");
                  }
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>📄 زیادکردن بۆ بەڵگە</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={idModalVisible} transparent animationType="fade"><View style={styles.overlay}><View style={styles.idBox}><View style={styles.idPreviewBox}><Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1042/1042340.png' }} style={styles.idIllustration} /><View style={styles.passportGuideBox}><Text style={styles.guideLine}>┌                                          ┐</Text><View style={{height: 60}} /><Text style={{color: '#fff', fontSize: 10, textAlign: 'center'}}>وێنەی {idCategory} لێرە ڕێکبخە</Text><View style={{height: 20}} /><Text style={styles.guideLine}>└                                          ┘</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.idCats}>{['گشتی', 'ناسنامە', 'مۆڵەت', 'پاسپۆرت', 'کارتی بانکی', 'بڕوانامە'].map(cat => (<TouchableOpacity key={cat} style={[styles.catBtn, idCategory === cat && styles.catBtnActive]} onPress={() => setIdCategory(cat)}><Text style={[styles.catText, idCategory === cat && {color: '#fff'}]}>{cat}</Text></TouchableOpacity>))}</ScrollView><TouchableOpacity style={styles.makeBtn} onPress={startIDScan}><Text style={styles.makeBtnText}>ئێستا وێنەکە بگرە</Text></TouchableOpacity><TouchableOpacity onPress={() => setIdModalVisible(false)} style={{marginTop: 15}}><Text style={{color: '#888', textAlign: 'center'}}>پاشگەزبوونەوە</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={lockModalVisible} transparent><View style={styles.overlay}><View style={styles.renameBox}><Text style={{color: '#fff', marginBottom: 15, textAlign:'center'}}>کۆد بۆ فایل دابنێ</Text><TextInput style={styles.renameIn} placeholder="Pass..." value={docPassword} onChangeText={setDocPassword} keyboardType="numeric" /><TouchableOpacity onPress={() => { if(editingDoc) setEditingDoc({...editingDoc, password: docPassword}); setLockModalVisible(false); Alert.alert("سەرکەوتوو", "فایلەکە قفڵ کرا"); }}><Text style={{color: '#34C759', fontWeight: 'bold', textAlign: 'center'}}>تەواو</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={passInputVisible} transparent><View style={styles.overlay}><View style={styles.renameBox}><Text style={{color: '#fff', marginBottom: 15}}>قفڵ کراوە 🔒</Text><TextInput style={styles.renameIn} placeholder="کۆد..." value={enteredPass} onChangeText={setPassToCheck} secureTextEntry /><TouchableOpacity onPress={() => { if(enteredPass===targetDoc.password) { setEditingDoc(targetDoc); setCurrentScreen('edit'); setPassInputVisible(false); setPassToCheck(''); } else Alert.alert("هەڵە","کۆدەکە هەڵەیە"); }}><Text style={{color: '#007AFF', fontWeight: 'bold', textAlign: 'center'}}>بیکەرەوە</Text></TouchableOpacity></View></View></Modal>

      {/* HOME RECENT SCANS ACTION MENU MODAL */}
      <Modal visible={homeDocMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setHomeDocMenuVisible(false)}
        >
          <View style={{backgroundColor: '#1c1c1e', width: '85%', borderRadius: 20, padding: 20}}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center'}}>
              {selectedHomeDoc?.name || "کردارەکان"}
            </Text>

            <TouchableOpacity
              style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333'}}
              onPress={async () => {
                const target = selectedHomeDoc;
                setHomeDocMenuVisible(false);
                if (target) {
                  await handleShareDoc(target);
                }
              }}
            >
              <Text style={{fontSize: 20, marginRight: 12}}>📤</Text>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: 'bold'}}>هاوبەشکردن</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 14}}
              onPress={async () => {
                const target = selectedHomeDoc;
                setHomeDocMenuVisible(false);
                if (target) {
                  await handleSaveToPhoneDoc(target);
                }
              }}
            >
              <Text style={{fontSize: 20, marginRight: 12}}>💾</Text>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: 'bold'}}>پاشەکەوتکردن لە مۆبایل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{marginTop: 15, paddingTop: 10, alignItems: 'center'}}
              onPress={() => setHomeDocMenuVisible(false)}
            >
              <Text style={{color: '#ff3b30', fontWeight: 'bold', fontSize: 15}}>داخستن</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SIGNATURE PAD MODAL */}
      <Modal visible={signatureModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={{backgroundColor: '#1c1c1e', width: '92%', height: '85%', borderRadius: 30, padding: 20}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>ئیمزای نوێ / پاشکەوتکراوەکان ✍️</Text>
              <TouchableOpacity onPress={() => setSignatureModalVisible(false)}>
                <Text style={{color: '#888', fontSize: 20}}>✕</Text>
              </TouchableOpacity>
            </View>

            {savedSignatures.length > 0 && (
              <View style={{marginBottom: 15}}>
                <Text style={{color: '#ffd60a', fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'right'}}>ئیمزا پاشکەوتکراوەکان:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedSignatures.map((sUri, idx) => (
                    <View key={idx} style={{backgroundColor: '#2c2c2e', borderRadius: 15, padding: 8, marginRight: 10, alignItems: 'center', justifyContent: 'center', width: 100, height: 70}}>
                      <TouchableOpacity onPress={() => saveAndUseSignature(sUri)} style={{flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center'}}>
                        <Image source={{ uri: sUri }} style={{width: 80, height: 45, resizeMode: 'contain'}} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{position: 'absolute', top: 2, right: 2}}
                        onPress={async () => {
                          const updated = savedSignatures.filter((_, i) => i !== idx);
                          setSavedSignatures(updated);
                          await AsyncStorage.setItem('saved_signatures', JSON.stringify(updated));
                        }}
                      >
                        <Text style={{color: '#ff3b30', fontSize: 12}}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={{color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'right'}}>ئیمزای نوێ بکێشە:</Text>

            <View style={{flex: 1, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 15}}>
              <ViewShot ref={sigViewShotRef} options={{ format: 'png', quality: 0.9, result: 'tmpfile' }} style={{flex: 1, backgroundColor: 'transparent'}}>
                <View style={StyleSheet.absoluteFill} {...sigPanResponder.panHandlers}>
                  {sigStrokes.map((pts, i) => renderSigStroke(pts, `sig-${i}`, sigColor, sigThickness))}
                  {renderSigStroke(sigCurrentStroke, 'sig-curr', sigColor, sigThickness)}
                </View>
              </ViewShot>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
              <View style={{flexDirection: 'row'}}>
                {['#000000', '#0000FF', '#FF0000'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setSigColor(c)} style={{width: 30, height: 30, borderRadius: 15, backgroundColor: c, marginRight: 8, borderWidth: sigColor === c ? 3 : 0, borderColor: '#fff'}} />
                ))}
              </View>
              <View style={{flexDirection: 'row'}}>
                {[
                  { label: 'باریک', val: 2 },
                  { label: 'ناوەەند', val: 4 },
                  { label: 'ئەستوور', val: 7 }
                ].map(t => (
                  <TouchableOpacity key={t.val} onPress={() => setSigThickness(t.val)} style={{paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: sigThickness === t.val ? '#007AFF' : '#2c2c2e', marginLeft: 6}}>
                    <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <TouchableOpacity
                style={{backgroundColor: '#2c2c2e', padding: 12, borderRadius: 15, flex: 1, marginRight: 5, alignItems: 'center'}}
                onPress={() => setSigStrokes([])}
              >
                <Text style={{color: '#ff3b30', fontWeight: 'bold'}}>پاککردنەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{backgroundColor: '#2c2c2e', padding: 12, borderRadius: 15, flex: 1, marginHorizontal: 5, alignItems: 'center'}}
                onPress={() => {
                  if (sigStrokes.length > 0) {
                    setSigStrokes(prev => prev.slice(0, -1));
                  }
                }}
              >
                <Text style={{color: '#007AFF', fontWeight: 'bold'}}>گەڕانەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{backgroundColor: '#2c2c2e', padding: 12, borderRadius: 15, flex: 1, marginHorizontal: 5, alignItems: 'center'}}
                onPress={handleImportSignatureImage}
              >
                <Text style={{color: '#34C759', fontWeight: 'bold'}}>لە وێنەوە</Text>
              </TouchableOpacity>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}}>
              <TouchableOpacity
                style={{backgroundColor: '#555', padding: 15, borderRadius: 15, flex: 1, marginRight: 8, alignItems: 'center'}}
                onPress={() => setSignatureModalVisible(false)}
              >
                <Text style={{color: '#fff', fontWeight: 'bold'}}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{backgroundColor: '#34C759', padding: 15, borderRadius: 15, flex: 1, marginLeft: 8, alignItems: 'center'}}
                onPress={handleFinishDrawingSignature}
              >
                <Text style={{color: '#fff', fontWeight: 'bold'}}>تەواو</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SIGNATURE CROPPER FULLSCREEN MODAL COMPONENT */}
      <Modal visible={cropModalVisible && !!croppingSig} animationType="slide" statusBarTranslucent>
        {croppingSig && (
          <SignatureCropper
            uri={croppingSig.uri}
            onDone={(newUri, size) => {
              if (croppingSig && newUri) {
                setSignatures(prev => prev.map(s => {
                  if (s.id === croppingSig.id) {
                    const aspect = (size && size.width && size.height) ? (size.width / size.height) : (s.width / s.height);
                    const newHeight = Math.round(s.width / aspect);
                    return {
                      ...s,
                      uri: newUri,
                      height: newHeight
                    };
                  }
                  return s;
                }));
              }
              setCropModalVisible(false);
              setCroppingSig(null);
            }}
            onCancel={() => {
              setCropModalVisible(false);
              setCroppingSig(null);
            }}
          />
        )}
      </Modal>

      <PptEditorModal
        visible={pptEditorVisible}
        onClose={() => {
          setPptEditorVisible(false);
          setToolsModalVisible(true);
        }}
        onSaveDocument={(newDoc) => {
          const updatedDocs = [newDoc, ...documents];
          setDocuments(updatedDocs);
          AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
        }}
        handleShareDoc={handleShareDoc}
        handleSaveToPhoneDoc={handleSaveToPhoneDoc}
      />

      {loading && <View style={styles.loader}><ActivityIndicator size="large" color="#007AFF" /></View>}
    </SafeAreaView></View></SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, flex1: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center' },
  logo: { color: '#fff', fontSize: 28, fontWeight: 'bold' }, proBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 }, proText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  docCard: { backgroundColor: '#1c1c1e', marginHorizontal: 20, marginBottom: 15, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  docThumb: { width: 55, height: 75, borderRadius: 10, backgroundColor: '#2c2c2e' }, docName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bottomTabContainer: { position: 'absolute', bottom: 0, width: '100%', height: 90, backgroundColor: '#1c1c1e', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabItems: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: '100%' },
  tabBtn: { alignItems: 'center' }, tabIcon: { fontSize: 20, color: '#8e8e93' }, tabText: { color: '#8e8e93', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  centerFab: { position: 'absolute', top: -35, left: width / 2 - 40, width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  innerFab: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' }, navTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pageCard: { backgroundColor: '#1c1c1e', margin: 15, borderRadius: 25, overflow: 'hidden' }, editImg: { width: '100%', height: 380, resizeMode: 'contain' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  toolsFullBox: { backgroundColor: '#fff', width: '100%', height: '50%', borderTopLeftRadius: 40, borderTopRightRadius: 40, position: 'absolute', bottom: 0, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }, toolItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 55, height: 55, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }, toolLabel: { fontSize: 11, color: '#333', textAlign: 'center' },
  closeBtn: { backgroundColor: '#ff3b30', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10, width: '100%' },
  vipFullBox: { backgroundColor: '#1c1c1e', width: '90%', padding: 25, borderRadius: 40, borderWidth: 1, borderColor: '#ffd60a' },
  vipHeaderTitle: { color: '#ffd60a', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  fibInfoCard: { backgroundColor: '#000', width: '100%', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  codeIn: { backgroundColor: '#2c2c2e', color: '#fff', padding: 15, borderRadius: 15, width: '100%', textAlign: 'center', marginVertical: 15 },
  actBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 15, width: '100%', alignItems: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  profileHeader: { padding: 20, backgroundColor: '#fff', paddingBottom: 30 }, userInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 },
  userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  userEmail: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'right' }, freeBadge: { backgroundColor: '#f1f3f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-end', marginTop: 5 },
  freeBadgeText: { fontSize: 12, color: '#868e96' }, premiumCard: { backgroundColor: '#eef2ff', padding: 20, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  premTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, benefitsSection: { padding: 20, backgroundColor: '#fff', marginTop: 10 },
  benefitsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 }, benefitItem: { alignItems: 'center', flex: 1 },
  benefitIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  benefitLabel: { fontSize: 11, fontWeight: 'bold', color: '#333' }, benefitSub: { fontSize: 9, color: '#999', marginTop: 2 },
  settingsList: { marginTop: 10, backgroundColor: '#fff', paddingHorizontal: 20 }, settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: '#f1f3f5' },
  settingLabel: { fontSize: 16, color: '#333', marginRight: 15 }, settingIconBox: { width: 30, alignItems: 'center' },
  eraseHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: '#1c1c1e' },
  eraseTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' }, saveEraseBtn: { backgroundColor: '#3DBB8F', padding: 8, borderRadius: 10, paddingHorizontal: 15 },
  eraseCanvas: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  eraseFooter: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  eraseToolsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  footerTool: { alignItems: 'center' }, brushTrack: { flexDirection: 'row', justifyContent: 'space-around', width: '80%', marginTop: 15 },
  brushDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ddd' },
  resetZoomBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3DBB8F',
    zIndex: 15
  },
  resetZoomText: {
    color: '#3DBB8F',
    fontSize: 12,
    fontWeight: 'bold'
  },
  idBox: { backgroundColor: '#fff', width: '100%', height: '70%', borderTopLeftRadius: 40, borderTopRightRadius: 40, position: 'absolute', bottom: 0, padding: 25 },
  idPreviewBox: { backgroundColor: '#f8f9fa', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 30 }, idIllustration: { width: 150, height: 100, resizeMode: 'contain' },
  idCats: { flexDirection: 'row', marginBottom: 30 }, catBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f3f5', marginRight: 10 },
  catBtnActive: { backgroundColor: '#00C2A0' }, catText: { color: '#333', fontSize: 14, fontWeight: 'bold' },
  makeBtn: { backgroundColor: '#00C2A0', padding: 18, borderRadius: 30, alignItems: 'center', elevation: 5 }, makeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  passportGuideBox: { position: 'absolute', top: 20, bottom: 20, left: 40, right: 40, borderWidth: 0, justifyContent: 'center' }, guideLine: { color: '#00C2A0', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  transBox: { backgroundColor: '#fff', width: '92%', height: '80%', padding: 25, borderRadius: 35 }, transTitle: { fontSize: 22, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  transIn: { backgroundColor: '#f1f3f5', borderRadius: 15, padding: 15, height: 120, textAlignVertical: 'top', color: '#000', fontSize: 16, marginBottom: 15, textAlign: 'right' },
  resBox: { height: 160, backgroundColor: '#f8f9fa', borderRadius: 15, padding: 15, marginTop: 15, borderWidth: 1, borderColor: '#eee' },
  langRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  langBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eee', marginHorizontal: 5 },
  langBtnActive: { backgroundColor: '#007AFF' }, langText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  ocrBox: { backgroundColor: '#1c1c1e', width: '#85%', padding: 25, borderRadius: 25, borderLeftWidth: 4, borderLeftColor: '#007AFF' }, ocrTitle: { color: '#007AFF', fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10, textAlign: 'right' },
  renameBox: { backgroundColor: '#1c1c1e', padding: 30, borderRadius: 30, width: '85%' },
  renameIn: { backgroundColor: '#2c2c2e', color: '#fff', padding: 15, borderRadius: 15, marginBottom: 20, textAlign: 'center' },
  brushSizeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f3f5', marginHorizontal: 4 },
  brushSizeBtnActive: { backgroundColor: '#3DBB8F' },
  brushSizeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  viewAllBtn: { alignItems: 'center', marginTop: 15, padding: 10 },
  fixedSigToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 15,
    paddingBottom: 25,
    paddingTop: 10,
    zIndex: 999,
    elevation: 20,
    borderTopWidth: 1,
    borderColor: '#333'
  },
  panelContainer: {
    backgroundColor: '#2c2c2e',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10
  },
  toolBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8
  },
  toolBarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 3
  },
  panelBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center'
  },
  shapeHandle: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  handleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  handleDotCorner: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FF9500',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  }
});
