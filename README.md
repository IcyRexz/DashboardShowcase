# Sustainability Monitoring Dashboard

A map-centric dashboard for viewing ESG (Environmental, Social, Governance) metrics across listed companies in **multiple countries** (currently Singapore, Malaysia, and Indonesia). The dataset spans **report years 2021–2024**. Built with Next.js and Leaflet.

## What it does

- Displays ~3,500 companies on an interactive map, colored by **data plausibility** (Good / Watch / Review)
- Lets you search and filter across countries, industries, and plausibility bands, then inspect detailed sustainability metrics per company
- Shows emissions (tCO₂e), energy (kWh), water (m³), and waste (tonnes) with a toggle between canonical and raw units
- Provides peer strategy examples from similar companies in the dataset
- All data is static and build-time generated — no backend or API required

## Architecture

```
Data for CSV/
  indonesia_2022.csv
  indonesia_2023.csv
  indonesia_2024.csv
  malaysia_2022.csv
  malaysia_2023.csv
  malaysia_2024.csv
  singapore_2021.csv
  singapore_2022.csv
  singapore_2023.csv
  singapore_2024.csv
        │
        ▼
scripts/build-sustainability-data.ts   ← build-time transform (CSV → TS)
        │
        ▼
data/sustainability.generated.ts       ← typed dataset (auto-generated)
        │
        ▼
app/dashboard/page.tsx                 ← single-page client-side app
        │
        ├── MapView          (Leaflet map with plausibility-colored markers)
        ├── SidePanelLeft     (search, filters, company list, industry filter)
        ├── SidePanelRight    (summary stats, plausibility & completeness breakdowns)
        └── BottomDetailsPanel (detailed metrics, peer examples, targets, strategy)
```

**Data pipeline:** All country-year CSVs under `Data for CSV/` (`country_year.csv`) → build script → generated TypeScript → in-memory runtime. No database, no API calls.

**Unit normalization** (`lib/units.ts`) converts raw extracted values into canonical units at build time. Both raw and normalized values are stored so the UI can switch between them.

**Plausibility bands** are computed at build time using consistency checks, completeness scoring, and percentile comparisons across the full cohort; see [Plausibility bands](#plausibility-bands-good--watch--review) below.

## Tech stack

| Layer       | Technology                             |
| ----------- | -------------------------------------- |
| Framework   | Next.js 16 (App Router)                |
| Language    | TypeScript (strict)                    |
| UI          | React 19, Tailwind CSS 4, shadcn/ui    |
| Map         | Leaflet 1.9                            |
| Charts      | Recharts (available, not heavily used) |
| Build tools | tsx (for the data build script)        |

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Build the dataset

Reads all `Data for CSV/country_year.csv` files (e.g. `singapore_2024.csv`) and generates `data/sustainability.generated.ts`:

```bash
npm run build:data
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

### Production build

```bash
npm run build
npm run start
```

## Project structure

```
app/
  dashboard/page.tsx        — main dashboard page
components/dashboard/
  map-view.tsx              — Leaflet map
  side-panel-left.tsx       — search, filters, company list, industry filter
  side-panel-right.tsx      — overview breakdowns
  bottom-details-panel.tsx  — company detail view
  kpi-row.tsx               — KPI cards (available but not mounted)
Data for CSV/
  country_year.csv — canonical multi-country/year sources
data/
  sustainability.ts        — types, helpers, formatters
  sustainability.generated.ts — auto-generated dataset (do not edit)
lib/
  units.ts                  — unit normalization (tCO2e, kWh, m³, tonnes)
  utils.ts                  — general utilities
scripts/
  build-sustainability-data.ts — CSV → TypeScript build script
```

## Data completeness and trust metrics

**Completeness** is a 0–4 score computed from four key fields (see `Completeness` and `calcCompleteness` in `data/sustainability.ts`):

- **Scope 1 emissions** (value non-null) → 1 point  
- **Scope 2 emissions** (value non-null) → 1 point  
- **Waste generated** (value non-null) → 1 point  
- **Waste recycled** (value non-null) → 1 point  

A score of **4** means all four metrics are present. This score is used for the “Incomplete only” filter and as an input to plausibility: companies with score &lt; 4 are always marked **Review**.

**Trust metrics** (from extraction metadata) are also used in plausibility:

- **extractionOk** — `true` when no extraction groups failed (`groupsFailed === 0`). If any group failed, the company is marked **Review**.
- **dataQualityScore** — optional 0–100 score from the extraction pipeline. If present and &lt; 50, the company is marked **Review**.
- **verifiedByHuman** — optional flag; stored but not used to assign bands.

## Plausibility bands (Good / Watch / Review)

The build script (`scripts/build-sustainability-data.ts`) assigns each company a **plausibility band** using normalized metrics, completeness, trust, and cohort percentiles.

**Inputs:** Normalized values from `lib/units.ts` (Scope 1/2/3 in tCO₂e, total energy in kWh, water in m³, waste in tonnes), plus derived `scope12Total`, `wasteDiversionRate`, completeness score, and trust metrics.

**Review** — Assigned when any of the following hold:

- **Consistency failures:** waste recycled &gt; waste generated; water recycled &gt; water withdrawal; or any negative value in Scope 1, Scope 2, waste generated, or waste recycled.
- **Incomplete reporting:** completeness score &lt; 4 (one or more of Scope 1, Scope 2, waste generated, waste recycled missing).
- **Extraction issues:** `groupsFailed &gt; 0` (extraction had failed groups).
- **Low data quality:** `dataQualityScore` present and &lt; 50.

**Watch** — Assigned when the data passes the consistency and trust checks above but is flagged as an outlier (only when the cohort has enough peers, currently ≥ 10). The script computes global percentiles across the full dataset:

- **95th percentile** for Scope 1+2 emissions, total energy, water withdrawal, and waste generated. If a company is at or above the 95th on any of these, it gets a Watch reason.
- **10th percentile** for waste diversion rate. If diversion is at or below the 10th percentile, or below **20%** (a fixed floor applied even when percentiles are not used), it gets a Watch reason.

**Watch** means “unusual relative to the cohort but internally consistent,” not necessarily wrong.

**Good** — Assigned when there are no consistency or trust failures and no outlier flags from the percentile logic.

The build script stores **human-readable reasons** (`plausibilityReasons`) for each Watch or Review company; the UI can show these in the company detail view.

## Scripts

| Command              | Description                 |
| -------------------- | --------------------------- |
| `npm run dev`        | Start dev server            |
| `npm run build`      | Production build            |
| `npm run start`      | Serve production build      |
| `npm run build:data` | Regenerate dataset from CSV |
| `npm run lint`       | Run ESLint                  |
