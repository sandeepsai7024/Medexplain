import React, { useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  ExternalLink,
  FileText,
  Scale,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UI_COPY, LanguageCode } from '../lib/i18n.ts';
import type {
  GroundedExplanation,
  MedicineMasterRecord,
  SafetyEvaluation,
} from '../types/medexplain.ts';
import { SafetyBanner } from './SafetyBanner.tsx';

interface MedicineExplainerViewProps {
  medicine: MedicineMasterRecord;
  explanation: GroundedExplanation;
  safety: SafetyEvaluation;
  languageCode: LanguageCode;
  countryName: string;
  onSaveMedicine: (medicine: MedicineMasterRecord) => Promise<void>;
  onAddToCompare: (medicine: MedicineMasterRecord) => void;
  onEmergencySymptomCheck: (symptomText: string) => void;
  isSignedIn: boolean;
}

export const MedicineExplainerView: React.FC<MedicineExplainerViewProps> = ({
  medicine,
  explanation,
  safety,
  languageCode,
  countryName,
  onSaveMedicine,
  onAddToCompare,
  onEmergencySymptomCheck,
  isSignedIn,
}) => {
  const [showOfficialWording, setShowOfficialWording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pharmacistImgError, setPharmacistImgError] = useState(false);
  const [symptomCheckInput, setSymptomCheckInput] = useState('');

  const copy = UI_COPY[languageCode] || UI_COPY.en;
  const titles = copy.sections;

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToRead = [
      medicine.brandName,
      explanation.whatIsThisMedicine,
      explanation.statedPurpose,
      explanation.howToUnderstandInstructions,
      ...explanation.importantWarnings,
      ...explanation.seriousWarningSigns,
    ].join('. ');
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang =
      languageCode === 'hi'
        ? 'hi-IN'
        : languageCode === 'te'
          ? 'te-IN'
          : languageCode === 'ta'
            ? 'ta-IN'
            : languageCode === 'bn'
              ? 'bn-IN'
              : languageCode === 'ur'
                ? 'ur-PK'
                : 'en-GB';
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = async () => {
    await onSaveMedicine(medicine);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const verificationLabel =
    medicine.verificationStatus === 'SYNTHETIC_TEST'
      ? 'Synthetic Test Record (Clearly Marked)'
      : medicine.verificationStatus === 'OFFICIAL_OPENFDA_SPL'
        ? 'Official US FDA / DailyMed SPL'
        : medicine.verificationStatus;

  return (
    <div className="space-y-8">
      {/* Header Identification & Metadata (Zero-Pill Discipline) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className="font-semibold text-teal-800">{countryName}</span>
          <span aria-hidden="true">·</span>
          <span>{medicine.regulatoryStatus}</span>
          <span aria-hidden="true">·</span>
          <span>{verificationLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Verified {medicine.sourceLastVerified}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {medicine.brandName}
            </h2>
            <p className="text-lg text-slate-700">
              Active ingredient(s):{' '}
              <strong className="font-semibold text-slate-900">
                {medicine.activeIngredients}
              </strong>{' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="font-mono tabular-nums font-medium">
                {medicine.strength}
              </span>{' '}
              <span aria-hidden="true">·</span> {medicine.dosageForm} (
              {medicine.routeOfAdministration})
            </p>
            <p className="text-sm text-slate-600">
              Manufacturer: {medicine.manufacturer}{' '}
              <span aria-hidden="true">·</span> Authorisation / ID:{' '}
              <span className="font-mono tabular-nums">
                {medicine.marketingAuthorisationNumber}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleReadAloud}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 text-teal-700" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-teal-700" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onAddToCompare(medicine)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              <Scale className="w-4 h-4 text-sky-700" />
              <span>Compare</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!isSignedIn}
              title={
                isSignedIn
                  ? 'Save to My Medicines'
                  : 'Sign in with Google to save medicines'
              }
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{isSignedIn ? 'Save Medicine' : 'Sign In to Save'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Controls Bar: Official Wording Toggle & Quick Urgent Symptom Check */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setShowOfficialWording((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800 hover:text-sky-900 underline underline-offset-4 min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            <span>
              {showOfficialWording
                ? 'Hide Original Official Regulatory Wording'
                : 'View Original Official Regulatory Wording'}
            </span>
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (symptomCheckInput.trim()) {
                onEmergencySymptomCheck(symptomCheckInput.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={symptomCheckInput}
              onChange={(e) => setSymptomCheckInput(e.target.value)}
              placeholder="Screen a symptom (e.g. swelling, rash)..."
              aria-label="Screen a symptom for urgent RED safety routing"
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 min-h-[44px] w-64"
            />
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 min-h-[44px] whitespace-nowrap shrink-0"
            >
              Safety Screen
            </button>
          </form>
        </div>

        {showOfficialWording && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3 text-sm text-slate-800">
            <p className="font-semibold text-slate-900">
              Original Official Wording ({medicine.sourceAuthority})
            </p>
            <div>
              <span className="font-medium text-slate-600">Indications: </span>
              <span>{explanation.originalOfficialWording.indications}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">Instructions: </span>
              <span>{explanation.originalOfficialWording.instructions}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">
                Prescribing Summary:{' '}
              </span>
              <span>{explanation.originalOfficialWording.prescribingInfo}</span>
            </div>
          </div>
        )}
      </div>

      {/* Built-in Safety Banner */}
      <SafetyBanner
        safety={safety}
        countryCode={medicine.countryCode}
        countryName={countryName}
        languageCode={languageCode}
        activeMedicine={medicine}
      />

      {explanation.uncertaintyNotes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-1.5 text-sm text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Transparency & Data Completeness Notes</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {explanation.uncertaintyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 10 Required Plain-Language Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-lg font-bold text-slate-900">{titles[0]}</h3>
          <p className="text-slate-700 leading-relaxed">
            {explanation.whatIsThisMedicine}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-lg font-bold text-slate-900">{titles[1]}</h3>
          <p className="text-slate-700 leading-relaxed">
            {explanation.statedPurpose}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-lg font-bold text-slate-900">{titles[2]}</h3>
          <p className="text-slate-700 leading-relaxed">
            {explanation.officialUses}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-lg font-bold text-slate-900">{titles[3]}</h3>
          <p className="text-slate-700 leading-relaxed">
            {explanation.howToUnderstandInstructions}
          </p>
          <p className="text-xs text-slate-500 pt-1">
            MedExplain never changes your prescribed dose or recommends doubling a
            missed dose.
          </p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">{titles[4]}</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-800">
            {explanation.importantWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">{titles[5]}</h3>
          {explanation.commonSideEffects.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-slate-700">
              {explanation.commonSideEffects.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600">
              Refer to the official patient leaflet for full frequency tables.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-red-200 bg-red-50/50 p-6 space-y-3">
          <h3 className="text-lg font-bold text-red-950">{titles[6]}</h3>
          {explanation.seriousWarningSigns.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-red-950">
              {explanation.seriousWarningSigns.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-red-900">
              Seek urgent care immediately if you experience breathing difficulty,
              facial swelling, chest pain, or severe rash.
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2.5">
          <h3 className="text-lg font-bold text-slate-900">{titles[7]}</h3>
          <p className="text-slate-700 leading-relaxed">
            {explanation.storageInstructions}
          </p>
        </article>
      </div>

      {/* Section 9: Ask a Pharmacist + Section 10: Official References */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <article className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">{titles[8]}</h3>
            <p className="text-sm text-slate-600">
              Take these tailored questions to your community or hospital pharmacist.
              AI-generated prompts prepare you for a real consultation—they do not
              replace a pharmacist.
            </p>
            <ul className="space-y-2.5 text-slate-800 list-disc pl-5">
              {explanation.pharmacistQuestions.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>
          {!pharmacistImgError ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 aspect-[16/9] max-h-56">
              <img
                src="/src/assets/images/pharmacist_consultation_1794549294501.jpg"
                alt="Community pharmacist reviewing a printed medication leaflet with a patient"
                referrerPolicy="no-referrer"
                onError={() => setPharmacistImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-sm text-teal-900">
              Ask your licensed pharmacist in person or by phone before changing
              how you take any medicine.
            </div>
          )}
        </article>

        <article className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8 space-y-4">
          <h3 className="text-xl font-bold text-slate-900">{titles[9]}</h3>
          <p className="text-sm text-slate-600">
            Rule: <strong>No source, no clinical claim.</strong> Every section above
            maps to the official or clearly labeled synthetic reference below:
          </p>
          <div className="space-y-4 pt-2">
            {explanation.officialReferences.map((ref, idx) => (
              <div
                key={idx}
                className="border-t border-slate-200 pt-3 space-y-1 text-sm"
              >
                <p className="font-semibold text-slate-900">{ref.claimArea}</p>
                <p className="text-slate-700">{ref.authority}</p>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  Last verified: {ref.lastVerified}
                </p>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-teal-800 font-semibold hover:underline pt-1"
                >
                  <span>Visit regulatory source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};
