import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  activeIngredients,
  aiQaReviews,
  auditLogs,
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
  reminderLogs,
  reminders,
  savedMedicines,
  scanSessions,
} from './src/db/schema.ts';
import {
  deleteUserAccountData,
  updateUserPreferences,
} from './src/db/users.ts';
import { ensureDatabaseSeeded } from './src/data/syntheticSeed.ts';
import {
  ADMIN_ROLES,
  AuthRequest,
  optionalAuth,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';
import {
  extractMedicineLabelFromImage,
  generateGroundedExplanation,
  MedicineSourceRecordInput,
} from './src/services/aiService.ts';
import {
  CSV_SCHEMAS,
  CsvTableName,
  parseCsvText,
  serializeToCsv,
  validateCsvPayload,
} from './src/services/csvEngine.ts';
import { searchOpenFdaLabels } from './src/services/openFdaService.ts';
import {
  evaluateMedicineSafety,
  getCountryEmergencyInfo,
  validateManualReminderInput,
} from './src/services/safetyClassifier.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function normalizeIngredientAlias(name: string): string {
  const lower = name.trim().toLowerCase();
  if (lower === 'acetaminophen') return 'paracetamol';
  if (lower === 'albuterol') return 'salbutamol';
  if (lower === 'acetylsalicylic acid') return 'aspirin';
  return lower;
}

async function fetchFullMedicineDossier(medicineId: string) {
  const [master] = await db
    .select()
    .from(medicinesMaster)
    .where(eq(medicinesMaster.medicineId, medicineId));
  if (!master) return null;

  const [
    indications,
    instructions,
    warnings,
    sideEffects,
    contraindications,
    approvals,
    sources,
    formulations,
    strengths,
    translations,
    history,
  ] = await Promise.all([
    db
      .select()
      .from(medicineIndications)
      .where(eq(medicineIndications.medicineId, medicineId)),
    db
      .select()
      .from(medicineInstructions)
      .where(eq(medicineInstructions.medicineId, medicineId)),
    db
      .select()
      .from(medicineWarnings)
      .where(eq(medicineWarnings.medicineId, medicineId)),
    db
      .select()
      .from(medicineSideEffects)
      .where(eq(medicineSideEffects.medicineId, medicineId)),
    db
      .select()
      .from(medicineContraindications)
      .where(eq(medicineContraindications.medicineId, medicineId)),
    db
      .select()
      .from(medicineCountryApprovals)
      .where(eq(medicineCountryApprovals.medicineId, medicineId)),
    db
      .select()
      .from(medicineSources)
      .where(eq(medicineSources.medicineId, medicineId)),
    db
      .select()
      .from(medicineFormulations)
      .where(eq(medicineFormulations.medicineId, medicineId)),
    db
      .select()
      .from(medicineStrengths)
      .where(eq(medicineStrengths.medicineId, medicineId)),
    db
      .select()
      .from(medicineLanguages)
      .where(eq(medicineLanguages.medicineId, medicineId)),
    db
      .select()
      .from(medicineUpdateHistory)
      .where(eq(medicineUpdateHistory.medicineId, medicineId)),
  ]);

  const safety = evaluateMedicineSafety({
    countryCode: master.countryCode,
    verificationStatus: master.verificationStatus,
    missingFields: master.missingDataIndicators || [],
    seriousSideEffectsCount: sideEffects.filter((s) => s.isSerious).length,
  });

  return {
    master,
    indications,
    instructions,
    warnings,
    sideEffects,
    contraindications,
    approvals,
    sources,
    formulations,
    strengths,
    translations,
    history,
    safety,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // =========================================================================
  // HEALTH & COUNTRY CONFIGURATION
  // =========================================================================

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'MedExplain' });
  });

  app.get('/api/countries', async (_req, res) => {
    try {
      await ensureDatabaseSeeded();
      const rows = await db
        .select()
        .from(countryConfigs)
        .where(eq(countryConfigs.isActive, true));
      res.json({ countries: rows });
    } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).json({ error: 'Unable to load country configurations.' });
    }
  });

  // =========================================================================
  // MEDICINE SEARCH, DOSSIER & GROUNDED EXPLANATION
  // =========================================================================

  app.get('/api/medicines/search', async (req, res) => {
    try {
      await ensureDatabaseSeeded();
      const q = String(req.query.q || '').trim();
      const country = String(req.query.country || 'GB').toUpperCase();
      const includeOpenFda = String(req.query.includeOpenFda || 'true') === 'true';

      const conditions = [];
      if (country !== 'ALL') {
        conditions.push(eq(medicinesMaster.countryCode, country));
      }
      if (q) {
        const pattern = `%${q}%`;
        conditions.push(
          or(
            ilike(medicinesMaster.brandName, pattern),
            ilike(medicinesMaster.genericName, pattern),
            ilike(medicinesMaster.activeIngredients, pattern)
          )
        );
      }

      const localRows =
        conditions.length > 0
          ? await db
              .select()
              .from(medicinesMaster)
              .where(and(...conditions))
              .limit(30)
          : await db.select().from(medicinesMaster).limit(30);

      let openFdaResults: Awaited<ReturnType<typeof searchOpenFdaLabels>>['results'] = [];
      let openFdaError: string | undefined;

      if (q && includeOpenFda && (country === 'US' || country === 'ALL')) {
        const fdaResp = await searchOpenFdaLabels(q, 5);
        openFdaResults = fdaResp.results;
        openFdaError = fdaResp.error;
      }

      res.json({
        country,
        query: q,
        localResults: localRows,
        openFdaResults,
        openFdaError,
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Medicine search failed. Please try again.' });
    }
  });

  app.get('/api/medicines/:id', async (req, res) => {
    try {
      await ensureDatabaseSeeded();
      const dossier = await fetchFullMedicineDossier(req.params.id);
      if (!dossier) {
        return res.status(404).json({ error: 'Medicine record not found.' });
      }
      res.json(dossier);
    } catch (error) {
      console.error('Error fetching medicine dossier:', error);
      res.status(500).json({ error: 'Unable to load medicine details.' });
    }
  });

  app.post('/api/medicines/explain', async (req, res) => {
    try {
      await ensureDatabaseSeeded();
      const {
        medicineId,
        countryCode = 'GB',
        languageCode = 'en',
        openFdaCandidate,
        userSymptomText = '',
      } = req.body as {
        medicineId?: string;
        countryCode?: string;
        languageCode?: string;
        openFdaCandidate?: Record<string, unknown>;
        userSymptomText?: string;
      };

      // Check emergency symptoms first — never delay emergency guidance
      const immediateSafety = evaluateMedicineSafety({
        countryCode,
        verificationStatus: 'SYNTHETIC_TEST',
        missingFields: [],
        userSymptomText,
      });
      if (immediateSafety.level === 'RED') {
        return res.json({
          safety: immediateSafety,
          explanation: null,
          emergencyBlocked: true,
        });
      }

      let sourceInput: MedicineSourceRecordInput | null = null;
      let seriousCount = 0;

      if (openFdaCandidate && typeof openFdaCandidate.brandName === 'string') {
        const missing = Array.isArray(openFdaCandidate.missingDataIndicators)
          ? (openFdaCandidate.missingDataIndicators as string[])
          : [];
        sourceInput = {
          medicineId: String(openFdaCandidate.medicineId || 'OPENFDA_LIVE'),
          countryCode: 'US',
          brandName: String(openFdaCandidate.brandName),
          genericName: String(openFdaCandidate.genericName || ''),
          activeIngredients: String(openFdaCandidate.activeIngredients || ''),
          strength: String(openFdaCandidate.strength || ''),
          dosageForm: String(openFdaCandidate.dosageForm || ''),
          routeOfAdministration: String(openFdaCandidate.routeOfAdministration || ''),
          manufacturer: String(openFdaCandidate.manufacturer || ''),
          regulatoryStatus: String(openFdaCandidate.regulatoryStatus || ''),
          approvedIndications: String(openFdaCandidate.approvedIndications || ''),
          officialPatientInformation: String(
            openFdaCandidate.officialPatientInformation || ''
          ),
          officialPrescribingInformation: String(
            openFdaCandidate.officialPrescribingInformation || ''
          ),
          storageInstructions: String(openFdaCandidate.storageInstructions || ''),
          warnings: openFdaCandidate.warningsText
            ? [
                {
                  officialText: String(openFdaCandidate.warningsText),
                  plainText: String(openFdaCandidate.warningsText),
                  safetyTier: 'AMBER',
                },
              ]
            : [],
          sideEffects: openFdaCandidate.sideEffectsText
            ? [
                {
                  officialTerm: 'Reported adverse reactions (DailyMed SPL)',
                  plainDescription: String(openFdaCandidate.sideEffectsText),
                  frequencyCategory: 'Listed in Official Label',
                  isSerious: false,
                  actionGuidance: 'Discuss any new or troubling symptoms with your pharmacist or doctor.',
                },
              ]
            : [],
          sourceUrl: String(openFdaCandidate.sourceUrl || 'https://dailymed.nlm.nih.gov/'),
          sourceAuthority: String(
            openFdaCandidate.sourceAuthority || 'US FDA / DailyMed (OpenFDA)'
          ),
          sourceLastVerified: String(
            openFdaCandidate.sourceLastVerified || new Date().toISOString().slice(0, 10)
          ),
          verificationStatus: 'OFFICIAL_OPENFDA_SPL',
          missingDataIndicators: missing,
        };
      } else if (medicineId) {
        const dossier = await fetchFullMedicineDossier(medicineId);
        if (!dossier) {
          return res.status(404).json({ error: 'Exact medicine record not found.' });
        }
        const m = dossier.master;
        const preTrans = dossier.translations.find(
          (t) => t.languageCode === languageCode
        );
        seriousCount = dossier.sideEffects.filter((s) => s.isSerious).length;

        sourceInput = {
          medicineId: m.medicineId,
          countryCode: m.countryCode,
          brandName: m.brandName,
          genericName: m.genericName,
          activeIngredients: m.activeIngredients,
          strength: m.strength,
          dosageForm: m.dosageForm,
          routeOfAdministration: m.routeOfAdministration,
          manufacturer: m.manufacturer,
          regulatoryStatus: m.regulatoryStatus,
          approvedIndications: m.approvedIndications,
          officialPatientInformation: m.officialPatientInformation,
          officialPrescribingInformation: m.officialPrescribingInformation,
          storageInstructions: m.storageInstructions,
          warnings: dossier.warnings.map((w) => ({
            officialText: w.officialWarningText,
            plainText: w.plainLanguageWarning,
            safetyTier: w.safetyTier,
          })),
          sideEffects: dossier.sideEffects.map((s) => ({
            officialTerm: s.officialTerm,
            plainDescription: s.plainLanguageDescription,
            frequencyCategory: s.frequencyCategory,
            isSerious: s.isSerious,
            actionGuidance: s.actionGuidance,
          })),
          sourceUrl: m.sourceUrl,
          sourceAuthority: m.sourceAuthority,
          sourceLastVerified: m.sourceLastVerified,
          verificationStatus: m.verificationStatus,
          missingDataIndicators: m.missingDataIndicators || [],
          preTranslated: preTrans
            ? {
                translatedPurpose: preTrans.translatedPurpose,
                translatedInstructions: preTrans.translatedInstructions,
                translatedWarnings: preTrans.translatedWarnings,
              }
            : null,
        };
      }

      if (!sourceInput) {
        return res.status(400).json({
          error:
            'No exact medicine record selected. MedExplain never guesses or explains an unconfirmed product.',
        });
      }

      const safety = evaluateMedicineSafety({
        countryCode: sourceInput.countryCode,
        verificationStatus: sourceInput.verificationStatus,
        missingFields: sourceInput.missingDataIndicators,
        seriousSideEffectsCount: seriousCount,
      });

      const explanation = await generateGroundedExplanation(
        sourceInput,
        languageCode
      );

      await db.insert(aiQaReviews).values({
        medicineId: sourceInput.medicineId,
        countryCode: sourceInput.countryCode,
        languageCode,
        safetyLevel: safety.level,
        generatedSummary: {
          whatIsThisMedicine: explanation.whatIsThisMedicine,
          generatedByAi: explanation.generatedByAi,
          sourceAuthority: sourceInput.sourceAuthority,
        },
        qaStatus: 'pending_review',
      });

      res.json({
        safety,
        explanation,
        emergencyInfo: getCountryEmergencyInfo(sourceInput.countryCode),
      });
    } catch (error) {
      console.error('Explain endpoint error:', error);
      res.status(500).json({ error: 'Unable to generate medicine explanation.' });
    }
  });

  // =========================================================================
  // SMART MEDICINE SCANNER (OCR + MANDATORY USER CONFIRMATION)
  // =========================================================================

  app.post('/api/scanner/extract', optionalAuth, async (req: AuthRequest, res) => {
    try {
      await ensureDatabaseSeeded();
      const {
        imageBase64,
        mimeType = 'image/jpeg',
        countryCode = 'GB',
        scanMode = 'label_photo',
        manualTextHint = '',
      } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        countryCode?: string;
        scanMode?: string;
        manualTextHint?: string;
      };

      if (!imageBase64 && !manualTextHint) {
        return res
          .status(400)
          .json({ error: 'Please capture/upload an image or provide label text.' });
      }

      let extracted;
      if (imageBase64) {
        const ocrRes = await extractMedicineLabelFromImage(
          imageBase64,
          mimeType,
          countryCode
        );
        extracted = ocrRes.data;
      } else {
        extracted = {
          brandName: manualTextHint,
          genericName: null,
          activeIngredients: null,
          strength: null,
          dosageForm: null,
          manufacturer: null,
          expiryDate: null,
          batchNumber: null,
          printedInstructions: null,
          warnings: null,
          isBlurryOrIncomplete: false,
          confidenceNote: 'Parsed from user-entered label text.',
        };
      }

      const searchTerms = [
        extracted.brandName,
        extracted.genericName,
        extracted.activeIngredients,
      ]
        .filter((v): v is string => Boolean(v && v.trim()))
        .map((v) => v.split(/\s+/)[0]);

      let candidates: (typeof medicinesMaster.$inferSelect)[] = [];
      if (searchTerms.length > 0) {
        const term = `%${searchTerms[0]}%`;
        candidates = await db
          .select()
          .from(medicinesMaster)
          .where(
            and(
              eq(medicinesMaster.countryCode, countryCode.toUpperCase()),
              or(
                ilike(medicinesMaster.brandName, term),
                ilike(medicinesMaster.genericName, term),
                ilike(medicinesMaster.activeIngredients, term)
              )
            )
          )
          .limit(8);
      }

      const openFdaMatches =
        countryCode.toUpperCase() === 'US' && searchTerms.length > 0
          ? (await searchOpenFdaLabels(searchTerms[0], 4)).results
          : [];

      const isFailed =
        extracted.isBlurryOrIncomplete ||
        (candidates.length === 0 && openFdaMatches.length === 0);

      const safety = evaluateMedicineSafety({
        countryCode,
        verificationStatus: 'SYNTHETIC_TEST',
        missingFields: [],
        isUncertainMatch: true, // Always AMBER until user explicitly confirms the product
      });

      const [session] = await db
        .insert(scanSessions)
        .values({
          userUid: req.user?.uid || 'guest',
          countryCode: countryCode.toUpperCase(),
          scanMode,
          extractedData: extracted as unknown as Record<string, string | null>,
          candidateMedicineIds: candidates.map((c) => c.medicineId),
          status: isFailed ? 'failed_ocr' : 'awaiting_confirmation',
          safetyLevel: safety.level,
          failureReason: isFailed
            ? extracted.confidenceNote || 'No country-matched product found'
            : '',
        })
        .returning();

      res.json({
        sessionId: session.id,
        requiresConfirmation: true,
        extracted,
        candidates,
        openFdaMatches,
        safety,
      });
    } catch (error) {
      console.error('Scanner extraction error:', error);
      res.status(500).json({ error: 'Medicine scan failed. Please try manual search.' });
    }
  });

  app.post('/api/scanner/confirm', async (req, res) => {
    try {
      const { sessionId, selectedMedicineId } = req.body as {
        sessionId: number;
        selectedMedicineId: string;
      };
      if (!sessionId || !selectedMedicineId) {
        return res
          .status(400)
          .json({ error: 'Session ID and confirmed medicine selection are required.' });
      }
      await db
        .update(scanSessions)
        .set({
          confirmedMedicineId: selectedMedicineId,
          status: 'confirmed',
          safetyLevel: 'GREEN',
        })
        .where(eq(scanSessions.id, sessionId));

      res.json({ confirmed: true, selectedMedicineId });
    } catch (error) {
      console.error('Scan confirmation error:', error);
      res.status(500).json({ error: 'Unable to confirm scan match.' });
    }
  });

  // =========================================================================
  // INTERACTION AWARENESS & MEDICINE COMPARISON
  // =========================================================================

  app.post('/api/interactions/check', async (req, res) => {
    try {
      await ensureDatabaseSeeded();
      const { items = [], countryCode = 'GB' } = req.body as {
        items: { label: string; activeIngredients: string }[];
        countryCode?: string;
      };

      if (items.length < 2) {
        return res
          .status(400)
          .json({ error: 'Please select at least two medicines or supplements to check.' });
      }

      const allInteractions = await db.select().from(medicineInteractions);
      const findings: {
        itemA: string;
        itemB: string;
        matchedIngredients: string;
        severity: string;
        safetyTier: string;
        clinicalEffect: string;
        plainLanguageExplanation: string;
        recommendedNextStep: string;
        evidenceSource: string;
        sourceUrl: string;
      }[] = [];

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const ingsA = items[i].activeIngredients
            .split(/[|,+]/)
            .map(normalizeIngredientAlias)
            .filter(Boolean);
          const ingsB = items[j].activeIngredients
            .split(/[|,+]/)
            .map(normalizeIngredientAlias)
            .filter(Boolean);

          for (const a of ingsA) {
            for (const b of ingsB) {
              for (const rule of allInteractions) {
                const rA = normalizeIngredientAlias(rule.ingredientA);
                const rB = normalizeIngredientAlias(rule.ingredientB);
                if ((a === rA && b === rB) || (a === rB && b === rA)) {
                  findings.push({
                    itemA: items[i].label,
                    itemB: items[j].label,
                    matchedIngredients: `${rule.ingredientA} + ${rule.ingredientB}`,
                    severity: rule.severity,
                    safetyTier: rule.safetyTier,
                    clinicalEffect: rule.clinicalEffect,
                    plainLanguageExplanation: rule.plainLanguageExplanation,
                    recommendedNextStep: rule.recommendedNextStep,
                    evidenceSource: rule.evidenceSource,
                    sourceUrl: rule.sourceUrl,
                  });
                }
              }
            }
          }
        }
      }

      const hasMajor = findings.some((f) => f.severity === 'Major');
      const safety = evaluateMedicineSafety({
        countryCode,
        verificationStatus: 'SYNTHETIC_TEST',
        missingFields: [],
        hasMajorInteraction: hasMajor || findings.length > 0,
      });

      res.json({
        findings,
        safety,
        importantCaveat:
          'Absence of a documented interaction in loaded reference records does NOT guarantee a combination is safe. Always verify prescription, OTC, herbal, and supplement combinations with a licensed pharmacist.',
      });
    } catch (error) {
      console.error('Interaction check error:', error);
      res.status(500).json({ error: 'Unable to check medicine interactions.' });
    }
  });

  app.post('/api/compare', async (req, res) => {
    try {
      await ensureDatabaseSeeded();
      const { medicineIds = [] } = req.body as { medicineIds: string[] };
      if (medicineIds.length < 2) {
        return res
          .status(400)
          .json({ error: 'Select at least two medicines to compare.' });
      }

      const dossiers = (
        await Promise.all(medicineIds.slice(0, 4).map((id) => fetchFullMedicineDossier(id)))
      ).filter((d): d is NonNullable<typeof d> => d !== null);

      const differences: string[] = [];
      if (dossiers.length >= 2) {
        const base = dossiers[0].master;
        for (let i = 1; i < dossiers.length; i++) {
          const cmp = dossiers[i].master;
          if (base.countryCode !== cmp.countryCode) {
            differences.push(
              `Country of approval differs: ${base.brandName} (${base.countryCode}) vs ${cmp.brandName} (${cmp.countryCode}).`
            );
          }
          if (base.activeIngredients !== cmp.activeIngredients) {
            differences.push(
              `Active ingredients differ: ${base.activeIngredients} vs ${cmp.activeIngredients}.`
            );
          }
          if (base.strength !== cmp.strength) {
            differences.push(`Strength differs: ${base.strength} vs ${cmp.strength}.`);
          }
          if (base.dosageForm !== cmp.dosageForm) {
            differences.push(
              `Formulation differs: ${base.dosageForm} vs ${cmp.dosageForm}.`
            );
          }
          if (base.regulatoryStatus !== cmp.regulatoryStatus) {
            differences.push(
              `Regulatory classification differs: ${base.regulatoryStatus} vs ${cmp.regulatoryStatus}.`
            );
          }
        }
      }

      res.json({
        products: dossiers.map((d) => ({
          ...d.master,
          formulationDetails: d.formulations[0] || null,
          approvalDetails: d.approvals[0] || null,
        })),
        differences,
        interchangeabilityNotice:
          'Even when two products share an active ingredient, they are NOT automatically interchangeable across brands, release formulations, or countries. Always consult a pharmacist or prescriber before switching.',
      });
    } catch (error) {
      console.error('Compare error:', error);
      res.status(500).json({ error: 'Unable to compare products.' });
    }
  });

  // =========================================================================
  // AUTHENTICATED USER PROFILE, SAVED MEDICINES & MANUAL REMINDERS
  // =========================================================================

  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.dbUser });
  });

  app.patch('/api/me/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { preferredCountry, preferredLanguage, largePrintEnabled } =
        req.body as {
          preferredCountry?: string;
          preferredLanguage?: string;
          largePrintEnabled?: boolean;
        };
      const updated = await updateUserPreferences(req.user!.uid, {
        preferredCountry,
        preferredLanguage,
        largePrintEnabled,
      });
      res.json({ user: updated });
    } catch (error) {
      console.error('Preference update error:', error);
      res.status(500).json({ error: 'Failed to update preferences.' });
    }
  });

  // Role switcher for Governance RBAC evaluation — audited in PostgreSQL
  app.post('/api/me/role', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { role } = req.body as { role: string };
      const validRoles = [
        'patient',
        'db_admin',
        'clinical_reviewer',
        'content_manager',
        'tech_admin',
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role selection.' });
      }
      const updated = await updateUserPreferences(req.user!.uid, { role });
      await db.insert(auditLogs).values({
        actorUid: req.user!.uid,
        actorEmail: req.user!.email || '',
        actorRole: role,
        action: 'SANDBOX_ROLE_SWITCHED',
        targetType: 'user',
        targetId: req.user!.uid,
        details: { newRole: role },
      });
      res.json({ user: updated });
    } catch (error) {
      console.error('Role update error:', error);
      res.status(500).json({ error: 'Failed to update governance role.' });
    }
  });

  app.delete('/api/me/data', requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteUserAccountData(req.user!.uid, req.user!.email || '');
      res.json({
        deleted: true,
        message: 'All personal profile data, saved medicines, and reminders have been deleted.',
      });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: 'Unable to delete account data.' });
    }
  });

  app.get('/api/saved-medicines', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(savedMedicines)
        .where(eq(savedMedicines.userId, req.dbUser!.id))
        .orderBy(desc(savedMedicines.savedAt));
      res.json({ savedMedicines: rows });
    } catch (error) {
      console.error('Fetch saved medicines error:', error);
      res.status(500).json({ error: 'Unable to fetch saved medicines.' });
    }
  });

  app.post('/api/saved-medicines', requireAuth, async (req: AuthRequest, res) => {
    try {
      const {
        medicineId,
        countryCode,
        brandName,
        genericName,
        strength,
        sourceOrigin = 'catalog',
        personalNote = '',
      } = req.body as {
        medicineId: string;
        countryCode: string;
        brandName: string;
        genericName: string;
        strength: string;
        sourceOrigin?: string;
        personalNote?: string;
      };
      const [created] = await db
        .insert(savedMedicines)
        .values({
          userId: req.dbUser!.id,
          medicineId,
          countryCode,
          brandName,
          genericName,
          strength,
          sourceOrigin,
          personalNote,
        })
        .returning();
      res.status(201).json({ savedMedicine: created });
    } catch (error) {
      console.error('Save medicine error:', error);
      res.status(500).json({ error: 'Unable to save medicine.' });
    }
  });

  app.delete('/api/saved-medicines/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const idNum = Number(req.params.id);
      await db
        .delete(savedMedicines)
        .where(
          and(
            eq(savedMedicines.id, idNum),
            eq(savedMedicines.userId, req.dbUser!.id)
          )
        );
      res.json({ deleted: true });
    } catch (error) {
      console.error('Delete saved medicine error:', error);
      res.status(500).json({ error: 'Unable to remove saved medicine.' });
    }
  });

  app.get('/api/reminders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await db
        .select()
        .from(reminders)
        .where(eq(reminders.userId, req.dbUser!.id))
        .orderBy(desc(reminders.createdAt));
      const logs = await db
        .select()
        .from(reminderLogs)
        .where(eq(reminderLogs.userId, req.dbUser!.id))
        .orderBy(desc(reminderLogs.loggedAt))
        .limit(40);
      res.json({ reminders: rows, logs });
    } catch (error) {
      console.error('Fetch reminders error:', error);
      res.status(500).json({ error: 'Unable to load reminders.' });
    }
  });

  app.post('/api/reminders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const validation = validateManualReminderInput(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      const {
        medicineId = '',
        medicineName,
        prescribedDose,
        reminderTime,
        frequency,
        startDate,
        endDate = '',
        notificationPreference = 'browser',
      } = req.body;

      const [created] = await db
        .insert(reminders)
        .values({
          userId: req.dbUser!.id,
          medicineId,
          medicineName,
          prescribedDose,
          reminderTime,
          frequency,
          startDate,
          endDate,
          notificationPreference,
        })
        .returning();

      res.status(201).json({
        reminder: created,
        missedDoseSafetyNote:
          'If you miss a dose, do NOT take a double dose unless your verified patient leaflet or prescriber explicitly instructs it.',
      });
    } catch (error) {
      console.error('Create reminder error:', error);
      res.status(500).json({ error: 'Unable to create reminder.' });
    }
  });

  app.patch('/api/reminders/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const idNum = Number(req.params.id);
      const { status, note = '' } = req.body as { status: string; note?: string };
      if (!['taken', 'skipped', 'snoozed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid reminder status.' });
      }

      const [updated] = await db
        .update(reminders)
        .set({ lastActionStatus: status, lastActionAt: new Date() })
        .where(
          and(eq(reminders.id, idNum), eq(reminders.userId, req.dbUser!.id))
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Reminder not found.' });
      }

      await db.insert(reminderLogs).values({
        reminderId: idNum,
        userId: req.dbUser!.id,
        status,
        note,
      });

      res.json({ reminder: updated });
    } catch (error) {
      console.error('Update reminder status error:', error);
      res.status(500).json({ error: 'Unable to update reminder status.' });
    }
  });

  app.delete('/api/reminders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const idNum = Number(req.params.id);
      await db
        .delete(reminders)
        .where(
          and(eq(reminders.id, idNum), eq(reminders.userId, req.dbUser!.id))
        );
      res.json({ deleted: true });
    } catch (error) {
      console.error('Delete reminder error:', error);
      res.status(500).json({ error: 'Unable to delete reminder.' });
    }
  });

  // =========================================================================
  // ADMIN GOVERNANCE DASHBOARD ROUTES (RBAC ENFORCED)
  // =========================================================================

  const adminRolesList = Array.from(ADMIN_ROLES);

  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole(adminRolesList),
    async (_req: AuthRequest, res) => {
      try {
        await ensureDatabaseSeeded();
        const [
          [{ value: totalMedicines }],
          [{ value: totalInteractions }],
          [{ value: totalSources }],
          [{ value: totalLanguages }],
          allMeds,
          failedScans,
          qaQueue,
          recentAudit,
        ] = await Promise.all([
          db.select({ value: count() }).from(medicinesMaster),
          db.select({ value: count() }).from(medicineInteractions),
          db.select({ value: count() }).from(medicineSources),
          db.select({ value: count() }).from(medicineLanguages),
          db.select().from(medicinesMaster).orderBy(desc(medicinesMaster.createdAt)),
          db
            .select()
            .from(scanSessions)
            .where(eq(scanSessions.status, 'failed_ocr'))
            .orderBy(desc(scanSessions.createdAt))
            .limit(20),
          db
            .select()
            .from(aiQaReviews)
            .orderBy(desc(aiQaReviews.createdAt))
            .limit(20),
          db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(30),
        ]);

        const missingFieldRecords = allMeds.filter(
          (m) => (m.missingDataIndicators || []).length > 0
        );
        const pendingVerificationRecords = allMeds.filter(
          (m) => m.verificationStatus === 'PENDING_REVIEW'
        );

        res.json({
          metrics: {
            totalMedicines,
            totalInteractions,
            totalSources,
            totalLanguages,
            missingFieldsCount: missingFieldRecords.length,
            pendingVerificationCount: pendingVerificationRecords.length,
            failedOcrCount: failedScans.length,
          },
          medicines: allMeds,
          failedScans,
          qaQueue,
          recentAudit,
          csvTables: Object.keys(CSV_SCHEMAS),
        });
      } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({ error: 'Unable to load admin governance overview.' });
      }
    }
  );

  app.get(
    '/api/admin/csv/export/:table',
    requireAuth,
    requireRole(adminRolesList),
    async (req: AuthRequest, res) => {
      try {
        await ensureDatabaseSeeded();
        const table = req.params.table as CsvTableName;
        if (!CSV_SCHEMAS[table]) {
          return res.status(400).json({ error: 'Unknown CSV table name.' });
        }

        let rows: Record<string, unknown>[] = [];
        switch (table) {
          case 'medicines_master': {
            const raw = await db.select().from(medicinesMaster);
            rows = raw.map((r) => ({
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              brand_name: r.brandName,
              generic_name: r.genericName,
              active_ingredients: r.activeIngredients,
              strength: r.strength,
              dosage_form: r.dosageForm,
              route_of_administration: r.routeOfAdministration,
              manufacturer: r.manufacturer,
              marketing_authorisation_number: r.marketingAuthorisationNumber,
              regulatory_status: r.regulatoryStatus,
              approved_indications: r.approvedIndications,
              official_patient_information: r.officialPatientInformation,
              official_prescribing_information: r.officialPrescribingInformation,
              source_url: r.sourceUrl,
              source_authority: r.sourceAuthority,
              source_last_verified: r.sourceLastVerified,
              record_last_updated: r.recordLastUpdated,
              verification_status: r.verificationStatus,
            }));
            break;
          }
          case 'active_ingredients': {
            const raw = await db.select().from(activeIngredients);
            rows = raw.map((r) => ({
              ingredient_id: r.ingredientId,
              inn_name: r.innName,
              chemical_class: r.chemicalClass,
              pharmacological_group: r.pharmacologicalGroup,
              atc_code: r.atcCode,
              is_synthetic: r.isSynthetic,
              source_authority: r.sourceAuthority,
              source_url: r.sourceUrl,
            }));
            break;
          }
          case 'medicine_brands': {
            const raw = await db.select().from(medicineBrands);
            rows = raw.map((r) => ({
              brand_id: r.brandId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              brand_name: r.brandName,
              trademark_owner: r.trademarkOwner,
              marketing_status: r.marketingStatus,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_strengths': {
            const raw = await db.select().from(medicineStrengths);
            rows = raw.map((r) => ({
              strength_id: r.strengthId,
              medicine_id: r.medicineId,
              ingredient_name: r.ingredientName,
              strength_value: r.strengthValue,
              strength_unit: r.strengthUnit,
              basis_of_strength: r.basisOfStrength,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_formulations': {
            const raw = await db.select().from(medicineFormulations);
            rows = raw.map((r) => ({
              formulation_id: r.formulationId,
              medicine_id: r.medicineId,
              dosage_form: r.dosageForm,
              release_characteristic: r.releaseCharacteristic,
              route_of_administration: r.routeOfAdministration,
              excipients_summary: r.excipientsSummary,
              appearance_description: r.appearanceDescription,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_indications': {
            const raw = await db.select().from(medicineIndications);
            rows = raw.map((r) => ({
              indication_id: r.indicationId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              official_indication_text: r.officialIndicationText,
              plain_language_purpose: r.plainLanguagePurpose,
              population_restriction: r.populationRestriction,
              source_reference: r.sourceReference,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_instructions': {
            const raw = await db.select().from(medicineInstructions);
            rows = raw.map((r) => ({
              instruction_id: r.instructionId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              official_wording: r.officialWording,
              plain_language_guidance: r.plainLanguageGuidance,
              food_timing_note: r.foodTimingNote,
              missed_dose_policy: r.missedDosePolicy,
              source_reference: r.sourceReference,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_warnings': {
            const raw = await db.select().from(medicineWarnings);
            rows = raw.map((r) => ({
              warning_id: r.warningId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              warning_type: r.warningType,
              safety_tier: r.safetyTier,
              official_warning_text: r.officialWarningText,
              plain_language_warning: r.plainLanguageWarning,
              source_reference: r.sourceReference,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_side_effects': {
            const raw = await db.select().from(medicineSideEffects);
            rows = raw.map((r) => ({
              side_effect_id: r.sideEffectId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              frequency_category: r.frequencyCategory,
              is_serious: r.isSerious,
              official_term: r.officialTerm,
              plain_language_description: r.plainLanguageDescription,
              action_guidance: r.actionGuidance,
              source_reference: r.sourceReference,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_interactions': {
            const raw = await db.select().from(medicineInteractions);
            rows = raw.map((r) => ({
              interaction_id: r.interactionId,
              ingredient_a: r.ingredientA,
              ingredient_b: r.ingredientB,
              severity: r.severity,
              safety_tier: r.safetyTier,
              clinical_effect: r.clinicalEffect,
              plain_language_explanation: r.plainLanguageExplanation,
              recommended_next_step: r.recommendedNextStep,
              evidence_source: r.evidenceSource,
              source_url: r.sourceUrl,
              country_scope: r.countryScope,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_contraindications': {
            const raw = await db.select().from(medicineContraindications);
            rows = raw.map((r) => ({
              contraindication_id: r.contraindicationId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              condition_name: r.conditionName,
              official_statement: r.officialStatement,
              plain_language_explanation: r.plainLanguageExplanation,
              source_reference: r.sourceReference,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_country_approvals': {
            const raw = await db.select().from(medicineCountryApprovals);
            rows = raw.map((r) => ({
              approval_id: r.approvalId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              regulatory_authority: r.regulatoryAuthority,
              authorisation_number: r.authorisationNumber,
              approval_status: r.approvalStatus,
              supply_classification: r.supplyClassification,
              approval_date: r.approvalDate,
              last_reviewed_date: r.lastReviewedDate,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_manufacturers': {
            const raw = await db.select().from(medicineManufacturers);
            rows = raw.map((r) => ({
              manufacturer_id: r.manufacturerId,
              manufacturer_name: r.manufacturerName,
              country_of_origin: r.countryOfOrigin,
              regulatory_site_id: r.regulatorySiteId,
              contact_channel: r.contactChannel,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_sources': {
            const raw = await db.select().from(medicineSources);
            rows = raw.map((r) => ({
              source_id: r.sourceId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              authority_name: r.authorityName,
              document_type: r.documentType,
              document_url: r.documentUrl,
              license_terms: r.licenseTerms,
              last_verified_at: r.lastVerifiedAt,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_languages': {
            const raw = await db.select().from(medicineLanguages);
            rows = raw.map((r) => ({
              translation_id: r.translationId,
              medicine_id: r.medicineId,
              language_code: r.languageCode,
              language_name: r.languageName,
              translated_purpose: r.translatedPurpose,
              translated_instructions: r.translatedInstructions,
              translated_warnings: r.translatedWarnings,
              review_status: r.reviewStatus,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
          case 'medicine_update_history': {
            const raw = await db.select().from(medicineUpdateHistory);
            rows = raw.map((r) => ({
              history_id: r.historyId,
              medicine_id: r.medicineId,
              country_code: r.countryCode,
              change_type: r.changeType,
              changed_fields: r.changedFields,
              change_summary: r.changeSummary,
              changed_by: r.changedBy,
              changed_at: r.changedAt,
              is_synthetic: r.isSynthetic,
            }));
            break;
          }
        }

        const csvString = serializeToCsv(CSV_SCHEMAS[table], rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${table}.csv"`
        );
        res.send(csvString);
      } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ error: 'CSV export failed.' });
      }
    }
  );

  app.post(
    '/api/admin/csv/validate',
    requireAuth,
    requireRole(adminRolesList),
    async (req: AuthRequest, res) => {
      try {
        const { table, csvContent } = req.body as {
          table: CsvTableName;
          csvContent: string;
        };
        if (!CSV_SCHEMAS[table]) {
          return res.status(400).json({ error: 'Unknown CSV table schema.' });
        }
        const { headers, rows } = parseCsvText(csvContent || '');
        const validation = validateCsvPayload(table, headers, rows);
        res.json({ validation, previewRows: rows.slice(0, 10) });
      } catch (error) {
        console.error('CSV validation error:', error);
        res.status(500).json({ error: 'Failed to validate CSV payload.' });
      }
    }
  );

  app.post(
    '/api/admin/csv/import',
    requireAuth,
    requireRole(['db_admin', 'content_manager']),
    async (req: AuthRequest, res) => {
      try {
        const { table, csvContent } = req.body as {
          table: CsvTableName;
          csvContent: string;
        };
        if (table !== 'medicines_master' && table !== 'medicine_interactions') {
          return res.status(400).json({
            error:
              'Full upsert import currently supports medicines_master and medicine_interactions; companion tables can be validated and exported.',
          });
        }
        const { headers, rows } = parseCsvText(csvContent || '');
        const validation = validateCsvPayload(table, headers, rows);
        if (!validation.valid) {
          return res.status(400).json({ error: 'CSV failed validation.', validation });
        }

        const nowDate = new Date().toISOString().slice(0, 10);
        let importedCount = 0;

        if (table === 'medicines_master') {
          for (const row of rows) {
            const missing = CSV_SCHEMAS.medicines_master.filter(
              (col) => !row[col] || row[col] === 'MISSING'
            );
            const isSyn =
              row.verification_status === 'SYNTHETIC_TEST' ||
              row.brand_name.includes('SYNTHETIC');
            await db
              .insert(medicinesMaster)
              .values({
                medicineId: row.medicine_id,
                countryCode: row.country_code.toUpperCase(),
                brandName: row.brand_name,
                genericName: row.generic_name,
                activeIngredients: row.active_ingredients,
                strength: row.strength,
                dosageForm: row.dosage_form,
                routeOfAdministration: row.route_of_administration,
                manufacturer: row.manufacturer,
                marketingAuthorisationNumber: row.marketing_authorisation_number,
                regulatoryStatus: row.regulatory_status,
                approvedIndications: row.approved_indications,
                officialPatientInformation: row.official_patient_information,
                officialPrescribingInformation:
                  row.official_prescribing_information,
                sourceUrl: row.source_url,
                sourceAuthority: row.source_authority,
                sourceLastVerified: row.source_last_verified || nowDate,
                recordLastUpdated: nowDate,
                verificationStatus: row.verification_status || 'PENDING_REVIEW',
                isSynthetic: isSyn,
                missingDataIndicators: missing,
                safetyLevel: missing.length > 0 ? 'AMBER' : 'GREEN',
              })
              .onConflictDoUpdate({
                target: medicinesMaster.medicineId,
                set: {
                  brandName: row.brand_name,
                  genericName: row.generic_name,
                  activeIngredients: row.active_ingredients,
                  strength: row.strength,
                  dosageForm: row.dosage_form,
                  approvedIndications: row.approved_indications,
                  officialPatientInformation: row.official_patient_information,
                  sourceUrl: row.source_url,
                  sourceAuthority: row.source_authority,
                  recordLastUpdated: nowDate,
                  verificationStatus: row.verification_status || 'PENDING_REVIEW',
                  missingDataIndicators: missing,
                },
              });
            importedCount++;
          }
        } else if (table === 'medicine_interactions') {
          for (const row of rows) {
            await db
              .insert(medicineInteractions)
              .values({
                interactionId: row.interaction_id,
                ingredientA: row.ingredient_a,
                ingredientB: row.ingredient_b,
                severity: row.severity,
                safetyTier: row.safety_tier || 'AMBER',
                clinicalEffect: row.clinical_effect,
                plainLanguageExplanation: row.plain_language_explanation,
                recommendedNextStep: row.recommended_next_step,
                evidenceSource: row.evidence_source,
                sourceUrl: row.source_url,
                countryScope: row.country_scope || 'GLOBAL',
                isSynthetic: row.is_synthetic === 'true',
              })
              .onConflictDoNothing();
            importedCount++;
          }
        }

        await db.insert(auditLogs).values({
          actorUid: req.user!.uid,
          actorEmail: req.user!.email || '',
          actorRole: req.dbUser!.role,
          action: 'CSV_IMPORT_EXECUTED',
          targetType: table,
          targetId: `${importedCount}_rows`,
          details: { importedCount, table },
        });

        res.json({ importedCount, validation });
      } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({ error: 'CSV import failed.' });
      }
    }
  );

  app.post(
    '/api/admin/medicines/:id/verify',
    requireAuth,
    requireRole(['clinical_reviewer', 'db_admin']),
    async (req: AuthRequest, res) => {
      try {
        const { status, note = '' } = req.body as {
          status: 'VERIFIED' | 'PENDING_REVIEW' | 'WITHDRAWN' | 'SYNTHETIC_TEST';
          note?: string;
        };
        const medicineId = req.params.id;
        const today = new Date().toISOString().slice(0, 10);

        const [updated] = await db
          .update(medicinesMaster)
          .set({
            verificationStatus: status,
            sourceLastVerified: today,
            recordLastUpdated: today,
            safetyLevel: status === 'WITHDRAWN' ? 'RED' : 'GREEN',
          })
          .where(eq(medicinesMaster.medicineId, medicineId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Medicine record not found.' });
        }

        await db.insert(medicineUpdateHistory).values({
          historyId: `HST-${medicineId}-${Date.now()}`,
          medicineId,
          countryCode: updated.countryCode,
          changeType: status,
          changedFields: 'verification_status,safety_level',
          changeSummary: note || `Status changed to ${status}`,
          changedBy: req.user!.email || req.user!.uid,
          changedAt: today,
          isSynthetic: updated.isSynthetic,
        });

        await db.insert(auditLogs).values({
          actorUid: req.user!.uid,
          actorEmail: req.user!.email || '',
          actorRole: req.dbUser!.role,
          action: `RECORD_${status}`,
          targetType: 'medicines_master',
          targetId: medicineId,
          details: { status, note },
        });

        res.json({ updated });
      } catch (error) {
        console.error('Clinical verification error:', error);
        res.status(500).json({ error: 'Unable to update verification status.' });
      }
    }
  );

  app.patch(
    '/api/admin/qa/:id',
    requireAuth,
    requireRole(['clinical_reviewer', 'content_manager', 'tech_admin']),
    async (req: AuthRequest, res) => {
      try {
        const qaId = Number(req.params.id);
        const { qaStatus, reviewerNotes = '' } = req.body as {
          qaStatus: 'approved' | 'flagged';
          reviewerNotes?: string;
        };
        const [updated] = await db
          .update(aiQaReviews)
          .set({
            qaStatus,
            reviewerNotes,
            reviewedBy: req.user!.email || req.user!.uid,
          })
          .where(eq(aiQaReviews.id, qaId))
          .returning();
        res.json({ updated });
      } catch (error) {
        console.error('AI QA update error:', error);
        res.status(500).json({ error: 'Unable to update AI QA review.' });
      }
    }
  );

  app.get(
    '/api/admin/audit-report',
    requireAuth,
    requireRole(adminRolesList),
    async (_req: AuthRequest, res) => {
      try {
        const logs = await db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(200);
        res.json({
          generatedAt: new Date().toISOString(),
          totalEvents: logs.length,
          logs,
        });
      } catch (error) {
        console.error('Audit report error:', error);
        res.status(500).json({ error: 'Unable to generate audit report.' });
      }
    }
  );

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedExplain server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MedExplain server:', err);
  process.exit(1);
});
