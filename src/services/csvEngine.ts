export type CsvTableName =
  | 'medicines_master'
  | 'active_ingredients'
  | 'medicine_brands'
  | 'medicine_strengths'
  | 'medicine_formulations'
  | 'medicine_indications'
  | 'medicine_instructions'
  | 'medicine_warnings'
  | 'medicine_side_effects'
  | 'medicine_interactions'
  | 'medicine_contraindications'
  | 'medicine_country_approvals'
  | 'medicine_manufacturers'
  | 'medicine_sources'
  | 'medicine_languages'
  | 'medicine_update_history';

export const CSV_SCHEMAS: Record<CsvTableName, string[]> = {
  medicines_master: [
    'medicine_id',
    'country_code',
    'brand_name',
    'generic_name',
    'active_ingredients',
    'strength',
    'dosage_form',
    'route_of_administration',
    'manufacturer',
    'marketing_authorisation_number',
    'regulatory_status',
    'approved_indications',
    'official_patient_information',
    'official_prescribing_information',
    'source_url',
    'source_authority',
    'source_last_verified',
    'record_last_updated',
    'verification_status',
  ],
  active_ingredients: [
    'ingredient_id',
    'inn_name',
    'chemical_class',
    'pharmacological_group',
    'atc_code',
    'is_synthetic',
    'source_authority',
    'source_url',
  ],
  medicine_brands: [
    'brand_id',
    'medicine_id',
    'country_code',
    'brand_name',
    'trademark_owner',
    'marketing_status',
    'is_synthetic',
  ],
  medicine_strengths: [
    'strength_id',
    'medicine_id',
    'ingredient_name',
    'strength_value',
    'strength_unit',
    'basis_of_strength',
    'is_synthetic',
  ],
  medicine_formulations: [
    'formulation_id',
    'medicine_id',
    'dosage_form',
    'release_characteristic',
    'route_of_administration',
    'excipients_summary',
    'appearance_description',
    'is_synthetic',
  ],
  medicine_indications: [
    'indication_id',
    'medicine_id',
    'country_code',
    'official_indication_text',
    'plain_language_purpose',
    'population_restriction',
    'source_reference',
    'is_synthetic',
  ],
  medicine_instructions: [
    'instruction_id',
    'medicine_id',
    'country_code',
    'official_wording',
    'plain_language_guidance',
    'food_timing_note',
    'missed_dose_policy',
    'source_reference',
    'is_synthetic',
  ],
  medicine_warnings: [
    'warning_id',
    'medicine_id',
    'country_code',
    'warning_type',
    'safety_tier',
    'official_warning_text',
    'plain_language_warning',
    'source_reference',
    'is_synthetic',
  ],
  medicine_side_effects: [
    'side_effect_id',
    'medicine_id',
    'country_code',
    'frequency_category',
    'is_serious',
    'official_term',
    'plain_language_description',
    'action_guidance',
    'source_reference',
    'is_synthetic',
  ],
  medicine_interactions: [
    'interaction_id',
    'ingredient_a',
    'ingredient_b',
    'severity',
    'safety_tier',
    'clinical_effect',
    'plain_language_explanation',
    'recommended_next_step',
    'evidence_source',
    'source_url',
    'country_scope',
    'is_synthetic',
  ],
  medicine_contraindications: [
    'contraindication_id',
    'medicine_id',
    'country_code',
    'condition_name',
    'official_statement',
    'plain_language_explanation',
    'source_reference',
    'is_synthetic',
  ],
  medicine_country_approvals: [
    'approval_id',
    'medicine_id',
    'country_code',
    'regulatory_authority',
    'authorisation_number',
    'approval_status',
    'supply_classification',
    'approval_date',
    'last_reviewed_date',
    'is_synthetic',
  ],
  medicine_manufacturers: [
    'manufacturer_id',
    'manufacturer_name',
    'country_of_origin',
    'regulatory_site_id',
    'contact_channel',
    'is_synthetic',
  ],
  medicine_sources: [
    'source_id',
    'medicine_id',
    'country_code',
    'authority_name',
    'document_type',
    'document_url',
    'license_terms',
    'last_verified_at',
    'is_synthetic',
  ],
  medicine_languages: [
    'translation_id',
    'medicine_id',
    'language_code',
    'language_name',
    'translated_purpose',
    'translated_instructions',
    'translated_warnings',
    'review_status',
    'is_synthetic',
  ],
  medicine_update_history: [
    'history_id',
    'medicine_id',
    'country_code',
    'change_type',
    'changed_fields',
    'change_summary',
    'changed_by',
    'changed_at',
    'is_synthetic',
  ],
};

export function parseCsvText(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  if (!clean) return { headers: [], rows: [] };

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        records.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        records.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }
  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    records.push(currentRow);
  }

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const rowArr = records[r];
    if (rowArr.every((c) => c === '')) continue;
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = rowArr[idx] ?? '';
    });
    rows.push(obj);
  }
  return { headers, rows };
}

export function serializeToCsv(
  headers: string[],
  rows: Record<string, unknown>[]
): string {
  const escapeCell = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export interface CsvValidationResult {
  valid: boolean;
  missingColumns: string[];
  duplicateIds: string[];
  rowsWithMissingFields: { rowIndex: number; id: string; missing: string[] }[];
  totalRows: number;
}

export function validateCsvPayload(
  table: CsvTableName,
  headers: string[],
  rows: Record<string, string>[]
): CsvValidationResult {
  const expected = CSV_SCHEMAS[table];
  const missingColumns = expected.filter((col) => !headers.includes(col));
  const pkField = expected[0];
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const rowsWithMissingFields: {
    rowIndex: number;
    id: string;
    missing: string[];
  }[] = [];

  rows.forEach((row, idx) => {
    const idVal = row[pkField] || `row_${idx + 1}`;
    if (row[pkField]) {
      if (seen.has(row[pkField])) {
        duplicateIds.push(row[pkField]);
      }
      seen.add(row[pkField]);
    }
    const missing = expected.filter(
      (col) => row[col] === undefined || row[col] === '' || row[col] === 'MISSING'
    );
    if (missing.length > 0) {
      rowsWithMissingFields.push({ rowIndex: idx + 1, id: idVal, missing });
    }
  });

  return {
    valid: missingColumns.length === 0 && duplicateIds.length === 0 && rows.length > 0,
    missingColumns,
    duplicateIds,
    rowsWithMissingFields,
    totalRows: rows.length,
  };
}

export const POSTGRES_DDL_REFERENCE = `-- MedExplain PostgreSQL Relational Schema Reference (16 Medicine Tables + Governance)
-- Synchronized with Drizzle ORM schema in src/db/schema.ts
-- Supports country isolation (GB, IN, US, CA, AU, EU), multi-ingredient formulations,
-- missing-data indicators, clinical verification workflows, and immutable audit trails.
-- Run 'npx drizzle-kit push' or Cloud SQL UpdateSchema to provision.`;
