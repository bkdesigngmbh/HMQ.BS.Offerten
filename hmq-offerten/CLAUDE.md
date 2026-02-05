# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 App Router application for generating construction survey quotes ("Beweissicherung Offerten") for HMQ AG. It's deployed on Vercel with Supabase as the database.

### Core Data Flow

1. **Offerte Creation** (`/app/page.tsx`): Main page with two tabs
   - Tab 1 (Daten): Customer info, project details, service checkboxes
   - Tab 2 (Kosten): Cost calculation based on categories and factors

2. **Cost Calculation** (`/lib/kosten-rechner.ts`): Calculates quote totals using:
   - `kosten_kategorien` (DB) - categories with factors for each cost type
   - `kosten_basiswerte` (DB) - base prices in CHF
   - Formula: Σ(Anzahl × Faktor × Basiswert) + Spesen + MwSt (8.1%)

3. **Document Generation** (`/lib/docx-template-generator.ts`): Creates Word documents using docxtemplater with templates from `/public/Offerte_Template_V*.docx`

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `kosten_kategorien` | Cost categories with multiplier factors |
| `kosten_basiswerte` | Base prices (single row, id=1) |
| `offerten_historie` | Saved quotes (upsert by `offertnummer`) |
| `app_einstellungen` | App config (single row, id=1) |
| `standorte` | Office locations (ZH, GR, AG) |

### Key Modules

- **`/lib/types.ts`**: All TypeScript interfaces including `Offerte`, `Checkboxen`, `KostenBerechnung`
- **`/lib/supabase.ts`**: Database functions with lazy client initialization via `getSupabase()`
- **`/lib/mail-parser.ts`**: Parses EML/MSG files and folder names to auto-fill quote data
- **`/lib/store.ts`**: LocalStorage management for `standorte` and `ansprechpartner`

### Routes

- `/` - Quote editor (main functionality)
- `/admin` - Manage cost categories, base values, settings
- `/admin/standorte` - Office locations
- `/admin/ansprechpartner` - Contact persons with signatures

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Conventions

- Swiss formatting: CHF with thousands separators (1'234.50), dates as DD.MM.YYYY
- 5-Rappen rounding for all monetary values
- Checkbox groups in `Offerte.checkboxen` auto-link (e.g., selecting "Strassen" in Erstaufnahme auto-checks "Belag" and "Rand")
- Admin uses @dnd-kit for drag-and-drop category sorting
