import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Info,
  PhoneCall,
} from 'lucide-react';
import { EMERGENCY_UI_COPY, LanguageCode } from '../lib/i18n.ts';
import {
  EmergencyGuidanceCardItem,
  getCountryEmergencyInfo,
} from '../services/safetyClassifier.ts';
import type { MedicineMasterRecord } from '../types/medexplain.ts';

interface EmergencyGuidanceCardsProps {
  countryCode: string;
  languageCode: LanguageCode;
  activeMedicine?: MedicineMasterRecord | null;
  defaultExpandedFirst?: boolean;
}

export const EmergencyGuidanceCards: React.FC<EmergencyGuidanceCardsProps> = ({
  countryCode,
  languageCode,
  activeMedicine,
  defaultExpandedFirst = false,
}) => {
  const info = getCountryEmergencyInfo(countryCode);
  const copy = EMERGENCY_UI_COPY[languageCode] || EMERGENCY_UI_COPY.en;

  const [expandedCardId, setExpandedCardId] = useState<string | null>(
    defaultExpandedFirst && info.cards[0] ? info.cards[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedCardId(
      defaultExpandedFirst && info.cards[0] ? info.cards[0].id : null
    );
  }, [countryCode, defaultExpandedFirst, info.cards]);

  const toggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const handleCopyNumber = async (
    e: React.MouseEvent,
    cardId: string,
    phone: string
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(cardId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  const getTierStyles = (tier: EmergencyGuidanceCardItem['tier']) => {
    if (tier === 'RED') {
      return {
        border: 'border-red-300 bg-red-50/70',
        headerText: 'text-red-950',
        badgeText: 'text-red-800',
        callBtn: 'bg-red-700 hover:bg-red-800 text-white',
        icon: <AlertOctagon className="w-5 h-5 text-red-700 shrink-0" />,
        tierLabel: 'EMERGENCY ACTION',
      };
    }
    if (tier === 'AMBER') {
      return {
        border: 'border-amber-300 bg-amber-50/70',
        headerText: 'text-amber-950',
        badgeText: 'text-amber-800',
        callBtn: 'bg-amber-700 hover:bg-amber-800 text-white',
        icon: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
        tierLabel: 'URGENT ADVICE & POISON HELP',
      };
    }
    return {
      border: 'border-slate-200 bg-white',
      headerText: 'text-slate-900',
      badgeText: 'text-teal-800',
      callBtn: 'bg-teal-700 hover:bg-teal-800 text-white',
      icon: <Info className="w-5 h-5 text-teal-700 shrink-0" />,
      tierLabel: 'REGULATORY REPORTING',
    };
  };

  return (
    <section
      aria-label={`${info.countryName} emergency and regulatory guidance`}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">
          {copy.sectionTitle} — {info.countryName}
        </h3>
        <p className="text-xs text-slate-500">{info.regulatoryStandard}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {info.cards.map((card) => {
          const s = getTierStyles(card.tier);
          const isExpanded = expandedCardId === card.id;

          return (
            <div
              key={card.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${s.border}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {s.icon}
                    <span className={s.badgeText}>{s.tierLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCard(card.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${card.serviceName} checklist`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-black/5 min-h-[36px]"
                  >
                    <span>Checklist</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div>
                  <div className={`text-sm font-semibold ${s.badgeText}`}>
                    {card.title}
                  </div>
                  <h4
                    className={`text-lg font-bold leading-snug mt-0.5 ${s.headerText}`}
                  >
                    {card.serviceName}
                  </h4>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed">
                  <span className="font-semibold">{copy.whenToUse}: </span>
                  {card.whenToUse}
                </p>

                {isExpanded && (
                  <div className="pt-3 mt-2 border-t border-slate-200/80 space-y-2.5 text-xs text-slate-800">
                    <div className="font-bold text-slate-900">
                      {copy.whatToShare}:
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      {card.whatToShare.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>

                    {activeMedicine && (
                      <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-1">
                        <div className="font-semibold text-slate-700">
                          {copy.activeMedicineNote}
                        </div>
                        <div className="font-mono text-slate-900 font-semibold">
                          {activeMedicine.brandName} ·{' '}
                          {activeMedicine.activeIngredients} ·{' '}
                          {activeMedicine.strength}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600">
                      Authority: {card.regulatoryAuthority}
                    </div>
                  </div>
                )}
              </div>

              {/* Clickable Primary Call + Official Guidance Links */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {card.phoneNumber && card.telHref && (
                  <>
                    <a
                      href={card.telHref}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors min-h-[44px] flex-1 whitespace-nowrap ${s.callBtn}`}
                    >
                      <PhoneCall className="w-4 h-4 shrink-0" />
                      <span className="font-mono tabular-nums">
                        {copy.callNow} {card.phoneNumber}
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleCopyNumber(e, card.id, card.phoneNumber!)
                      }
                      aria-label={`Copy ${card.phoneNumber}`}
                      title={copy.copyNumber}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px] whitespace-nowrap"
                    >
                      {copiedId === card.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{copy.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copy.copyNumber}</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <a
                  href={card.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-50 min-h-[44px] w-full"
                >
                  <span>
                    {card.officialPortalLabel || copy.officialSource}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
