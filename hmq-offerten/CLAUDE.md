# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Document Generation:** PizZip (DOCX XML manipulation)
- **PDF Conversion:** CloudConvert API (optional)
- **Drag & Drop:** @dnd-kit
- **Email Parsing:** @kenjiuno/msgreader (MSG), custom EML parser

## Architecture Overview

```
/app
  page.tsx                    # Main quote editor (2 tabs)
  /admin/
    page.tsx                  # Admin dashboard (tab orchestrator)
    /components/
      KategorienTab.tsx       # Categories CRUD + DnD sorting
      BasiswerteTab.tsx       # Base values form
      StandorteTab.tsx        # Office locations grid
      AnsprechpartnerTab.tsx  # Contact persons display
      EinstellungenTab.tsx    # App settings form
  /api/generate-docx/route.ts # DOCX/PDF generation endpoint

/components
  /layout/AppLayout.tsx       # Header + navigation
  /offerte/
    Tab1Daten.tsx            # Customer & project info, checkboxes
    Tab2Kosten.tsx           # Cost calculation (orchestrator)
    CheckboxGruppe.tsx       # Checkbox groups with auto-linking
    PlanUpload.tsx           # Image upload (PNG/JPG)
    FolderImport.tsx         # Folder/email import
    /kosten/
      KategorienGrid.tsx     # Category input grid
      SpesenGrid.tsx         # Travel expenses inputs
      KostenUebersicht.tsx   # Price sidebar + totals

/lib
  types.ts                    # TypeScript interfaces
  constants.ts                # Shared constants (MWST, rounding, months, standorte)
  store.ts                    # LocalStorage management (with JSON.parse error handling)
  supabase.ts                 # Database functions (lazy init)
  kosten-rechner.ts          # Cost calculation logic
  kosten-helpers.ts          # Shared helpers (rundeAuf5Rappen, formatCHF, berechneRabattUndMwst)
  download-utils.ts          # File download utilities
  mail-parser.ts             # EML/MSG/folder parsing
  docx-template-generator.ts # DOCX generation via XML
  cloudconvert.ts            # DOCX to PDF conversion (lazy init)
  /hooks/
    use-kosten-config.ts     # Load kategorienConfig + basiswerte from Supabase
    use-editable-preise.ts   # EditablePreise state, init, recalculation, persistence
    use-einsatzpauschale.ts  # Auto-calculation of einsatzpauschale

/public
  Offerte_Template_V11.docx  # Word template (only current version)
  data/                       # JSON fallback data
```

## Core Data Structure: Offerte

```typescript
{
  offertnummer: "51.25.405"           // Quote number
  datum: "2026-02-05"                 // Set to today when generating
  standortId: "zh" | "gr" | "ag"     // Office location
  ansprechpartnerIds: string[]        // Contact persons

  empfaenger: {                       // Recipient
    firma, abteilung, anrede, vorname, nachname, funktion,
    strasse, plz, ort
  }

  projekt: { ort, bezeichnung, anfrageDatum }

  kosten: {
    leistungspreis: number            // Calculated total
    rabattProzent: number             // Discount %
  }

  kostenBerechnung: {
    kategorien: [{ kategorieId, titel, anzahl }]
    overrides: { stundenEnd?, bindemengeEnd? }
    spesen: { kilometer, reisezeitStunden, verpflegungAnzahl, uebernachtungenAnzahl }
    gespeicherteWerte: GespeicherteKostenWerte  // Manual overrides
  }

  vorlaufzeit: "3 Wochen"
  einsatzpauschalen: number           // Auto: ceil(stundenEnd / 8)

  checkboxen: {
    artBauvorhaben: { neubau, umbau, rueckbau, sonstiges }
    artGebaeude: { efhFreistehend, reihenhaus, terrassenhaus, mfh, strassen, kunstbauten, sonstiges1, sonstiges2 }
    taetigkeiten: { aushub, rammarbeiten, mikropfaehle, baustellenverkehr, schwereMaschinen, sprengungen, diverses, sonstiges }
    koordination: { schriftlicheInfo, terminvereinbarung, durchAuftraggeber, sonstiges }
    erstaufnahme: { fassaden, strassen, strassenBelag, strassenRand, innenraeume, aussenanlagen, sonstiges }
    dokumentation: { rissprotokoll, fotoAussen, fotoInnen, fotoStrasse, zustellbestaetigung, datenabgabe }
  }

  planbeilage: {                      // Optional plan image
    dateiname, base64, mimeType, width?, height?
  } | null
}
```

## Cost Calculation (`kosten-rechner.ts`)

**Formula:**
```
Grundlagen      = Σ(Anzahl × Faktor × Basiswert)
Termin          = Σ(Anzahl × Faktor × Basiswert)
Aufnahme        = Stunden × Stundensatz
Bericht         = Σ(Anzahl × Faktor × Basiswert)
Kontrolle       = Σ(Anzahl × Faktor × Basiswert)
Zustellbest.    = Σ(Anzahl × Faktor × Basiswert)
Datenabgabe     = Σ(Anzahl × Faktor × Basiswert)
USB             = Pauschal (einmalig)
Binden          = Menge × Einheitspreis
Spesen          = km×Satz + Zeit×Satz + Verpfl.×Satz + Übern.×Satz

Zwischentotal   = Sum of all
Rabatt          = Zwischentotal × RabattProzent / 100
MwSt (8.1%)     = (Zwischentotal - Rabatt) × 0.081
Total           = Zwischentotal - Rabatt + MwSt
```

**5-Rappen-Rundung:** `Math.round(value * 20) / 20`

**Einsatzpauschalen:** `Math.ceil(aufnahmeStunden / 8)` → 1 pro angefangene 8 Stunden

## Checkbox Auto-Linking

When Erstaufnahme checkboxes change:
- `fassaden` OR `aussenanlagen` → auto-check `dokumentation.fotoAussen`
- `innenraeume` → auto-check `dokumentation.fotoInnen`
- `strassen` → auto-check `dokumentation.fotoStrasse` + `strassenBelag` + `strassenRand`

## Folder/Email Import (`mail-parser.ts`)

**Folder Structure:**
```
51.25.405 Zürich, Seestrasse 44, Neubau MFH/
└── anfrage.eml or email.msg
```

**Parsing:**
- Folder name regex: `(\d{2}\.\d{2}\.\d{3})\s+([^,]+),\s*(.+)` → Offertnummer, Ort, Bezeichnung
- EML/MSG: Extracts Date, "Standort:", "Bezeichnung:", "Empfänger:" sections
- Deadline regex: `/Offerten\s*Deadline[:\s]*(\d{2}\.\d{2}\.\d{4})/i`

## DOCX Generation (`docx-template-generator.ts`)

**Process:**
1. Load template from `/public/Offerte_Template_V*.docx`
2. Unzip with PizZip
3. Replace placeholders in `word/document.xml`: `{{FIRMA}}`, `{{DATUM}}`, etc.
4. Set checkboxes (38 total):
   - Word native: `<w14:checked w14:val="0"/>` → `val="1"`
   - Unicode: `☐` → `☒`
5. Embed plan image if present:
   - Add to `word/media/`
   - Update `word/_rels/document.xml.rels`
   - Update `[Content_Types].xml`
6. Generate legend PNG for erstaufnahme checkboxes
7. Remove empty rows (missing Funktion, Abteilung, Rabatt)
8. Rezip and return buffer

**Critical:** All text must be escaped with `escapeXml()` before XML insertion.

## PDF Generation (`cloudconvert.ts`)

Requires `CLOUDCONVERT_API_KEY` in `.env.local`.

**Process:**
1. Create CloudConvert job (upload → convert → export)
2. Upload DOCX buffer
3. Wait for completion
4. Download PDF from result URL

Falls back to DOCX-only if not configured or fails.

## API Route: `/api/generate-docx`

**Request:** POST with Offerte JSON

**Response:**
```json
{
  "docx": { "data": "base64...", "filename": "Beweissicherung ¦ 51.25.405.docx" },
  "pdf": { "data": "base64...", "filename": "Beweissicherung ¦ 51.25.405.pdf" } | null
}
```

## Database Schema (Supabase)

**kosten_kategorien**
- `id`, `titel`, `beschreibung`, `sortierung`
- `faktor_grundlagen`, `faktor_termin`, `faktor_aufnahme`, `faktor_bericht`, `faktor_kontrolle`, `faktor_abschluss`

**kosten_basiswerte** (single row, id=1)
- `grundlagen_chf`, `termin_chf`, `bericht_chf`, `kontrolle_chf`, `zustellbestaetigung_chf`, `datenabgabe_chf`
- `basisstunden_aufnahme`, `stundensatz_aufnahme`
- `usb_pauschal`, `binden_einheitspreis`
- `km_satz`, `reisezeit_satz`, `verpflegung_satz`, `uebernachtung_satz`

**offerten_historie**
- `offertnummer` (unique), `offerte_data` (jsonb)
- `projekt_ort`, `projekt_bezeichnung`, `empfaenger_firma` (indexed for search)

**app_einstellungen** (single row, id=1)
- `standort_default`, `vorlaufzeit_default`, `einsatzpauschalen_default`, `standard_checkboxen`

**standorte**
- `id` ("zh", "gr", "ag"), `name`, `firma`, `strasse`, `plz`, `ort`

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Main quote editor (Tab1Daten, Tab2Kosten) |
| `/admin` | Manage categories, base values, standorte, ansprechpartner, einstellungen |
| `/api/generate-docx` | Generate DOCX + PDF |

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Optional (enables PDF generation)
CLOUDCONVERT_API_KEY=your_api_key
```

## State Management

- **React State:** Quote data, cost calculations (`useMemo`)
- **LocalStorage:** `hmq_standorte`, `hmq_ansprechpartner` (cached with fallback to `/public/data/`)
- **Supabase:** Persistent storage via `getSupabase()` (lazy init)
- **Manual Edits:** Tracked in `EditablePreise` state, shows "manuell" badge

## Conventions

- **Money:** CHF with `'` separator (1'234.50), 5-Rappen rounding
- **Dates:** ISO in data (YYYY-MM-DD), DD.MM.YYYY in UI/documents
- **German months:** Januar, Februar, März, etc. in documents
- **File names:** kebab-case
- **Components:** PascalCase
- **Functions/variables:** camelCase

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Supabase connection error | Check `.env.local` variables |
| PDF not generating | Check `CLOUDCONVERT_API_KEY`, review console logs |
| Word shows "unreadable content" | Ensure `escapeXml()` on all text, check `[Content_Types].xml` for PNG/JPEG |
| Checkboxes not working | Template needs 38 checkboxes, both `<w14:checkbox>` and Unicode `☐` |
| Import not detecting email | File must be `.eml` or `.msg`, folder name must match regex |
