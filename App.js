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
  PanResponder
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentScanner from 'react-native-document-scanner-plugin';
import ImagePicker from 'react-native-image-crop-picker';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { inpaintImage } from './inpaint';

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

// --- Global Helper Components ---
const ToolIcon = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.toolItem} onPress={onPress}>
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      <Text style={{fontSize: 24}}>{icon}</Text>
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
  const [currentStroke, setCurrentStroke] = useState([]);
  const [brushSize, setBrushSize] = useState(25);
  const [inpainting, setInpainting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [imageLayout, setImageLayout] = useState({ width: width, height: height * 0.6 });
  const [imageNatSize, setImageNatSize] = useState({ width: 1000, height: 1000 });

  const currentStrokeRef = useRef([]);
  const eraseImageRef = useRef(null);
  const imageLayoutRef = useRef({ width: width, height: height * 0.6 });
  const imageNatSizeRef = useRef({ width: 1000, height: 1000 });
  const brushSizeRef = useRef(25);
  const inpaintingRef = useRef(false);

  useEffect(() => { eraseImageRef.current = eraseImage; }, [eraseImage]);
  useEffect(() => { imageLayoutRef.current = imageLayout; }, [imageLayout]);
  useEffect(() => { imageNatSizeRef.current = imageNatSize; }, [imageNatSize]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { inpaintingRef.current = inpainting; }, [inpainting]);

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
    try {
      const image = await ImagePicker.openPicker({ width: 600, height: 800, cropping: true });
      setLoading(true);
      const manipulated = await ImageManipulator.manipulateAsync(image.path, [{ resize: { width: 800 } }], { base64: true, format: 'jpeg', compress: 0.5 });
      let formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${manipulated.base64}`);
      formData.append('language', 'ara'); formData.append('apikey', 'K81828384888957'); formData.append('OCREngine', '2');
      const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
      const data = await response.json();
      if (data && data.ParsedResults && data.ParsedResults[0]) { setOcrText(data.ParsedResults[0].ParsedText); setOcrModalVisible(true); }
      else { Alert.alert("هەڵە", "نەتوانرا دەقەکە بخوێنرێتەوە."); }
    } catch (e) { Alert.alert("هەڵە", "کێشەی سێرڤەر."); } finally { setLoading(false); }
  };

  const handleSignature = async () => {
    if (!(await checkPremiumLimit())) return;
    setToolsModalVisible(false);
    const res = await ExpoImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled && editingDoc) {
      const newPages = [...editingDoc.pages];
      newPages.push(res.assets[0].uri);
      setEditingDoc({ ...editingDoc, pages: newPages });
      Alert.alert("سەرکەوتوو", "ئیمزا زیاد کرا");
    }
  };

  const handleLock = async () => {
    if (!(await checkPremiumLimit())) return;
    setToolsModalVisible(false);
    setLockModalVisible(true);
  };

  const handlePPT = async () => {
    setToolsModalVisible(false);
    try {
      const res = await DocumentScanner.scanDocument({ maxNumDocuments: 50, responseType: 'imageFilePath', letUserAdjustCrop: true });
      if (res.scannedImages?.length > 0) {
        const newPpt = { id: Date.now().toString(), name: "PPT_" + Date.now(), date: new Date().toLocaleDateString(), pages: res.scannedImages, thumbnail: res.scannedImages[0], password: '', type: 'ppt' };
        const updatedDocs = [newPpt, ...documents];
        setDocuments(updatedDocs);
        await AsyncStorage.setItem('saved_documents', JSON.stringify(updatedDocs));
        Alert.alert("سەرکەوتوو", "پاوەرپۆینت دروست کرا ✅");
      }
    } catch (e) {}
  };

  const handleSmartEraseInit = async () => {
    setToolsModalVisible(false);
    try {
      const image = await ImagePicker.openPicker({ width: 1000, height: 1500, cropping: true });
      const imgPath = image.path;
      setEraseImage(imgPath);
      setImageHistory([imgPath]);
      setCurrentStroke([]);
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

  const calculateRelativePoint = (touchX, touchY) => {
    const containerW = imageLayoutRef.current.width || width;
    const containerH = imageLayoutRef.current.height || (height * 0.6);
    const imgW = imageNatSizeRef.current.width || 1000;
    const imgH = imageNatSizeRef.current.height || 1000;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;

    const offsetX = (containerW - displayW) / 2;
    const offsetY = (containerH - displayH) / 2;

    const relX = touchX - offsetX;
    const relY = touchY - offsetY;

    return {
      x: Math.max(0, Math.min(displayW, relX)),
      y: Math.max(0, Math.min(displayH, relY)),
      displayW,
      displayH
    };
  };

  const handleUndo = () => {
    if (imageHistory.length > 1) {
      const newHistory = imageHistory.slice(0, -1);
      setImageHistory(newHistory);
      setEraseImage(newHistory[newHistory.length - 1]);
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
        const { locationX, locationY } = evt.nativeEvent;
        const rel = calculateRelativePoint(locationX, locationY);
        currentStrokeRef.current = [{ x: rel.x, y: rel.y }];
        setCurrentStroke([{ x: rel.x, y: rel.y }]);
      },
      onPanResponderMove: (evt) => {
        if (inpaintingRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const rel = calculateRelativePoint(locationX, locationY);
        currentStrokeRef.current = [...currentStrokeRef.current, { x: rel.x, y: rel.y }];
        setCurrentStroke([...currentStrokeRef.current]);
      },
      onPanResponderRelease: async () => {
        if (inpaintingRef.current) return;
        const strokePts = [...currentStrokeRef.current];
        currentStrokeRef.current = [];
        setCurrentStroke([]);

        if (strokePts.length > 0 && eraseImageRef.current) {
          const containerW = imageLayoutRef.current.width || width;
          const containerH = imageLayoutRef.current.height || (height * 0.6);
          const imgW = imageNatSizeRef.current.width || 1000;
          const imgH = imageNatSizeRef.current.height || 1000;

          const scale = Math.min(containerW / imgW, containerH / imgH);
          const displayW = imgW * scale;
          const displayH = imgH * scale;

          try {
            setInpainting(true);
            const currentUri = eraseImageRef.current;

            const newUri = await inpaintImage(
              currentUri,
              strokePts,
              brushSizeRef.current,
              displayW,
              displayH,
              (progress) => setDownloadProgress(progress)
            );

            if (newUri) {
              setEraseImage(newUri);
              setImageHistory((prev) => [...prev, newUri]);
            }
          } catch (err) {
            const errorMsg = err?.message || "نەتوانرا سڕینەوەی وێنەکە ئەنجام بیدرێت";
            Alert.alert("هەڵە", errorMsg);
          } finally {
            setInpainting(false);
            setDownloadProgress(null);
          }
        }
      },
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
        {documents.slice(0, 3).map(doc => (
          <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => { if(doc.password) { setTargetDoc(doc); setPassInputVisible(true); } else { setEditingDoc(doc); setCurrentScreen('edit'); }}}>
            <Image source={{ uri: doc.thumbnail || doc.pages[0] }} style={styles.docThumb} />
            <View style={{flex: 1, marginLeft: 15}}><Text style={styles.docName}>{doc.name}</Text></View>
          </TouchableOpacity>
        ))}
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
        {documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(doc => (
          <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => { if(doc.password) { setTargetDoc(doc); setPassInputVisible(true); } else { setEditingDoc(doc); setCurrentScreen('edit'); }}}>
            <Image source={{ uri: doc.thumbnail || doc.pages[0] }} style={styles.docThumb} />
            <View style={{flex: 1, marginLeft: 15}}><Text style={styles.docName}>{doc.name}</Text><Text style={{color: '#8e8e93', fontSize: 11}}>{doc.date}</Text></View>
            <TouchableOpacity onPress={() => { const f = documents.filter(d => d.id !== doc.id); setDocuments(f); AsyncStorage.setItem('saved_documents', JSON.stringify(f)); }}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity>
          </TouchableOpacity>
        ))}
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

    return (
      <React.Fragment key={strokeIndex}>
        {strokePoints.map((pt, i) => (
          <View
            key={`pt-${strokeIndex}-${i}`}
            style={{
              position: 'absolute',
              left: pt.x - brushSize / 2,
              top: pt.y - brushSize / 2,
              width: brushSize,
              height: brushSize,
              borderRadius: brushSize / 2,
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
                top: cy - brushSize / 2,
                width: distance,
                height: brushSize,
                borderRadius: brushSize / 2,
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

    const undoCount = imageHistory.length - 1;

    return (
      <View style={[styles.flex1, {backgroundColor: '#000'}]}>
        <View style={styles.eraseHeader}>
          <TouchableOpacity onPress={() => { setImageHistory([]); setCurrentStroke([]); setCurrentScreen('home'); }}>
            <Text style={{color: '#fff', fontSize: 22}}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.eraseTitle}>سڕینەوەی دەق ✨</Text>

          <TouchableOpacity onPress={finishSmartErase} style={styles.saveEraseBtn}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>پاشەکەوتکردن</Text>
          </TouchableOpacity>
        </View>

        {/* IMAGE CANVAS CONTAINER WITH ONLAYOUT */}
        <View
          style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setImageLayout({ width: w, height: h });
          }}
        >
          <View style={{ width: containerW, height: containerH, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            {/* BASE FULL DOCUMENT IMAGE (MODIFIED DIRECTLY IN FULL RESOLUTION) */}
            <Image
              source={{ uri: eraseImage }}
              style={{ width: containerW, height: containerH }}
              resizeMode="contain"
            />

            {/* ACTIVE RED MASK PREVIEW WHILE DRAGGING FINGER */}
            {currentStroke.length > 0 && (
              <View style={{ position: 'absolute', left: offsetX, top: offsetY, width: displayW, height: displayH, overflow: 'hidden' }}>
                {renderSingleStroke(currentStroke, 'preview-stroke', 'rgba(255, 0, 0, 0.4)')}
              </View>
            )}

            {/* TOUCH OVERLAY */}
            <View
              style={StyleSheet.absoluteFill}
              {...panResponder.panHandlers}
            />
          </View>

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
                <Text style={{color: '#fff', marginTop: 12, fontWeight: 'bold'}}>خەریکی سڕینەوە لەسەر پیکسڵەکانە...</Text>
              )}
            </View>
          )}
        </View>

        {/* BOTTOM TOOLBAR */}
        <View style={styles.eraseFooter}>
           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10}}>
             <TouchableOpacity
               onPress={() => {
                 if (imageHistory.length > 0) {
                   const initial = imageHistory[0];
                   setEraseImage(initial);
                   setImageHistory([initial]);
                 }
               }}
               style={styles.eraseBtn}
             >
               <Text style={{color: '#ff3b30', fontWeight: 'bold'}}>🗑️ پاککردنەوەی هەمووی</Text>
             </TouchableOpacity>

             <TouchableOpacity onPress={handleUndo} disabled={undoCount <= 0} style={[styles.eraseBtn, undoCount <= 0 && {opacity: 0.5}]}>
               <Text style={{color: '#007AFF', fontWeight: 'bold'}}>↩️ پاشگەزبوونەوە ({undoCount})</Text>
             </TouchableOpacity>
           </View>

           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 5}}>
             <Text style={{color: '#333', fontWeight: 'bold', fontSize: 13}}>قەبارەی فرچە: {brushSize}</Text>
             <View style={styles.brushTrack}>
               {[15, 25, 35, 45].map(s => (
                 <TouchableOpacity key={s} onPress={() => setBrushSize(s)} style={[styles.brushDot, brushSize === s && {backgroundColor: '#3DBB8F'}]} />
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
      <FlatList data={editingDoc?.pages || []} keyExtractor={(_, i) => i.toString()} renderItem={({ item }) => (
          <View style={styles.pageCard}><Image source={{ uri: item }} style={styles.editImg} /></View>
        )}
      />
    </View>
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
      {currentScreen === 'edit' && renderEdit()}

      {/* TOOLS MODAL */}
      <Modal visible={toolsModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.toolsFullBox}><ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>ئامرازەکان</Text><TouchableOpacity onPress={() => setToolsModalVisible(false)}><Text style={{color: '#888'}}>✕</Text></TouchableOpacity></View>
        <View style={styles.toolsGrid}>
          <ToolIcon icon="📝" label="دەق" color="#E8F5E9" onPress={handleOCR} />
          <ToolIcon icon="✍️" label="ئیمزا" color="#FFF3E0" onPress={handleSignature} />
          <ToolIcon icon="🪄" label="سڕینەوە" color="#F3E5F5" onPress={handleSmartEraseInit} />
          <ToolIcon icon="🔐" label="قفڵ" color="#E3F2FD" onPress={handleLock} />
          <ToolIcon icon="📊" label="PPT" color="#E3F2FD" onPress={handlePPT} />
          <ToolIcon icon="🌐" label="وەرگێڕان" color="#E1F5FE" onPress={() => { setToolsModalVisible(false); setTransModalVisible(true); }} />
        </View>
        <Text style={styles.sectionTitle}>سکانی زیرەک</Text>
        <View style={styles.toolsGrid}><ToolIcon icon="🪪" label="ناسنامە" color="#E1F5FE" onPress={() => { setToolsModalVisible(false); setIdModalVisible(true); }} /><ToolIcon icon="📚" label="کتێب" color="#F3E5F5" onPress={startScan} /></View>
        <TouchableOpacity onPress={() => setToolsModalVisible(false)} style={styles.closeBtn}><Text style={{color: '#fff', fontWeight: 'bold'}}>داخستن</Text></TouchableOpacity>
      </ScrollView></View></View></Modal>

      {/* Other Modals */}
      <Modal visible={vipModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.vipFullBox}><ScrollView contentContainerStyle={{alignItems: 'center'}}><Text style={styles.vipHeaderTitle}>Scanner Pro VIP ⭐</Text><View style={styles.fibInfoCard}><Text style={{color: '#fff'}}>FIB: 0750 715 9851</Text></View><TextInput style={styles.codeIn} placeholder="کۆد..." placeholderTextColor="#555" value={secretCode} onChangeText={setSecretCode} /><TouchableOpacity style={styles.actBtn} onPress={activateVipOnline}><Text style={{color: '#fff', fontWeight: 'bold'}}>چالاککردن</Text></TouchableOpacity><TouchableOpacity onPress={() => setVipModalVisible(false)} style={{marginTop: 20}}><Text style={{color: '#fff'}}>✕</Text></TouchableOpacity></ScrollView></View></View></Modal>
      <Modal visible={transModalVisible} transparent animationType="slide"><View style={styles.overlay}><View style={styles.transBox}><Text style={styles.transTitle}>وەرگێڕی پڕۆ 🌐</Text><View style={styles.langRow}><TouchableOpacity style={[styles.langBtn, targetLang === 'en' && styles.langBtnActive]} onPress={() => setTargetLang('en')}><Text style={styles.langText}>EN</Text></TouchableOpacity><TouchableOpacity style={[styles.langBtn, targetLang === 'ar' && styles.langBtnActive]} onPress={() => setTargetLang('ar')}><Text style={styles.langText}>AR</Text></TouchableOpacity><TouchableOpacity style={[styles.langBtn, targetLang === 'ku' && styles.langBtnActive]} onPress={() => setTargetLang('ku')}><Text style={styles.langText}>KU</Text></TouchableOpacity></View><TextInput style={styles.transIn} placeholder="لێرە بنووسە..." placeholderTextColor="#888" multiline value={transInput} onChangeText={setTransInput} textAlign="right" autoFocus /><TouchableOpacity style={styles.actBtn} onPress={handleTranslateAction}><Text style={{color: '#fff', fontWeight: 'bold'}}>ئێستا وەریگێڕە</Text></TouchableOpacity><View style={styles.resBox}><ScrollView><Text style={{color: '#000', fontSize: 16, textAlign: 'right'}}>{transOutput || "ئەنجام..."}</Text></ScrollView>{transOutput !== '' && (<TouchableOpacity onPress={() => { Clipboard.setString(transOutput); Alert.alert("کۆپی کرا"); }} style={{alignSelf: 'flex-start', padding: 5}}><Text style={{color: '#007AFF', fontSize: 12}}>📋 کۆپی کردن</Text></TouchableOpacity>)}</View><TouchableOpacity onPress={() => { setTransModalVisible(false); setTransOutput(''); }} style={{marginTop: 15}}><Text style={{color: '#ff3b30', textAlign: 'center', fontWeight: 'bold'}}>داخستن</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={ocrModalVisible} transparent><View style={styles.overlay}><View style={styles.ocrBox}><Text style={styles.ocrTitle}>دەق 🔎</Text><ScrollView style={{maxHeight: 200}}><Text style={{color: '#fff'}}>{ocrText}</Text></ScrollView><TouchableOpacity onPress={() => setOcrModalVisible(false)} style={{marginTop: 15}}><Text style={{color: '#007AFF', textAlign: 'center'}}>داخستن</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={idModalVisible} transparent animationType="fade"><View style={styles.overlay}><View style={styles.idBox}><View style={styles.idPreviewBox}><Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1042/1042340.png' }} style={styles.idIllustration} /><View style={styles.passportGuideBox}><Text style={styles.guideLine}>┌                                          ┐</Text><View style={{height: 60}} /><Text style={{color: '#fff', fontSize: 10, textAlign: 'center'}}>وێنەی {idCategory} لێرە ڕێکبخە</Text><View style={{height: 20}} /><Text style={styles.guideLine}>└                                          ┘</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.idCats}>{['گشتی', 'ناسنامە', 'مۆڵەت', 'پاسپۆرت', 'کارتی بانکی', 'بڕوانامە'].map(cat => (<TouchableOpacity key={cat} style={[styles.catBtn, idCategory === cat && styles.catBtnActive]} onPress={() => setIdCategory(cat)}><Text style={[styles.catText, idCategory === cat && {color: '#fff'}]}>{cat}</Text></TouchableOpacity>))}</ScrollView><TouchableOpacity style={styles.makeBtn} onPress={startIDScan}><Text style={styles.makeBtnText}>ئێستا وێنەکە بگرە</Text></TouchableOpacity><TouchableOpacity onPress={() => setIdModalVisible(false)} style={{marginTop: 15}}><Text style={{color: '#888', textAlign: 'center'}}>پاشگەزبوونەوە</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={lockModalVisible} transparent><View style={styles.overlay}><View style={styles.renameBox}><Text style={{color: '#fff', marginBottom: 15, textAlign:'center'}}>کۆد بۆ فایل دابنێ</Text><TextInput style={styles.renameIn} placeholder="Pass..." value={docPassword} onChangeText={setDocPassword} keyboardType="numeric" /><TouchableOpacity onPress={() => { if(editingDoc) setEditingDoc({...editingDoc, password: docPassword}); setLockModalVisible(false); Alert.alert("سەرکەوتوو", "فایلەکە قفڵ کرا"); }}><Text style={{color: '#34C759', fontWeight: 'bold', textAlign: 'center'}}>تەواو</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={passInputVisible} transparent><View style={styles.overlay}><View style={styles.renameBox}><Text style={{color: '#fff', marginBottom: 15}}>قفڵ کراوە 🔒</Text><TextInput style={styles.renameIn} placeholder="کۆد..." value={enteredPass} onChangeText={setPassToCheck} secureTextEntry /><TouchableOpacity onPress={() => { if(enteredPass===targetDoc.password) { setEditingDoc(targetDoc); setCurrentScreen('edit'); setPassInputVisible(false); setPassToCheck(''); } else Alert.alert("هەڵە","کۆدەکە هەڵەیە"); }}><Text style={{color: '#007AFF', fontWeight: 'bold', textAlign: 'center'}}>بیکەرەوە</Text></TouchableOpacity></View></View></Modal>

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
  viewAllBtn: { alignItems: 'center', marginTop: 15, padding: 10 }
});
