# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Vitest (kosten-rechner, mail-parser, DOCX-Snapshot)
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
      EmgTab.tsx              # EMG base values form (rates, week tariffs)
      StandorteTab.tsx        # Office locations grid
      AnsprechpartnerTab.tsx  # Contact persons display
      EinstellungenTab.tsx    # App settings form
  /api/generate-docx/route.ts # DOCX/PDF generation endpoint

/components
  /layout/AppLayout.tsx       # Header + navigation
  /offerte/
    Tab1Daten.tsx            # Customer & project info, Offertart, checkboxes, EMG inputs
    Tab2Kosten.tsx           # Cost calculation (orchestrator)
    CheckboxGruppe.tsx       # Checkbox groups with auto-linking
    PlanUpload.tsx           # Image upload (PNG/JPG)
    FolderImport.tsx         # Folder/email import
    /kosten/
      KategorienGrid.tsx     # Category input grid
      SpesenGrid.tsx         # Travel expenses inputs
      KostenUebersicht.tsx   # Price sidebar + totals (BS)
      EmgKostenBlock.tsx     # EMG cost block (Grundpauschale grid, overrides, own total)

/lib
  types.ts                    # TypeScript interfaces (incl. Offertart, EmgKonfiguration)
  constants.ts                # Shared constants (MWST, rounding, months, standorte, EMG defaults)
  store.ts                    # LocalStorage management (with JSON.parse error handling)
  supabase.ts                 # Database functions (lazy init)
  kosten-rechner.ts          # Cost calculation logic (BS)
  emg-kosten-rechner.ts      # EMG cost calculation (Grundpauschale components, week tariffs)
  kosten-helpers.ts          # Shared helpers (rundeAuf5Rappen, formatCHF, berechneRabattUndMwst)
  download-utils.ts          # File download utilities
  mail-parser.ts             # EML/MSG/folder parsing
  docx-template-generator.ts # DOCX generation via XML
  cloudconvert.ts            # DOCX to PDF conversion (lazy init)
  /hooks/
    use-kosten-config.ts     # Load kategorienConfig + basiswerte from Supabase
    use-editable-preise.ts   # EditablePreise state, init, recalculation, persistence
    use-einsatzpauschale.ts  # Auto-calculation of einsatzpauschale
    use-emg-kosten.ts        # Load EMG basiswerte + keep emg.gespeicherteWerte current

/public
  Offerte_Template_V13.docx  # Word template (current version, V12 = pre-EMG, V11 = pre-Vergleichsaufnahme)
  data/                       # JSON fallback data

/scripts
  build_template_v13.py       # Programmatic template build V12 -> V13 (EMG blocks)

/database
  emg-migration.sql           # Additive Supabase migration: table emg_basiswerte
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
  vergleichsaufnahme?: boolean        // Optional: Abschnitt 2.3 Vergleichsaufnahme + Kostenzeile "(Preis)" aufführen

  offertart?: "bs" | "bs_emg" | "emg" // Missing on old offers = "bs" (BS only, output as before)
  emg?: {                             // Only relevant for bs_emg/emg
    anzahlGeraete, anzahlWochen: number | null   // Required >= 1 when EMG active, no defaults
    leistungen: { konfiguration, smsAlarmierung, terminvereinbarung,
                  erstinstallation, vorhalten, deinstallation }  // default all true, deselectable
    abschlussbericht: boolean         // checked -> priced into total, else "(250.00)" bracket row
    grundpauschale: { organisationH, beschaffungH, konfigurationStk (null=auto=anzahlGeraete),
                      installationH, deinstallationH, fahrtenInstallationKm,
                      reisezeitInstallationH, fahrtenDeinstallationKm, reisezeitDeinstallationH }
    overrides: { grundpauschaleEnd?, vorhaltenEnd?, abschlussberichtPreisEnd? }
    rabattProzent: number             // separate EMG discount (independent of BS discount)
    gespeicherteWerte?: EmgGespeicherteWerte  // Frozen values used by the generator (REQUIRED when EMG active)
  }

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

## EMG Cost Calculation (`emg-kosten-rechner.ts`)

```
Grundpauschale  = Σ(Komponenten-Anzahl × Ansatz)   // 9 Komponenten: h × Stundensatz,
                                                    // Stk. × Konfigurationssatz, km × km-Satz
Wochentarif     = höchstes Band mit abWochen <= anzahlWochen (Bänder aus emg_basiswerte)
Vorhalten       = Geräte × Wochen × Wochentarif
Zwischentotal   = Grundpauschale + Vorhalten + (Abschlussbericht wenn angekreuzt)
Rabatt/MwSt/Total wie BS (eigener EMG-Rabatt, 8.1%, 5-Rappen-Rundung)
```

Overrides (`grundpauschaleEnd`, `vorhaltenEnd`, `abschlussberichtPreisEnd`) ersetzen die
Berechnung. `konfigurationStk = null` folgt automatisch der Geräteanzahl.
`use-emg-kosten.ts` (page-level) hält `emg.gespeicherteWerte` bei jeder Änderung aktuell;
der Generator arbeitet ausschliesslich mit diesen eingefrorenen Werten und wirft einen
Fehler, wenn sie bei aktivem EMG fehlen (kein stiller Fallback).

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
4. Handle Vergleichsaufnahme (`vergleichsaufnahme` flag):
   - Template contains section "2.3 Beweissicherung Vergleichsaufnahme" wrapped in hidden `{{VA_START}}`/`{{VA_END}}` marker paragraphs plus a cost table row with `{{PREIS_VERGLEICH}}`
   - Flag off: remove the whole block + cost row (output identical to V11). Flag on: remove only the markers; `{{NR_DOKU}}` becomes 2.4, `{{KOSTEN_TITEL}}` "Beweissicherung", `{{LEISTUNG_LABEL}}` "Leistungen Erstaufnahme", `{{PREIS_VERGLEICH}}` = same value as `{{PREIS_LEISTUNG}}` (shown in parentheses, NOT added to totals)
   - Pagination (like the Muster-Offerte 51.26.404): flag on inserts `<w:pageBreakBefore/>` into the Dokumentation heading (2.4 starts a new page). The `{{SCHLUSS_UMBRUCH}}` break paragraph is replaced with two empty paragraphs whenever VA OR EMG is active (`passeSchlussUmbruchAn`), so KOMPETENZ stays on the same page as signatures/Beilagen; plain BS keeps the fixed page break (marker replaced with '')
5. Handle EMG (`offertart`, modelled after the manually extended Muster-Offerte 51.26.392 "mit EMG"):
   - Template V13 contains the EMG-Leistungen chapter in `{{EMG_START}}`/`{{EMG_END}}`, the EMG cost section in `{{EMGK_START}}`/`{{EMGK_END}}`, the BS-Leistungen chapter in `{{BS_START}}`/`{{BS_END}}` and the BS cost section (3.1 + table) in `{{BSK_START}}`/`{{BSK_END}}`
   - `bs`: remove both EMG blocks + all markers → output identical to V12 (verified word-by-word)
   - `bs_emg`: keep everything; EMG chapter auto-numbers to 3, `{{NR_KOSTEN}}` 4.1, `{{NR_EMGK}}` 4.2, `{{NR_EMG}}` 3.1; page break before the EMG chapter (para with `{{EMG_PB}}`) and `pageBreakBefore` injected into the KOSTEN heading (after `keepLines`, schema order)
   - `emg`: remove BS blocks; subject becomes "Offerte für Erschütterungsmessung" (`{{OFFERT_TITEL}}`), `{{AUSGANGSLAGE_ZIEL}}`/`{{TERMINE_SATZ1}}`/`{{TERMINE_OBJEKT}}` switch to EMG wording, numbers 2.1/3.1, the `{{EMG_PB}}` page-break paragraph and the "Installation erfolgt zeitgleich..." bullet are removed; filename prefix "Erschütterungsmessung ¦ "
   - Wochentarif list: the `{{EMG_TARIFE}}` marker paragraph is replaced with 4 generated bullet lines from `gespeicherteWerte.tarife`; the active band (by anzahlWochen) is bold. The EMG block deliberately has NO trailing empty paragraph (would spill to a new page and create a blank page before KOSTEN)
   - "inkl. SMS-Alarmierung/Web-Zugriff" is its own checkbox line below Konfiguration (checkbox order unchanged)
   - EMG modes only: the "Offertgültigkeit: 90 Tage" paragraph is merged into the end of the Vorlaufzeit paragraph (saves a line so Datenschutz fits the page); plain BS keeps the separate paragraph (byte-identical output)
   - EMG cost table: Grundpauschale/Vorhalten/Abschlussbericht rows via `{{EMG_PREIS_*}}`; Abschlussbericht row toggles between "(250.00)" bracket and real position; own Rabatt row (`{{EMG_PREIS_RABATT}}`) removed at 0%; footnote `{{EMG_FOLGETARIF}}` = applied band tariff ("80.-")
   - All EMG amounts come from `emg.gespeicherteWerte` (frozen client-side); generator throws if missing
6. Set checkboxes (in document order of the checkboxes REMAINING in the XML):
   - Word native: `<w14:checked w14:val="0"/>` → `val="1"`; Unicode: `☐` → `☒`
   - `bs`: 37 states (+4 forced-checked VA states between erstaufnahme and dokumentation when VA active)
   - `bs_emg`: + 8 EMG states appended (6 Leistungen, Abschlussbericht, Leerzeile=false)
   - `emg`: 20 states (Kapitel 1.1/1.2) + 8 EMG states; template V13 holds 49 checkboxes total
7. Embed plan image if present:
   - Add to `word/media/`
   - Update `word/_rels/document.xml.rels`
   - Update `[Content_Types].xml`
8. Generate legend PNGs: erstaufnahme checkboxes (BS) plus green circle `legende_emg.png`
   (#9BBB59, dark border, like the Word shape in the Muster-Offerte) whenever EMG is active;
   at `emg` only the EMG entry remains
9. Remove empty rows (missing Funktion, Abteilung, Rabatt)
10. Rezip and return buffer

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

**emg_basiswerte** (single row, id=1; created by `database/emg-migration.sql`)
- `stundensatz`, `konfiguration_stk_chf`, `km_satz`
- `tarif1_ab`..`tarif4_ab`, `tarif1_chf`..`tarif4_chf` (week tariff bands)
- `abschlussbericht_chf`
- Missing table: admin EMG tab and EMG cost block show an explicit migration hint,
  the other tabs keep working (loaded separately)

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

## Word Template: Critical Rules

**NEVER edit the template in Microsoft Word.** Word splits `{{PLACEHOLDER}}` across multiple XML runs (e.g. `<w:t>{{OFFNR_A</w:t>` + `<w:t>}}</w:t>`) and inserts `<w:proofErr>` tags between them. This silently breaks placeholder replacement. Always modify the template programmatically via Python/zipfile, editing `word/document.xml` as a string.

**Template modification workflow:**
1. Read the current template from `public/Offerte_Template_V13.docx` via `zipfile.ZipFile` (Vorbild: `scripts/build_template_v13.py`)
2. Extract `word/document.xml` as UTF-8 string
3. Make text replacements (verify with `.count()` before and after)
4. Rewrite the ZIP with all original files, replacing only modified ones
5. Verify all 45 `{{PLACEHOLDER}}` occurrences are still intact after changes

**Content-Types are case-insensitive in Word.** Having both `Extension="JPG"` and `Extension="jpg"` in `[Content_Types].xml` causes "unreadable content" errors. The template already has `Extension="JPG"` -- do not add a lowercase variant.

**Signature images use anchor positioning, not tab order.** `rId10` (image2, posH=5.6cm) is the RIGHT signature, `rId11` (image3, posH=0.3cm) is the LEFT. The XML order does not match the visual layout. Always check `<wp:positionH>` to determine left/right.

**Ansprechpartner are maintained in 3 places:** `lib/data/ansprechpartner.json` (data), `app/admin/components/AnsprechpartnerTab.tsx` (admin display), and the Word template itself (names, titles, signature images in `word/media/`). All must be updated together.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Supabase connection error | Check `.env.local` variables |
| PDF not generating | Check `CLOUDCONVERT_API_KEY`, review console logs |
| Word shows "unreadable content" | Ensure `escapeXml()` on all text, check `[Content_Types].xml` for duplicate extensions (case-insensitive) |
| Checkboxes not working | Template needs 49 checkboxes (37 + 4 Vergleichsaufnahme + 8 EMG), both `<w14:checkbox>` and Unicode `☐` |
| Import not detecting email | File must be `.eml` or `.msg`, folder name must match regex |
| Placeholders not replaced | Template was likely edited in Word -- rebuild from git original programmatically |
