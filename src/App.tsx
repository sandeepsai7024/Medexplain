import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Camera,
  ChevronRight,
  Globe,
  History,
  LogIn,
  LogOut,
  PhoneCall,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { AdminPortalView } from './components/AdminPortalView.tsx';
import { EmergencyGuidanceCards } from './components/EmergencyGuidanceCards.tsx';
import { InteractionAndCompareView } from './components/InteractionAndCompareView.tsx';
import { MedicineExplainerView } from './components/MedicineExplainerView.tsx';
import {
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallButton.tsx';
import { PrivacyAndDocsModal } from './components/PrivacyAndDocsModal.tsx';
import { SmartScannerView } from './components/SmartScannerView.tsx';
import { RemindersView } from './components/RemindersView.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import {
  EMERGENCY_UI_COPY,
  LANGUAGES,
  LanguageCode,
  UI_COPY,
} from './lib/i18n.ts';
import { getCountryEmergencyInfo } from './services/safetyClassifier.ts';
import type {
  CountryConfig,
  GroundedExplanation,
  MedicineMasterRecord,
  SafetyEvaluation,
} from './types/medexplain.ts';

type AppView =
  | 'home'
  | 'scanner'
  | 'explainer'
  | 'compare'
  | 'interactions'
  | 'reminders'
  | 'admin';

function MedExplainShell() {
  const { firebaseUser, profile, signInWithGoogle, logout, authFetch, authError } =
    useAuth();

  const [view, setView] = useState<AppView>('home');
  const [countryCode, setCountryCode] = useState<string>('GB');
  const [languageCode, setLanguageCode] = useState<LanguageCode>('en');
  const [largePrint, setLargePrint] = useState<boolean>(true);
  const [countries, setCountries] = useState<CountryConfig[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [localResults, setLocalResults] = useState<MedicineMasterRecord[]>([]);
  const [openFdaResults, setOpenFdaResults] = useState<MedicineMasterRecord[]>(
    []
  );
  const [openFdaNotice, setOpenFdaNotice] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineMasterRecord | null>(null);
  const [explanation, setExplanation] = useState<GroundedExplanation | null>(
    null
  );
  const [safetyEval, setSafetyEval] = useState<SafetyEvaluation | null>(null);
  const [explaining, setExplaining] = useState(false);

  const [recentScans, setRecentScans] = useState<MedicineMasterRecord[]>([]);
  const [compareList, setCompareList] = useState<MedicineMasterRecord[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const copy = UI_COPY[languageCode] || UI_COPY.en;
  const emergencyCopy = EMERGENCY_UI_COPY[languageCode] || EMERGENCY_UI_COPY.en;
  const emergencyInfo = useMemo(
    () => getCountryEmergencyInfo(countryCode),
    [countryCode]
  );
  const activeLangMeta =
    LANGUAGES.find((l) => l.code === languageCode) || LANGUAGES[0];

  const activeCountry = useMemo(
    () =>
      countries.find((c) => c.countryCode === countryCode) || {
        countryCode,
        countryName:
          countryCode === 'IN'
            ? 'India'
            : countryCode === 'US'
              ? 'United States'
              : countryCode === 'CA'
                ? 'Canada'
                : countryCode === 'AU'
                  ? 'Australia'
                  : countryCode === 'EU'
                    ? 'European Union'
                    : 'United Kingdom',
        emergencyNumber:
          countryCode === 'IN' || countryCode === 'EU'
            ? '112'
            : countryCode === 'US' || countryCode === 'CA'
              ? '911'
              : countryCode === 'AU'
                ? '000'
                : '999',
        emergencyGuidance: '',
        regulatoryAuthorities: [],
        officialDataSources: [],
        approvedLanguages: ['en'],
        classificationRules: {},
        privacyFramework: '',
        sourceUpdateSchedule: '',
        isActive: true,
      },
    [countries, countryCode]
  );

  // Sync user preferences on sign-in
  useEffect(() => {
    if (profile) {
      if (profile.preferredCountry) setCountryCode(profile.preferredCountry);
      if (
        profile.preferredLanguage &&
        UI_COPY[profile.preferredLanguage as LanguageCode]
      ) {
        setLanguageCode(profile.preferredLanguage as LanguageCode);
      }
      setLargePrint(profile.largePrintEnabled);
    }
  }, [profile]);

  // Load country registry on mount
  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.countries)) {
          setCountries(d.countries);
        }
      })
      .catch(() => {
        // Keep fallback country metadata if offline
      });
  }, []);

  const performSearch = useCallback(
    async (queryText: string, country: string) => {
      setSearching(true);
      setSearchError(null);
      setOpenFdaNotice(null);
      try {
        const params = new URLSearchParams({
          q: queryText,
          country,
          includeOpenFda: country === 'US' || country === 'ALL' ? 'true' : 'false',
        });
        const res = await fetch(`/api/medicines/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setSearchError(data.error || 'Search failed.');
        } else {
          setLocalResults(data.localResults || []);
          setOpenFdaResults(data.openFdaResults || []);
          if (data.openFdaError) setOpenFdaNotice(data.openFdaError);
        }
      } catch {
        setSearchError('Unable to reach MedExplain search service.');
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    void performSearch(searchQuery, countryCode);
  }, [countryCode, performSearch]);

  const openExplanation = useCallback(
    async (
      med: MedicineMasterRecord,
      isOpenFda = false,
      symptomText = '',
      targetLang: LanguageCode = languageCode
    ) => {
      setExplaining(true);
      setSelectedMedicine(med);
      setView('explainer');
      setRecentScans((prev) => {
        const filtered = prev.filter((p) => p.medicineId !== med.medicineId);
        return [med, ...filtered].slice(0, 5);
      });

      try {
        const res = await fetch('/api/medicines/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineId: isOpenFda ? undefined : med.medicineId,
            countryCode: med.countryCode,
            languageCode: targetLang,
            openFdaCandidate: isOpenFda ? med : undefined,
            userSymptomText: symptomText,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSafetyEval(data.safety);
          setExplanation(data.explanation);
        }
      } finally {
        setExplaining(false);
      }
    },
    [languageCode]
  );

  const handleLanguageChange = async (newLang: LanguageCode) => {
    setLanguageCode(newLang);
    if (firebaseUser) {
      void authFetch('/api/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: newLang }),
      });
    }
    if (view === 'explainer' && selectedMedicine) {
      const isFda = selectedMedicine.medicineId.startsWith('OPENFDA_');
      await openExplanation(selectedMedicine, isFda, '', newLang);
    }
  };

  const handleCountryChange = (newCountry: string) => {
    setCountryCode(newCountry);
    if (firebaseUser) {
      void authFetch('/api/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferredCountry: newCountry }),
      });
    }
  };

  const handleSaveMedicine = async (med: MedicineMasterRecord) => {
    if (!firebaseUser) return;
    await authFetch('/api/saved-medicines', {
      method: 'POST',
      body: JSON.stringify({
        medicineId: med.medicineId,
        countryCode: med.countryCode,
        brandName: med.brandName,
        genericName: med.genericName,
        strength: med.strength,
        sourceOrigin: med.medicineId.startsWith('OPENFDA_')
          ? 'openfda'
          : 'catalog',
      }),
    });
  };

  const handleAddToCompare = (med: MedicineMasterRecord) => {
    setCompareList((prev) => {
      if (prev.some((m) => m.medicineId === med.medicineId)) return prev;
      return [...prev, med].slice(0, 4);
    });
    setView('compare');
  };

  return (
    <div
      dir={activeLangMeta.dir || 'ltr'}
      className={`min-h-screen flex flex-col bg-white text-slate-900 ${
        largePrint ? 'large-print' : ''
      }`}
    >
      {/* Top Bar Contract: Single-row 3-zone header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="text-xl font-bold tracking-tight text-teal-800 whitespace-nowrap shrink-0 text-left"
          >
            MedExplain
          </button>

          {/* Zone 2: 5 Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600"
          >
            {[
              { id: 'home', label: copy.navSearch },
              { id: 'scanner', label: copy.navScan },
              { id: 'compare', label: copy.navCompare },
              { id: 'interactions', label: copy.navInteractions },
              { id: 'reminders', label: copy.navReminders },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id as AppView)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  view === item.id ||
                  (view === 'explainer' && item.id === 'home')
                    ? 'border-teal-700 text-teal-900'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Account / Admin Portal Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setView(view === 'admin' ? 'home' : 'admin')}
              className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 min-h-[40px] ${
                view === 'admin'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {view === 'admin' ? 'Patient View' : 'Admin Portal'}
            </button>

            {firebaseUser ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Controls Bar (Below Header: Country, Language, Large Print, PWA Install) */}
      {view !== 'admin' && (
        <div className="border-b border-slate-100 bg-slate-50/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                <label
                  htmlFor="country-select"
                  className="text-xs font-semibold text-slate-600 whitespace-nowrap"
                >
                  {copy.countryLabel}:
                </label>
                <select
                  id="country-select"
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 min-h-[40px]"
                >
                  <option value="GB">United Kingdom (999)</option>
                  <option value="IN">India (112)</option>
                  <option value="US">United States — Live OpenFDA (911)</option>
                  <option value="CA">Canada (911)</option>
                  <option value="AU">Australia (000)</option>
                  <option value="EU">European Union (112)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="lang-select"
                  className="text-xs font-semibold text-slate-600 whitespace-nowrap"
                >
                  {copy.languageLabel}:
                </label>
                <select
                  id="lang-select"
                  value={languageCode}
                  onChange={(e) =>
                    handleLanguageChange(e.target.value as LanguageCode)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 min-h-[40px]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setLargePrint((v) => !v)}
                aria-pressed={largePrint}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-semibold min-h-[40px] whitespace-nowrap ${
                  largePrint
                    ? 'border-teal-700 bg-teal-50 text-teal-900'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <TypeIcon className="w-4 h-4" />
                <span>{copy.largePrintLabel}: {largePrint ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs sm:text-sm font-bold text-red-900 hover:bg-red-100 min-h-[40px] whitespace-nowrap"
              >
                <PhoneCall className="w-4 h-4 text-red-700" />
                <span>
                  {emergencyCopy.quickTrigger} (
                  <span className="font-mono tabular-nums">
                    {emergencyInfo.emergencyNumber}
                  </span>
                  )
                </span>
              </button>
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}

      {authError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
            Sign-in notice: {authError}
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
        {view === 'home' && (
          <div className="space-y-10">
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-10">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-teal-800">
                    Welcome to MedExplain · {copy.slogan}
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                    {copy.heroTitle}
                  </h1>
                  <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
                    {copy.heroSubtitle}
                  </p>
                </div>

                {/* Search Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void performSearch(searchQuery, countryCode);
                  }}
                  className="space-y-3"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={copy.searchPlaceholder}
                        aria-label="Search medicines"
                        className="w-full rounded-xl border border-slate-300 pl-11 pr-4 py-3 text-base text-slate-900 placeholder:text-slate-400 min-h-[52px]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-xl bg-teal-700 px-6 py-3 text-base font-semibold text-white hover:bg-teal-800 transition-colors min-h-[52px] whitespace-nowrap shrink-0"
                    >
                      {copy.searchButton}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setView('scanner')}
                      className="inline-flex items-center gap-2 rounded-xl border border-teal-700 bg-teal-50 px-5 py-2.5 text-sm sm:text-base font-semibold text-teal-900 hover:bg-teal-100 min-h-[44px] whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{copy.scanCta}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('interactions')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px] whitespace-nowrap"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>Check Interactions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('reminders')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px] whitespace-nowrap"
                    >
                      <Bell className="w-4 h-4 text-sky-700" />
                      <span>My Reminders</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_medicine_clarity_1794549294374.jpg"
                    alt="Organised weekly pill box, medicine carton, reading glasses, and glass of water on a sunlit table"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-64 lg:h-full object-cover"
                  />
                ) : (
                  <div className="p-8 flex-1 flex flex-col justify-center items-center text-center space-y-2">
                    <Shield className="w-10 h-10 text-teal-700" />
                    <p className="font-semibold text-slate-800">
                      Country-Specific Medicine Clarity
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Scans Strip */}
            {recentScans.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-700" />
                  <span>Recent Medicines Viewed</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentScans.map((med) => (
                    <button
                      key={med.medicineId}
                      type="button"
                      onClick={() =>
                        openExplanation(
                          med,
                          med.medicineId.startsWith('OPENFDA_')
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left hover:border-teal-600 transition-colors min-h-[44px]"
                    >
                      <div className="text-xs text-slate-500">
                        {med.countryCode} · {med.strength}
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {med.brandName}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Country-Filtered Catalog & Live OpenFDA Results */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {activeCountry.countryName} Medicine Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Showing country-specific records only ·{' '}
                  <button
                    type="button"
                    onClick={() => setEmergencyModalOpen(true)}
                    className="font-semibold text-red-800 hover:underline underline-offset-2"
                  >
                    {emergencyCopy.quickTrigger} (
                    <span className="font-mono tabular-nums">
                      {activeCountry.emergencyNumber}
                    </span>
                    )
                  </button>
                </p>
              </div>

              {searchError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  {searchError}
                </div>
              )}

              {openFdaNotice && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  {openFdaNotice}
                </div>
              )}

              {searching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {localResults.length === 0 && openFdaResults.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center space-y-3">
                      <p className="text-lg font-semibold text-slate-900">
                        No matching products found in {activeCountry.countryName}
                      </p>
                      <p className="text-sm text-slate-600 max-w-xl mx-auto">
                        Try searching by generic active ingredient (such as
                        Paracetamol, Metformin, or Ibuprofen), switch to United
                        States for live OpenFDA SPL queries, or scan your pack.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {localResults.map((med) => (
                        <article
                          key={med.medicineId}
                          className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4 hover:border-teal-600 transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500">
                              {med.countryCode} · {med.regulatoryStatus} ·{' '}
                              {med.verificationStatus}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 leading-snug">
                              {med.brandName}
                            </h3>
                            <p className="text-sm text-slate-700">
                              {med.activeIngredients} ·{' '}
                              <span className="font-mono tabular-nums font-semibold">
                                {med.strength}
                              </span>
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {med.approvedIndications}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => openExplanation(med, false)}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-800 hover:text-teal-900 min-h-[44px]"
                            >
                              <span>Explain Medicine</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCompare(med)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 min-h-[44px] px-2"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Compare</span>
                            </button>
                          </div>
                        </article>
                      ))}

                      {openFdaResults.map((med) => (
                        <article
                          key={med.medicineId}
                          className="rounded-2xl border border-sky-200 bg-sky-50/30 p-6 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-sky-800">
                              US · Live OpenFDA / DailyMed SPL ·{' '}
                              {med.regulatoryStatus}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 leading-snug">
                              {med.brandName}
                            </h3>
                            <p className="text-sm text-slate-700">
                              {med.activeIngredients}
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {med.approvedIndications}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-sky-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => openExplanation(med, true)}
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-800 hover:text-sky-900 min-h-[44px]"
                            >
                              <span>Explain Official SPL</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Localized Clickable Emergency & Regulatory Guidance Cards */}
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 md:p-8">
              <EmergencyGuidanceCards
                countryCode={countryCode}
                languageCode={languageCode}
                activeMedicine={selectedMedicine}
              />
            </section>
          </div>
        )}

        {view === 'scanner' && (
          <SmartScannerView
            countryCode={countryCode}
            countryName={activeCountry.countryName}
            languageCode={languageCode}
            onConfirmMedicine={async (med, isOpenFda) => {
              await openExplanation(med, isOpenFda);
            }}
          />
        )}

        {view === 'explainer' && (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setView('home')}
              className="text-sm font-semibold text-teal-800 hover:underline min-h-[44px]"
            >
              ← Back to {activeCountry.countryName} Medicine Search
            </button>

            {explaining ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-base text-slate-600">
                Preparing grounded plain-language explanation in{' '}
                <strong>{activeLangMeta.nativeName}</strong>...
              </div>
            ) : (
              selectedMedicine &&
              explanation &&
              safetyEval && (
                <MedicineExplainerView
                  medicine={selectedMedicine}
                  explanation={explanation}
                  safety={safetyEval}
                  languageCode={languageCode}
                  countryName={activeCountry.countryName}
                  onSaveMedicine={handleSaveMedicine}
                  onAddToCompare={handleAddToCompare}
                  onEmergencySymptomCheck={(text) => {
                    void openExplanation(
                      selectedMedicine,
                      selectedMedicine.medicineId.startsWith('OPENFDA_'),
                      text
                    );
                  }}
                  isSignedIn={Boolean(firebaseUser)}
                />
              )
            )}
          </div>
        )}

        {(view === 'interactions' || view === 'compare') && (
          <InteractionAndCompareView
            mode={view}
            catalogMedicines={localResults}
            countryCode={countryCode}
            countryName={activeCountry.countryName}
            languageCode={languageCode}
            compareList={compareList}
            onAddToCompare={(m) =>
              setCompareList((prev) =>
                prev.some((x) => x.medicineId === m.medicineId)
                  ? prev
                  : [...prev, m].slice(0, 4)
              )
            }
            onRemoveFromCompare={(id) =>
              setCompareList((prev) => prev.filter((x) => x.medicineId !== id))
            }
          />
        )}

        {view === 'reminders' && (
          <RemindersView
            onOpenMedicine={async (medId) => {
              const res = await fetch(`/api/medicines/${medId}`);
              if (res.ok) {
                const d = await res.json();
                await openExplanation(d.master, false);
              }
            }}
          />
        )}

        {view === 'admin' && <AdminPortalView />}
      </main>

      {/* Mobile Bottom Thumb-Zone Tab Bar (<= 15% Sticky Cap) */}
      {view !== 'admin' && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md grid grid-cols-5 h-16"
        >
          {[
            { id: 'home', label: copy.navSearch, icon: Search },
            { id: 'scanner', label: copy.navScan, icon: Camera },
            { id: 'compare', label: copy.navCompare, icon: Scale },
            { id: 'interactions', label: copy.navInteractions, icon: ShieldAlert },
            { id: 'reminders', label: copy.navReminders, icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as AppView)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active ? 'text-teal-800' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-full px-1">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-6 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <strong>MedExplain</strong> · Educational medicine information only
              (not medical diagnosis or prescribing).
            </span>
            {emergencyInfo.cards[0]?.telHref && (
              <a
                href={emergencyInfo.cards[0].telHref}
                className="font-bold text-red-800 hover:underline font-mono tabular-nums"
              >
                Emergency ({countryCode}): {emergencyInfo.emergencyNumber}
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setEmergencyModalOpen(true)}
              className="font-semibold text-red-800 hover:underline"
            >
              {emergencyCopy.quickTrigger} & Regulatory Cards
            </button>
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="font-semibold text-teal-800 hover:underline"
            >
              Privacy, Compliance & Working Status
            </button>
          </div>
        </div>
      </footer>

      <OfflineIndicator />
      <PrivacyAndDocsModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />

      {emergencyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={emergencyCopy.sectionTitle}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">
                  {emergencyInfo.countryName} · {emergencyInfo.regulatoryStandard}
                </p>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                  {emergencyCopy.quickTrigger}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                aria-label="Close emergency guidance"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <EmergencyGuidanceCards
              countryCode={countryCode}
              languageCode={languageCode}
              activeMedicine={selectedMedicine}
              defaultExpandedFirst={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MedExplainShell />
    </AuthProvider>
  );
}
