import React, { useState } from 'react';
import { Lock, Shield, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface PrivacyAndDocsModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyAndDocsModal: React.FC<PrivacyAndDocsModalProps> = ({
  open,
  onClose,
}) => {
  const { firebaseUser, profile, deleteAccountData } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy, Regulatory Compliance and Platform Transparency"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Privacy, Compliance & Platform Transparency
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Built for UK GDPR, Data Protection Act 2018, India DPDP Act 2023,
              and international privacy minimization.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy & Data Minimization */}
        <section className="space-y-2.5 text-sm text-slate-700">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-700" />
            <span>Data Privacy & Medical Device Boundary</span>
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Minimal Data Collection:</strong> Browse and scan medicines
              without creating an account or entering medical history.
            </li>
            <li>
              <strong>Zero Model Training on Uploads:</strong> Uploaded labels
              and prescriptions are processed solely to extract printed text for
              your confirmation and are never used to train AI models.
            </li>
            <li>
              <strong>Non-Diagnostic Scope:</strong> MedExplain translates
              manufacturer/regulator wording into plain language. It does not
              diagnose conditions, prescribe, or alter doses, keeping it outside
              regulated clinical decision support.
            </li>
          </ul>
        </section>

        {/* Working vs Simulated Transparency Matrix */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-700" />
            <span>Feature Status: Fully Working vs. Synthetic / Simulated</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="p-3 font-semibold">Capability</th>
                  <th className="p-3 font-semibold">Implementation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-3 font-semibold">
                    Cloud SQL PostgreSQL + 16-Table Drizzle Schema
                  </td>
                  <td className="p-3">
                    <strong>Fully Working:</strong> Live relational PostgreSQL
                    instance storing all 16 CSV tables, user profiles, reminders,
                    scans, QA reviews, and audit logs.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">
                    Live US OpenFDA Drug Label API
                  </td>
                  <td className="p-3">
                    <strong>Fully Working:</strong> Real-time queries to
                    api.fda.gov/drug/label.json for US SPL monographs.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">
                    UK, India, CA, AU, EU Medicine Records
                  </td>
                  <td className="p-3">
                    <strong>Synthetic Test Dataset (24 Records):</strong>{' '}
                    Clearly labeled SYNTHETIC_TEST records because NHS, eMC, BNF,
                    and CDSCO require formal licensing agreements.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">
                    Smart OCR & 6-Language Grounded Explainer
                  </td>
                  <td className="p-3">
                    <strong>Fully Working:</strong> Server-side Gemini Vision OCR
                    + grounded explanation engine across English, Hindi, Telugu,
                    Tamil, Bengali, and Urdu with mandatory user confirmation.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">
                    Reminders & Notifications
                  </td>
                  <td className="p-3">
                    <strong>Working Schedule + Browser Alerts:</strong> Manual
                    schedule persistence in PostgreSQL and browser notifications;
                    external SMS/email delivery requires production SMTP/FCM
                    provider credentials.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* User-Controlled Deletion */}
        {firebaseUser && (
          <section className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
            <div className="text-sm font-bold text-red-950">
              Your Data Rights ({profile?.email})
            </div>
            <p className="text-xs text-red-900">
              Under UK GDPR Article 17 and India DPDP Act, you may permanently
              erase your saved medicines, medication reminders, and profile from
              MedExplain’s PostgreSQL database.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete My Personal Data</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAccountData();
                    onClose();
                  }}
                  className="rounded-xl bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
                >
                  Confirm Permanent Erasure
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
