export type LanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'ur';

export const LANGUAGES: {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir?: 'rtl' | 'ltr';
}[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
];

export const EMERGENCY_UI_COPY: Record<
  LanguageCode,
  {
    sectionTitle: string;
    callNow: string;
    copyNumber: string;
    copied: string;
    officialSource: string;
    whenToUse: string;
    whatToShare: string;
    quickTrigger: string;
    activeMedicineNote: string;
  }
> = {
  en: {
    sectionTitle: 'Verified Local Emergency & Regulatory Guidance',
    callNow: 'Call',
    copyNumber: 'Copy number',
    copied: 'Copied',
    officialSource: 'Official guidance',
    whenToUse: 'When to contact',
    whatToShare: 'What to tell the operator or pharmacist',
    quickTrigger: 'Emergency Help',
    activeMedicineNote: 'Details ready to read aloud for this medicine:',
  },
  hi: {
    sectionTitle: 'सत्यापित स्थानीय आपातकालीन और नियामक सहायता',
    callNow: 'कॉल करें',
    copyNumber: 'नंबर कॉपी करें',
    copied: 'कॉपी हो गया',
    officialSource: 'आधिकारिक दिशानिर्देश',
    whenToUse: 'कब संपर्क करें',
    whatToShare: 'ऑपरेटर या फार्मासिस्ट को क्या बताएं',
    quickTrigger: 'आपातकालीन मदद',
    activeMedicineNote: 'इस दवा की जानकारी बोलकर बताने के लिए:',
  },
  te: {
    sectionTitle: 'ధృవీకరించబడిన స్థానిక అత్యవసర మరియు నియంత్రణ మార్గదర్శకాలు',
    callNow: 'కాల్ చేయండి',
    copyNumber: 'నంబర్ కాపీ',
    copied: 'కాపీ అయింది',
    officialSource: 'అధికారిక మార్గదర్శకం',
    whenToUse: 'ఎప్పుడు సంప్రదించాలి',
    whatToShare: 'ఆపరేటర్ లేదా ఫార్మసిస్ట్‌కు చెప్పవలసిన వివరాలు',
    quickTrigger: 'అత్యవసర సహాయం',
    activeMedicineNote: 'ఈ మందు గురించి చెప్పడానికి సిద్ధంగా ఉన్న వివరాలు:',
  },
  ta: {
    sectionTitle: 'சரிபார்க்கப்பட்ட உள்ளூர் அவசர மற்றும் ஒழுங்குமுறை வழிகாட்டுதல்',
    callNow: 'அழைக்கவும்',
    copyNumber: 'எண்ணை நகலெடு',
    copied: 'நகலெடுக்கப்பட்டது',
    officialSource: 'அதிகாரப்பூர்வ வழிகாட்டி',
    whenToUse: 'எப்போது தொடர்பு கொள்ள வேண்டும்',
    whatToShare: 'அவசர உதவியாளரிடம் தெரிவிக்க வேண்டியவை',
    quickTrigger: 'அவசர உதவி',
    activeMedicineNote: 'இந்த மருந்தின் விவரங்கள்:',
  },
  bn: {
    sectionTitle: 'যাচাইকৃত স্থানীয় জরুরি ও নিয়ন্ত্রক নির্দেশিকা',
    callNow: 'কল করুন',
    copyNumber: 'নম্বর কপি করুন',
    copied: 'কপি হয়েছে',
    officialSource: 'সরকারি নির্দেশিকা',
    whenToUse: 'কখন যোগাযোগ করবেন',
    whatToShare: 'অপারেটর বা ফার্মাসিস্টকে কী জানাবেন',
    quickTrigger: 'জরুরি সাহায্য',
    activeMedicineNote: 'এই ওষুধের তথ্য:',
  },
  ur: {
    sectionTitle: 'مصدقہ مقامی ہنگامی اور سرکاری رہنمائی',
    callNow: 'کال کریں',
    copyNumber: 'نمبر کاپی کریں',
    copied: 'کاپی ہو گیا',
    officialSource: 'سرکاری رہنمائی',
    whenToUse: 'کب رابطہ کریں',
    whatToShare: 'آپریٹر یا فارماسسٹ کو کیا بتائیں',
    quickTrigger: 'ہنگامی مدد',
    activeMedicineNote: 'اس دوا کی تفصیلات:',
  },
};

export const UI_COPY: Record<
  LanguageCode,
  {
    slogan: string;
    heroTitle: string;
    heroSubtitle: string;
    searchPlaceholder: string;
    searchButton: string;
    scanCta: string;
    navSearch: string;
    navScan: string;
    navCompare: string;
    navInteractions: string;
    navReminders: string;
    countryLabel: string;
    languageLabel: string;
    largePrintLabel: string;
    sections: string[];
  }
> = {
  en: {
    slogan: 'Your medicine. Clearly explained.',
    heroTitle: 'Understand your medicines without medical jargon.',
    heroSubtitle:
      'Scan a box, search by country, or check how products compare. Every explanation comes strictly from retrieved official sources—never guessed.',
    searchPlaceholder: 'Search by brand or generic name (e.g. Paracetamol, Metformin, Dolo)...',
    searchButton: 'Search Medicines',
    scanCta: 'Scan a Medicine Label',
    navSearch: 'Search',
    navScan: 'Scan',
    navCompare: 'Compare',
    navInteractions: 'Interactions',
    navReminders: 'Reminders',
    countryLabel: 'Country of sale',
    languageLabel: 'Language',
    largePrintLabel: 'Large Print',
    sections: [
      '1. What is this medicine?',
      '2. What is its stated purpose?',
      '3. What does the official information say it is used for?',
      '4. How should the printed instructions be understood?',
      '5. Important warnings',
      '6. Commonly listed side effects',
      '7. Serious warning signs',
      '8. Storage instructions',
      '9. Questions to ask a pharmacist',
      '10. Official information and references',
    ],
  },
  hi: {
    slogan: 'आपकी दवा। सरल शब्दों में।',
    heroTitle: 'कठिन चिकित्सा शब्दों के बिना अपनी दवा को समझें।',
    heroSubtitle:
      'दवा के डिब्बे को स्कैन करें या देश के अनुसार खोजें। हर जानकारी आधिकारिक स्रोतों पर आधारित है।',
    searchPlaceholder: 'दवा का नाम या जेनेरिक नाम लिखें (जैसे Paracetamol, Dolo)...',
    searchButton: 'दवा खोजें',
    scanCta: 'दवा का लेबल स्कैन करें',
    navSearch: 'खोजें',
    navScan: 'स्कैन',
    navCompare: 'तुलना',
    navInteractions: 'परस्पर क्रिया',
    navReminders: 'रिमाइंडर',
    countryLabel: 'देश चुनें',
    languageLabel: 'भाषा',
    largePrintLabel: 'बड़ा फ़ॉन्ट',
    sections: [
      '1. यह दवा क्या है?',
      '2. इसका मुख्य उद्देश्य क्या है?',
      '3. आधिकारिक जानकारी के अनुसार इसका उपयोग किस लिए है?',
      '4. लेबल पर लिखे निर्देशों को कैसे समझें?',
      '5. महत्वपूर्ण चेतावनियाँ',
      '6. सामान्य दुष्प्रभाव',
      '7. गंभीर चेतावनी संकेत',
      '8. संग्रहण (स्टोरेज) निर्देश',
      '9. फार्मासिस्ट से पूछने योग्य प्रश्न',
      '10. आधिकारिक जानकारी और संदर्भ',
    ],
  },
  te: {
    slogan: 'మీ మందు. స్పష్టంగా వివరించబడింది.',
    heroTitle: 'కష్టమైన వైద్య పదాలు లేకుండా మీ మందులను అర్థం చేసుకోండి.',
    heroSubtitle:
      'మందుల బాక్స్‌ను స్కాన్ చేయండి లేదా దేశం వారీగా శోధించండి. ప్రతి వివరణ అధికారిక సమాచారంపై ఆధారపడి ఉంటుంది.',
    searchPlaceholder: 'బ్రాండ్ లేదా జనరిక్ పేరు శోధించండి (ఉదా. Paracetamol, Dolo)...',
    searchButton: 'మందులు శోధించండి',
    scanCta: 'మందు లేబుల్ స్కాన్ చేయండి',
    navSearch: 'శోధన',
    navScan: 'స్కాన్',
    navCompare: 'పోలిక',
    navInteractions: 'పరస్పర చర్యలు',
    navReminders: 'రిమైండర్లు',
    countryLabel: 'దేశం',
    languageLabel: 'భాష',
    largePrintLabel: 'పెద్ద అక్షరాలు',
    sections: [
      '1. ఈ మందు ఏమిటి?',
      '2. దీని ఉద్దేశ్యం ఏమిటి?',
      '3. అధికారిక సమాచారం ప్రకారం ఇది దేనికి ఉపయోగపడుతుంది?',
      '4. లేబుల్ సూచనలను ఎలా అర్థం చేసుకోవాలి?',
      '5. ముఖ్యమైన హెచ్చరికలు',
      '6. సాధారణ దుష్ప్రభావాలు',
      '7. తీవ్రమైన హెచ్చరిక సంకేతాలు',
      '8. నిల్వ చేసే విధానం',
      '9. ఫార్మసిస్ట్‌ను అడగవలసిన ప్రశ్నలు',
      '10. అధికారిక సమాచారం మరియు ఆధారాలు',
    ],
  },
  ta: {
    slogan: 'உங்கள் மருந்து. தெளிவான விளக்கம்.',
    heroTitle: 'மருத்துவக் கலைச்சொற்கள் இன்றி உங்கள் மருந்தை எளிதாகப் புரிந்துகொள்ளுங்கள்.',
    heroSubtitle:
      'மருந்து அட்டையை ஸ்கேன் செய்யவும் அல்லது நாடு வாரியாகத் தேடவும். அனைத்து தகவல்களும் அதிகாரப்பூர்வ ஆதாரங்களின் அடிப்படையில் வழங்கப்படுகின்றன.',
    searchPlaceholder: 'மருந்தின் பெயரை உள்ளிடவும் (எ.கா. Paracetamol, Metformin)...',
    searchButton: 'மருந்துகளைத் தேடு',
    scanCta: 'மருந்து லேபிளை ஸ்கேன் செய்',
    navSearch: 'தேடு',
    navScan: 'ஸ்கேன்',
    navCompare: 'ஒப்பிடு',
    navInteractions: 'மருந்து இடைவினை',
    navReminders: 'நினைவூட்டல்',
    countryLabel: 'நாடு',
    languageLabel: 'மொழி',
    largePrintLabel: 'பெரிய எழுத்து',
    sections: [
      '1. இந்த மருந்து என்ன?',
      '2. இதன் நோக்கம் என்ன?',
      '3. அதிகாரப்பூர்வ தகவல் இதன் பயன்பாட்டைப் பற்றி என்ன கூறுகிறது?',
      '4. அச்சிடப்பட்ட வழிமுறைகளை எவ்வாறு புரிந்துகொள்வது?',
      '5. முக்கிய எச்சரிக்கைகள்',
      '6. பொதுவான பக்க விளைவுகள்',
      '7. அவசர எச்சரிக்கை அறிகுறிகள்',
      '8. சேமிப்பு வழிமுறைகள்',
      '9. மருந்தாளரிடம் கேட்க வேண்டிய கேள்விகள்',
      '10. அதிகாரப்பூர்வ தகவல்கள் மற்றும் ஆதாரங்கள்',
    ],
  },
  bn: {
    slogan: 'আপনার ওষুধ। সহজ ভাষায় ব্যাখ্যা।',
    heroTitle: 'জটিল চিকিৎসা শব্দ ছাড়াই আপনার ওষুধ সম্পর্কে জানুন।',
    heroSubtitle:
      'ওষুধের বাক্স স্ক্যান করুন বা দেশ অনুযায়ী খুঁজুন। প্রতিটি ব্যাখ্যা সরকারি নথির উপর ভিত্তি করে তৈরি।',
    searchPlaceholder: 'ওষুধ বা জেনেরিক নাম লিখুন (যেমন Paracetamol, Metformin)...',
    searchButton: 'ওষুধ খুঁজুন',
    scanCta: 'ওষুধের লেবেল স্ক্যান করুন',
    navSearch: 'খুঁজুন',
    navScan: 'স্ক্যান',
    navCompare: 'তুলনা',
    navInteractions: 'ওষুধের বিক্রিয়া',
    navReminders: 'রিমাইন্ডার',
    countryLabel: 'দেশ',
    languageLabel: 'ভাষা',
    largePrintLabel: 'বড় লেখা',
    sections: [
      '১. এই ওষুধটি কী?',
      '২. এর মূল উদ্দেশ্য কী?',
      '৩. সরকারি তথ্য অনুযায়ী এটি কী কাজে ব্যবহৃত হয়?',
      '৪. লেবেলের নির্দেশাবলী কীভাবে বুঝবেন?',
      '৫. গুরুত্বপূর্ণ সতর্কতা',
      '৬. সাধারণ পার্শ্বপ্রতিক্রিয়া',
      '৭. গুরুতর সতর্কতার লক্ষণ',
      '৮. সংরক্ষণ নির্দেশাবলী',
      '৯. ফার্মাসিস্টকে জিজ্ঞাসা করার প্রশ্ন',
      '১০. সরকারি তথ্য ও সূত্র',
    ],
  },
  ur: {
    slogan: 'آپ کی دوا۔ آسان اور واضح الفاظ میں۔',
    heroTitle: 'مشکل طبی اصطلاحات کے بغیر اپنی دوا کو سمجھیں۔',
    heroSubtitle:
      'دوا کے ڈبے کو اسکین کریں یا ملک کے لحاظ سے تلاش کریں۔ تمام وضاحتیں مستند سرکاری ذرائع پر مبنی ہیں۔',
    searchPlaceholder: 'دوا یا عام نام درج کریں (مثلاً Paracetamol, Metformin)...',
    searchButton: 'دوا تلاش کریں',
    scanCta: 'دوا کا لیبل اسکین کریں',
    navSearch: 'تلاش',
    navScan: 'اسکین',
    navCompare: 'موازنہ',
    navInteractions: 'ادویات کا تعامل',
    navReminders: 'یاد دہانی',
    countryLabel: 'ملک',
    languageLabel: 'زبان',
    largePrintLabel: 'بڑے حروف',
    sections: [
      '1. یہ دوا کیا ہے؟',
      '2. اس کا مقصد کیا ہے؟',
      '3. سرکاری معلومات کے مطابق یہ کس لیے استعمال ہوتی ہے؟',
      '4. لیبل کی ہدایات کو کیسے سمجھیں؟',
      '5. اہم انتباہات',
      '6. عام ضمنی اثرات',
      '7. سنگین انتباہی علامات',
      '8. محفوظ رکھنے کی ہدایات',
      '9. فارماسسٹ سے پوچھنے کے سوالات',
      '10. سرکاری معلومات اور حوالہ جات',
    ],
  },
};
