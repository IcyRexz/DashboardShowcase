// ============================================================================
// SUSTAINABILITY MONITORING DATA MODEL (Real Dataset)
// ============================================================================

export type Year = 2021 | 2022 | 2023 | 2024;

// ============================================================================
// RAW DATA TYPES (matching CSV structure)
// ============================================================================

export interface QuantityRaw {
  value: number | null;
  unit: string | null;
}

export interface EmissionsData {
  scope1: QuantityRaw;
  scope2: QuantityRaw;
  scope3: QuantityRaw;
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface WasteData {
  generated: QuantityRaw;
  disposed: QuantityRaw;
  recycled: QuantityRaw;
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface WaterData {
  withdrawal: QuantityRaw;
  discharge: QuantityRaw;
  consumption: QuantityRaw;
  recycled: QuantityRaw;
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface EnergyData {
  total: QuantityRaw;
  breakdown: string | null; // JSON string from CSV
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface FuelData {
  consumption: QuantityRaw;
  breakdown: string | null; // JSON string from CSV
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface GfaData {
  value: QuantityRaw;
  calculation: string | null;
  notes: string | null;
  status: string | null;
}

export interface TargetsData {
  json: string | null; // Raw JSON array string
  notes: string | null;
  status: string | null;
}

export interface StrategyData {
  summary: string | null;
  notes: string | null;
  status: string | null;
}

export interface ExtractionMeta {
  extractionId: string | null;
  extractionDate: string | null;
  sourceImagesPrefix: string | null;
  processingSeconds: number | null;
  groupsExtracted: number | null;
  groupsFailed: number | null;
  groupsSkipped: number | null;
  rawJsonPath: string | null;
  dataQualityScore: number | null;
  verifiedByHuman: boolean | null;
}

// ============================================================================
// DERIVED TYPES
// ============================================================================

/** Minimum filled overview metrics (of 12) for “strong” green completeness. */
export const COMPLETENESS_GREEN_MIN = 6;
/** Total overview metrics tracked for completeness (matches dashboard overview grid). */
export const COMPLETENESS_TOTAL_FIELDS = 12;

export interface Completeness {
  hasScope1: boolean;
  hasScope2: boolean;
  hasWasteGenerated: boolean;
  hasWasteRecycled: boolean;
  /** Legacy 0–4 count: Scope 1, Scope 2, waste generated, waste recycled. */
  score: number;
  /** 0–12 count across overview metrics (see calcCompleteness). */
  score12: number;
  /** True when score12 >= COMPLETENESS_GREEN_MIN. */
  meetsGreenThreshold: boolean;
}

export interface TrustMetrics {
  extractionOk: boolean; // groupsFailed === 0
  dataQualityScore: number | null;
  verifiedByHuman: boolean | null;
}

/** Canonical normalized values (build-time). Used for KPIs and unit switching. */
export interface NormalizedMetrics {
  scope1TCO2e: number | null;
  scope2TCO2e: number | null;
  scope3TCO2e: number | null;
  totalEnergyKwh: number | null;
  waterWithdrawalM3: number | null;
  waterConsumptionM3: number | null;
  waterRecycledM3: number | null;
  wasteGeneratedTonnes: number | null;
  wasteRecycledTonnes: number | null;
  wasteDisposedTonnes: number | null;
}

export interface DerivedMetrics {
  scope12Total: number | null; // scope1 + scope2 (normalized to tCO2e)
  wasteDiversionRate: number | null; // recycled / generated (0-1)
  completeness: Completeness;
  trust: TrustMetrics;
  /** Coverage score 0–100: percentage of key ESG fields present (Option A). */
  coverageScore?: number | null;
  /** Rank by coverage score (1 = highest coverage). */
  coverageRank?: number | null;
  /** Percentile of coverage score (0–100, 100 = top). */
  coveragePercentile?: number | null;
}

/** Optional normalized metrics (populated by build script). */
export interface SustainabilityCompanyNormalized {
  emissionsNormalized?: {
    scope1TCO2e: number | null;
    scope2TCO2e: number | null;
    scope3TCO2e: number | null;
  };
  energyNormalized?: { totalKwh: number | null };
  waterNormalized?: {
    withdrawalM3: number | null;
    consumptionM3: number | null;
    recycledM3: number | null;
  };
  wasteNormalized?: {
    generatedTonnes: number | null;
    recycledTonnes: number | null;
    disposedTonnes: number | null;
  };
}

// ============================================================================
// MAIN COMPANY TYPE
// ============================================================================

export interface SustainabilityCompany {
  id: string;
  name: string;
  reportName: string | null;
  reportYear: Year;

  /** Industry sector (sector_ssic from CSV). */
  industry?: string;
  /** Ticker symbol (e.g. "5EN.SI"). */
  tickerSymbol?: string | null;
  /** Number of employees. */
  companySize?: number | null;
  /** Annual revenue in millions (local currency). */
  annualRevenue?: number | null;
  /** Revenue currency code (e.g. "SGD"). */
  revenueCurrency?: string | null;
  /** Market cap in millions. */
  marketCap?: number | null;

  // Location (derived from company name patterns or default)
  country: string;
  city: string;
  lat: number;
  lng: number;

  emissions: EmissionsData;
  waste: WasteData;
  water: WaterData;
  energy: EnergyData;
  fuel: FuelData;
  gfa: GfaData;
  targets: TargetsData;
  strategy: StrategyData;
  meta: ExtractionMeta;

  /** Canonical normalized values (from build script). */
  normalized?: NormalizedMetrics;

  // Pre-computed derived metrics
  derived: DerivedMetrics;
}

// ============================================================================
// LOCATION TYPE (for map grouping)
// ============================================================================

export interface Location {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  companies: SustainabilityCompany[];
}

// ============================================================================
// FILTER AND KPI INTERFACES
// ============================================================================

export interface FilterOptions {
  search: string;
  countries: string[];
  /** When true, only companies with fewer than 6 of 12 overview fields filled. */
  incompleteOnly: boolean;
  /** Industries to include (empty = all industries). */
  industries: string[];
  /** Report year slice (CSV cohort). */
  reportYear: Year;
}

export interface KpiData {
  totalCompanies: number;
  /** Companies meeting the 6/12 data completeness threshold. */
  reportingComplete: number;
  totalScope12: number | null;
  avgWasteDiversion: number | null;
  avgDataQuality: number | null;
}

// ============================================================================
// UTILITY FUNCTIONS - Unit Normalization
// ============================================================================

/**
 * Normalize emissions value to tCO2e
 * Handles: tCO2e, kgCO2e, MtCO2e, etc.
 */
export function normalizeToTCO2e(
  value: number | null,
  unit: string | null,
): number | null {
  if (value === null) return null;
  if (unit === null) return value; // Assume tCO2e if no unit

  const unitLower = unit.toLowerCase().trim();

  // kg to tonnes
  if (unitLower.includes("kg")) {
    return value / 1000;
  }

  // Mt (megatonnes) to tonnes
  if (unitLower.startsWith("mt") || unitLower.includes("megaton")) {
    return value * 1000000;
  }

  // kt (kilotonnes) to tonnes
  if (unitLower.startsWith("kt") || unitLower.includes("kiloton")) {
    return value * 1000;
  }

  // Already in tonnes or tCO2e
  return value;
}

// ============================================================================
// UTILITY FUNCTIONS - Derived Metrics
// ============================================================================

/**
 * Calculate Scope 1+2 total in tCO2e
 */
export function calcScope12(company: SustainabilityCompany): number | null {
  const scope1 = normalizeToTCO2e(
    company.emissions.scope1.value,
    company.emissions.scope1.unit,
  );
  const scope2 = normalizeToTCO2e(
    company.emissions.scope2.value,
    company.emissions.scope2.unit,
  );

  if (scope1 === null && scope2 === null) return null;
  return (scope1 ?? 0) + (scope2 ?? 0);
}

/**
 * Calculate waste diversion rate (0-1)
 * recycled / generated
 */
export function calcWasteDiversion(
  company: SustainabilityCompany,
): number | null {
  const generated = company.waste.generated.value;
  const recycled = company.waste.recycled.value;

  if (generated === null || recycled === null || generated === 0) {
    return null;
  }

  // Ensure rate is between 0 and 1
  const rate = recycled / generated;
  return Math.min(1, Math.max(0, rate));
}

/** Labels for the 12 overview completeness fields (order matches scoring). */
export const COMPLETENESS_FIELD_LABELS = [
  "Scope 1",
  "Scope 2",
  "Scope 3",
  "Scope 1+2 total",
  "Waste generated",
  "Waste recycled",
  "Waste disposed",
  "Diversion rate",
  "Water withdrawal",
  "Water consumption",
  "Total energy",
  "Fuel consumption",
] as const;

export interface CompletenessFieldRow {
  label: (typeof COMPLETENESS_FIELD_LABELS)[number];
  filled: boolean;
}

function getCompletenessFlags(company: SustainabilityCompany): {
  hasScope1: boolean;
  hasScope2: boolean;
  hasScope3: boolean;
  hasScope12: boolean;
  hasWasteGenerated: boolean;
  hasWasteRecycled: boolean;
  hasWasteDisposed: boolean;
  hasDiversion: boolean;
  hasWaterWithdrawal: boolean;
  hasWaterConsumption: boolean;
  hasEnergy: boolean;
  hasFuel: boolean;
} {
  return {
    hasScope1: company.emissions.scope1.value !== null,
    hasScope2: company.emissions.scope2.value !== null,
    hasScope3: company.emissions.scope3.value !== null,
    hasScope12: company.derived.scope12Total !== null,
    hasWasteGenerated: company.waste.generated.value !== null,
    hasWasteRecycled: company.waste.recycled.value !== null,
    hasWasteDisposed: company.waste.disposed.value !== null,
    hasDiversion: company.derived.wasteDiversionRate !== null,
    hasWaterWithdrawal:
      company.water.withdrawal.value !== null ||
      company.normalized?.waterWithdrawalM3 != null,
    hasWaterConsumption:
      company.water.consumption.value !== null ||
      company.normalized?.waterConsumptionM3 != null,
    hasEnergy:
      company.energy.total.value !== null ||
      company.normalized?.totalEnergyKwh != null,
    hasFuel: company.fuel.consumption.value !== null,
  };
}

/** Per-field rows for UI (same rules as {@link calcCompleteness}). */
export function getCompletenessFieldRows(
  company: SustainabilityCompany,
): CompletenessFieldRow[] {
  const f = getCompletenessFlags(company);
  const filled = [
    f.hasScope1,
    f.hasScope2,
    f.hasScope3,
    f.hasScope12,
    f.hasWasteGenerated,
    f.hasWasteRecycled,
    f.hasWasteDisposed,
    f.hasDiversion,
    f.hasWaterWithdrawal,
    f.hasWaterConsumption,
    f.hasEnergy,
    f.hasFuel,
  ];
  return COMPLETENESS_FIELD_LABELS.map((label, i) => ({
    label,
    filled: filled[i] ?? false,
  }));
}

/** Badge styles: green when at least {@link COMPLETENESS_GREEN_MIN} of 12 fields are filled. */
export function getCompletenessBadgeClass(meetsGreenThreshold: boolean): string {
  return meetsGreenThreshold
    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
    : "bg-red-100 text-red-700 border-red-300";
}

/**
 * Calculate completeness metrics (4-field legacy score + 12-field overview score).
 */
export function calcCompleteness(company: SustainabilityCompany): Completeness {
  const f = getCompletenessFlags(company);
  const hasScope1 = f.hasScope1;
  const hasScope2 = f.hasScope2;
  const hasWasteGenerated = f.hasWasteGenerated;
  const hasWasteRecycled = f.hasWasteRecycled;

  const score = [
    hasScope1,
    hasScope2,
    hasWasteGenerated,
    hasWasteRecycled,
  ].filter(Boolean).length;

  const score12 = [
    f.hasScope1,
    f.hasScope2,
    f.hasScope3,
    f.hasScope12,
    f.hasWasteGenerated,
    f.hasWasteRecycled,
    f.hasWasteDisposed,
    f.hasDiversion,
    f.hasWaterWithdrawal,
    f.hasWaterConsumption,
    f.hasEnergy,
    f.hasFuel,
  ].filter(Boolean).length;

  const meetsGreenThreshold = score12 >= COMPLETENESS_GREEN_MIN;

  return {
    hasScope1,
    hasScope2,
    hasWasteGenerated,
    hasWasteRecycled,
    score,
    score12,
    meetsGreenThreshold,
  };
}

/**
 * Calculate trust metrics
 */
export function calcTrust(company: SustainabilityCompany): TrustMetrics {
  const groupsFailed = company.meta.groupsFailed;
  const extractionOk = groupsFailed === null || groupsFailed === 0;

  return {
    extractionOk,
    dataQualityScore: company.meta.dataQualityScore,
    verifiedByHuman: company.meta.verifiedByHuman,
  };
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a decimal as percentage string (e.g., 0.45 -> "45.0%")
 */
export function fmtPct(value: number | null): string {
  if (value === null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a number with thousands separators
 */
export function fmtNumber(value: number | null): string {
  if (value === null) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Format emissions in tCO2e with appropriate scale
 */
export function fmtTCO2e(value: number | null): string {
  if (value === null) return "N/A";

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M tCO2e`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K tCO2e`;
  }
  return `${value.toFixed(0)} tCO2e`;
}

/**
 * Format emissions value only (no unit)
 */
export function fmtEmissionsValue(value: number | null): string {
  if (value === null) return "N/A";

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Format quantity with unit (raw display)
 */
export function fmtQuantity(qty: QuantityRaw): string {
  if (qty.value === null) return "N/A";
  const formatted = fmtNumber(qty.value);
  return qty.unit ? `${formatted} ${qty.unit}` : formatted;
}

/** Display mode for metrics: canonical (tCO2e, kWh, m³, tonnes) or raw extracted. */
export type UnitView = "Canonical" | "Raw";

/** Format energy for display: canonical kWh or raw quantity */
export function fmtEnergy(
  company: SustainabilityCompany,
  unitView: UnitView,
): string {
  if (unitView === "Raw") return fmtQuantity(company.energy.total);
  const kwh = company.normalized?.totalEnergyKwh ?? null;
  if (kwh === null) return fmtQuantity(company.energy.total);
  if (kwh >= 1e9) return `${(kwh / 1e9).toFixed(2)}B kWh`;
  if (kwh >= 1e6) return `${(kwh / 1e6).toFixed(2)}M kWh`;
  if (kwh >= 1e3) return `${(kwh / 1e3).toFixed(2)}K kWh`;
  return `${kwh.toFixed(0)} kWh`;
}

/** Format water for display: canonical m³ or raw */
export function fmtWater(
  qty: QuantityRaw,
  canonicalM3: number | null | undefined,
  unitView: UnitView,
): string {
  if (unitView === "Raw") return fmtQuantity(qty);
  if (canonicalM3 === null || canonicalM3 === undefined)
    return fmtQuantity(qty);
  return `${fmtNumber(canonicalM3)} m³`;
}

/** Format waste for display: canonical tonnes or raw */
export function fmtWaste(
  qty: QuantityRaw,
  canonicalTonnes: number | null | undefined,
  unitView: UnitView,
): string {
  if (unitView === "Raw") return fmtQuantity(qty);
  if (canonicalTonnes === null || canonicalTonnes === undefined)
    return fmtQuantity(qty);
  return `${fmtNumber(canonicalTonnes)} tonnes`;
}

// ============================================================================
// KPI CALCULATION
// ============================================================================

/**
 * Calculate KPIs from a list of companies
 */
export function calculateKpis(companies: SustainabilityCompany[]): KpiData {
  const totalCompanies = companies.length;

  const reportingComplete = companies.filter(
    (c) => c.derived.completeness.meetsGreenThreshold,
  ).length;

  // Total Scope 1+2 (use canonical; derived.scope12Total is already tCO2e)
  const scope12Values = companies
    .map((c) => c.derived.scope12Total)
    .filter((v): v is number => v !== null);
  const totalScope12 =
    scope12Values.length > 0
      ? scope12Values.reduce((sum, v) => sum + v, 0)
      : null;

  // Avg Waste Diversion (canonical; exclude non-convertible)
  const diversionValues = companies
    .map((c) => c.derived.wasteDiversionRate)
    .filter((v): v is number => v !== null);
  const avgWasteDiversion =
    diversionValues.length > 0
      ? diversionValues.reduce((sum, v) => sum + v, 0) / diversionValues.length
      : null;

  // Avg Data Quality Score
  const qualityValues = companies
    .map((c) => c.derived.trust.dataQualityScore)
    .filter((v): v is number => v !== null);
  const avgDataQuality =
    qualityValues.length > 0
      ? qualityValues.reduce((sum, v) => sum + v, 0) / qualityValues.length
      : null;

  return {
    totalCompanies,
    reportingComplete,
    totalScope12,
    avgWasteDiversion,
    avgDataQuality,
  };
}

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Filter companies based on filter options
 */
export function filterCompanies(
  companies: SustainabilityCompany[],
  options: FilterOptions,
): SustainabilityCompany[] {
  return companies.filter((company) => {
    if (company.reportYear !== options.reportYear) {
      return false;
    }

    // Search filter (name, country, city)
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      const matchesSearch =
        company.name.toLowerCase().includes(searchLower) ||
        company.country.toLowerCase().includes(searchLower) ||
        company.city.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Country filter
    if (
      options.countries.length > 0 &&
      !options.countries.includes(company.country)
    ) {
      return false;
    }

    // Industry filter
    if (options.industries.length > 0) {
      const industry = company.industry?.trim();
      if (!industry || !options.industries.includes(industry)) {
        return false;
      }
    }

    // Incomplete only: fewer than 6 of 12 overview fields
    if (
      options.incompleteOnly &&
      company.derived.completeness.meetsGreenThreshold
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Get unique countries from companies
 */
export function getCountries(companies: SustainabilityCompany[]): string[] {
  return [...new Set(companies.map((c) => c.country))].sort();
}

/**
 * Get unique industries from companies (non-empty, sorted)
 */
export function getIndustries(companies: SustainabilityCompany[]): string[] {
  const industries = new Set<string>();
  for (const company of companies) {
    const industry = company.industry?.trim();
    if (industry) {
      industries.add(industry);
    }
  }
  return [...industries].sort();
}

/**
 * Unique report years present in the dataset, ascending.
 */
const VALID_REPORT_YEARS: readonly Year[] = [2021, 2022, 2023, 2024];

export function getAvailableReportYears(
  companies: SustainabilityCompany[],
): Year[] {
  const years = new Set<Year>();
  for (const c of companies) {
    if (VALID_REPORT_YEARS.includes(c.reportYear)) {
      years.add(c.reportYear);
    }
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * Prefer 2024 when present; otherwise the latest year in the dataset.
 */
export function getDefaultReportYear(companies: SustainabilityCompany[]): Year {
  const available = getAvailableReportYears(companies);
  if (available.length === 0) {
    return 2024;
  }
  if (available.includes(2024)) {
    return 2024;
  }
  return available[available.length - 1];
}

// ============================================================================
// LOCATION HELPERS
// ============================================================================

/**
 * Create one Location per company so each gets its own map marker.
 */
export function getLocations(companies: SustainabilityCompany[]): Location[] {
  return companies.map((company) => ({
    id: company.id,
    city: company.city,
    country: company.country,
    lat: company.lat,
    lng: company.lng,
    companies: [company],
  }));
}

// ============================================================================
// DISTRICT SUMMARIES (for bubble-map view)
// ============================================================================

export interface DistrictSummary {
  district: string;
  country: string;
  lat: number;
  lng: number;
  companies: SustainabilityCompany[];
  count: number;
  avgCoverageScore: number;
  /** Companies with 6+ of 12 overview fields filled. */
  completenessStrong: number;
  /** Companies below 6/12. */
  completenessWeak: number;
}

export function getDistrictSummaries(
  companies: SustainabilityCompany[],
): DistrictSummary[] {
  const byDistrict = new Map<string, SustainabilityCompany[]>();
  for (const c of companies) {
    const key = `${c.city}|${c.country}`;
    const list = byDistrict.get(key) ?? [];
    list.push(c);
    byDistrict.set(key, list);
  }

  const summaries: DistrictSummary[] = [];
  for (const [key, group] of byDistrict) {
    const [district, country] = key.split("|");
    const avgLat = group.reduce((s, c) => s + c.lat, 0) / group.length;
    const avgLng = group.reduce((s, c) => s + c.lng, 0) / group.length;
    const avgCov =
      group.reduce((s, c) => s + (c.derived.coverageScore ?? 0), 0) /
      group.length;
    let completenessStrong = 0;
    let completenessWeak = 0;
    for (const c of group) {
      if (c.derived.completeness.meetsGreenThreshold) completenessStrong += 1;
      else completenessWeak += 1;
    }
    summaries.push({
      district,
      country,
      lat: avgLat,
      lng: avgLng,
      companies: group,
      count: group.length,
      avgCoverageScore: Math.round(avgCov),
      completenessStrong,
      completenessWeak,
    });
  }
  return summaries.sort((a, b) => b.count - a.count);
}

// ============================================================================
// PEER STRATEGY EXAMPLES (examples only, not advice)
// ============================================================================

export interface PeerStrategyExample {
  company: SustainabilityCompany;
  snippet: string;
  targetsSummary: string | null;
}

/**
 * Parse targets_json to a short summary string (target_year, baseline_year, target_reduction).
 */
export function parseTargetsSummary(targetsJson: string | null): string | null {
  if (!targetsJson || targetsJson === "[]" || targetsJson.trim() === "")
    return null;
  try {
    const arr = JSON.parse(targetsJson) as unknown[];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const parts: string[] = [];
    for (const item of arr.slice(0, 3)) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        const reduction = o.target_reduction ?? o.target_reduction_scope;
        const year = o.target_year ?? o.baseline_year;
        if (reduction != null || year != null) {
          parts.push(
            [String(reduction ?? ""), year != null ? String(year) : ""]
              .filter(Boolean)
              .join(" "),
          );
        }
      }
    }
    return parts.length > 0 ? parts.join("; ") : null;
  } catch {
    return null;
  }
}

/**
 * Get peer companies with strategy examples (same industry, non-empty strategy_summary).
 * Rank by similarity (scope12 band, diversion band, completeness score12).
 * Returns top 3–5 peers.
 */
export function getPeerStrategyExamples(
  selected: SustainabilityCompany,
  allCompanies: SustainabilityCompany[],
  maxPeers = 5,
): PeerStrategyExample[] {
  const industry = selected.industry ?? "General";
  const scope12 = selected.derived.scope12Total;
  const diversion = selected.derived.wasteDiversionRate;
  const score12 = selected.derived.completeness.score12;

  const scope12Band =
    scope12 === null
      ? "none"
      : scope12 < 1000
        ? "low"
        : scope12 < 100000
          ? "med"
          : "high";
  const diversionBand =
    diversion === null
      ? "none"
      : diversion < 0.2
        ? "low"
        : diversion < 0.5
          ? "med"
          : "high";

  const candidates = allCompanies.filter(
    (c) =>
      c.id !== selected.id &&
      (c.industry ?? "General") === industry &&
      (c.strategy.summary ?? "").trim().length > 0,
  );

  const withScore = candidates.map((c) => {
    const s12 = c.derived.scope12Total;
    const div = c.derived.wasteDiversionRate;
    const s12B =
      s12 === null
        ? "none"
        : s12 < 1000
          ? "low"
          : s12 < 100000
            ? "med"
            : "high";
    const divB =
      div === null ? "none" : div < 0.2 ? "low" : div < 0.5 ? "med" : "high";
    let similarity = 0;
    if (c.derived.completeness.meetsGreenThreshold) similarity += 3;
    if (s12B === scope12Band) similarity += 2;
    if (divB === diversionBand) similarity += 2;
    if (c.derived.completeness.score12 === score12) similarity += 1;
    return { company: c, similarity };
  });

  withScore.sort((a, b) => b.similarity - a.similarity);
  const top = withScore.slice(0, maxPeers);

  return top.map(({ company }) => {
    const summary = company.strategy.summary ?? "";
    const snippet =
      summary.length > 200 ? summary.slice(0, 200).trim() + "…" : summary;
    const targetsSummary = parseTargetsSummary(company.targets.json);
    return { company, snippet, targetsSummary };
  });
}

// ============================================================================
// RE-EXPORT GENERATED DATA
// ============================================================================

// This will be populated by the build script
export { SUSTAINABILITY_COMPANIES } from "./sustainability.generated";
