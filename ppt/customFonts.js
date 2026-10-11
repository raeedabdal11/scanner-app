// Unicode Kurdish fonts bundled in assets/font (copied from the user's Windows fonts).
// Every one contains ڕ ڵ ێ ۆ ە ی ک گ (checked against the font's cmap).
// id     = fontFamily the app registers with expo-font (no spaces)
// family = the real family name from the font's name table — what PowerPoint shows and what the
//          PPTX writes into <a:latin>/<a:ea>/<a:cs>
// Loaded in the background by PptEditorModal (useFonts) — app launch never waits for them.
// Order = order in the picker (most popular first).

export const CUSTOM_KURDISH_FONTS = [
  { id: 'Rudaw', family: 'Rudaw', label: 'ڕووداو', file: require('../assets/font/Rudaw_Regular.ttf') },
  { id: 'UniShlerSamik', family: 'UniCode S-Samik', label: 'شلێر سمک', file: require('../assets/font/UniCodeShlerSamik.ttf') },
  { id: 'UniShlerKhaldar', family: 'UniCode S-Khaldar', label: 'شلێر خاڵدار', file: require('../assets/font/UniCode-Shler_Khaldar.ttf') },
  { id: 'UniShlerKufy', family: 'UniCode S-Kufy', label: 'شلێر کووفی', file: require('../assets/font/UniCodeSansShler.ttf') },
  { id: 'SarchiaAli', family: 'Sarchia_Ali', label: 'سەرچیا عەلی', file: require('../assets/font/10_Sarchia_Ali.ttf') },
  { id: 'UnikurdWeb', family: 'Unikurd Web', label: 'یونیکورد وێب', file: require('../assets/font/Unikuweb_0.ttf') },
  { id: 'UnikurdGoran', family: 'Unikurd Goran', label: 'یونیکورد گۆران', file: require('../assets/font/KGoran_0.ttf') },
  { id: 'UnikurdHejar', family: 'Unikurd Hejar', label: 'یونیکورد هەژار', file: require('../assets/font/KHejar.ttf') },
  { id: 'UnikurdNaske', family: 'Unikurd Naske', label: 'یونیکورد نەسخ', file: require('../assets/font/KNaske.ttf') },
  { id: 'UnikurdXani', family: 'Unikurd Xani', label: 'یونیکورد خانی', file: require('../assets/font/KXani.ttf') },
  { id: 'UnikurdNali', family: 'Unikurd Nali', label: 'یونیکورد نالی', file: require('../assets/font/KNali.ttf') },
  { id: 'UnikurdHemen', family: 'Unikurd Hemen', label: 'یونیکورد هێمن', file: require('../assets/font/KHemen.ttf') },
  { id: 'UnikurdJino', family: 'Unikurd Jino', label: 'یونیکورد ژینۆ', file: require('../assets/font/KJino.ttf') },
  { id: 'UnikurdHiwa', family: 'Unikurd Hiwa', label: 'یونیکورد هیوا', file: require('../assets/font/kHiwa.ttf') },
  { id: 'UnikurdTishk', family: 'Unikurd Tishk', label: 'یونیکورد تیشک', file: require('../assets/font/KTishk.ttf') },
  { id: 'UnikurdDigital', family: 'Unikurd Digital', label: 'یونیکورد دیجیتاڵ', file: require('../assets/font/KDigital.ttf') },
  { id: 'UnikurdEzmer', family: 'Unikurd Ezmer', label: 'یونیکورد ئەزمەر', file: require('../assets/font/KEzmer.ttf') },
  { id: 'UnikurdHana', family: 'Unikurd Hana', label: 'یونیکورد هانا', file: require('../assets/font/KHana.ttf') },
  { id: 'UnikurdKale', family: 'Unikurd Kale', label: 'یونیکورد کالێ', file: require('../assets/font/KKale.ttf') },
  { id: 'UnikurdKamran', family: 'Unikurd Kamran', label: 'یونیکورد کامەران', file: require('../assets/font/KKamran.ttf') },
  { id: 'UnikurdKawe', family: 'Unikurd Kawe', label: 'یونیکورد کاوە', file: require('../assets/font/Kkawe.ttf') },
  { id: 'UnikurdKoch', family: 'Unikurd Koch', label: 'یونیکورد کۆچ', file: require('../assets/font/kkoch.ttf') },
  { id: 'UnikurdMagroon', family: 'Unikurd Magroon', label: 'یونیکورد ماگرون', file: require('../assets/font/KMagroon.ttf') },
  { id: 'UnikurdMestan', family: 'Unikurd Mestan', label: 'یونیکورد مەستان', file: require('../assets/font/KMestan.ttf') },
  { id: 'UnikurdMidya', family: 'Unikurd Midya', label: 'یونیکورد میدیا', file: require('../assets/font/Kmidya.ttf') },
  { id: 'UnikurdPeshiw', family: 'Unikurd Peshiw', label: 'یونیکورد پێشیو', file: require('../assets/font/KPeshew.ttf') },
  { id: 'UnikurdQandil', family: 'Unikurd Qandil', label: 'یونیکورد قەندیل', file: require('../assets/font/KQandil.ttf') },
  { id: 'UnikurdRawanduz', family: 'Unikurd Rawanduz', label: 'یونیکورد ڕەواندز', file: require('../assets/font/KRawanduz.ttf') },
  { id: 'UnikurdReyhan', family: 'Unikurd Reyhan', label: 'یونیکورد ڕەیحان', file: require('../assets/font/KReyhan.ttf') },
  { id: 'UnikurdRoonak', family: 'Unikurd Roonak', label: 'یونیکورد ڕووناک', file: require('../assets/font/KRoonak.ttf') },
  { id: 'UnikurdSeyran', family: 'Unikurd Seyran', label: 'یونیکورد سەیران', file: require('../assets/font/KSeyran.ttf') },
  { id: 'UnikurdShilan', family: 'Unikurd Shilan', label: 'یونیکورد شیلان', file: require('../assets/font/Kshilan.ttf') },
  { id: 'UnikurdSiber', family: 'Unikurd Siber', label: 'یونیکورد سایبەر', file: require('../assets/font/KSiber.ttf') },
  { id: 'UnikurdSirwan', family: 'Unikurd Sirwan', label: 'یونیکورد سیروان', file: require('../assets/font/KSirwan.ttf') },
  { id: 'UnikurdTewar', family: 'Unikurd Tewar', label: 'یونیکورد تەوار', file: require('../assets/font/KTewar.ttf') },
  { id: 'UnikurdXatoon', family: 'Unikurd Xatoon', label: 'یونیکورد خاتوون', file: require('../assets/font/KXatoon.ttf') },
  { id: 'UnikurdXezal', family: 'Unikurd Xezal', label: 'یونیکورد خەزاڵ', file: require('../assets/font/KXezal.ttf') },
  { id: 'UnikurdYadgar', family: 'Unikurd Yadgar', label: 'یونیکورد یادگار', file: require('../assets/font/KYadgar.ttf') },
];

// { id: moduleId } map for expo-font's useFonts / loadAsync
export const CUSTOM_FONT_SOURCES = CUSTOM_KURDISH_FONTS.reduce((acc, f) => {
  acc[f.id] = f.file;
  return acc;
}, {});
