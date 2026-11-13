import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// 1. USERS, CONSENT & PRIVACY GOVERNANCE
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default(''),
  role: text('role').notNull().default('patient'), // patient | db_admin | clinical_reviewer | content_manager | tech_admin
  preferredCountry: text('preferred_country').notNull().default('GB'),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  largePrintEnabled: boolean('large_print_enabled').notNull().default(true),
  consentVersion: text('consent_version').default('2026-01'),
  consentGrantedAt: timestamp('consent_granted_at'),
  dataRetentionDays: integer('data_retention_days').notNull().default(365),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 2. COUNTRY EXPANSION CONFIGURATION REGISTRY
// ============================================================================

export const countryConfigs = pgTable('country_configs', {
  countryCode: text('country_code').primaryKey(), // GB, IN, US, CA, AU, EU
  countryName: text('country_name').notNull(),
  regulatoryAuthorities: jsonb('regulatory_authorities').$type<string[]>().notNull(),
  officialDataSources: jsonb('official_data_sources').$type<{ name: string; url: string; integrationStatus: string }[]>().notNull(),
  approvedLanguages: jsonb('approved_languages').$type<string[]>().notNull(),
  emergencyNumber: text('emergency_number').notNull(),
  emergencyGuidance: text('emergency_guidance').notNull(),
  classificationRules: jsonb('classification_rules').$type<Record<string, string>>().notNull(),
  privacyFramework: text('privacy_framework').notNull(),
  sourceUpdateSchedule: text('source_update_schedule').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// 3. 16-TABLE MEDICINE CSV ARCHITECTURE
// ============================================================================

// CSV 1: medicines_master.csv
export const medicinesMaster = pgTable(
  'medicines_master',
  {
    medicineId: text('medicine_id').primaryKey(),
    countryCode: text('country_code').notNull(),
    brandName: text('brand_name').notNull(),
    genericName: text('generic_name').notNull(),
    activeIngredients: text('active_ingredients').notNull(), // Pipe-separated INN names for CSV compatibility
    strength: text('strength').notNull(),
    dosageForm: text('dosage_form').notNull(),
    routeOfAdministration: text('route_of_administration').notNull(),
    manufacturer: text('manufacturer').notNull(),
    marketingAuthorisationNumber: text('marketing_authorisation_number').notNull(),
    regulatoryStatus: text('regulatory_status').notNull(), // Prescription-Only | Pharmacy-Only | Over-The-Counter
    approvedIndications: text('approved_indications').notNull(),
    officialPatientInformation: text('official_patient_information').notNull(),
    officialPrescribingInformation: text('official_prescribing_information').notNull(),
    storageInstructions: text('storage_instructions').notNull().default('Store according to packaging instructions.'),
    sourceUrl: text('source_url').notNull(),
    sourceAuthority: text('source_authority').notNull(),
    sourceLastVerified: text('source_last_verified').notNull(),
    recordLastUpdated: text('record_last_updated').notNull(),
    verificationStatus: text('verification_status').notNull().default('SYNTHETIC_TEST'), // VERIFIED | PENDING_REVIEW | SYNTHETIC_TEST | WITHDRAWN
    isSynthetic: boolean('is_synthetic').notNull().default(true),
    missingDataIndicators: jsonb('missing_data_indicators').$type<string[]>().notNull().default([]),
    safetyLevel: text('safety_level').notNull().default('GREEN'), // GREEN | AMBER | RED
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('medicines_country_auth_idx').on(table.countryCode, table.medicineId),
  ]
);

// CSV 2: active_ingredients.csv
export const activeIngredients = pgTable('active_ingredients', {
  ingredientId: text('ingredient_id').primaryKey(),
  innName: text('inn_name').notNull(),
  chemicalClass: text('chemical_class').notNull(),
  pharmacologicalGroup: text('pharmacological_group').notNull(),
  atcCode: text('atc_code').notNull().default(''),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
  sourceAuthority: text('source_authority').notNull(),
  sourceUrl: text('source_url').notNull(),
});

// CSV 3: medicine_brands.csv
export const medicineBrands = pgTable('medicine_brands', {
  brandId: text('brand_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  brandName: text('brand_name').notNull(),
  trademarkOwner: text('trademark_owner').notNull(),
  marketingStatus: text('marketing_status').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 4: medicine_strengths.csv
export const medicineStrengths = pgTable('medicine_strengths', {
  strengthId: text('strength_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  ingredientName: text('ingredient_name').notNull(),
  strengthValue: text('strength_value').notNull(),
  strengthUnit: text('strength_unit').notNull(),
  basisOfStrength: text('basis_of_strength').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 5: medicine_formulations.csv
export const medicineFormulations = pgTable('medicine_formulations', {
  formulationId: text('formulation_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  dosageForm: text('dosage_form').notNull(),
  releaseCharacteristic: text('release_characteristic').notNull(),
  routeOfAdministration: text('route_of_administration').notNull(),
  excipientsSummary: text('excipients_summary').notNull(),
  appearanceDescription: text('appearance_description').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 6: medicine_indications.csv
export const medicineIndications = pgTable('medicine_indications', {
  indicationId: text('indication_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  officialIndicationText: text('official_indication_text').notNull(),
  plainLanguagePurpose: text('plain_language_purpose').notNull(),
  populationRestriction: text('population_restriction').notNull(),
  sourceReference: text('source_reference').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 7: medicine_instructions.csv
export const medicineInstructions = pgTable('medicine_instructions', {
  instructionId: text('instruction_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  officialWording: text('official_wording').notNull(),
  plainLanguageGuidance: text('plain_language_guidance').notNull(),
  foodTimingNote: text('food_timing_note').notNull(),
  missedDosePolicy: text('missed_dose_policy').notNull(),
  sourceReference: text('source_reference').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 8: medicine_warnings.csv
export const medicineWarnings = pgTable('medicine_warnings', {
  warningId: text('warning_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  warningType: text('warning_type').notNull(), // boxed | precaution | serious_sign | pregnancy | driving
  safetyTier: text('safety_tier').notNull().default('AMBER'), // GREEN | AMBER | RED
  officialWarningText: text('official_warning_text').notNull(),
  plainLanguageWarning: text('plain_language_warning').notNull(),
  sourceReference: text('source_reference').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 9: medicine_side_effects.csv
export const medicineSideEffects = pgTable('medicine_side_effects', {
  sideEffectId: text('side_effect_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  frequencyCategory: text('frequency_category').notNull(), // Very common | Common | Uncommon | Rare | Serious - Seek Urgent Care
  isSerious: boolean('is_serious').notNull().default(false),
  officialTerm: text('official_term').notNull(),
  plainLanguageDescription: text('plain_language_description').notNull(),
  actionGuidance: text('action_guidance').notNull(),
  sourceReference: text('source_reference').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 10: medicine_interactions.csv
export const medicineInteractions = pgTable('medicine_interactions', {
  interactionId: text('interaction_id').primaryKey(),
  ingredientA: text('ingredient_a').notNull(),
  ingredientB: text('ingredient_b').notNull(),
  severity: text('severity').notNull(), // Major | Moderate | Minor | Unknown
  safetyTier: text('safety_tier').notNull().default('AMBER'), // AMBER | RED
  clinicalEffect: text('clinical_effect').notNull(),
  plainLanguageExplanation: text('plain_language_explanation').notNull(),
  recommendedNextStep: text('recommended_next_step').notNull(),
  evidenceSource: text('evidence_source').notNull(),
  sourceUrl: text('source_url').notNull(),
  countryScope: text('country_scope').notNull().default('GLOBAL'),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 11: medicine_contraindications.csv
export const medicineContraindications = pgTable('medicine_contraindications', {
  contraindicationId: text('contraindication_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  conditionName: text('condition_name').notNull(),
  officialStatement: text('official_statement').notNull(),
  plainLanguageExplanation: text('plain_language_explanation').notNull(),
  sourceReference: text('source_reference').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 12: medicine_country_approvals.csv
export const medicineCountryApprovals = pgTable('medicine_country_approvals', {
  approvalId: text('approval_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  regulatoryAuthority: text('regulatory_authority').notNull(),
  authorisationNumber: text('authorisation_number').notNull(),
  approvalStatus: text('approval_status').notNull(), // Approved | Pending | Withdrawn | Not Approved
  supplyClassification: text('supply_classification').notNull(), // Rx | Pharmacy | OTC
  approvalDate: text('approval_date').notNull(),
  lastReviewedDate: text('last_reviewed_date').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 13: medicine_manufacturers.csv
export const medicineManufacturers = pgTable('medicine_manufacturers', {
  manufacturerId: text('manufacturer_id').primaryKey(),
  manufacturerName: text('manufacturer_name').notNull(),
  countryOfOrigin: text('country_of_origin').notNull(),
  regulatorySiteId: text('regulatory_site_id').notNull(),
  contactChannel: text('contact_channel').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 14: medicine_sources.csv
export const medicineSources = pgTable('medicine_sources', {
  sourceId: text('source_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  authorityName: text('authority_name').notNull(),
  documentType: text('document_type').notNull(), // SmPC | PIL | DailyMed SPL | Package Insert | CMI
  documentUrl: text('document_url').notNull(),
  licenseTerms: text('license_terms').notNull(),
  lastVerifiedAt: text('last_verified_at').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 15: medicine_languages.csv
export const medicineLanguages = pgTable('medicine_languages', {
  translationId: text('translation_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  languageCode: text('language_code').notNull(), // en | hi | te | ta | bn | ur
  languageName: text('language_name').notNull(),
  translatedPurpose: text('translated_purpose').notNull(),
  translatedInstructions: text('translated_instructions').notNull(),
  translatedWarnings: text('translated_warnings').notNull(),
  reviewStatus: text('review_status').notNull().default('CLINICAL_PENDING'),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// CSV 16: medicine_update_history.csv
export const medicineUpdateHistory = pgTable('medicine_update_history', {
  historyId: text('history_id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  changeType: text('change_type').notNull(), // CREATED | UPDATED | VERIFIED | WITHDRAWN | SOURCE_REFRESH
  changedFields: text('changed_fields').notNull(),
  changeSummary: text('change_summary').notNull(),
  changedBy: text('changed_by').notNull(),
  changedAt: text('changed_at').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
});

// ============================================================================
// 4. PATIENT SAVED MEDICINES, REMINDERS, OCR SCANS & ADMIN QA / AUDIT
// ============================================================================

export const savedMedicines = pgTable('saved_medicines', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  brandName: text('brand_name').notNull(),
  genericName: text('generic_name').notNull(),
  strength: text('strength').notNull(),
  sourceOrigin: text('source_origin').notNull().default('catalog'), // catalog | openfda
  personalNote: text('personal_note').default(''),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
});

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  medicineId: text('medicine_id').default(''),
  medicineName: text('medicine_name').notNull(),
  prescribedDose: text('prescribed_dose').notNull(),
  reminderTime: text('reminder_time').notNull(), // HH:MM
  frequency: text('frequency').notNull(), // Once daily | Twice daily | Three times daily | Weekly | Custom
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').default(''),
  notificationPreference: text('notification_preference').notNull().default('browser'), // browser | email | in_app
  lastActionStatus: text('last_action_status').notNull().default('pending'), // pending | taken | skipped | snoozed
  lastActionAt: timestamp('last_action_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reminderLogs = pgTable('reminder_logs', {
  id: serial('id').primaryKey(),
  reminderId: integer('reminder_id')
    .references(() => reminders.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(), // taken | skipped | snoozed
  note: text('note').default(''),
  loggedAt: timestamp('logged_at').defaultNow().notNull(),
});

export const scanSessions = pgTable('scan_sessions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').default('anonymous'),
  countryCode: text('country_code').notNull(),
  scanMode: text('scan_mode').notNull().default('label_photo'), // box | prescription | label_photo | leaflet
  extractedData: jsonb('extracted_data').$type<Record<string, string | null>>().notNull(),
  candidateMedicineIds: jsonb('candidate_medicine_ids').$type<string[]>().notNull().default([]),
  confirmedMedicineId: text('confirmed_medicine_id').default(''),
  status: text('status').notNull().default('awaiting_confirmation'), // awaiting_confirmation | confirmed | failed_ocr | uncertain_amber
  safetyLevel: text('safety_level').notNull().default('AMBER'),
  failureReason: text('failure_reason').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiQaReviews = pgTable('ai_qa_reviews', {
  id: serial('id').primaryKey(),
  medicineId: text('medicine_id').notNull(),
  countryCode: text('country_code').notNull(),
  languageCode: text('language_code').notNull(),
  safetyLevel: text('safety_level').notNull(),
  generatedSummary: jsonb('generated_summary').$type<Record<string, unknown>>().notNull(),
  qaStatus: text('qa_status').notNull().default('pending_review'), // pending_review | approved | flagged
  reviewerNotes: text('reviewer_notes').default(''),
  reviewedBy: text('reviewed_by').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  savedMedicines: many(savedMedicines),
  reminders: many(reminders),
  reminderLogs: many(reminderLogs),
}));

export const remindersRelations = relations(reminders, ({ one, many }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  logs: many(reminderLogs),
}));
