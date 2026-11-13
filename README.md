# MedExplain — International Medicine Information Platform

**"Your medicine. Clearly explained."**

MedExplain is a multilingual, country-specific medicine information platform built for patients, caregivers, and clinical governance teams across the UK, India, United States, Canada, Australia, and the European Union.

## Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Progressive Web App (`vite-plugin-pwa`), WCAG 2.2 AA focus states, senior-friendly Large Print mode, Read-Aloud speech synthesis, and 6-language UI (`English`, `Hindi`, `Telugu`, `Tamil`, `Bengali`, `Urdu` including RTL support).
- **Backend**: Node.js + Express (`server.ts`) enforcing server-side Gemini API isolation, Firebase Admin ID token verification, and role-based access control (`patient`, `db_admin`, `clinical_reviewer`, `content_manager`, `tech_admin`).
- **Database**: Cloud SQL PostgreSQL managed via Drizzle ORM (`src/db/schema.ts`), storing all **16 normalized medicine CSV tables**, extensible country configurations, user profiles, saved medicines, manual reminders, adherence logs, OCR scan sessions, AI QA reviews, and immutable audit logs.
- **Clinical AI & External APIs**:
  - `@google/genai` (`gemini-4-hydrogen`) for structured OCR extraction (`extractMedicineLabelFromImage`) and strictly grounded 10-section plain-language explanations (`generateGroundedExplanation`).
  - Live `https://api.fda.gov/drug/label.json` (OpenFDA Drug Label API) connector for US FDA Structured Product Labeling.

## 16 Medicine CSV Schemas

All 16 relational tables are exportable/validatable via the Admin Governance Portal:
1. `medicines_master.csv`
2. `active_ingredients.csv`
3. `medicine_brands.csv`
4. `medicine_strengths.csv`
5. `medicine_formulations.csv`
6. `medicine_indications.csv`
7. `medicine_instructions.csv`
8. `medicine_warnings.csv`
9. `medicine_side_effects.csv`
10. `medicine_interactions.csv`
11. `medicine_contraindications.csv`
12. `medicine_country_approvals.csv`
13. `medicine_manufacturers.csv`
14. `medicine_sources.csv`
15. `medicine_languages.csv`
16. `medicine_update_history.csv`

## Working vs. Synthetic / Simulated Features

| Feature | Status | Notes |
| --- | --- | --- |
| Cloud SQL PostgreSQL + 16-Table Schema | **Fully Working** | Provisioned PostgreSQL instance via Drizzle ORM |
| Firebase Google Auth + RBAC + GDPR/DPDP Deletion | **Fully Working** | Token-verified routes & audited role switching |
| Live US OpenFDA Drug Label Search | **Fully Working** | Real-time SPL queries via `api.fda.gov` |
| UK, India, CA, AU, EU Records | **Synthetic Test Dataset (24 records)** | Clearly flagged `SYNTHETIC_TEST` (official NHS/eMC/BNF/CDSCO require formal licensing) |
| Smart OCR Scanner + Confirmation Gate | **Fully Working** | Gemini Vision structured extraction + mandatory user confirmation |
| 10-Section Grounded Explainer & 6 Languages | **Fully Working** | Deterministic fallback when offline or key missing |
| Manual Reminders & Adherence Tracking | **Working Schedule + Browser Alerts** | External SMS/email push requires production SMTP/FCM keys |



┌────────────────────────────────────────────────────────────────────────────┐
│                        PATIENT & ADMIN CLIENT (React 19 PWA)               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Patient Portal (UI)  │  │ Smart Scanner & OCR  │  │ Admin Governance │  │
│  │ • Large-Print Mode   │  │ • Camera / Upload    │  │ • 16-CSV Importer│  │
│  │ • 10-Part Explainer  │  │ • Extraction Review  │  │ • Duplicate Check│  │
│  │ • 6-Lang Switcher    │  │ • Match Confirmation │  │ • Clinical Review│  │
│  │ • Reminders & Compare│  │ • Failed Scan Log    │  │ • Audit & QA Logs│  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│             └─────────────────────────┼───────────────────────┘            │
│                         Firebase Auth ID Token (Bearer)                    │
└───────────────────────────────────────┼────────────────────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS API & SAFETY ORCHESTRATION LAYER                 │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Auth & RBAC Guard    │  │ Clinical Safety Gate │  │ Country Registry │  │
│  │ • Firebase Admin SDK │  │ • GREEN / AMBER / RED│  │ • UK, IN, US, CA │  │
│  │ • Role Verification  │  │ • Emergency Routing  │  │ • AU, EU Configs │  │
│  │ • Consent Enforcement│  │ • No-Source Block    │  │ • Local Helplines│  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│             ▼                         ▼                       ▼            │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ @google/genai Engine │  │ OpenFDA Connector    │  │ 16-CSV Pipeline  │  │
│  │ • Vision OCR Schema  │  │ • api.fda.gov/drug/  │  │ • Parse/Validate │  │
│  │ • Grounded Explainer │  │   label.json Search  │  │ • Missing Fields │  │
│  │ • 6-Lang Translator  │  │ • SPL Mapping        │  │ • Diff & Export  │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
└─────────────┼─────────────────────────┼───────────────────────┼────────────┘
              │                         ▼                       │
              │              External Official API              │
              │              (OpenFDA Drug Labels)              │
              ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   CLOUD SQL POSTGRESQL (Drizzle ORM + pg Pool)             │
│  • 16 Normalized Medicine Catalog & Governance Tables                      │
│  • Users, Consents, Saved Medicines, Manual Reminders, Reminder Logs       │
│  • OCR Scan Sessions (Failed/Confirmed), AI QA Reviews, Immutable AuditLog │
└────────────────────────────────────────────────────────────────────────────┘


## Running Tests & Build

```bash
npm run test
npm run lint
npm run build
npm run start
```
