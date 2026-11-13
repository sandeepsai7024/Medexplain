export type SafetyLevel = 'GREEN' | 'AMBER' | 'RED';

export interface SafetyEvaluation {
  level: SafetyLevel;
  headline: string;
  guidance: string;
  emergencyNumber?: string;
  emergencyGuidance?: string;
  reasons: string[];
}

export interface CountryConfig {
  countryCode: string;
  countryName: string;
  regulatoryAuthorities: string[];
  officialDataSources: {
    name: string;
    url: string;
    integrationStatus: string;
  }[];
  approvedLanguages: string[];
  emergencyNumber: string;
  emergencyGuidance: string;
  classificationRules: Record<string, string>;
  privacyFramework: string;
  sourceUpdateSchedule: string;
  isActive: boolean;
}

export interface MedicineMasterRecord {
  medicineId: string;
  countryCode: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  strength: string;
  dosageForm: string;
  routeOfAdministration: string;
  manufacturer: string;
  marketingAuthorisationNumber: string;
  regulatoryStatus: string;
  approvedIndications: string;
  officialPatientInformation: string;
  officialPrescribingInformation: string;
  storageInstructions: string;
  sourceUrl: string;
  sourceAuthority: string;
  sourceLastVerified: string;
  recordLastUpdated: string;
  verificationStatus: string;
  isSynthetic: boolean;
  missingDataIndicators: string[];
  safetyLevel: SafetyLevel;
  warningsText?: string;
  sideEffectsText?: string;
}

export interface GroundedExplanation {
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

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'patient' | 'db_admin' | 'clinical_reviewer' | 'content_manager' | 'tech_admin';
  preferredCountry: string;
  preferredLanguage: string;
  largePrintEnabled: boolean;
  consentVersion: string;
}

export interface ReminderRecord {
  id: number;
  medicineId: string;
  medicineName: string;
  prescribedDose: string;
  reminderTime: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notificationPreference: string;
  lastActionStatus: 'pending' | 'taken' | 'skipped' | 'snoozed';
  lastActionAt: string | null;
}

export interface SavedMedicineRecord {
  id: number;
  medicineId: string;
  countryCode: string;
  brandName: string;
  genericName: string;
  strength: string;
  sourceOrigin: string;
  personalNote: string;
  savedAt: string;
}
