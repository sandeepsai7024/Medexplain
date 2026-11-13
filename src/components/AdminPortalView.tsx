import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { MedicineMasterRecord, UserProfile } from '../types/medexplain.ts';

interface AdminOverviewData {
  metrics: {
    totalMedicines: number;
    totalInteractions: number;
    totalSources: number;
    totalLanguages: number;
    missingFieldsCount: number;
    pendingVerificationCount: number;
    failedOcrCount: number;
  };
  medicines: MedicineMasterRecord[];
  failedScans: {
    id: number;
    countryCode: string;
    scanMode: string;
    failureReason: string;
    extractedData: Record<string, string | null>;
    createdAt: string;
  }[];
  qaQueue: {
    id: number;
    medicineId: string;
    countryCode: string;
    languageCode: string;
    safetyLevel: string;
    qaStatus: string;
    generatedSummary: Record<string, unknown>;
    createdAt: string;
  }[];
  recentAudit: {
    id: number;
    actorEmail: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }[];
  csvTables: string[];
}

export const AdminPortalView: React.FC = () => {
  const { firebaseUser, profile, signInWithGoogle, authFetch, switchSandboxRole } =
    useAuth();

  const [tab, setTab] = useState<'records' | 'csv' | 'ocr_qa' | 'audit'>(
    'records'
  );
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // CSV Workbench state
  const [selectedCsvTable, setSelectedCsvTable] = useState('medicines_master');
  const [csvText, setCsvText] = useState('');
  const [csvValidation, setCsvValidation] = useState<{
    valid: boolean;
    missingColumns: string[];
    duplicateIds: string[];
    rowsWithMissingFields: { rowIndex: number; id: string; missing: string[] }[];
    totalRows: number;
  } | null>(null);

  const isAdminRole =
    profile &&
    ['db_admin', 'clinical_reviewer', 'content_manager', 'tech_admin'].includes(
      profile.role
    );

  const loadOverview = useCallback(async () => {
    if (!firebaseUser || !isAdminRole) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/admin/overview');
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Access denied.');
      } else {
        setOverview(data);
      }
    } catch {
      setErrorMsg('Unable to load admin governance dashboard.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, firebaseUser, isAdminRole]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleDownloadCsv = async (tableName: string) => {
    const res = await authFetch(`/api/admin/csv/export/${tableName}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleValidateCsv = async () => {
    setErrorMsg(null);
    setCsvValidation(null);
    const res = await authFetch('/api/admin/csv/validate', {
      method: 'POST',
      body: JSON.stringify({ table: selectedCsvTable, csvContent: csvText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Validation failed.');
    } else {
      setCsvValidation(data.validation);
    }
  };

  const handleImportCsv = async () => {
    setErrorMsg(null);
    const res = await authFetch('/api/admin/csv/import', {
      method: 'POST',
      body: JSON.stringify({ table: selectedCsvTable, csvContent: csvText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Import failed.');
    } else {
      setStatusToast(`Imported ${data.importedCount} row(s) into ${selectedCsvTable}.`);
      setCsvText('');
      setCsvValidation(null);
      await loadOverview();
    }
  };

  const handleVerifyStatus = async (
    medicineId: string,
    status: 'VERIFIED' | 'PENDING_REVIEW' | 'WITHDRAWN'
  ) => {
    const res = await authFetch(`/api/admin/medicines/${medicineId}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        note: `Updated via Clinical Governance Portal (${profile?.role})`,
      }),
    });
    if (res.ok) {
      setStatusToast(`Record ${medicineId} marked as ${status}.`);
      await loadOverview();
    } else {
      const data = await res.json();
      setErrorMsg(data.error || 'Permission denied for this role.');
    }
  };

  const handleQaDecision = async (id: number, qaStatus: 'approved' | 'flagged') => {
    const res = await authFetch(`/api/admin/qa/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ qaStatus }),
    });
    if (res.ok) {
      setStatusToast(`AI QA item #${id} marked ${qaStatus}.`);
      await loadOverview();
    }
  };

  const handleDownloadAuditReport = async () => {
    const res = await authFetch('/api/admin/audit-report');
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medexplain-audit-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!firebaseUser) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center max-w-xl mx-auto space-y-4">
        <Lock className="w-10 h-10 text-slate-700 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-900">
          Admin Governance Portal
        </h2>
        <p className="text-sm text-slate-600">
          Sign in with your Google account to access role-based CSV management,
          clinical record verification, OCR failure triage, and audit logs.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 min-h-[44px]"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Governance Header & Sandbox RBAC Switcher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Clinical & Database Governance · Signed in as {profile?.email}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            MedExplain Admin Workbench
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="sandbox-role-select"
            className="text-xs font-semibold text-slate-700"
          >
            RBAC Role (Audited):
          </label>
          <select
            id="sandbox-role-select"
            value={profile?.role || 'patient'}
            onChange={(e) =>
              switchSandboxRole(e.target.value as UserProfile['role'])
            }
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 min-h-[40px]"
          >
            <option value="patient">Patient (No Admin Access)</option>
            <option value="db_admin">Database Administrator</option>
            <option value="clinical_reviewer">Clinical Reviewer</option>
            <option value="content_manager">Content Manager</option>
            <option value="tech_admin">Technical Administrator</option>
          </select>
          <button
            type="button"
            onClick={loadOverview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {!isAdminRole ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-2 text-amber-950">
          <h3 className="text-lg font-bold">
            Role-Based Access Control Enforced (403 Patient Least-Privilege)
          </h3>
          <p className="text-sm">
            Your current role is <strong>{profile?.role}</strong>. Admin API routes
            reject patient tokens on the server. Switch to{' '}
            <strong>Database Administrator</strong> or{' '}
            <strong>Clinical Reviewer</strong> in the audited RBAC selector above
            to inspect and manage database governance workflows.
          </p>
        </div>
      ) : (
        <>
          {statusToast && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
              {statusToast}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {errorMsg}
            </div>
          )}

          {/* Metrics Strip */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                ['Master Records', overview.metrics.totalMedicines],
                ['Missing Fields', overview.metrics.missingFieldsCount],
                ['Pending Review', overview.metrics.pendingVerificationCount],
                ['Failed OCR', overview.metrics.failedOcrCount],
                ['Interactions', overview.metrics.totalInteractions],
                ['Sources', overview.metrics.totalSources],
                ['Translations', overview.metrics.totalLanguages],
              ].map(([label, val], idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Segmented Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'records', label: 'Clinical Verification & Freshness' },
              { id: 'csv', label: '16-CSV Import / Export' },
              { id: 'ocr_qa', label: 'Failed OCR & AI QA Queue' },
              { id: 'audit', label: 'Audit Trail & Reports' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setTab(t.id as 'records' | 'csv' | 'ocr_qa' | 'audit')
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && !overview && (
            <p className="text-sm text-slate-500">Loading governance data...</p>
          )}

          {/* TAB 1: Clinical Records */}
          {tab === 'records' && overview && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="p-3.5 font-semibold">ID</th>
                    <th className="p-3.5 font-semibold">Country</th>
                    <th className="p-3.5 font-semibold">Brand & Ingredients</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Missing Fields</th>
                    <th className="p-3.5 font-semibold">Verified Date</th>
                    <th className="p-3.5 font-semibold text-right">
                      Clinical Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.medicines.map((m) => (
                    <tr key={m.medicineId} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-mono tabular-nums text-slate-700">
                        {m.medicineId}
                      </td>
                      <td className="p-3.5 font-semibold">{m.countryCode}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">
                          {m.brandName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {m.activeIngredients} · {m.strength}
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {m.verificationStatus}
                      </td>
                      <td className="p-3.5 text-amber-800">
                        {m.missingDataIndicators?.length
                          ? m.missingDataIndicators.join(', ')
                          : 'Complete'}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-slate-600">
                        {m.sourceLastVerified}
                      </td>
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyStatus(m.medicineId, 'VERIFIED')
                          }
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyStatus(m.medicineId, 'PENDING_REVIEW')
                          }
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          Flag
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyStatus(m.medicineId, 'WITHDRAWN')
                          }
                          className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
                        >
                          Withdraw
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: 16-CSV Import/Export */}
          {tab === 'csv' && overview && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                  <span>All 16 Medicine CSV Schemas</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Export any relational CSV template populated with current
                  PostgreSQL rows, or select a table to validate and import.
                </p>
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl">
                  {overview.csvTables.map((tbl, i) => (
                    <div
                      key={tbl}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs ${
                        selectedCsvTable === tbl ? 'bg-teal-50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCsvTable(tbl)}
                        className="text-left font-mono font-semibold text-slate-800 hover:text-teal-800"
                      >
                        {String(i + 1).padStart(2, '0')}. {tbl}.csv
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCsv(tbl)}
                        className="inline-flex items-center gap-1 text-teal-800 font-semibold hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Validate & Import CSV ({selectedCsvTable}.csv)
                </h3>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => setCsvText(String(reader.result || ''));
                    reader.readAsText(f);
                  }}
                  className="block text-sm text-slate-700"
                />
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste CSV content here or upload a .csv file above..."
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-900"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!csvText.trim()}
                    onClick={handleValidateCsv}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Validate & Check Duplicates</span>
                  </button>
                  <button
                    type="button"
                    disabled={!csvText.trim()}
                    onClick={handleImportCsv}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import to PostgreSQL</span>
                  </button>
                </div>

                {csvValidation && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
                    <div className="font-bold text-slate-900">
                      Validation Result:{' '}
                      {csvValidation.valid ? 'PASSED' : 'ISSUES FOUND'} (
                      {csvValidation.totalRows} rows)
                    </div>
                    {csvValidation.missingColumns.length > 0 && (
                      <div className="text-red-700">
                        Missing required columns:{' '}
                        {csvValidation.missingColumns.join(', ')}
                      </div>
                    )}
                    {csvValidation.duplicateIds.length > 0 && (
                      <div className="text-red-700">
                        Duplicate primary IDs:{' '}
                        {csvValidation.duplicateIds.join(', ')}
                      </div>
                    )}
                    {csvValidation.rowsWithMissingFields.length > 0 && (
                      <div className="text-amber-800">
                        Rows with missing fields:{' '}
                        {csvValidation.rowsWithMissingFields
                          .map((r) => `${r.id} (${r.missing.join(', ')})`)
                          .join('; ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Failed OCR & AI QA */}
          {tab === 'ocr_qa' && overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Failed / Unmatched OCR Scans ({overview.failedScans.length})
                </h3>
                {overview.failedScans.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No failed OCR scans queued.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {overview.failedScans.map((s) => (
                      <div key={s.id} className="py-3 text-sm space-y-1">
                        <div className="font-semibold text-slate-900">
                          Scan #{s.id} · {s.countryCode} · {s.scanMode}
                        </div>
                        <div className="text-xs text-amber-800">
                          {s.failureReason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">
                  AI Explanation QA Queue ({overview.qaQueue.length})
                </h3>
                {overview.qaQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No AI explanations generated yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {overview.qaQueue.map((qa) => (
                      <div
                        key={qa.id}
                        className="py-3 flex items-start justify-between gap-3 text-sm"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {qa.medicineId} · {qa.countryCode} · {qa.languageCode}{' '}
                            · {qa.qaStatus}
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-2">
                            {String(qa.generatedSummary?.whatIsThisMedicine || '')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQaDecision(qa.id, 'approved')}
                            aria-label="Approve AI output"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQaDecision(qa.id, 'flagged')}
                            aria-label="Flag AI output"
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Audit Logs */}
          {tab === 'audit' && overview && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Immutable Governance Audit Trail
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadAuditReport}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Audit Report (JSON)</span>
                </button>
              </div>
              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                {overview.recentAudit.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-900">
                        {log.action}
                      </span>{' '}
                      <span className="text-slate-600">
                        on {log.targetType} ({log.targetId})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      {log.actorEmail} ({log.actorRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
