# Sustainability Monitoring Dashboard

A map-centric dashboard for viewing ESG (Environmental, Social, Governance) metrics across SGX-listed companies. Built with Next.js and Leaflet.

## What it does

- Displays ~607 companies on an interactive map, colored by **data plausibility** (Good / Watch / Review)
- Lets you search, filter, and select companies to inspect detailed sustainability metrics
- Shows emissions (tCO₂e), energy (kWh), water (m³), and waste (tonnes) with a toggle between canonical and raw units
- Provides peer strategy examples from similar companies in the dataset
- All data is static — no backend required

## Architecture

```
master_metrics_1.csv
        │
        ▼
scripts/build-sustainability-data.ts   ← build-time transform
        │
        ▼
data/sustainability.generated.ts       ← typed dataset (auto-generated)
        │
        ▼
app/dashboard/page.tsx                 ← single-page client-side app
        │
        ├── MapView          (Leaflet map with plausibility-colored markers)
        ├── SidePanelLeft     (search, filters, company list)
        ├── SidePanelRight    (summary stats, plausibility & completeness breakdowns)
        └── BottomDetailsPanel (detailed metrics, peer examples, targets, strategy)
```

**Data pipeline:** CSV → build script → generated TypeScript → in-memory runtime. No database, no API calls.

**Unit normalization** (`lib/units.ts`) converts raw extracted values into canonical units at build time. Both raw and normalized values are stored so the UI can switch between them.

**Plausibility bands** are computed at build time using consistency checks, completeness scoring, and percentile comparisons across the dataset.

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

Reads `master_metrics_1.csv` and generates `data/sustainability.generated.ts`:

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
  side-panel-left.tsx       — search, filters, company list
  side-panel-right.tsx      — overview breakdowns
  bottom-details-panel.tsx  — company detail view
  kpi-row.tsx               — KPI cards (available but not mounted)
data/
  sustainability.ts         — types, helpers, formatters
  sustainability.generated.ts — auto-generated dataset (do not edit)
lib/
  units.ts                  — unit normalization (tCO2e, kWh, m³, tonnes)
  utils.ts                  — general utilities
scripts/
  build-sustainability-data.ts — CSV → TypeScript build script
master_metrics_1.csv        — source data
```

## Scripts

| Command              | Description                 |
| -------------------- | --------------------------- |
| `npm run dev`        | Start dev server            |
| `npm run build`      | Production build            |
| `npm run start`      | Serve production build      |
| `npm run build:data` | Regenerate dataset from CSV |
| `npm run lint`       | Run ESLint                  |
