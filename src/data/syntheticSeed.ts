import { count } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  activeIngredients,
  countryConfigs,
  medicineBrands,
  medicineContraindications,
  medicineCountryApprovals,
  medicineFormulations,
  medicineIndications,
  medicineInstructions,
  medicineInteractions,
  medicineLanguages,
  medicineManufacturers,
  medicineSideEffects,
  medicineSources,
  medicinesMaster,
  medicineStrengths,
  medicineUpdateHistory,
  medicineWarnings,
} from '../db/schema.ts';

let seedPromise: Promise<void> | null = null;

interface SyntheticRecordSpec {
  id: string;
  countryCode: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  strength: string;
  dosageForm: string;
  route: string;
  manufacturerId: string;
  manufacturerName: string;
  authNumber: string;
  regulatoryStatus: string;
  indications: string;
  plainPurpose: string;
  patientInfo: string;
  prescribingInfo: string;
  storage: string;
  sourceUrl: string;
  sourceAuthority: string;
  verificationStatus?: string;
  safetyLevel?: string;
  missingFields?: string[];
  warningText: string;
  plainWarning: string;
  warningTier: string;
  commonSideEffect: string;
  seriousSideEffect: string;
  contraindication: string;
  hiPurpose: string;
  tePurpose: string;
}

const COUNTRY_CONFIG_SEED: (typeof countryConfigs.$inferInsert)[] = [
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    regulatoryAuthorities: ['MHRA', 'NHS Medicines A-Z', 'eMC (Electronic Medicines Compendium)', 'NICE / BNF (Licensed)'],
    officialDataSources: [
      { name: 'NHS Medicines A-Z', url: 'https://www.nhs.uk/medicines/', integrationStatus: 'Reference Registry (License Check Required)' },
      { name: 'MHRA Products & Alerts', url: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency', integrationStatus: 'Reference Registry' },
      { name: 'Electronic Medicines Compendium (eMC)', url: 'https://www.medicines.org.uk/emc', integrationStatus: 'Reference Registry (SmPC / PIL)' },
    ],
    approvedLanguages: ['en', 'hi', 'te', 'ta', 'bn', 'ur'],
    emergencyNumber: '999',
    emergencyGuidance: 'Call 999 for life-threatening emergencies or NHS 111 for urgent medical help.',
    classificationRules: {
      POM: 'Prescription-Only Medicine (POM)',
      P: 'Pharmacy Medicine (P)',
      GSL: 'General Sales List / Over-The-Counter (GSL)',
    },
    privacyFramework: 'UK GDPR & Data Protection Act 2018',
    sourceUpdateSchedule: 'Weekly MHRA Safety & eMC SmPC sync check',
    isActive: true,
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    regulatoryAuthorities: ['CDSCO', 'Indian Pharmacopoeia Commission (IPC)', 'Ministry of Health & Family Welfare (MoHFW)'],
    officialDataSources: [
      { name: 'CDSCO Drug Regulatory Portal', url: 'https://cdsco.gov.in/', integrationStatus: 'Reference Registry' },
      { name: 'Indian Pharmacopoeia Commission', url: 'https://ipc.gov.in/', integrationStatus: 'Reference Registry' },
      { name: 'MoHFW India', url: 'https://mohfw.gov.in/', integrationStatus: 'Reference Registry' },
    ],
    approvedLanguages: ['en', 'hi', 'te', 'ta', 'bn', 'ur'],
    emergencyNumber: '112',
    emergencyGuidance: 'Call 112 (National Emergency Helpline) or 108 (Ambulance) immediately for severe symptoms.',
    classificationRules: {
      'Schedule H / H1': 'Prescription-Only Medicine (Schedule H / H1)',
      'Schedule G': 'Medical Supervision Required',
      OTC: 'Over-The-Counter / Non-Scheduled',
    },
    privacyFramework: 'India Digital Personal Data Protection (DPDP) Act 2023',
    sourceUpdateSchedule: 'Monthly CDSCO & IPC Formulary verification',
    isActive: true,
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    regulatoryAuthorities: ['U.S. FDA Drugs@FDA', 'DailyMed (NLM)', 'MedlinePlus'],
    officialDataSources: [
      { name: 'OpenFDA Drug Label API', url: 'https://api.fda.gov/drug/label.json', integrationStatus: 'Live Public API Connected' },
      { name: 'DailyMed NLM', url: 'https://dailymed.nlm.nih.gov/', integrationStatus: 'Live Link & SPL Mapping' },
      { name: 'MedlinePlus', url: 'https://medlineplus.gov/', integrationStatus: 'Reference Registry' },
    ],
    approvedLanguages: ['en', 'es', 'hi', 'zh'],
    emergencyNumber: '911',
    emergencyGuidance: 'Call 911 immediately for medical emergencies, or Poison Control at 1-800-222-1222.',
    classificationRules: {
      Rx: 'Prescription-Only (Rx Only)',
      OTC: 'Over-The-Counter (OTC Monograph / NDA)',
    },
    privacyFramework: 'US Privacy & HIPAA-aligned minimization',
    sourceUpdateSchedule: 'Live OpenFDA SPL Query + Daily sync',
    isActive: true,
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    regulatoryAuthorities: ['Health Canada Drug Product Database (DPD)'],
    officialDataSources: [
      { name: 'Health Canada DPD', url: 'https://health-products.canada.ca/dpd-bdpp/', integrationStatus: 'Reference Registry (Open Data Adapter Ready)' },
    ],
    approvedLanguages: ['en', 'fr'],
    emergencyNumber: '911',
    emergencyGuidance: 'Call 911 or visit the nearest hospital emergency department immediately.',
    classificationRules: {
      Pr: 'Prescription Drug (Pr)',
      OTC: 'Non-Prescription / Over-The-Counter',
    },
    privacyFramework: 'PIPEDA & Canadian Provincial Health Privacy',
    sourceUpdateSchedule: 'Weekly Health Canada DPD monograph check',
    isActive: true,
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    regulatoryAuthorities: ['Therapeutic Goods Administration (TGA)', 'ARTG', 'Consumer Medicine Information (CMI)'],
    officialDataSources: [
      { name: 'TGA Australia', url: 'https://www.tga.gov.au/', integrationStatus: 'Reference Registry' },
    ],
    approvedLanguages: ['en'],
    emergencyNumber: '000',
    emergencyGuidance: 'Call 000 (Triple Zero) immediately, or Poisons Information Centre on 13 11 26.',
    classificationRules: {
      S4: 'Schedule 4 Prescription-Only',
      S3: 'Schedule 3 Pharmacist-Only',
      S2: 'Schedule 2 Pharmacy Medicine',
    },
    privacyFramework: 'Australian Privacy Act 1988 (APPs)',
    sourceUpdateSchedule: 'Monthly TGA ARTG & CMI sync',
    isActive: true,
  },
  {
    countryCode: 'EU',
    countryName: 'European Union',
    regulatoryAuthorities: ['European Medicines Agency (EMA)', 'National Competent Authorities'],
    officialDataSources: [
      { name: 'European Medicines Agency (EMA)', url: 'https://www.ema.europa.eu/', integrationStatus: 'Reference Registry' },
    ],
    approvedLanguages: ['en', 'fr', 'de', 'es'],
    emergencyNumber: '112',
    emergencyGuidance: 'Call 112 (EU-wide emergency helpline) immediately for urgent care.',
    classificationRules: {
      Rx: 'Subject to Medical Prescription',
      OTC: 'Not Subject to Medical Prescription',
    },
    privacyFramework: 'EU General Data Protection Regulation (GDPR)',
    sourceUpdateSchedule: 'Weekly EMA EPAR product update check',
    isActive: true,
  },
];

const SYNTHETIC_RECORDS: SyntheticRecordSpec[] = [
  // UNITED KINGDOM (9 synthetic test records)
  {
    id: 'SYN-GB-001',
    countryCode: 'GB',
    brandName: 'Paracetamol-Synth UK [SYNTHETIC TEST]',
    genericName: 'Paracetamol',
    activeIngredients: 'Paracetamol',
    strength: '500 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-01',
    manufacturerName: 'Albion Synthetic Pharma Ltd (Test)',
    authNumber: 'PL-SYNTH-0001/01',
    regulatoryStatus: 'Over-The-Counter',
    indications: 'Synthetic test indication: relief of mild-to-moderate pain (headache, toothache) and reduction of fever.',
    plainPurpose: 'Used to relieve everyday aches, pains, and high temperature.',
    patientInfo: 'Adults: swallow 1 or 2 tablets with water every 4 to 6 hours if needed. Do not exceed 8 tablets (4000 mg) in 24 hours.',
    prescribingInfo: 'Synthetic SmPC summary: Standard adult oral dose 500 mg to 1000 mg every 4–6 hours; maximum 4 g/day.',
    storage: 'Store below 25°C in the original blister pack away from children.',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK eMC / NHS structure',
    warningText: 'Contains paracetamol. Do not take with any other paracetamol-containing products. Immediate medical advice required in overdose even if you feel well.',
    plainWarning: 'Never take this with other cold, flu, or pain medicines that also contain paracetamol, as too much can harm your liver.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild nausea (uncommon at standard doses)',
    seriousSideEffect: 'Severe skin rash, yellowing of skin/eyes, or allergic facial swelling',
    contraindication: 'Known hypersensitivity to paracetamol or severe hepatic impairment',
    hiPurpose: 'हल्के से मध्यम दर्द और बुखार से राहत के लिए उपयोग किया जाता है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'తేలికపాటి నుండి మధ్యస్థ నొప్పి మరియు జ్వరాన్ని తగ్గించడానికి ఉపయోగించబడుతుంది. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-002',
    countryCode: 'GB',
    brandName: 'Amoxil-Synth UK [SYNTHETIC TEST]',
    genericName: 'Amoxicillin',
    activeIngredients: 'Amoxicillin',
    strength: '500 mg',
    dosageForm: 'Hard Capsule',
    route: 'Oral',
    manufacturerId: 'MFR-GB-01',
    manufacturerName: 'Albion Synthetic Pharma Ltd (Test)',
    authNumber: 'PL-SYNTH-0002/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: treatment of susceptible bacterial infections including respiratory and urinary tract infections.',
    plainPurpose: 'An antibiotic used to treat bacterial infections prescribed by a clinician.',
    patientInfo: 'Take one capsule three times a day spaced evenly apart, or as directed on your prescription label. Complete the full prescribed course.',
    prescribingInfo: 'Synthetic SmPC summary: Penicillin-class beta-lactam antibiotic; 500 mg every 8 hours depending on infection severity.',
    storage: 'Store below 25°C in a dry place.',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK eMC / MHRA structure',
    warningText: 'Penicillin allergy warning: severe hypersensitivity (anaphylaxis) has been reported.',
    plainWarning: 'Do not take if you have ever had an allergic reaction to penicillin or cephalosporin antibiotics.',
    warningTier: 'RED',
    commonSideEffect: 'Mild stomach upset, diarrhoea, or nausea',
    seriousSideEffect: 'Difficulty breathing, throat swelling, or widespread blistering rash',
    contraindication: 'History of severe immediate hypersensitivity to penicillin',
    hiPurpose: 'डॉक्टर द्वारा बताए गए जीवाणु संक्रमण के इलाज के लिए एक एंटीबायोटिक। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'వైద్యుడు సూచించిన బ్యాక్టీరియా ఇన్ఫెక్షన్ల చికిత్సకు ఉపయోగించే యాంటీబయాటిక్. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-003',
    countryCode: 'GB',
    brandName: 'Glucophage-Synth UK [SYNTHETIC TEST]',
    genericName: 'Metformin Hydrochloride',
    activeIngredients: 'Metformin',
    strength: '500 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-02',
    manufacturerName: 'Thames Clinical Generics (Test)',
    authNumber: 'PL-SYNTH-0003/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: management of type 2 diabetes mellitus when diet and exercise alone are insufficient.',
    plainPurpose: 'Helps lower and steady blood sugar levels in adults with type 2 diabetes.',
    patientInfo: 'Take with or just after a meal to help reduce stomach upset. Follow the exact dose prescribed by your doctor.',
    prescribingInfo: 'Synthetic SmPC summary: Biguanide antihyperglycaemic agent; monitor renal function (eGFR) regularly.',
    storage: 'No special temperature storage conditions required; keep out of reach of children.',
    sourceUrl: 'https://www.nhs.uk/medicines/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK NHS / eMC structure',
    warningText: 'Rare risk of lactic acidosis, especially with sudden kidney impairment or severe dehydration.',
    plainWarning: 'Tell your doctor before any medical scan using contrast dye, and seek help if you develop severe vomiting or unusual tiredness.',
    warningTier: 'AMBER',
    commonSideEffect: 'Nausea, mild stomach discomfort, or metallic taste during initial weeks',
    seriousSideEffect: 'Rapid breathing, severe muscle pain, extreme drowsiness (signs of lactic acidosis)',
    contraindication: 'Severe renal failure (eGFR < 30 mL/min) or acute metabolic acidosis',
    hiPurpose: 'टाइप 2 मधुमेह में रक्त शर्करा को नियंत्रित रखने में मदद करता है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'టైప్ 2 డయాబెటిస్‌లో రక్తంలో చక్కెర స్థాయిలను నియంత్రించడంలో సహాయపడుతుంది. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-004',
    countryCode: 'GB',
    brandName: 'Zestril-Synth UK [SYNTHETIC TEST]',
    genericName: 'Lisinopril',
    activeIngredients: 'Lisinopril',
    strength: '10 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-02',
    manufacturerName: 'Thames Clinical Generics (Test)',
    authNumber: 'PL-SYNTH-0004/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: treatment of hypertension and symptomatic heart failure.',
    plainPurpose: 'Relaxes blood vessels to lower high blood pressure and reduce strain on the heart.',
    patientInfo: 'Take once daily at around the same time each day, with or without food.',
    prescribingInfo: 'Synthetic SmPC summary: ACE inhibitor; monitor blood pressure, renal function, and serum potassium.',
    storage: 'Store below 30°C.',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK eMC structure',
    warningText: 'Contraindicated in pregnancy. May cause angioedema (swelling of face, lips, or tongue).',
    plainWarning: 'Do not use during pregnancy. Seek urgent care immediately if your lips, tongue, or throat start to swell.',
    warningTier: 'RED',
    commonSideEffect: 'Dry tickly cough or mild dizziness when standing up quickly',
    seriousSideEffect: 'Swelling of face, lips, or tongue (angioedema)',
    contraindication: 'Pregnancy (second and third trimesters) or history of ACE-inhibitor angioedema',
    hiPurpose: 'उच्च रक्तचाप को कम करने और हृदय पर दबाव घटाने के लिए उपयोग की जाती है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'అధిక రక్తపోటును తగ్గించడానికి మరియు గుండెపై భారాన్ని తగ్గించడానికి ఉపయోగిస్తారు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-005',
    countryCode: 'GB',
    brandName: 'Ventolin-Synth UK [SYNTHETIC TEST]',
    genericName: 'Salbutamol',
    activeIngredients: 'Salbutamol',
    strength: '100 micrograms/actuation',
    dosageForm: 'Pressurised Inhalation Suspension',
    route: 'Inhalation',
    manufacturerId: 'MFR-GB-01',
    manufacturerName: 'Albion Synthetic Pharma Ltd (Test)',
    authNumber: 'PL-SYNTH-0005/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: symptomatic relief of bronchospasm in asthma and COPD.',
    plainPurpose: 'A reliever inhaler that quickly opens tightened airways to make breathing easier.',
    patientInfo: 'Inhale 1 or 2 puffs when needed for sudden shortness of breath, as detailed in your personal asthma action plan.',
    prescribingInfo: 'Synthetic SmPC summary: Short-acting beta-2 agonist (SABA); increasing reliever use signals poor asthma control.',
    storage: 'Store below 30°C. Pressurised canister: do not puncture or expose to frost or direct sunlight.',
    sourceUrl: 'https://www.nhs.uk/medicines/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK NHS / eMC structure',
    warningText: 'If your reliever inhaler does not ease breathing for at least 3 hours, seek urgent medical attention.',
    plainWarning: 'If you need your blue reliever inhaler more than 3 times a week, contact your doctor or asthma nurse for a review.',
    warningTier: 'AMBER',
    commonSideEffect: 'Temporary mild hand tremor or faster heartbeat',
    seriousSideEffect: 'Worsening severe breathlessness immediately after inhaling (paradoxical bronchospasm)',
    contraindication: 'Hypersensitivity to salbutamol or propellant excipients',
    hiPurpose: 'अस्थमा या सांस फूलने के दौरान वायुमार्ग को जल्दी खोलने वाला रिलीवर इनहेलर। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'ఆస్తమా లేదా శ్వాస ఆడకపోయినప్పుడు వాయుమార్గాలను త్వరగా తెరిచే రిలీవర్ ఇన్హేలర్. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-006',
    countryCode: 'GB',
    brandName: 'Lipitor-Synth UK [SYNTHETIC TEST]',
    genericName: 'Atorvastatin',
    activeIngredients: 'Atorvastatin',
    strength: '20 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-02',
    manufacturerName: 'Thames Clinical Generics (Test)',
    authNumber: 'PL-SYNTH-0006/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: reduction of elevated LDL-cholesterol and cardiovascular event risk.',
    plainPurpose: 'Lowers cholesterol levels in the blood to help protect against heart attacks and strokes.',
    patientInfo: 'Take one tablet once daily at any time of day, with or without food.',
    prescribingInfo: 'Synthetic SmPC summary: HMG-CoA reductase inhibitor (statin). Avoid large quantities of grapefruit juice.',
    storage: 'Store below 25°C.',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK eMC structure',
    warningText: 'Report unexplained muscle pain, tenderness, or weakness promptly.',
    plainWarning: 'Contact your doctor promptly if you notice unusual muscle pain, tenderness, or dark-coloured urine.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild headache, nasal congestion, or joint ache',
    seriousSideEffect: 'Severe unexplained muscle pain or weakness (rhabdomyolysis risk)',
    contraindication: 'Active liver disease or pregnancy/breastfeeding',
    hiPurpose: 'रक्त में कोलेस्ट्रॉल कम करने और हृदय स्वास्थ्य की रक्षा करने के लिए उपयोग की जाती है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'రక్తంలో కొలెస్ట్రాల్‌ను తగ్గించడానికి మరియు గుండె ఆరోగ్యాన్ని కాపాడటానికి ఉపయోగిస్తారు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-007',
    countryCode: 'GB',
    brandName: 'Warfarin-Synth UK [SYNTHETIC TEST]',
    genericName: 'Warfarin Sodium',
    activeIngredients: 'Warfarin',
    strength: '3 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-01',
    manufacturerName: 'Albion Synthetic Pharma Ltd (Test)',
    authNumber: 'PL-SYNTH-0007/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: prophylaxis and treatment of venous thrombosis and thromboembolism.',
    plainPurpose: 'A blood-thinning medicine (anticoagulant) that helps prevent harmful blood clots.',
    patientInfo: 'Take once daily at the same time each day according to your current yellow anticoagulant booklet INR dose.',
    prescribingInfo: 'Synthetic SmPC summary: Vitamin K antagonist requiring regular INR blood monitoring; high interaction potential.',
    storage: 'Store below 25°C in a light-resistant container.',
    sourceUrl: 'https://www.nhs.uk/medicines/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK NHS / BNF structure',
    warningText: 'High bleeding risk. Many over-the-counter painkillers (such as ibuprofen or aspirin) and herbal products interact strongly.',
    plainWarning: 'Always check with a pharmacist before taking painkillers like ibuprofen, aspirin, or herbal remedies while on warfarin.',
    warningTier: 'RED',
    commonSideEffect: 'Bruising more easily than usual or minor nosebleeds',
    seriousSideEffect: 'Severe bleeding that will not stop, vomiting blood, or black tarry stools',
    contraindication: 'Active clinically significant bleeding or first/third trimester pregnancy',
    hiPurpose: 'रक्त के थक्कों को रोकने के लिए उपयोग की जाने वाली रक्त पतला करने वाली दवा। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'రక్తం గడ్డకట్టడాన్ని నివారించడానికి ఉపయోగించే రక్తాన్ని పలుచన చేసే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-008',
    countryCode: 'GB',
    brandName: 'Ibuprofen-Synth UK [SYNTHETIC TEST]',
    genericName: 'Ibuprofen',
    activeIngredients: 'Ibuprofen',
    strength: '400 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-GB-02',
    manufacturerName: 'Thames Clinical Generics (Test)',
    authNumber: 'PL-SYNTH-0008/01',
    regulatoryStatus: 'Pharmacy-Only',
    indications: 'Synthetic test indication: relief of musculoskeletal pain, inflammation, dental pain, and fever.',
    plainPurpose: 'An anti-inflammatory painkiller used to reduce swelling, pain, and fever.',
    patientInfo: 'Take with or right after food or milk to protect your stomach. Use the lowest effective dose for the shortest duration.',
    prescribingInfo: 'Synthetic SmPC summary: Non-steroidal anti-inflammatory drug (NSAID). Caution in asthma, gastric ulcer history, or renal disease.',
    storage: 'Store below 25°C.',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK eMC structure',
    warningText: 'Avoid if you have a history of stomach ulcers, severe heart failure, or NSAID-triggered asthma.',
    plainWarning: 'Take with food. Ask a pharmacist first if you have asthma, stomach ulcers, kidney issues, or take blood thinners.',
    warningTier: 'AMBER',
    commonSideEffect: 'Indigestion or mild heartburn',
    seriousSideEffect: 'Severe stomach pain, black stools, or sudden wheezing',
    contraindication: 'Active gastrointestinal bleeding, severe heart/renal failure, third trimester pregnancy',
    hiPurpose: 'दर्द, सूजन और बुखार को कम करने के लिए सूजन-रोधी दर्द निवारक। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'నొప్పి, వాపు మరియు జ్వరాన్ని తగ్గించే యాంటీ ఇన్‌ఫ్లమేటరీ నొప్పి నివారిణి. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-GB-009',
    countryCode: 'GB',
    brandName: 'Omeprazole-Synth UK [SYNTHETIC TEST]',
    genericName: 'Omeprazole',
    activeIngredients: 'Omeprazole',
    strength: '20 mg',
    dosageForm: 'Gastro-Resistant Capsule',
    route: 'Oral',
    manufacturerId: 'MFR-GB-01',
    manufacturerName: 'Albion Synthetic Pharma Ltd (Test)',
    authNumber: 'PL-SYNTH-0009/01',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: treatment of gastro-oesophageal reflux disease (GORD) and gastric ulcers.',
    plainPurpose: 'Reduces the amount of acid your stomach produces to heal heartburn and acid reflux.',
    patientInfo: 'Swallow the capsule whole with half a glass of water before breakfast. Do not chew or crush.',
    prescribingInfo: 'Synthetic SmPC summary: Proton pump inhibitor (PPI).',
    storage: '', // Intentional missing field to showcase AMBER missing-data detection
    sourceUrl: 'https://www.nhs.uk/medicines/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on UK NHS / eMC structure',
    verificationStatus: 'PENDING_REVIEW',
    missingFields: ['storage_instructions'],
    warningText: 'Long-term use may lower magnesium or vitamin B12 levels; report persistent difficulty swallowing.',
    plainWarning: 'Swallow capsules whole. Tell your doctor if you have unintentional weight loss or trouble swallowing.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild headache or stomach gas',
    seriousSideEffect: 'Severe persistent diarrhoea or severe skin reactions',
    contraindication: 'Concurrent use with nelfinavir',
    hiPurpose: 'सीने में जलन और एसिड रिफ्लक्स को कम करने के लिए पेट के एसिड को घटाती है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'ఛాతీలో మంట మరియు యాసిడ్ రిఫ్లక్స్ తగ్గించడానికి కడుపులో ఆమ్లాన్ని తగ్గిస్తుంది. (సింథటిక్ పరీక్ష డేటా)',
  },

  // INDIA (9 synthetic test records — including brand differences & combinations)
  {
    id: 'SYN-IN-001',
    countryCode: 'IN',
    brandName: 'Dolo-Synth 650 [SYNTHETIC TEST]',
    genericName: 'Paracetamol',
    activeIngredients: 'Paracetamol',
    strength: '650 mg',
    dosageForm: 'Uncoated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-01',
    manufacturerName: 'Bharat Synthetic Labs Pvt Ltd (Test)',
    authNumber: 'CDSCO-SYN-1001',
    regulatoryStatus: 'Over-The-Counter',
    indications: 'Synthetic test indication: symptomatic relief of fever and mild-to-moderate pain (higher 650 mg tablet strength common in India).',
    plainPurpose: 'Reduces fever and relieves headache or body ache. Note the 650 mg tablet strength is higher than standard 500 mg packs.',
    patientInfo: 'Follow the spacing instructed by your physician or pharmacist (typically at least 4–6 hours between doses).',
    prescribingInfo: 'Synthetic IPC/CDSCO insert: Paracetamol 650 mg; maximum total daily intake across all products must not exceed 4000 mg in healthy adults.',
    storage: 'Store in a cool, dry place protected from moisture and light below 30°C.',
    sourceUrl: 'https://ipc.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on IPC / CDSCO India format',
    warningText: 'Check all other fever or cold medicines for paracetamol to avoid accidental overdose.',
    plainWarning: 'Because each tablet contains 650 mg, count your daily total carefully and avoid other paracetamol products at the same time.',
    warningTier: 'AMBER',
    commonSideEffect: 'Generally well tolerated; occasional mild nausea',
    seriousSideEffect: 'Dark urine, yellowing eyes, or allergic rash',
    contraindication: 'Severe liver impairment or paracetamol hypersensitivity',
    hiPurpose: 'बुखार और शरीर दर्द से राहत के लिए 650 मिलीग्राम पैरासिटामोल टैबलेट। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'జ్వరం మరియు శరీర నొప్పుల నుండి ఉపశమనం కోసం 650 మి.గ్రా పారాసెటమాల్ టాబ్లెట్. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-002',
    countryCode: 'IN',
    brandName: 'Crocin-Synth Advance / Pain Relief [SYNTHETIC TEST]',
    genericName: 'Paracetamol + Caffeine',
    activeIngredients: 'Paracetamol | Caffeine',
    strength: '650 mg + 50 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-01',
    manufacturerName: 'Bharat Synthetic Labs Pvt Ltd (Test)',
    authNumber: 'CDSCO-SYN-1002',
    regulatoryStatus: 'Over-The-Counter',
    indications: 'Synthetic test indication: fast relief of headache and migraine pain using combination paracetamol + caffeine.',
    plainPurpose: 'A combination painkiller containing paracetamol plus caffeine—different from single-ingredient paracetamol packs.',
    patientInfo: 'Limit coffee, tea, or cola while taking this medicine because each tablet contains caffeine.',
    prescribingInfo: 'Synthetic CDSCO insert: Combination analgesic (Paracetamol 650 mg + Caffeine 50 mg).',
    storage: 'Store below 30°C in dry packaging.',
    sourceUrl: 'https://cdsco.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on CDSCO India package insert',
    warningText: 'Contains both Paracetamol and Caffeine. Different regional variants of the same brand family may have different strengths or added ingredients.',
    plainWarning: 'Check the active ingredients carefully—this combination pack contains caffeine in addition to paracetamol.',
    warningTier: 'AMBER',
    commonSideEffect: 'Restlessness or mild trouble sleeping if taken late in the evening',
    seriousSideEffect: 'Severe allergic reaction or signs of liver injury on overdose',
    contraindication: 'Paracetamol hypersensitivity or severe uncontrolled arrhythmia',
    hiPurpose: 'सिरदर्द से राहत के लिए पैरासिटामोल और कैफीन का संयोजन। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'తలనొప్పి ఉపశమనం కోసం పారాసెటమాల్ మరియు కెఫీన్ కలయిక. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-003',
    countryCode: 'IN',
    brandName: 'Augmentin-Synth 625 Duo [SYNTHETIC TEST]',
    genericName: 'Amoxicillin + Clavulanic Acid',
    activeIngredients: 'Amoxicillin | Clavulanic Acid',
    strength: '500 mg + 125 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-02',
    manufacturerName: 'Deccan Formulations India (Test)',
    authNumber: 'CDSCO-SYN-1003',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: treatment of beta-lactamase producing bacterial infections.',
    plainPurpose: 'A two-ingredient prescription antibiotic combining amoxicillin with clavulanic acid to overcome resistant bacteria.',
    patientInfo: 'Take at the start of a meal to reduce stomach upset and help absorption. Complete the full prescribed Schedule H course.',
    prescribingInfo: 'Synthetic Schedule H1 antimicrobial: Amoxicillin trihydrate eq. to 500 mg + Potassium clavulanate eq. to 125 mg.',
    storage: 'Store below 25°C; protect from moisture (sensitive to humidity).',
    sourceUrl: 'https://cdsco.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on CDSCO Schedule H1 insert',
    warningText: 'Schedule H1 Warning: Sell only against valid prescription of a registered medical practitioner. Risk of severe penicillin allergy.',
    plainWarning: 'Requires a valid prescription. Do not take if allergic to penicillin, and finish all prescribed tablets.',
    warningTier: 'RED',
    commonSideEffect: 'Loose stools, mild nausea, or abdominal discomfort',
    seriousSideEffect: 'Facial swelling, breathing trouble, or severe watery diarrhoea',
    contraindication: 'Penicillin allergy or previous antibiotic-associated cholestatic jaundice',
    hiPurpose: 'संक्रमण के इलाज के लिए दो घटकों वाला प्रिस्क्रिप्शन एंटीबायोटिक। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'ఇన్ఫెక్షన్ల చికిత్సకు ఉపయోగించే రెండు అంశాల ప్రిస్క్రిప్షన్ యాంటీబయాటిక్. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-004',
    countryCode: 'IN',
    brandName: 'Glycomet-Synth 500 SR [SYNTHETIC TEST]',
    genericName: 'Metformin Sustained Release',
    activeIngredients: 'Metformin',
    strength: '500 mg',
    dosageForm: 'Sustained-Release Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-02',
    manufacturerName: 'Deccan Formulations India (Test)',
    authNumber: 'CDSCO-SYN-1004',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: once- or twice-daily blood glucose control in type 2 diabetes mellitus.',
    plainPurpose: 'Releases metformin slowly over the day to help control blood sugar with gentler stomach impact.',
    patientInfo: 'Swallow the sustained-release tablet whole with water after dinner or a meal—do NOT crush or chew.',
    prescribingInfo: 'Synthetic Schedule H insert: Extended-release matrix tablet; ghost tablet shell may occasionally appear harmlessly in stool.',
    storage: 'Store below 30°C in a dry place.',
    sourceUrl: 'https://ipc.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on IPC / CDSCO India format',
    warningText: 'Do not crush or split sustained-release tablets.',
    plainWarning: 'Swallow whole without crushing; crushing releases the medicine too fast.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild bloating or reduced appetite initially',
    seriousSideEffect: 'Extreme fatigue, fast breathing, or cold skin (rare lactic acidosis)',
    contraindication: 'Severe kidney dysfunction or diabetic ketoacidosis',
    hiPurpose: 'धीरे-धीरे असर करने वाली शुगर की दवा—गोली को चबाएं या तोड़ें नहीं। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'నెమ్మదిగా విడుదలయ్యే డయాబెటిస్ టాబ్లెట్—టాబ్లెట్‌ను నమలవద్దు లేదా విరగొట్టవద్దు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-005',
    countryCode: 'IN',
    brandName: 'Telma-Synth 40 [SYNTHETIC TEST]',
    genericName: 'Telmisartan',
    activeIngredients: 'Telmisartan',
    strength: '40 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-01',
    manufacturerName: 'Bharat Synthetic Labs Pvt Ltd (Test)',
    authNumber: 'CDSCO-SYN-1005',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: management of essential hypertension and cardiovascular risk reduction.',
    plainPurpose: 'Relaxes blood vessels to help lower high blood pressure.',
    patientInfo: 'Take once daily at the same time each day, with or without food. Keep tablets in blister until right before swallowing.',
    prescribingInfo: 'Synthetic Schedule H insert: Angiotensin II receptor blocker (ARB); moisture-sensitive blister packaging.',
    storage: 'Store in the original blister pack below 30°C to protect from humidity.',
    sourceUrl: 'https://cdsco.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on CDSCO India format',
    warningText: 'Pregnancy warning: Discontinue promptly under medical supervision if pregnancy is detected.',
    plainWarning: 'Not safe during pregnancy. Keep tablets sealed in the foil strip until the moment you take them.',
    warningTier: 'RED',
    commonSideEffect: 'Mild dizziness or back ache',
    seriousSideEffect: 'Severe drop in blood pressure (fainting) or high potassium symptoms',
    contraindication: 'Pregnancy and severe biliary obstruction',
    hiPurpose: 'उच्च रक्तचाप को नियंत्रित रखने के लिए दिन में एक बार ली जाने वाली दवा। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'అధిక రక్తపోటును నియంత్రించడానికి రోజుకు ఒకసారి తీసుకునే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-006',
    countryCode: 'IN',
    brandName: 'Pantocid-Synth 40 [SYNTHETIC TEST]',
    genericName: 'Pantoprazole',
    activeIngredients: 'Pantoprazole',
    strength: '40 mg',
    dosageForm: 'Enteric-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-02',
    manufacturerName: 'Deccan Formulations India (Test)',
    authNumber: 'CDSCO-SYN-1006',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: acid reflux (GERD), peptic ulcer disease, and Zollinger-Ellison syndrome.',
    plainPurpose: 'Lowers excess stomach acid to relieve acidity, heartburn, and ulcer irritation.',
    patientInfo: 'Swallow whole 30 to 60 minutes before breakfast. Do not chew or break the enteric-coated tablet.',
    prescribingInfo: 'Synthetic Schedule H insert: Proton pump inhibitor.',
    storage: 'Store below 25°C in a dry place.',
    sourceUrl: 'https://ipc.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on IPC India format',
    warningText: 'Long-term unsupervised use may reduce magnesium or vitamin B12.',
    plainWarning: 'Take before your morning meal and swallow whole.',
    warningTier: 'GREEN',
    commonSideEffect: 'Mild headache or bloating',
    seriousSideEffect: 'Severe persistent watery diarrhoea or allergic skin rash',
    contraindication: 'Hypersensitivity to substituted benzimidazoles',
    hiPurpose: 'पेट की एसिडिटी और अल्सर को शांत करने के लिए नाश्ते से पहले ली जाने वाली दवा। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'కడుపులో ఎసిడిటీ మరియు అల్సర్ల ఉపశమనం కోసం అల్పాహారానికి ముందు తీసుకునే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-007',
    countryCode: 'IN',
    brandName: 'Ecosprin-Synth 75 [SYNTHETIC TEST]',
    genericName: 'Aspirin (Low-Dose)',
    activeIngredients: 'Aspirin',
    strength: '75 mg',
    dosageForm: 'Gastro-Resistant Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-01',
    manufacturerName: 'Bharat Synthetic Labs Pvt Ltd (Test)',
    authNumber: 'CDSCO-SYN-1007',
    regulatoryStatus: 'Pharmacy-Only',
    indications: 'Synthetic test indication: secondary prevention of cardiovascular thrombotic events under medical advice.',
    plainPurpose: 'A low-dose blood-thinning aspirin used under doctor guidance to help prevent heart or stroke clots.',
    patientInfo: 'Swallow whole with water after food unless your doctor instructs otherwise.',
    prescribingInfo: 'Synthetic insert: Antiplatelet acetylsalicylic acid 75 mg.',
    storage: 'Store below 25°C away from moisture.',
    sourceUrl: 'https://cdsco.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on CDSCO India format',
    warningText: 'Bleeding risk when combined with anticoagulants (warfarin) or NSAIDs (ibuprofen). Do not give to children under 16 unless specifically advised.',
    plainWarning: 'Can increase bleeding risk, especially alongside painkillers like ibuprofen or blood thinners.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild stomach upset or easier bruising',
    seriousSideEffect: 'Vomiting blood, black stools, or severe wheezing',
    contraindication: 'Active peptic ulcer, haemophilia, or aspirin-sensitive asthma',
    hiPurpose: 'हृदय और नसों में खून के थक्के रोकने के लिए कम खुराक वाली एस्पिरिन। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'గుండె మరియు రక్తనాళాల్లో రక్తం గడ్డకట్టకుండా నిరోధించడానికి తక్కువ మోతాదు ఆస్పిరిన్. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-008',
    countryCode: 'IN',
    brandName: 'Thyronorm-Synth 50 [SYNTHETIC TEST]',
    genericName: 'Levothyroxine Sodium',
    activeIngredients: 'Levothyroxine',
    strength: '50 mcg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-02',
    manufacturerName: 'Deccan Formulations India (Test)',
    authNumber: 'CDSCO-SYN-1008',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: replacement therapy for hypothyroidism.',
    plainPurpose: 'Replaces missing thyroid hormone so your body’s energy and metabolism stay balanced.',
    patientInfo: 'Take on an empty stomach first thing in the morning with water, at least 30–60 minutes before tea, coffee, breakfast, calcium, or iron supplements.',
    prescribingInfo: 'Synthetic Schedule H insert: Narrow therapeutic index; keep the same brand/formulation unless monitored with TSH testing.',
    storage: 'Store below 25°C away from heat and moisture.',
    sourceUrl: 'https://ipc.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on IPC India format',
    warningText: 'Calcium, iron, and antacids reduce absorption if taken within 4 hours.',
    plainWarning: 'Take first thing in the morning on an empty stomach, and keep calcium or iron pills separated by at least 4 hours.',
    warningTier: 'AMBER',
    commonSideEffect: 'Usually none when dose matches thyroid blood tests',
    seriousSideEffect: 'Fast or pounding heartbeat, chest pain, or excessive sweating (sign of excess dose)',
    contraindication: 'Untreated thyrotoxicosis or acute myocardial infarction',
    hiPurpose: 'थायरॉयड हार्मोन की कमी को पूरा करने के लिए सुबह खाली पेट ली जाने वाली दवा। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'థైరాయిడ్ హార్మోన్ లోపాన్ని భర్తీ చేయడానికి ఉదయం ఖాళీ కడుపుతో తీసుకునే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-IN-009',
    countryCode: 'IN',
    brandName: 'Combiflam-Synth [SYNTHETIC TEST]',
    genericName: 'Ibuprofen + Paracetamol',
    activeIngredients: 'Ibuprofen | Paracetamol',
    strength: '400 mg + 325 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-IN-01',
    manufacturerName: 'Bharat Synthetic Labs Pvt Ltd (Test)',
    authNumber: 'CDSCO-SYN-1009',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: short-term relief of acute musculoskeletal or dental pain and fever.',
    plainPurpose: 'Combines two painkillers (ibuprofen and paracetamol) in one tablet for short-term pain and fever.',
    patientInfo: 'Take after food to protect your stomach. Do not take extra paracetamol or ibuprofen separately while using this combination.',
    prescribingInfo: 'Synthetic Schedule H fixed-dose combination (Ibuprofen 400 mg + Paracetamol 325 mg).',
    storage: 'Store below 30°C.',
    sourceUrl: 'https://cdsco.gov.in/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on CDSCO India FDC format',
    warningText: 'Dual-ingredient warning: risk of accidental double dosing with standalone paracetamol or NSAIDs.',
    plainWarning: 'Already contains BOTH ibuprofen and paracetamol—do not add other pain or fever medicines without asking a pharmacist.',
    warningTier: 'AMBER',
    commonSideEffect: 'Stomach acidity or mild nausea',
    seriousSideEffect: 'Stomach bleeding, severe rash, or facial swelling',
    contraindication: 'Peptic ulcer, severe renal/hepatic disease, or NSAID allergy',
    hiPurpose: 'इबुप्रोफेन और पैरासिटामोल का संयोजन—इसके साथ अन्य दर्द निवारक न लें। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'ఇబుప్రోఫెన్ మరియు పారాసెటమాల్ కలయిక—దీనితో పాటు ఇతర నొప్పి నివారణ మందులు తీసుకోవద్దు. (సింథటిక్ పరీక్ష డేటా)',
  },

  // UNITED STATES (2 synthetic baseline records + live OpenFDA API)
  {
    id: 'SYN-US-001',
    countryCode: 'US',
    brandName: 'Tylenol-Synth US [SYNTHETIC TEST]',
    genericName: 'Acetaminophen',
    activeIngredients: 'Acetaminophen',
    strength: '500 mg',
    dosageForm: 'Caplet',
    route: 'Oral',
    manufacturerId: 'MFR-US-01',
    manufacturerName: 'Liberty Synthetic Healthcare (Test)',
    authNumber: 'NDC-SYNTH-5001',
    regulatoryStatus: 'Over-The-Counter',
    indications: 'Synthetic test indication: temporary relief of minor aches, pains, and fever. Notice US uses "Acetaminophen" instead of "Paracetamol".',
    plainPurpose: 'US name for paracetamol—used for fever and minor aches.',
    patientInfo: 'Follow Drug Facts panel; do not exceed maximum daily limit across all acetaminophen products.',
    prescribingInfo: 'Synthetic OTC Monograph template.',
    storage: 'Store at 20–25°C (68–77°F).',
    sourceUrl: 'https://dailymed.nlm.nih.gov/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on US FDA OTC Drug Facts',
    warningText: 'Liver warning: severe liver damage may occur if you take more than 4,000 mg in 24 hours or consume 3+ alcoholic drinks daily.',
    plainWarning: 'Notice that "Acetaminophen" in the US is the exact same active drug called "Paracetamol" in the UK and India.',
    warningTier: 'AMBER',
    commonSideEffect: 'Rare at recommended doses',
    seriousSideEffect: 'Severe skin reactions or liver injury signs',
    contraindication: 'Severe liver disease or acetaminophen allergy',
    hiPurpose: 'अमेरिका में पैरासिटामोल को एसिटामिनोफेन कहा जाता है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'అమెరికాలో పారాసెటమాల్‌ను అసిటమినోఫెన్ అని పిలుస్తారు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-US-002',
    countryCode: 'US',
    brandName: 'Synth-Withdrawn-Example [SYNTHETIC TEST]',
    genericName: 'Example Withdrawn Record',
    activeIngredients: 'Test Compound Alpha',
    strength: '10 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-US-01',
    manufacturerName: 'Liberty Synthetic Healthcare (Test)',
    authNumber: 'NDC-SYNTH-9999',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic demonstration of an Administrative Withdrawn Record workflow.',
    plainPurpose: 'Withdrawn synthetic test record demonstrating clinical safety withdrawal alerts.',
    patientInfo: 'Withdrawn record.',
    prescribingInfo: 'Withdrawn.',
    storage: 'N/A',
    sourceUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
    sourceAuthority: 'SYNTHETIC TEST — Clinical Governance Withdrawal Demo',
    verificationStatus: 'WITHDRAWN',
    safetyLevel: 'RED',
    warningText: 'This record has been withdrawn by clinical governance.',
    plainWarning: 'Withdrawn record—consult your pharmacist or doctor.',
    warningTier: 'RED',
    commonSideEffect: 'N/A',
    seriousSideEffect: 'Withdrawn test record',
    contraindication: 'Withdrawn test record',
    hiPurpose: 'यह रिकॉर्ड समीक्षा के लिए वापस ले लिया गया है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'ఈ రికార్డు క్లినికల్ సమీక్ష కోసం ఉపసంహరించబడింది. (సింథటిక్ పరీక్ష డేటా)',
  },

  // CANADA (2 synthetic test records)
  {
    id: 'SYN-CA-001',
    countryCode: 'CA',
    brandName: 'Atorvastatin-Synth CA [SYNTHETIC TEST]',
    genericName: 'Atorvastatin Calcium',
    activeIngredients: 'Atorvastatin',
    strength: '20 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-CA-01',
    manufacturerName: 'Maple Synthetic Pharma Inc (Test)',
    authNumber: 'DIN-SYNTH-001',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: hypercholesterolaemia and cardiovascular risk reduction (Canada DPD model).',
    plainPurpose: 'Helps lower cholesterol under Canadian prescription monitoring.',
    patientInfo: 'Take once daily as prescribed by your Canadian healthcare provider.',
    prescribingInfo: 'Synthetic Health Canada Product Monograph summary.',
    storage: 'Store between 15°C and 30°C.',
    sourceUrl: 'https://health-products.canada.ca/dpd-bdpp/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on Health Canada DPD',
    warningText: 'Report unexplained muscle soreness or weakness.',
    plainWarning: 'Tell your doctor or pharmacist if you experience unusual muscle pain.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild digestive upset',
    seriousSideEffect: 'Severe muscle pain or dark urine',
    contraindication: 'Active hepatic disease or pregnancy',
    hiPurpose: 'कनाडा मानक के अनुसार कोलेस्ट्रॉल कम करने वाली दवा। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'కెనడా ప్రమాణాల ప్రకారం కొలెస్ట్రాల్ తగ్గించే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },
  {
    id: 'SYN-CA-002',
    countryCode: 'CA',
    brandName: 'Metformin-Synth CA [SYNTHETIC TEST]',
    genericName: 'Metformin Hydrochloride',
    activeIngredients: 'Metformin',
    strength: '500 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-CA-01',
    manufacturerName: 'Maple Synthetic Pharma Inc (Test)',
    authNumber: 'DIN-SYNTH-002',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: glycemic control in type 2 diabetes mellitus.',
    plainPurpose: 'Helps manage blood sugar levels alongside diet and activity.',
    patientInfo: 'Take with meals as instructed by your prescriber.',
    prescribingInfo: 'Synthetic Health Canada Product Monograph summary.',
    storage: 'Store at room temperature (15–30°C).',
    sourceUrl: 'https://health-products.canada.ca/dpd-bdpp/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on Health Canada DPD',
    warningText: 'Inform imaging clinics before iodinated contrast procedures.',
    plainWarning: 'Take with food and mention this medicine before contrast scans.',
    warningTier: 'AMBER',
    commonSideEffect: 'Mild nausea or loose stools initially',
    seriousSideEffect: 'Signs of lactic acidosis (unusual breathing, extreme weakness)',
    contraindication: 'Severe renal impairment',
    hiPurpose: 'रक्त शर्करा को नियंत्रित रखने के लिए भोजन के साथ ली जाती है। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'రక్తంలో చక్కెరను నియంత్రించడానికి ఆహారంతో తీసుకునే మందు. (సింథటిక్ పరీక్ష డేటా)',
  },

  // AUSTRALIA (1 synthetic test record)
  {
    id: 'SYN-AU-001',
    countryCode: 'AU',
    brandName: 'Panadol-Synth AU [SYNTHETIC TEST]',
    genericName: 'Paracetamol',
    activeIngredients: 'Paracetamol',
    strength: '500 mg',
    dosageForm: 'Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-AU-01',
    manufacturerName: 'Southern Cross Synthetic Labs (Test)',
    authNumber: 'AUST-R-SYNTH-01',
    regulatoryStatus: 'Over-The-Counter',
    indications: 'Synthetic test indication: temporary relief of pain and fever (TGA CMI format).',
    plainPurpose: 'Relieves everyday aches, headaches, and fever.',
    patientInfo: 'Follow Australian pack directions and do not exceed 4 g per 24 hours.',
    prescribingInfo: 'Synthetic TGA Consumer Medicine Information summary.',
    storage: 'Store below 25°C.',
    sourceUrl: 'https://www.tga.gov.au/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on Australian TGA / CMI',
    warningText: 'Avoid combining with other paracetamol-containing cold/pain medicines.',
    plainWarning: 'Check other products for paracetamol to prevent taking too much.',
    warningTier: 'AMBER',
    commonSideEffect: 'Rare at recommended doses',
    seriousSideEffect: 'Allergic swelling or severe skin rash',
    contraindication: 'Paracetamol allergy',
    hiPurpose: 'दर्द और बुखार से अस्थायी राहत के लिए ऑस्ट्रेलियाई पैक मॉडल। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'నొప్పి మరియు జ్వరం నుండి తాత్కాలిక ఉపశమనం కోసం ఆస్ట్రేలియన్ ప్యాక్ మోడల్. (సింథటిక్ పరీక్ష డేటా)',
  },

  // EUROPEAN UNION (1 synthetic test record)
  {
    id: 'SYN-EU-001',
    countryCode: 'EU',
    brandName: 'Co-Amoxiclav-Synth EU [SYNTHETIC TEST]',
    genericName: 'Amoxicillin + Clavulanic Acid',
    activeIngredients: 'Amoxicillin | Clavulanic Acid',
    strength: '875 mg + 125 mg',
    dosageForm: 'Film-Coated Tablet',
    route: 'Oral',
    manufacturerId: 'MFR-EU-01',
    manufacturerName: 'EuroSynth Pharma GmbH (Test)',
    authNumber: 'EU/1/SYN/001',
    regulatoryStatus: 'Prescription-Only',
    indications: 'Synthetic test indication: twice-daily EU high-strength antibiotic formulation (875/125 mg vs. 500/125 mg in India/UK).',
    plainPurpose: 'A higher-strength two-ingredient antibiotic tablet used in EU prescribing schedules.',
    patientInfo: 'Notice the 875 mg + 125 mg strength differs from 500 mg + 125 mg tablets sold in other countries.',
    prescribingInfo: 'Synthetic EMA EPAR summary: 875/125 mg twice daily.',
    storage: 'Store below 25°C in original package.',
    sourceUrl: 'https://www.ema.europa.eu/',
    sourceAuthority: 'SYNTHETIC TEST — Modelled on EMA Product Information',
    warningText: 'Do not substitute across countries without verifying strength (875/125 mg vs 500/125 mg).',
    plainWarning: 'Check strength carefully—875/125 mg is not interchangeable with 500/125 mg packs.',
    warningTier: 'RED',
    commonSideEffect: 'Diarrhoea or mild nausea',
    seriousSideEffect: 'Severe penicillin allergy or breathing difficulty',
    contraindication: 'Beta-lactam hypersensitivity',
    hiPurpose: 'यूरोपीय मानक की उच्च क्षमता वाली एंटीबायोटिक। (सिंथेटिक परीक्षण डेटा)',
    tePurpose: 'యూరోపియన్ ప్రమాణాల అధిక శక్తి గల యాంటీబయాటిక్. (సింథటిక్ పరీక్ష డేటా)',
  },
];

const SYNTHETIC_INTERACTIONS = [
  {
    interactionId: 'INT-SYN-001',
    ingredientA: 'Warfarin',
    ingredientB: 'Ibuprofen',
    severity: 'Major',
    safetyTier: 'RED',
    clinicalEffect: 'Increased anticoagulant effect and elevated risk of serious gastrointestinal and systemic bleeding.',
    plainLanguageExplanation:
      'Taking ibuprofen alongside warfarin significantly raises your risk of stomach and internal bleeding.',
    recommendedNextStep:
      'Do not combine these without explicit approval from your doctor or anticoagulation clinic. Ask a pharmacist about safer pain options.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on BNF / MHRA / DailyMed Interaction Guidance',
    sourceUrl: 'https://www.nhs.uk/medicines/warfarin/',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
  {
    interactionId: 'INT-SYN-002',
    ingredientA: 'Warfarin',
    ingredientB: 'Aspirin',
    severity: 'Major',
    safetyTier: 'RED',
    clinicalEffect: 'Additive antithrombotic and antiplatelet effects increase bleeding risk.',
    plainLanguageExplanation:
      'Both warfarin and aspirin thin the blood in different ways, making bleeding much more likely unless closely supervised by your cardiologist.',
    recommendedNextStep:
      'Confirm with your prescribing specialist or pharmacist whether both were intentionally prescribed together.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on BNF / FDA Anticoagulant Guidance',
    sourceUrl: 'https://www.nhs.uk/medicines/warfarin/',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
  {
    interactionId: 'INT-SYN-003',
    ingredientA: 'Paracetamol',
    ingredientB: 'Paracetamol',
    severity: 'Major',
    safetyTier: 'AMBER',
    clinicalEffect: 'Duplicate active ingredient exposure (including Acetaminophen or combination packs like Combiflam/Crocin Pain Relief) risks exceeding 4 g/day hepatotoxic threshold.',
    plainLanguageExplanation:
      'Both products contain paracetamol (also called acetaminophen). Taking them together can accidentally exceed the safe daily limit for your liver.',
    recommendedNextStep:
      'Ask your pharmacist to verify your total daily paracetamol dose before using more than one pain or fever product.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on MHRA / FDA / CDSCO Duplicate Ingredient Alert',
    sourceUrl: 'https://www.medicines.org.uk/emc',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
  {
    interactionId: 'INT-SYN-004',
    ingredientA: 'Lisinopril',
    ingredientB: 'Ibuprofen',
    severity: 'Moderate',
    safetyTier: 'AMBER',
    clinicalEffect: 'NSAIDs may blunt ACE-inhibitor blood pressure control and increase risk of acute kidney strain.',
    plainLanguageExplanation:
      'Ibuprofen can make blood pressure medicines like lisinopril work less well and put extra strain on your kidneys.',
    recommendedNextStep:
      'Speak with your pharmacist or doctor before taking ibuprofen regularly alongside blood pressure tablets.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on NICE / BNF Renal Safety Guidance',
    sourceUrl: 'https://www.nhs.uk/medicines/lisinopril/',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
  {
    interactionId: 'INT-SYN-005',
    ingredientA: 'Telmisartan',
    ingredientB: 'Ibuprofen',
    severity: 'Moderate',
    safetyTier: 'AMBER',
    clinicalEffect: 'Concurrent ARB and NSAID therapy may reduce antihypertensive efficacy and impair renal perfusion.',
    plainLanguageExplanation:
      'Taking ibuprofen with telmisartan can raise blood pressure slightly and stress your kidneys, especially if you are dehydrated.',
    recommendedNextStep:
      'Ask your doctor or pharmacist for a kidney-safe pain plan.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on CDSCO / BNF ARB-NSAID Precaution',
    sourceUrl: 'https://ipc.gov.in/',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
  {
    interactionId: 'INT-SYN-006',
    ingredientA: 'Metformin',
    ingredientB: 'Atorvastatin',
    severity: 'Minor',
    safetyTier: 'GREEN',
    clinicalEffect: 'Commonly co-prescribed in type 2 diabetes; monitor glucose routinely as statins may modestly alter glycemic control.',
    plainLanguageExplanation:
      'These two medicines are frequently prescribed together, though your doctor may monitor blood sugar and liver markers routinely.',
    recommendedNextStep:
      'Continue your prescribed monitoring schedule and ask your pharmacist if you notice unusual fatigue or blood sugar shifts.',
    evidenceSource: 'SYNTHETIC TEST — Modelled on Standard Diabetes Care Guidance',
    sourceUrl: 'https://www.nhs.uk/medicines/metformin/',
    countryScope: 'GLOBAL',
    isSynthetic: true,
  },
];

export async function ensureDatabaseSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  try {
    const [{ value: countryCount }] = await db
      .select({ value: count() })
      .from(countryConfigs);

    if (countryCount === 0) {
      for (const cfg of COUNTRY_CONFIG_SEED) {
        await db
          .insert(countryConfigs)
          .values(cfg)
          .onConflictDoNothing();
      }
    }

    const [{ value: medCount }] = await db
      .select({ value: count() })
      .from(medicinesMaster);

    if (medCount > 0) {
      return;
    }

    const today = '2026-11-01';

    // Seed unique manufacturers
    const mfrs = new Map<string, { name: string; country: string }>();
    for (const r of SYNTHETIC_RECORDS) {
      mfrs.set(r.manufacturerId, {
        name: r.manufacturerName,
        country: r.countryCode,
      });
    }
    for (const [id, info] of mfrs.entries()) {
      await db
        .insert(medicineManufacturers)
        .values({
          manufacturerId: id,
          manufacturerName: info.name,
          countryOfOrigin: info.country,
          regulatorySiteId: `SITE-${id}`,
          contactChannel: 'synthetic-medical-info@example.org',
          isSynthetic: true,
        })
        .onConflictDoNothing();
    }

    // Seed unique active ingredients
    const uniqueIngs = new Set<string>();
    for (const r of SYNTHETIC_RECORDS) {
      r.activeIngredients.split('|').forEach((ing) => uniqueIngs.add(ing.trim()));
    }
    let ingIdx = 1;
    for (const inn of uniqueIngs) {
      await db
        .insert(activeIngredients)
        .values({
          ingredientId: `ING-SYN-${String(ingIdx++).padStart(3, '0')}`,
          innName: inn,
          chemicalClass: 'Synthetic Test Pharmacological Class',
          pharmacologicalGroup: 'Reference Educational Entry',
          atcCode: `SYN-${String(ingIdx).padStart(4, '0')}`,
          isSynthetic: true,
          sourceAuthority: 'WHO INN / Synthetic Test Registry',
          sourceUrl: 'https://www.who.int/teams/health-product-and-policy-standards/inn',
        })
        .onConflictDoNothing();
    }

    // Seed all 24 synthetic test records across the remaining 14 CSV tables
    for (const r of SYNTHETIC_RECORDS) {
      await db
        .insert(medicinesMaster)
        .values({
          medicineId: r.id,
          countryCode: r.countryCode,
          brandName: r.brandName,
          genericName: r.genericName,
          activeIngredients: r.activeIngredients,
          strength: r.strength,
          dosageForm: r.dosageForm,
          routeOfAdministration: r.route,
          manufacturer: r.manufacturerName,
          marketingAuthorisationNumber: r.authNumber,
          regulatoryStatus: r.regulatoryStatus,
          approvedIndications: r.indications,
          officialPatientInformation: r.patientInfo,
          officialPrescribingInformation: r.prescribingInfo,
          storageInstructions: r.storage || 'MISSING — Check printed carton',
          sourceUrl: r.sourceUrl,
          sourceAuthority: r.sourceAuthority,
          sourceLastVerified: today,
          recordLastUpdated: today,
          verificationStatus: r.verificationStatus || 'SYNTHETIC_TEST',
          isSynthetic: true,
          missingDataIndicators: r.missingFields || [],
          safetyLevel: r.safetyLevel || 'GREEN',
        })
        .onConflictDoNothing();

      await db
        .insert(medicineBrands)
        .values({
          brandId: `BRD-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          brandName: r.brandName,
          trademarkOwner: r.manufacturerName,
          marketingStatus: r.verificationStatus === 'WITHDRAWN' ? 'Withdrawn' : 'Marketed (Synthetic)',
          isSynthetic: true,
        })
        .onConflictDoNothing();

      const parts = r.activeIngredients.split('|').map((s) => s.trim());
      for (let i = 0; i < parts.length; i++) {
        await db
          .insert(medicineStrengths)
          .values({
            strengthId: `STR-${r.id}-${i + 1}`,
            medicineId: r.id,
            ingredientName: parts[i],
            strengthValue: r.strength.split('+')[i]?.trim() || r.strength,
            strengthUnit: 'per dosage unit',
            basisOfStrength: 'Active moiety (synthetic test)',
            isSynthetic: true,
          })
          .onConflictDoNothing();
      }

      await db
        .insert(medicineFormulations)
        .values({
          formulationId: `FRM-${r.id}`,
          medicineId: r.id,
          dosageForm: r.dosageForm,
          releaseCharacteristic: r.dosageForm.includes('Sustained')
            ? 'Sustained Release'
            : r.dosageForm.includes('Gastro') || r.dosageForm.includes('Enteric')
              ? 'Delayed / Enteric Release'
              : 'Immediate Release',
          routeOfAdministration: r.route,
          excipientsSummary: 'Standard pharmacopoeial test excipients (synthetic)',
          appearanceDescription: `${r.dosageForm} marked with synthetic test code`,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineIndications)
        .values({
          indicationId: `IND-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          officialIndicationText: r.indications,
          plainLanguagePurpose: r.plainPurpose,
          populationRestriction: 'Follow age & prescriber guidance on official label',
          sourceReference: r.sourceAuthority,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineInstructions)
        .values({
          instructionId: `INS-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          officialWording: r.patientInfo,
          plainLanguageGuidance: r.patientInfo,
          foodTimingNote: r.patientInfo.toLowerCase().includes('meal') || r.patientInfo.toLowerCase().includes('food')
            ? 'Follow meal timing on label'
            : 'May usually be taken with or without food unless advised otherwise',
          missedDosePolicy: 'Never take a double dose to make up for a missed dose unless your official leaflet explicitly instructs otherwise. Ask your pharmacist if unsure.',
          sourceReference: r.sourceAuthority,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineWarnings)
        .values({
          warningId: `WRN-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          warningType: r.warningTier === 'RED' ? 'serious_sign' : 'precaution',
          safetyTier: r.warningTier,
          officialWarningText: r.warningText,
          plainLanguageWarning: r.plainWarning,
          sourceReference: r.sourceAuthority,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineSideEffects)
        .values([
          {
            sideEffectId: `SE-${r.id}-1`,
            medicineId: r.id,
            countryCode: r.countryCode,
            frequencyCategory: 'Common',
            isSerious: false,
            officialTerm: r.commonSideEffect,
            plainLanguageDescription: r.commonSideEffect,
            actionGuidance: 'Mention to your pharmacist or doctor if persistent or bothersome.',
            sourceReference: r.sourceAuthority,
            isSynthetic: true,
          },
          {
            sideEffectId: `SE-${r.id}-2`,
            medicineId: r.id,
            countryCode: r.countryCode,
            frequencyCategory: 'Serious - Seek Urgent Care',
            isSerious: true,
            officialTerm: r.seriousSideEffect,
            plainLanguageDescription: r.seriousSideEffect,
            actionGuidance: 'Stop taking and seek urgent medical help immediately.',
            sourceReference: r.sourceAuthority,
            isSynthetic: true,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(medicineContraindications)
        .values({
          contraindicationId: `CNT-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          conditionName: r.contraindication,
          officialStatement: r.contraindication,
          plainLanguageExplanation: `Do not use if you have: ${r.contraindication}.`,
          sourceReference: r.sourceAuthority,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineCountryApprovals)
        .values({
          approvalId: `APR-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          regulatoryAuthority: r.sourceAuthority,
          authorisationNumber: r.authNumber,
          approvalStatus: r.verificationStatus === 'WITHDRAWN' ? 'Withdrawn' : 'Synthetic Test Approved',
          supplyClassification: r.regulatoryStatus,
          approvalDate: '2024-01-15',
          lastReviewedDate: today,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineSources)
        .values({
          sourceId: `SRC-${r.id}`,
          medicineId: r.id,
          countryCode: r.countryCode,
          authorityName: r.sourceAuthority,
          documentType: r.countryCode === 'GB' ? 'Synthetic SmPC / PIL' : 'Synthetic Package Insert',
          documentUrl: r.sourceUrl,
          licenseTerms: 'Synthetic test record — no official dataset redistributed',
          lastVerifiedAt: today,
          isSynthetic: true,
        })
        .onConflictDoNothing();

      await db
        .insert(medicineLanguages)
        .values([
          {
            translationId: `LNG-${r.id}-hi`,
            medicineId: r.id,
            languageCode: 'hi',
            languageName: 'Hindi',
            translatedPurpose: r.hiPurpose,
            translatedInstructions: 'कृपया अपने डॉक्टर या फार्मासिस्ट के प्रिस्क्रिप्शन लेबल पर लिखे निर्देशों का पालन करें।',
            translatedWarnings: 'किसी भी गंभीर लक्षण या एलर्जी की स्थिति में तुरंत चिकित्सा सहायता लें।',
            reviewStatus: 'SYNTHETIC_DEMO',
            isSynthetic: true,
          },
          {
            translationId: `LNG-${r.id}-te`,
            medicineId: r.id,
            languageCode: 'te',
            languageName: 'Telugu',
            translatedPurpose: r.tePurpose,
            translatedInstructions: 'దయచేసి మీ డాక్టర్ లేదా ఫార్మసిస్ట్ ఇచ్చిన ప్రిస్క్రిప్షన్ లేబుల్ సూచనలను పాటించండి.',
            translatedWarnings: 'ఏదైనా తీవ్రమైన లక్షణాలు లేదా అలెర్జీ కనిపిస్తే వెంటనే వైద్య సహాయం తీసుకోండి.',
            reviewStatus: 'SYNTHETIC_DEMO',
            isSynthetic: true,
          },
        ])
        .onConflictDoNothing();

      await db
        .insert(medicineUpdateHistory)
        .values({
          historyId: `HST-${r.id}-1`,
          medicineId: r.id,
          countryCode: r.countryCode,
          changeType: 'CREATED',
          changedFields: 'ALL_INITIAL_FIELDS',
          changeSummary: `Seeded synthetic test record ${r.brandName} (${r.countryCode})`,
          changedBy: 'system_seed',
          changedAt: today,
          isSynthetic: true,
        })
        .onConflictDoNothing();
    }

    for (const inter of SYNTHETIC_INTERACTIONS) {
      await db.insert(medicineInteractions).values(inter).onConflictDoNothing();
    }
  } catch (err) {
    console.error('Error seeding MedExplain PostgreSQL database:', err);
    throw err;
  }
}
