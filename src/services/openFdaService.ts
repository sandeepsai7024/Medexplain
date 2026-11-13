export interface OpenFdaMedicineCandidate {
  medicineId: string;
  countryCode: 'US';
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
  warningsText: string;
  sideEffectsText: string;
  storageInstructions: string;
  sourceUrl: string;
  sourceAuthority: string;
  sourceLastVerified: string;
  verificationStatus: 'OFFICIAL_OPENFDA_SPL';
  isSynthetic: false;
  missingDataIndicators: string[];
}

interface OpenFdaRawResult {
  id?: string;
  set_id?: string;
  effective_time?: string;
  active_ingredient?: string[];
  purpose?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  boxed_warning?: string[];
  adverse_reactions?: string[];
  storage_and_handling?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    dosage_form?: string[];
    route?: string[];
    product_type?: string[];
    application_number?: string[];
    substance_name?: string[];
    spl_id?: string[];
  };
}

function cleanSnippet(arr?: string[], maxLen = 1800): string {
  if (!arr || arr.length === 0) return '';
  const joined = arr.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}…` : joined;
}

export async function searchOpenFdaLabels(
  query: string,
  limit = 6
): Promise<{ results: OpenFdaMedicineCandidate[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  const safeQuery = trimmed.replace(/[^a-zA-Z0-9\s-]/g, ' ').trim();
  if (!safeQuery) return { results: [] };

  const encoded = encodeURIComponent(
    `(openfda.brand_name:"${safeQuery}" OR openfda.generic_name:"${safeQuery}" OR active_ingredient:"${safeQuery}")`
  );
  const url = `https://api.fda.gov/drug/label.json?search=${encoded}&limit=${limit}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (response.status === 404) {
      return { results: [] };
    }
    if (!response.ok) {
      return {
        results: [],
        error: `OpenFDA API returned HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as { results?: OpenFdaRawResult[] };
    const rawList = payload.results || [];

    const mapped: OpenFdaMedicineCandidate[] = rawList.map((item, idx) => {
      const fda = item.openfda || {};
      const brand = fda.brand_name?.[0] || fda.generic_name?.[0] || safeQuery;
      const generic =
        fda.generic_name?.[0] ||
        cleanSnippet(item.active_ingredient, 160) ||
        'Not specified in SPL header';
      const substances =
        fda.substance_name?.join(' | ') ||
        cleanSnippet(item.active_ingredient, 200) ||
        generic;
      const setId = item.set_id || item.id || `openfda_${idx}`;
      const appNum = fda.application_number?.[0] || setId;
      const productType = fda.product_type?.[0] || '';
      const regulatoryStatus = productType.includes('OTC')
        ? 'Over-The-Counter'
        : productType.includes('PRESCRIPTION')
          ? 'Prescription-Only'
          : 'Unclassified in SPL';

      const indications =
        cleanSnippet(item.indications_and_usage) ||
        cleanSnippet(item.purpose) ||
        '';
      const instructions = cleanSnippet(item.dosage_and_administration);
      const warnings =
        [
          cleanSnippet(item.boxed_warning, 800),
          cleanSnippet(item.warnings, 1000),
          cleanSnippet(item.warnings_and_cautions, 800),
        ]
          .filter(Boolean)
          .join(' ') || '';
      const sideEffects = cleanSnippet(item.adverse_reactions);
      const storage = cleanSnippet(item.storage_and_handling, 500);

      const missing: string[] = [];
      if (!indications) missing.push('approved_indications');
      if (!instructions) missing.push('dosage_and_administration');
      if (!warnings) missing.push('warnings');
      if (!storage) missing.push('storage_and_handling');

      const formattedDate = item.effective_time
        ? `${item.effective_time.slice(0, 4)}-${item.effective_time.slice(4, 6)}-${item.effective_time.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);

      return {
        medicineId: `OPENFDA_${setId}`,
        countryCode: 'US',
        brandName: brand,
        genericName: generic,
        activeIngredients: substances,
        strength: cleanSnippet(item.active_ingredient, 120) || 'See SPL label details',
        dosageForm: fda.dosage_form?.[0] || 'See SPL label',
        routeOfAdministration: fda.route?.[0] || 'See SPL label',
        manufacturer: fda.manufacturer_name?.[0] || 'Manufacturer listed in DailyMed SPL',
        marketingAuthorisationNumber: appNum,
        regulatoryStatus,
        approvedIndications: indications || 'MISSING — Check official DailyMed SPL link.',
        officialPatientInformation:
          instructions || 'MISSING — Refer to printed prescription or DailyMed SPL.',
        officialPrescribingInformation:
          [indications, instructions].filter(Boolean).join(' ') ||
          'Refer to DailyMed Structured Product Labeling.',
        warningsText: warnings || 'MISSING — Consult pharmacist or DailyMed SPL.',
        sideEffectsText: sideEffects || 'See official DailyMed adverse reactions section.',
        storageInstructions: storage || 'Store according to package label.',
        sourceUrl: item.set_id
          ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${item.set_id}`
          : 'https://open.fda.gov/apis/drug/label/',
        sourceAuthority: 'US FDA / DailyMed (OpenFDA Drug Label API)',
        sourceLastVerified: formattedDate,
        verificationStatus: 'OFFICIAL_OPENFDA_SPL',
        isSynthetic: false,
        missingDataIndicators: missing,
      };
    });

    return { results: mapped };
  } catch (err) {
    console.error('OpenFDA lookup failed:', err);
    return {
      results: [],
      error: 'Live OpenFDA service temporarily unreachable. Local database remains available.',
    };
  }
}
