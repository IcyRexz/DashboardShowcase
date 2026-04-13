# Sustainability Monitoring Dashboard

A map-centric dashboard for viewing ESG (Environmental, Social, Governance) metrics across listed companies in **multiple countries** (currently Singapore, Malaysia, and Indonesia). The dataset spans **report years 2021–2024**. Built with Next.js and Leaflet.

## What it does

- Displays ~3,500 company-year records on an interactive map, colored by **data completeness** (green/red against a 6-of-12 threshold)
- Lets you search and filter across countries, industries, and incomplete records, then inspect detailed sustainability metrics per company
- Shows emissions (tCO₂e), energy (kWh), water (m³), and waste (tonnes) with a toggle between canonical and raw units
- Provides peer strategy examples from similar companies in the dataset
- Core dashboard data is static and build-time generated; optional API routes support PDF preview and explanation chat

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
        ├── MapView          (Leaflet map with completeness-colored markers)
        ├── SidePanelLeft     (search, filters, company list, industry filter)
        ├── SidePanelRight    (summary stats, coverage & completeness breakdowns)
        └── BottomDetailsPanel (detailed metrics, peer examples, targets, strategy)
```

**Data pipeline:** All country-year CSVs under `Data for CSV/` (`country_year.csv`) → build script → generated TypeScript → in-memory runtime.

**Unit normalization** (`lib/units.ts`) converts raw extracted values into canonical units at build time. Both raw and normalized values are stored so the UI can switch between them.

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

A score of **4** means all four metrics are present. This legacy score is retained in the model, while the UI primarily uses the 12-field completeness score and threshold.

**Trust metrics** (from extraction metadata) are retained for QA and drilldown:

- **extractionOk** — `true` when no extraction groups failed (`groupsFailed === 0`).
- **dataQualityScore** — optional 0–100 score from the extraction pipeline.
- **verifiedByHuman** — optional flag; stored but not used to assign bands.

## Scripts

| Command              | Description                 |
| -------------------- | --------------------------- |
| `npm run dev`        | Start dev server            |
| `npm run build`      | Production build            |
| `npm run start`      | Serve production build      |
| `npm run build:data` | Regenerate dataset from CSV |
| `npm run lint`       | Run ESLint                  |
