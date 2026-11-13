import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ExternalLink,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { LanguageCode } from '../lib/i18n.ts';
import type { MedicineMasterRecord, SafetyEvaluation } from '../types/medexplain.ts';
import { SafetyBanner } from './SafetyBanner.tsx';

interface InteractionAndCompareViewProps {
  mode: 'interactions' | 'compare';
  catalogMedicines: MedicineMasterRecord[];
  countryCode: string;
  countryName: string;
  languageCode?: LanguageCode;
  compareList: MedicineMasterRecord[];
  onRemoveFromCompare: (medicineId: string) => void;
  onAddToCompare: (medicine: MedicineMasterRecord) => void;
}

interface InteractionFinding {
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
}

export const InteractionAndCompareView: React.FC<
  InteractionAndCompareViewProps
> = ({
  mode,
  catalogMedicines,
  countryCode,
  countryName,
  languageCode = 'en',
  compareList,
  onRemoveFromCompare,
  onAddToCompare,
}) => {
  // Interaction Checker state
  const [selectedItems, setSelectedItems] = useState<
    { id: string; label: string; activeIngredients: string }[]
  >([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customIngredient, setCustomIngredient] = useState('');
  const [checking, setChecking] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{
    findings: InteractionFinding[];
    safety: SafetyEvaluation;
    importantCaveat: string;
  } | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  // Comparison state
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{
    products: MedicineMasterRecord[];
    differences: string[];
    interchangeabilityNotice: string;
  } | null>(null);

  const addCatalogItemToInteraction = (med: MedicineMasterRecord) => {
    if (selectedItems.some((i) => i.id === med.medicineId)) return;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: med.medicineId,
        label: `${med.brandName} (${med.strength})`,
        activeIngredients: med.activeIngredients,
      },
    ]);
  };

  const addCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim() || !customIngredient.trim()) return;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        label: customItemName.trim(),
        activeIngredients: customIngredient.trim(),
      },
    ]);
    setCustomItemName('');
    setCustomIngredient('');
  };

  const runInteractionCheck = async () => {
    setChecking(true);
    setInteractionError(null);
    try {
      const res = await fetch('/api/interactions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems,
          countryCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInteractionError(data.error || 'Interaction check failed.');
      } else {
        setInteractionResult(data);
      }
    } catch {
      setInteractionError('Network error while checking interactions.');
    } finally {
      setChecking(false);
    }
  };

  const runCompare = async () => {
    if (compareList.length < 2) return;
    setComparing(true);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineIds: compareList.map((m) => m.medicineId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompareResult(data);
      }
    } finally {
      setComparing(false);
    }
  };

  if (mode === 'interactions') {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Medicine Interaction Awareness
            </h2>
            <p className="text-base text-slate-600">
              Add two or more prescription medicines, over-the-counter painkillers,
              or supplements to check for documented interactions in loaded clinical
              reference sources.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800">
                Quick-add from catalog
              </label>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {catalogMedicines.map((med) => (
                  <button
                    key={med.medicineId}
                    type="button"
                    onClick={() => addCatalogItemToInteraction(med)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3 min-h-[44px]"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {med.brandName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {med.countryCode} · {med.activeIngredients} · {med.strength}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-teal-700 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={addCustomItem} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800">
                Or add an OTC medicine / supplement manually
              </label>
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Product name (e.g. Ibuprofen OTC)"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base min-h-[44px]"
              />
              <input
                type="text"
                value={customIngredient}
                onChange={(e) => setCustomIngredient(e.target.value)}
                placeholder="Active ingredient (e.g. Ibuprofen, Warfarin, Aspirin)"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base min-h-[44px]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Check List</span>
              </button>
            </form>
          </div>

          {/* Selected List */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Selected products ({selectedItems.length})
            </h3>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-slate-500">
                Select at least two products above (for example, Warfarin-Synth and
                Ibuprofen-Synth, or Dolo-Synth 650 and Combiflam-Synth).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800"
                  >
                    <span className="font-medium">{item.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedItems((prev) =>
                          prev.filter((x) => x.id !== item.id)
                        )
                      }
                      aria-label={`Remove ${item.label}`}
                      className="text-slate-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={selectedItems.length < 2 || checking}
                onClick={runInteractionCheck}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white hover:bg-teal-800 disabled:opacity-50 min-h-[48px]"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>
                  {checking ? 'Checking Reference Sources...' : 'Check Interactions'}
                </span>
              </button>
            </div>
          </div>

          {interactionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {interactionError}
            </div>
          )}
        </div>

        {interactionResult && (
          <div className="space-y-6">
            <SafetyBanner
              safety={interactionResult.safety}
              countryCode={countryCode}
              countryName={countryName}
              languageCode={languageCode}
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 font-medium">
              {interactionResult.importantCaveat}
            </div>

            {interactionResult.findings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-base text-slate-700">
                No documented interaction rules matched in the currently loaded
                dataset. Remember that this does not guarantee the combination is
                safe—confirm with a licensed pharmacist before combining medicines.
              </div>
            ) : (
              <div className="space-y-4">
                {interactionResult.findings.map((f, idx) => (
                  <article
                    key={idx}
                    className={`rounded-2xl border p-6 space-y-3 ${
                      f.severity === 'Major'
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-amber-300 bg-amber-50/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>Severity: {f.severity}</span>
                      <span aria-hidden="true">·</span>
                      <span>Matched: {f.matchedIngredients}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {f.itemA} + {f.itemB}
                    </h3>
                    <p className="text-base text-slate-800">
                      {f.plainLanguageExplanation}
                    </p>
                    <p className="text-sm text-slate-600">
                      Clinical summary: {f.clinicalEffect}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      Recommended next step: {f.recommendedNextStep}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Source: {f.evidenceSource}</span>
                      <a
                        href={f.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-800 hover:underline"
                      >
                        <span>Reference</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">
            Side-by-Side Medicine Comparison
          </h2>
          <p className="text-base text-slate-600">
            Compare products across countries by active ingredients, strength,
            formulation, country approval, and manufacturer. MedExplain highlights
            differences clearly and never claims two medicines are interchangeable.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-800">
            Add medicines to compare (2 to 4 products)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
            {catalogMedicines.map((med) => {
              const selected = compareList.some(
                (c) => c.medicineId === med.medicineId
              );
              return (
                <button
                  key={med.medicineId}
                  type="button"
                  onClick={() =>
                    selected
                      ? onRemoveFromCompare(med.medicineId)
                      : onAddToCompare(med)
                  }
                  className={`text-left rounded-xl border p-3.5 transition-colors min-h-[44px] ${
                    selected
                      ? 'border-teal-700 bg-teal-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs text-slate-500">
                    {med.countryCode} · {med.strength}
                  </div>
                  <div className="font-semibold text-slate-900 text-sm mt-0.5 truncate">
                    {med.brandName}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {med.activeIngredients}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-700">
            Selected for comparison:{' '}
            <strong className="font-mono tabular-nums">
              {compareList.length}
            </strong>{' '}
            product(s)
          </div>
          <button
            type="button"
            disabled={compareList.length < 2 || comparing}
            onClick={runCompare}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white hover:bg-teal-800 disabled:opacity-50 min-h-[48px]"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>{comparing ? 'Comparing...' : 'Compare Selected Products'}</span>
          </button>
        </div>
      </div>

      {compareResult && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-medium text-amber-950">
            {compareResult.interchangeabilityNotice}
          </div>

          {compareResult.differences.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
              <h3 className="text-lg font-bold text-slate-900">
                Key Differences Highlighted
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-800">
                {compareResult.differences.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 font-semibold text-slate-700">Attribute</th>
                  {compareResult.products.map((p) => (
                    <th
                      key={p.medicineId}
                      className="p-4 font-bold text-slate-900 min-w-[200px]"
                    >
                      {p.brandName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Country of Approval', (p: MedicineMasterRecord) => p.countryCode],
                  ['Active Ingredients', (p: MedicineMasterRecord) => p.activeIngredients],
                  ['Strength', (p: MedicineMasterRecord) => p.strength],
                  ['Formulation / Form', (p: MedicineMasterRecord) => `${p.dosageForm} (${p.routeOfAdministration})`],
                  ['Regulatory Status', (p: MedicineMasterRecord) => p.regulatoryStatus],
                  ['Manufacturer', (p: MedicineMasterRecord) => p.manufacturer],
                  ['Authorisation No.', (p: MedicineMasterRecord) => p.marketingAuthorisationNumber],
                  ['Source Authority', (p: MedicineMasterRecord) => p.sourceAuthority],
                ].map(([label, getter], idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">
                      {label as string}
                    </td>
                    {compareResult.products.map((p) => (
                      <td key={p.medicineId} className="p-4 text-slate-800">
                        {(getter as (m: MedicineMasterRecord) => string)(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
