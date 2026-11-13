import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FileUp,
  RotateCcw,
  ScanLine,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { LanguageCode } from '../lib/i18n.ts';
import type {
  ExtractedLabelData,
  MedicineMasterRecord,
  SafetyEvaluation,
} from '../types/medexplain.ts';
import { SafetyBanner } from './SafetyBanner.tsx';

interface SmartScannerViewProps {
  countryCode: string;
  countryName: string;
  languageCode?: LanguageCode;
  onConfirmMedicine: (
    medicine: MedicineMasterRecord,
    isOpenFda: boolean
  ) => Promise<void>;
}

export const SmartScannerView: React.FC<SmartScannerViewProps> = ({
  countryCode,
  countryName,
  languageCode = 'en',
  onConfirmMedicine,
}) => {
  const { authFetch } = useAuth();
  const [scanMode, setScanMode] = useState<
    'box' | 'prescription' | 'label_photo' | 'leaflet'
  >('label_photo');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualLabelHint, setManualLabelHint] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guideImgErr, setGuideImgErr] = useState(false);

  const [scanResult, setScanResult] = useState<{
    sessionId: number;
    extracted: ExtractedLabelData;
    candidates: MedicineMasterRecord[];
    openFdaMatches: MedicineMasterRecord[];
    safety: SafetyEvaluation;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError(
        'Camera permission was denied or no camera was detected. You can upload an image file or enter label text instead.'
      );
    }
  };

  const runExtraction = async (payload: {
    imageBase64?: string;
    mimeType?: string;
    manualTextHint?: string;
  }) => {
    setExtracting(true);
    setErrorMsg(null);
    setScanResult(null);
    try {
      const res = await authFetch('/api/scanner/extract', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          countryCode,
          scanMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not process the scan.');
      } else {
        setScanResult(data);
      }
    } catch {
      setErrorMsg('Network error while scanning medicine label.');
    } finally {
      setExtracting(false);
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewUrl(dataUrl);
    stopCamera();
    void runExtraction({ imageBase64: dataUrl, mimeType: 'image/jpeg' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      setPreviewUrl(resultStr);
      void runExtraction({
        imageBase64: resultStr,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmMatch = async (
    med: MedicineMasterRecord,
    isOpenFda: boolean
  ) => {
    if (scanResult) {
      await fetch('/api/scanner/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: scanResult.sessionId,
          selectedMedicineId: med.medicineId,
        }),
      });
    }
    await onConfirmMedicine(med, isOpenFda);
  };

  const resetScanner = () => {
    stopCamera();
    setPreviewUrl(null);
    setScanResult(null);
    setErrorMsg(null);
    setManualLabelHint('');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Smart Medicine Scanner ({countryName})
            </h2>
            <p className="text-base text-slate-600">
              Photograph a medicine box, printed prescription, bottle label, or
              patient leaflet. MedExplain extracts the printed details and asks you
              to confirm the exact match before displaying guidance.
            </p>
          </div>

          {/* Scan Document Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              What are you scanning?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'box', label: 'Medicine Box' },
                { id: 'label_photo', label: 'Bottle Label' },
                { id: 'prescription', label: 'Prescription' },
                { id: 'leaflet', label: 'Leaflet' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setScanMode(
                      m.id as 'box' | 'prescription' | 'label_photo' | 'leaflet'
                    )
                  }
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                    scanMode === m.id
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capture / Upload Actions */}
          <div className="flex flex-wrap gap-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-base font-semibold text-white hover:bg-teal-800 min-h-[48px] whitespace-nowrap"
              >
                <Camera className="w-5 h-5" />
                <span>Use Device Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={captureFromCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-base font-semibold text-white hover:bg-sky-800 min-h-[48px] whitespace-nowrap"
              >
                <ScanLine className="w-5 h-5" />
                <span>Capture Photo Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px] whitespace-nowrap"
            >
              <FileUp className="w-5 h-5 text-teal-700" />
              <span>Upload Label Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {(previewUrl || scanResult || cameraActive) && (
              <button
                type="button"
                onClick={resetScanner}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {cameraError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              {cameraError}
            </p>
          )}

          {cameraActive && (
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-h-80 object-contain"
              />
            </div>
          )}

          {previewUrl && !cameraActive && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img
                src={previewUrl}
                alt="Uploaded medicine packaging preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            </div>
          )}

          {/* Fallback / Quick Label Text Entry */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualLabelHint.trim()) {
                void runExtraction({ manualTextHint: manualLabelHint.trim() });
              }
            }}
            className="pt-4 border-t border-slate-100 space-y-2.5"
          >
            <label
              htmlFor="manual-label-hint"
              className="block text-sm font-semibold text-slate-800"
            >
              Or type text printed on the label (great for testing without a camera):
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="manual-label-hint"
                type="text"
                value={manualLabelHint}
                onChange={(e) => setManualLabelHint(e.target.value)}
                placeholder="e.g. Dolo 650, Paracetamol 500mg, Augmentin, Metformin..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-base text-slate-900 min-h-[48px]"
              />
              <button
                type="submit"
                disabled={extracting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-base font-semibold text-slate-900 hover:bg-slate-100 min-h-[48px] whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>Match Label</span>
              </button>
            </div>
          </form>
        </div>

        {/* Scanner Guide Photo Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">
              Tips for clear scanning
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
              <li>Place the box or bottle in bright daylight without glare.</li>
              <li>Make sure the medicine name and strength (e.g., 500 mg) are legible.</li>
              <li>
                Always double-check the confirmation screen—two packs with similar
                names can contain different ingredients across countries.
              </li>
            </ul>
          </div>
          {!guideImgErr ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 aspect-[4/3]">
              <img
                src="/src/assets/images/scanner_guide_preview_1794549293987.jpg"
                alt="Hands holding a smartphone framing a medicine carton neatly for clear OCR scanning"
                referrerPolicy="no-referrer"
                onError={() => setGuideImgErr(true)}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
              Frame the printed brand name, active ingredient, and dosage strength
              inside the camera view.
            </div>
          )}
        </div>
      </div>

      {extracting && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-base font-medium text-teal-900">
          Reading printed label details and checking {countryName} medicine records...
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-base text-red-900">
          {errorMsg}
        </div>
      )}

      {/* MANDATORY CONFIRMATION GATE */}
      {scanResult && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <SafetyBanner
            safety={scanResult.safety}
            countryCode={countryCode}
            countryName={countryName}
            languageCode={languageCode}
          />

          <div className="space-y-3">
            <h3 className="text-xl font-bold text-slate-900">
              Step 1: Review Extracted Label Details
            </h3>
            <p className="text-sm text-slate-600">
              {scanResult.extracted.confidenceNote}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-sm">
              {[
                ['Medicine / Brand Name', scanResult.extracted.brandName],
                ['Generic / Ingredient', scanResult.extracted.genericName || scanResult.extracted.activeIngredients],
                ['Strength', scanResult.extracted.strength],
                ['Dosage Form', scanResult.extracted.dosageForm],
                ['Manufacturer', scanResult.extracted.manufacturer],
                ['Expiry / Batch', [scanResult.extracted.expiryDate, scanResult.extracted.batchNumber].filter(Boolean).join(' · ') || null],
                ['Printed Instructions', scanResult.extracted.printedInstructions],
                ['Warnings', scanResult.extracted.warnings],
              ].map(([label, value], i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div className="text-xs font-medium text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {value || 'Not detected'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">
              Step 2: Confirm Your Exact Medicine ({countryName})
            </h3>
            <p className="text-sm text-slate-600">
              MedExplain never picks a medicine automatically when multiple matches
              exist. Select the exact matching record below to open its explanation:
            </p>

            {scanResult.candidates.length === 0 &&
              scanResult.openFdaMatches.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                  No verified or synthetic test match was found in {countryName} for
                  this scan. This failed scan has been logged for Clinical Review,
                  and we recommend asking a pharmacist to verify the physical pack.
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scanResult.candidates.map((med) => (
                <div
                  key={med.medicineId}
                  className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-teal-600 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500">
                      {med.countryCode} · {med.regulatoryStatus} ·{' '}
                      {med.verificationStatus}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {med.brandName}
                    </h4>
                    <p className="text-sm text-slate-700">
                      {med.activeIngredients} ·{' '}
                      <span className="font-mono tabular-nums">
                        {med.strength}
                      </span>{' '}
                      · {med.dosageForm}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirmMatch(med, false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Explain This Medicine</span>
                  </button>
                </div>
              ))}

              {scanResult.openFdaMatches.map((med) => (
                <div
                  key={med.medicineId}
                  className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-sky-800 font-semibold">
                      US · Live OpenFDA DailyMed SPL · {med.regulatoryStatus}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {med.brandName}
                    </h4>
                    <p className="text-sm text-slate-700">
                      {med.activeIngredients} · {med.dosageForm}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleConfirmMatch(med, true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm OpenFDA Match</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
