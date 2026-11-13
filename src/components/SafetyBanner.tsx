import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import type { LanguageCode } from '../lib/i18n.ts';
import { getCountryEmergencyInfo } from '../services/safetyClassifier.ts';
import type { MedicineMasterRecord, SafetyEvaluation } from '../types/medexplain.ts';
import { EmergencyGuidanceCards } from './EmergencyGuidanceCards.tsx';

interface SafetyBannerProps {
  safety: SafetyEvaluation;
  countryCode?: string;
  countryName?: string;
  languageCode?: LanguageCode;
  activeMedicine?: MedicineMasterRecord | null;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({
  safety,
  countryCode = 'GB',
  countryName,
  languageCode = 'en',
  activeMedicine,
}) => {
  const [showCardsOnGreen, setShowCardsOnGreen] = useState(false);
  const emergencyInfo = getCountryEmergencyInfo(countryCode);
  const primaryCard = emergencyInfo.cards[0];
  const showCards = safety.level !== 'GREEN' || showCardsOnGreen;

  const styles =
    safety.level === 'RED'
      ? {
          container: 'bg-red-50 border-red-300 text-red-950',
          labelColor: 'text-red-800',
          icon: <AlertOctagon className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />,
          tierText: 'RED SAFETY ALERT — URGENT ACTION',
        }
      : safety.level === 'AMBER'
        ? {
            container: 'bg-amber-50 border-amber-300 text-amber-950',
            labelColor: 'text-amber-800',
            icon: <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />,
            tierText: 'AMBER GUIDANCE — CHECK WITH A PHARMACIST',
          }
        : {
            container: 'bg-emerald-50 border-emerald-200 text-emerald-950',
            labelColor: 'text-emerald-800',
            icon: <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />,
            tierText: 'GREEN EDUCATIONAL INFORMATION',
          };

  return (
    <section
      aria-label={`Safety classification: ${safety.level}`}
      className={`rounded-2xl border p-5 space-y-5 ${styles.container}`}
    >
      <div className="flex items-start gap-3.5">
        {styles.icon}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className={styles.labelColor}>{styles.tierText}</span>
            {(countryName || emergencyInfo.countryName) && (
              <>
                <span aria-hidden="true" className="opacity-40">
                  ·
                </span>
                <span>{countryName || emergencyInfo.countryName}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug">{safety.headline}</h3>
          <p className="text-base leading-relaxed">{safety.guidance}</p>

          {safety.reasons.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
              {safety.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}

          {safety.emergencyNumber && (
            <div className="pt-3 mt-2 border-t border-current/15 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>
                  {primaryCard?.telHref ? (
                    <a
                      href={primaryCard.telHref}
                      className="underline underline-offset-2 font-mono tabular-nums hover:opacity-80"
                    >
                      Call {safety.emergencyNumber}
                    </a>
                  ) : (
                    <>Emergency ({safety.emergencyNumber})</>
                  )}
                  :{' '}
                  <span className="font-normal">{safety.emergencyGuidance}</span>
                </span>
              </div>

              {safety.level === 'GREEN' && (
                <button
                  type="button"
                  onClick={() => setShowCardsOnGreen((v) => !v)}
                  aria-expanded={showCardsOnGreen}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-950 hover:bg-emerald-100/70 min-h-[44px] whitespace-nowrap"
                >
                  <span>
                    {showCardsOnGreen
                      ? 'Hide Emergency & Regulatory Cards'
                      : 'View Emergency & Regulatory Cards'}
                  </span>
                  {showCardsOnGreen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showCards && (
        <div className="pt-4 border-t border-current/15">
          <EmergencyGuidanceCards
            countryCode={countryCode}
            languageCode={languageCode}
            activeMedicine={activeMedicine}
            defaultExpandedFirst={safety.level === 'RED'}
          />
        </div>
      )}
    </section>
  );
};

