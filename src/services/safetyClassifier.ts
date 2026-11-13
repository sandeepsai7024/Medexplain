export type SafetyLevel = 'GREEN' | 'AMBER' | 'RED';

export interface SafetyEvaluation {
  level: SafetyLevel;
  headline: string;
  guidance: string;
  emergencyNumber?: string;
  emergencyGuidance?: string;
  reasons: string[];
}

export interface EmergencyGuidanceCardItem {
  id: string;
  tier: 'RED' | 'AMBER' | 'INFO';
  title: string;
  serviceName: string;
  phoneNumber?: string;
  telHref?: string;
  officialPortalUrl: string;
  officialPortalLabel: string;
  regulatoryAuthority: string;
  whenToUse: string;
  whatToShare: string[];
}

export interface CountryEmergencyInfo {
  countryCode: string;
  countryName: string;
  emergencyNumber: string;
  emergencyGuidance: string;
  regulatoryStandard: string;
  cards: EmergencyGuidanceCardItem[];
}

const RED_EMERGENCY_PATTERNS = [
  /anaphylaxis/i,
  /difficulty breathing/i,
  /trouble breathing/i,
  /shortness of breath/i,
  /swelling of (the )?(face|lips|tongue|throat)/i,
  /chest pain/i,
  /severe bleeding/i,
  /vomiting blood/i,
  /black tarry stools/i,
  /stevens-johnson/i,
  /toxic epidermal necrolysis/i,
  /suicidal/i,
  /overdose/i,
  /unconscious/i,
  /seizure/i,
];

export const EMERGENCY_DIRECTORY: Record<string, CountryEmergencyInfo> = {
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    emergencyNumber: '999',
    emergencyGuidance:
      'Call 999 immediately for life-threatening symptoms, or call NHS 111 for urgent medical advice.',
    regulatoryStandard: 'NHS Urgent Care Standards & MHRA Pharmacovigilance',
    cards: [
      {
        id: 'gb-999',
        tier: 'RED',
        title: 'Life-Threatening Emergency',
        serviceName: 'UK Emergency Services (999)',
        phoneNumber: '999',
        telHref: 'tel:999',
        officialPortalUrl:
          'https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/',
        officialPortalLabel: 'NHS When to Call 999',
        regulatoryAuthority: 'NHS England / UK Emergency Services',
        whenToUse:
          'Trouble breathing, swelling of lips/tongue/throat, severe chest pain, collapse, or suspected severe overdose.',
        whatToShare: [
          'Exact medicine brand name, active ingredient, and strength on the pack',
          'Approximate amount taken and time taken',
          'Any known allergies or existing heart, kidney, or breathing conditions',
        ],
      },
      {
        id: 'gb-111',
        tier: 'AMBER',
        title: 'Urgent Medical & Pharmacist Advice',
        serviceName: 'NHS 111',
        phoneNumber: '111',
        telHref: 'tel:111',
        officialPortalUrl: 'https://111.nhs.uk/',
        officialPortalLabel: 'Open NHS 111 Online',
        regulatoryAuthority: 'NHS Urgent Medical Triage',
        whenToUse:
          'Worrying side effects, missed or accidental extra dose questions when your pharmacy is closed, or urgent guidance.',
        whatToShare: [
          'Keep the medicine box and printed prescription label in front of you',
          'List any other prescription, OTC, or herbal products taken today',
        ],
      },
      {
        id: 'gb-yellowcard',
        tier: 'INFO',
        title: 'Report a Suspected Side Effect',
        serviceName: 'MHRA Yellow Card Scheme',
        officialPortalUrl: 'https://yellowcard.mhra.gov.uk/',
        officialPortalLabel: 'MHRA Yellow Card Portal',
        regulatoryAuthority: 'Medicines and Healthcare products Regulatory Agency (MHRA)',
        whenToUse:
          'Report unexpected side effects or defective medicine packaging to help UK safety monitoring.',
        whatToShare: [
          'Batch number and expiry date printed on the carton or blister strip',
          'Description of the reaction and when it started',
        ],
      },
    ],
  },
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    emergencyNumber: '112',
    emergencyGuidance:
      'Call 112 (National Emergency Helpline) or 108 (Ambulance) immediately, or visit the nearest hospital emergency department.',
    regulatoryStandard: 'MoHFW Emergency Response & IPC Pharmacovigilance (PvPI)',
    cards: [
      {
        id: 'in-112',
        tier: 'RED',
        title: 'National Emergency Helpline',
        serviceName: 'Emergency Response Support System (112)',
        phoneNumber: '112',
        telHref: 'tel:112',
        officialPortalUrl: 'https://mohfw.gov.in/',
        officialPortalLabel: 'MoHFW India Guidance',
        regulatoryAuthority: 'Government of India (ERSS / MoHFW)',
        whenToUse:
          'Severe allergic reaction, breathing distress, seizures, chest pain, or accidental overdose.',
        whatToShare: [
          'Carry the medicine strip or bottle to the emergency department',
          'Share exact drug name, strength (mg/mcg), and time consumed',
        ],
      },
      {
        id: 'in-108',
        tier: 'RED',
        title: 'Emergency Ambulance Dispatch',
        serviceName: 'Medical Ambulance Helpline (108)',
        phoneNumber: '108',
        telHref: 'tel:108',
        officialPortalUrl: 'https://mohfw.gov.in/',
        officialPortalLabel: 'MoHFW Emergency Services',
        regulatoryAuthority: 'State & National Health Mission Ambulance Services',
        whenToUse:
          'Immediate ambulance transport needed for acute medical reactions or poisoning.',
        whatToShare: [
          'Exact street address/landmark and patient age',
          'Any medicines or multiple painkillers taken together',
        ],
      },
      {
        id: 'in-pvpi',
        tier: 'INFO',
        title: 'Report Adverse Drug Reactions',
        serviceName: 'IPC Pharmacovigilance Programme (PvPI)',
        officialPortalUrl: 'https://ipc.gov.in/',
        officialPortalLabel: 'Indian Pharmacopoeia Commission',
        regulatoryAuthority: 'Indian Pharmacopoeia Commission (IPC) / CDSCO',
        whenToUse:
          'Report suspected medicine side effects or quality issues to national regulators.',
        whatToShare: [
          'Brand name, manufacturer, batch/lot number, and expiry date',
          'Schedule H/OTC pack details and symptom description',
        ],
      },
    ],
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    emergencyNumber: '911',
    emergencyGuidance:
      'Call 911 immediately for emergency symptoms, or Poison Control at 1-800-222-1222 for suspected overdose.',
    regulatoryStandard: 'US Emergency Services, HRSA Poison Help & FDA MedWatch',
    cards: [
      {
        id: 'us-911',
        tier: 'RED',
        title: 'Immediate Medical Emergency',
        serviceName: 'US Emergency Services (911)',
        phoneNumber: '911',
        telHref: 'tel:911',
        officialPortalUrl: 'https://medlineplus.gov/firstaid.html',
        officialPortalLabel: 'MedlinePlus Emergency Guide',
        regulatoryAuthority: 'US Public Emergency Dispatch',
        whenToUse:
          'Difficulty breathing, throat swelling, chest pain, severe bleeding, or unresponsiveness.',
        whatToShare: [
          'Prescription bottle NDC / drug name and dosage strength',
          'Patient age, weight, and known allergies',
        ],
      },
      {
        id: 'us-poison',
        tier: 'AMBER',
        title: '24/7 Poison & Overdose Help',
        serviceName: 'Poison Control (1-800-222-1222)',
        phoneNumber: '1-800-222-1222',
        telHref: 'tel:18002221222',
        officialPortalUrl: 'https://www.poison.org/',
        officialPortalLabel: 'Poison Help Portal',
        regulatoryAuthority: 'America’s Poison Centers / HRSA',
        whenToUse:
          'Accidental double dose, child ingestion, or unsure if a combination is hazardous when the person is awake and breathing normally.',
        whatToShare: [
          'Active ingredients listed on the Drug Facts or Rx label',
          'Time of ingestion and approximate tablet count',
        ],
      },
      {
        id: 'us-medwatch',
        tier: 'INFO',
        title: 'Report Side Effects to FDA',
        serviceName: 'FDA MedWatch',
        officialPortalUrl:
          'https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program',
        officialPortalLabel: 'FDA MedWatch Reporting',
        regulatoryAuthority: 'U.S. Food and Drug Administration (FDA)',
        whenToUse:
          'Report serious adverse events, product quality defects, or medication errors.',
        whatToShare: [
          'SPL Set ID / NDC number and manufacturer name',
          'Reaction timeline and medical outcomes',
        ],
      },
    ],
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    emergencyNumber: '911',
    emergencyGuidance:
      'Call 911 immediately or go to the nearest emergency room. For non-life-threatening poison or drug advice, dial 811 or your regional Poison Centre.',
    regulatoryStandard: 'Health Canada Vigilance & Provincial 811 Triage',
    cards: [
      {
        id: 'ca-911',
        tier: 'RED',
        title: 'Life-Threatening Emergency',
        serviceName: 'Canada Emergency Services (911)',
        phoneNumber: '911',
        telHref: 'tel:911',
        officialPortalUrl: 'https://www.canada.ca/en/health-canada.html',
        officialPortalLabel: 'Health Canada Portal',
        regulatoryAuthority: 'Canadian Emergency Services',
        whenToUse:
          'Anaphylaxis, severe breathing trouble, chest pain, or loss of consciousness.',
        whatToShare: [
          'DIN (Drug Identification Number) and brand/generic name on package',
          'Time and dose taken',
        ],
      },
      {
        id: 'ca-811',
        tier: 'AMBER',
        title: '24/7 Health & Poison Triage',
        serviceName: 'Provincial Health Line (811)',
        phoneNumber: '811',
        telHref: 'tel:811',
        officialPortalUrl:
          'https://www.canada.ca/en/health-canada/services/drugs-health-products.html',
        officialPortalLabel: 'Health Canada Drug Info',
        regulatoryAuthority: 'Provincial / Territorial Health Authorities',
        whenToUse:
          'Urgent registered-nurse advice on side effects, dosing confusion, or regional poison centre routing.',
        whatToShare: [
          'Exact strength and formulation printed on your pharmacy label',
          'Other current prescriptions or natural health products',
        ],
      },
      {
        id: 'ca-vigilance',
        tier: 'INFO',
        title: 'Report Side Effects',
        serviceName: 'Canada Vigilance Program',
        officialPortalUrl:
          'https://www.canada.ca/en/health-canada/services/drugs-health-products/medeffect-canada/adverse-reaction-reporting.html',
        officialPortalLabel: 'MedEffect Canada Reporting',
        regulatoryAuthority: 'Health Canada',
        whenToUse:
          'Report suspected adverse drug reactions to Health Canada.',
        whatToShare: ['DIN number, lot number, and reaction details'],
      },
    ],
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    emergencyNumber: '000',
    emergencyGuidance:
      'Call 000 (Triple Zero) immediately for urgent care, or Poisons Information Centre on 13 11 26.',
    regulatoryStandard: 'Triple Zero Emergency, Poisons Centre & TGA Reporting',
    cards: [
      {
        id: 'au-000',
        tier: 'RED',
        title: 'Life-Threatening Emergency',
        serviceName: 'Triple Zero Emergency (000)',
        phoneNumber: '000',
        telHref: 'tel:000',
        officialPortalUrl: 'https://www.health.gov.au/',
        officialPortalLabel: 'Australian Dept of Health',
        regulatoryAuthority: 'Australian Emergency Services',
        whenToUse:
          'Breathing difficulty, severe allergic swelling, chest pain, or collapse.',
        whatToShare: [
          'AUST R / AUST L medicine name and strength on the Consumer Medicine Information leaflet',
          'Time and quantity taken',
        ],
      },
      {
        id: 'au-poisons',
        tier: 'AMBER',
        title: '24/7 Poisons Information Centre',
        serviceName: 'Poisons Hotline (13 11 26)',
        phoneNumber: '13 11 26',
        telHref: 'tel:131126',
        officialPortalUrl: 'https://www.tga.gov.au/',
        officialPortalLabel: 'TGA Australia Portal',
        regulatoryAuthority: 'Australian Poisons Information Centres',
        whenToUse:
          'Suspected overdose, accidental double dose, or child medicine exposure when patient is alert.',
        whatToShare: [
          'Active ingredients and milligram strength from packaging',
          'Approximate weight and age of the person',
        ],
      },
      {
        id: 'au-tga',
        tier: 'INFO',
        title: 'Report Medicine Problems',
        serviceName: 'TGA Adverse Event Reporting',
        officialPortalUrl: 'https://www.tga.gov.au/safety/reporting-problems',
        officialPortalLabel: 'TGA Safety Reporting',
        regulatoryAuthority: 'Therapeutic Goods Administration (TGA)',
        whenToUse:
          'Report unexpected side effects or suspected packaging defects.',
        whatToShare: ['AUST R/L number, batch number, and symptom details'],
      },
    ],
  },
  EU: {
    countryCode: 'EU',
    countryName: 'European Union',
    emergencyNumber: '112',
    emergencyGuidance:
      'Call 112 (EU-wide emergency number) immediately or go to the nearest hospital emergency department.',
    regulatoryStandard: 'EU 112 Directive & EMA Pharmacovigilance Network',
    cards: [
      {
        id: 'eu-112',
        tier: 'RED',
        title: 'EU-Wide Emergency Number',
        serviceName: 'European Emergency Services (112)',
        phoneNumber: '112',
        telHref: 'tel:112',
        officialPortalUrl:
          'https://digital-strategy.ec.europa.eu/en/policies/112',
        officialPortalLabel: 'European Commission 112 Info',
        regulatoryAuthority: 'European Union Member State Emergency Services',
        whenToUse:
          'Free from any mobile or landline across all EU countries for severe allergic reactions, breathing distress, or overdose.',
        whatToShare: [
          'INN active ingredient name (remains consistent across EU languages) and strength',
          'Time taken and current symptoms',
        ],
      },
      {
        id: 'eu-ema',
        tier: 'INFO',
        title: 'Report Suspected Side Effects',
        serviceName: 'EMA & National Reporting Network',
        officialPortalUrl:
          'https://www.ema.europa.eu/en/human-regulatory-overview/post-authorisation/pharmacovigilance-post-authorisation/reporting-suspected-side-effects',
        officialPortalLabel: 'EMA Reporting Directory',
        regulatoryAuthority: 'European Medicines Agency (EMA)',
        whenToUse:
          'Connect with your national medicines regulatory authority to report side effects.',
        whatToShare: [
          'EU marketing authorisation number, batch number, and symptom summary',
        ],
      },
    ],
  },
};

export function getCountryEmergencyInfo(countryCode: string): CountryEmergencyInfo {
  return EMERGENCY_DIRECTORY[countryCode.toUpperCase()] || EMERGENCY_DIRECTORY.GB;
}

export function detectEmergencySymptomText(text: string): string[] {
  const matched: string[] = [];
  for (const pattern of RED_EMERGENCY_PATTERNS) {
    const m = text.match(pattern);
    if (m) matched.push(m[0]);
  }
  return matched;
}

export function evaluateMedicineSafety(params: {
  countryCode: string;
  verificationStatus: string;
  missingFields: string[];
  seriousSideEffectsCount?: number;
  isUncertainMatch?: boolean;
  userSymptomText?: string;
  hasMajorInteraction?: boolean;
}): SafetyEvaluation {
  const emergency = getCountryEmergencyInfo(params.countryCode);
  const reasons: string[] = [];

  if (params.userSymptomText) {
    const redMatches = detectEmergencySymptomText(params.userSymptomText);
    if (redMatches.length > 0) {
      return {
        level: 'RED',
        headline: 'Potential Urgent Medical Situation',
        guidance:
          'Stop using conversational tools and seek immediate emergency medical help if someone is experiencing severe symptoms.',
        emergencyNumber: emergency.emergencyNumber,
        emergencyGuidance: emergency.emergencyGuidance,
        reasons: redMatches.map((r) => `Detected urgent symptom indicator: "${r}"`),
      };
    }
  }

  if (params.hasMajorInteraction) {
    reasons.push('A potentially serious or major documented interaction was identified.');
    return {
      level: 'AMBER',
      headline: 'Pharmacist or Doctor Review Recommended',
      guidance:
        'Do not start, stop, or change doses on your own. Speak with a pharmacist or prescriber before taking these medicines together.',
      emergencyNumber: emergency.emergencyNumber,
      emergencyGuidance: emergency.emergencyGuidance,
      reasons,
    };
  }

  if (params.verificationStatus === 'WITHDRAWN') {
    reasons.push('This record has been withdrawn from active clinical guidance.');
    return {
      level: 'RED',
      headline: 'Withdrawn Record — Do Not Rely on This Entry',
      guidance:
        'This medicine entry has been withdrawn pending clinical correction. Consult your pharmacist or prescriber.',
      emergencyNumber: emergency.emergencyNumber,
      emergencyGuidance: emergency.emergencyGuidance,
      reasons,
    };
  }

  if (params.isUncertainMatch) {
    reasons.push('Medicine packaging or strength could not be matched with complete certainty.');
  }
  if (params.missingFields.length > 0) {
    reasons.push(`Missing official data fields: ${params.missingFields.join(', ')}.`);
  }
  if (params.verificationStatus === 'PENDING_REVIEW') {
    reasons.push('Record is awaiting independent clinical review.');
  }

  if (reasons.length > 0) {
    return {
      level: 'AMBER',
      headline: 'Check With a Pharmacist Before Acting',
      guidance:
        'Some identification or regulatory details are incomplete or require confirmation. Ask a licensed pharmacist to verify your exact pack.',
      emergencyNumber: emergency.emergencyNumber,
      emergencyGuidance: emergency.emergencyGuidance,
      reasons,
    };
  }

  const greenReasons: string[] = [];
  if (params.verificationStatus === 'SYNTHETIC_TEST') {
    greenReasons.push(
      'Clearly marked synthetic test record demonstrating structured educational output.'
    );
  } else {
    greenReasons.push('Matched against verified regulatory product information.');
  }

  if ((params.seriousSideEffectsCount ?? 0) > 0) {
    greenReasons.push(
      `Includes ${params.seriousSideEffectsCount} documented serious warning sign(s) — review Section 7 carefully.`
    );
  }

  return {
    level: 'GREEN',
    headline: 'General Medicine Information',
    guidance:
      'Educational explanation based strictly on retrieved product information. Always follow your prescriber and pharmacist instructions.',
    emergencyNumber: emergency.emergencyNumber,
    emergencyGuidance: emergency.emergencyGuidance,
    reasons: greenReasons,
  };
}

export function validateManualReminderInput(input: {
  medicineName?: string;
  prescribedDose?: string;
  reminderTime?: string;
  frequency?: string;
  startDate?: string;
  autoGenerated?: boolean;
}): { valid: boolean; error?: string } {
  if (input.autoGenerated) {
    return {
      valid: false,
      error:
        'Safety rule violation: Reminders cannot be auto-generated from general medicine info. Enter your prescriber instructions manually.',
    };
  }
  if (!input.medicineName?.trim()) {
    return { valid: false, error: 'Medicine name is required.' };
  }
  if (!input.prescribedDose?.trim()) {
    return { valid: false, error: 'Your prescribed dose is required.' };
  }
  if (!input.reminderTime || !/^\d{2}:\d{2}$/.test(input.reminderTime)) {
    return { valid: false, error: 'Reminder time must be in HH:MM format.' };
  }
  if (!input.frequency?.trim()) {
    return { valid: false, error: 'Frequency is required.' };
  }
  if (!input.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    return { valid: false, error: 'Start date must be in YYYY-MM-DD format.' };
  }
  return { valid: true };
}
