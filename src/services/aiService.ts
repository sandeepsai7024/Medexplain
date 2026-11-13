import { GoogleGenAI, Type } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ExtractedLabelData {
  brandName: string | null;
  genericName: string | null;
  activeIngredients: string | null;
  strength: string | null;
  dosageForm: string | null;
  manufacturer: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  printedInstructions: string | null;
  warnings: string | null;
  isBlurryOrIncomplete: boolean;
  confidenceNote: string;
}

export interface GroundedMedicineExplanation {
  languageCode: string;
  languageName: string;
  whatIsThisMedicine: string;
  statedPurpose: string;
  officialUses: string;
  howToUnderstandInstructions: string;
  importantWarnings: string[];
  commonSideEffects: string[];
  seriousWarningSigns: string[];
  storageInstructions: string;
  pharmacistQuestions: string[];
  officialReferences: {
    claimArea: string;
    authority: string;
    url: string;
    lastVerified: string;
  }[];
  uncertaintyNotes: string[];
  originalOfficialWording: {
    indications: string;
    instructions: string;
    prescribingInfo: string;
  };
  generatedByAi: boolean;
}

export const SUPPORTED_LANGUAGES: Record<
  string,
  { code: string; name: string; nativeName: string }
> = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  ur: { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
};

export async function extractMedicineLabelFromImage(
  base64Data: string,
  mimeType: string,
  countryCode: string
): Promise<{ data: ExtractedLabelData; usedAi: boolean }> {
  const ai = getAiClient();
  if (!ai) {
    return {
      usedAi: false,
      data: {
        brandName: null,
        genericName: null,
        activeIngredients: null,
        strength: null,
        dosageForm: null,
        manufacturer: null,
        expiryDate: null,
        batchNumber: null,
        printedInstructions: null,
        warnings: null,
        isBlurryOrIncomplete: true,
        confidenceNote:
          'Optical extraction unavailable because GEMINI_API_KEY is not configured. Please enter the printed medicine name manually to confirm.',
      },
    };
  }

  const cleanBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `You are a clinical OCR extraction assistant for MedExplain (target country context: ${countryCode}).
Read ONLY what is visibly printed on this medicine box, bottle label, prescription, or patient leaflet.
Never guess or invent missing fields. If a field is not legible or absent, return null for that field and set isBlurryOrIncomplete to true if the medicine name or strength cannot be read clearly.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandName: { type: Type.STRING, nullable: true },
            genericName: { type: Type.STRING, nullable: true },
            activeIngredients: { type: Type.STRING, nullable: true },
            strength: { type: Type.STRING, nullable: true },
            dosageForm: { type: Type.STRING, nullable: true },
            manufacturer: { type: Type.STRING, nullable: true },
            expiryDate: { type: Type.STRING, nullable: true },
            batchNumber: { type: Type.STRING, nullable: true },
            printedInstructions: { type: Type.STRING, nullable: true },
            warnings: { type: Type.STRING, nullable: true },
            isBlurryOrIncomplete: { type: Type.BOOLEAN },
            confidenceNote: { type: Type.STRING },
          },
          required: ['isBlurryOrIncomplete', 'confidenceNote'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as ExtractedLabelData;
    return { data: parsed, usedAi: true };
  } catch (error) {
    console.error('Gemini OCR extraction error:', error);
    return {
      usedAi: false,
      data: {
        brandName: null,
        genericName: null,
        activeIngredients: null,
        strength: null,
        dosageForm: null,
        manufacturer: null,
        expiryDate: null,
        batchNumber: null,
        printedInstructions: null,
        warnings: null,
        isBlurryOrIncomplete: true,
        confidenceNote:
          'Unable to read the image clearly. Try brighter lighting or type the medicine name manually.',
      },
    };
  }
}

export interface MedicineSourceRecordInput {
  medicineId: string;
  countryCode: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  strength: string;
  dosageForm: string;
  routeOfAdministration: string;
  manufacturer: string;
  regulatoryStatus: string;
  approvedIndications: string;
  officialPatientInformation: string;
  officialPrescribingInformation: string;
  storageInstructions: string;
  warnings: { officialText: string; plainText: string; safetyTier: string }[];
  sideEffects: {
    officialTerm: string;
    plainDescription: string;
    frequencyCategory: string;
    isSerious: boolean;
    actionGuidance: string;
  }[];
  sourceUrl: string;
  sourceAuthority: string;
  sourceLastVerified: string;
  verificationStatus: string;
  missingDataIndicators: string[];
  preTranslated?: {
    translatedPurpose: string;
    translatedInstructions: string;
    translatedWarnings: string;
  } | null;
}

export async function generateGroundedExplanation(
  record: MedicineSourceRecordInput,
  languageCode: string
): Promise<GroundedMedicineExplanation> {
  const lang = SUPPORTED_LANGUAGES[languageCode] || SUPPORTED_LANGUAGES.en;
  const uncertaintyNotes: string[] = [];

  if (record.missingDataIndicators.length > 0) {
    uncertaintyNotes.push(
      `Missing official fields in source record: ${record.missingDataIndicators.join(', ')}. Consult a pharmacist for complete details.`
    );
  }
  if (record.verificationStatus === 'SYNTHETIC_TEST') {
    uncertaintyNotes.push(
      'This entry is a clearly marked SYNTHETIC TEST record for platform testing and demonstration, not a live national clinical monograph.'
    );
  }
  if (record.verificationStatus === 'PENDING_REVIEW') {
    uncertaintyNotes.push(
      'This record is pending clinical reviewer sign-off.'
    );
  }

  const baseReferences = [
    {
      claimArea: 'Approved Indications & Product Identity',
      authority: record.sourceAuthority,
      url: record.sourceUrl,
      lastVerified: record.sourceLastVerified,
    },
    {
      claimArea: 'Patient Instructions, Warnings & Side Effects',
      authority: record.sourceAuthority,
      url: record.sourceUrl,
      lastVerified: record.sourceLastVerified,
    },
  ];

  const fallbackResult: GroundedMedicineExplanation = {
    languageCode: lang.code,
    languageName: lang.name,
    whatIsThisMedicine: `${record.brandName} (${record.genericName}) contains ${record.activeIngredients} in ${record.strength} ${record.dosageForm} form (${record.routeOfAdministration}). Regulatory status in ${record.countryCode}: ${record.regulatoryStatus}.`,
    statedPurpose:
      record.preTranslated && lang.code !== 'en'
        ? record.preTranslated.translatedPurpose
        : record.approvedIndications,
    officialUses: record.approvedIndications,
    howToUnderstandInstructions:
      record.preTranslated && lang.code !== 'en'
        ? record.preTranslated.translatedInstructions
        : `${record.officialPatientInformation} Always follow the exact timing and directions printed on your personal prescription label.`,
    importantWarnings:
      record.preTranslated && lang.code !== 'en'
        ? [record.preTranslated.translatedWarnings]
        : record.warnings.length > 0
          ? record.warnings.map((w) => w.plainText || w.officialText)
          : ['Review the official package leaflet and check with your pharmacist before use.'],
    commonSideEffects: record.sideEffects
      .filter((s) => !s.isSerious)
      .map((s) => `${s.officialTerm} (${s.frequencyCategory}): ${s.plainDescription}`),
    seriousWarningSigns: record.sideEffects
      .filter((s) => s.isSerious)
      .map((s) => `${s.officialTerm}: ${s.plainDescription} — ${s.actionGuidance}`),
    storageInstructions: record.storageInstructions,
    pharmacistQuestions: [
      `Should I take ${record.brandName} (${record.strength}) with food or on an empty stomach?`,
      'What should I do if I miss a scheduled dose?',
      'Could this interact with my other prescriptions, over-the-counter medicines, or supplements?',
      `How should I store ${record.brandName} safely in my home climate?`,
      'Which warning signs mean I should seek urgent medical care right away?',
    ],
    officialReferences: baseReferences,
    uncertaintyNotes,
    originalOfficialWording: {
      indications: record.approvedIndications,
      instructions: record.officialPatientInformation,
      prescribingInfo: record.officialPrescribingInformation,
    },
    generatedByAi: false,
  };

  const ai = getAiClient();
  if (!ai) {
    return fallbackResult;
  }

  try {
    const prompt = `Transform ONLY the verified retrieved medicine record below into a clear, calm, everyday-reading-level explanation in ${lang.name} (${lang.code}).

STRICT CLINICAL RULES:
1. NO SOURCE, NO CLINICAL CLAIM: Use ONLY facts present in the retrieved JSON below. Never add unstated uses, doses, or side effects.
2. NEVER diagnose, prescribe, recommend starting/stopping medication, change doses, or advise doubling a missed dose.
3. TRANSLATION ACCURACY: Translate explanations into ${lang.name}, while keeping medicine brand names ("${record.brandName}"), active ingredient INN names ("${record.activeIngredients}"), strength ("${record.strength}"), and measurement units accurate and intact.
4. Keep sentences short, warm, and easy for an older adult to read.
5. Note any missing fields transparently rather than filling them in.

RETRIEVED RECORD:
${JSON.stringify(record, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are MedExplain’s strictly grounded patient-education editor. Never fabricate medical facts or offer medical advice.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatIsThisMedicine: { type: Type.STRING },
            statedPurpose: { type: Type.STRING },
            officialUses: { type: Type.STRING },
            howToUnderstandInstructions: { type: Type.STRING },
            importantWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            commonSideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
            seriousWarningSigns: { type: Type.ARRAY, items: { type: Type.STRING } },
            storageInstructions: { type: Type.STRING },
            pharmacistQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'whatIsThisMedicine',
            'statedPurpose',
            'officialUses',
            'howToUnderstandInstructions',
            'importantWarnings',
            'commonSideEffects',
            'seriousWarningSigns',
            'storageInstructions',
            'pharmacistQuestions',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<GroundedMedicineExplanation>;
    return {
      ...fallbackResult,
      whatIsThisMedicine: parsed.whatIsThisMedicine || fallbackResult.whatIsThisMedicine,
      statedPurpose: parsed.statedPurpose || fallbackResult.statedPurpose,
      officialUses: parsed.officialUses || fallbackResult.officialUses,
      howToUnderstandInstructions:
        parsed.howToUnderstandInstructions || fallbackResult.howToUnderstandInstructions,
      importantWarnings:
        parsed.importantWarnings?.length
          ? parsed.importantWarnings
          : fallbackResult.importantWarnings,
      commonSideEffects:
        parsed.commonSideEffects?.length
          ? parsed.commonSideEffects
          : fallbackResult.commonSideEffects,
      seriousWarningSigns:
        parsed.seriousWarningSigns?.length
          ? parsed.seriousWarningSigns
          : fallbackResult.seriousWarningSigns,
      storageInstructions: parsed.storageInstructions || fallbackResult.storageInstructions,
      pharmacistQuestions:
        parsed.pharmacistQuestions?.length
          ? parsed.pharmacistQuestions
          : fallbackResult.pharmacistQuestions,
      generatedByAi: true,
    };
  } catch (error) {
    console.error('Gemini grounded explanation error:', error);
    return fallbackResult;
  }
}
