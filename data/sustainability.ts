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

/** Data plausibility band: Good = consistent & comparable; Watch = unusual vs peers; Review = incomplete or suspicious */
export type PlausibilityBand = "Good" | "Watch" | "Review";

/** @deprecated Use PlausibilityBand. Kept for type compatibility. */
export type RiskBand = PlausibilityBand;

export interface Completeness {
  hasScope1: boolean;
  hasScope2: boolean;
  hasWasteGenerated: boolean;
  hasWasteRecycled: boolean;
  score: number; // 0-4 count of fields present
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
  /** Data plausibility (industry-relative + consistency checks). */
  plausibilityBand?: PlausibilityBand;
  /** Human-readable reasons when Watch or Review. */
  plausibilityReasons?: string[];
  /** @deprecated Use plausibilityBand. Present in older generated data. */
  riskBand?: PlausibilityBand;
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

  /** Industry for peer comparison (e.g. "General"). Default from build script. */
  industry?: string;

  // Location (derived from company name patterns or default)
  country: string;
  city: string;
  lat: number;
  lng: number;

  // 2023 Data from CSV
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
  /** Data plausibility bands to include (Good / Watch / Review). */
  plausibilityBands: PlausibilityBand[];
  incompleteOnly: boolean;
  /** Industries to include (empty = all industries). */
  industries: string[];
}

export interface KpiData {
  totalCompanies: number;
  reportingComplete: number; // Companies with completeness.score === 4
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

/**
 * Calculate completeness metrics
 */
export function calcCompleteness(company: SustainabilityCompany): Completeness {
  const hasScope1 = company.emissions.scope1.value !== null;
  const hasScope2 = company.emissions.scope2.value !== null;
  const hasWasteGenerated = company.waste.generated.value !== null;
  const hasWasteRecycled = company.waste.recycled.value !== null;

  const score = [
    hasScope1,
    hasScope2,
    hasWasteGenerated,
    hasWasteRecycled,
  ].filter(Boolean).length;

  return {
    hasScope1,
    hasScope2,
    hasWasteGenerated,
    hasWasteRecycled,
    score,
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

/**
 * @deprecated Use plausibilityBand from build output. Fallback when plausibility not precomputed.
 */
export function calcRiskBand(company: SustainabilityCompany): PlausibilityBand {
  const completeness = calcCompleteness(company);
  const trust = calcTrust(company);
  const diversion = calcWasteDiversion(company);

  if (completeness.score < 4) return "Review";
  if (trust.dataQualityScore !== null && trust.dataQualityScore < 50)
    return "Review";
  if (!trust.extractionOk) return "Review";
  if (diversion !== null && diversion < 0.3) return "Watch";
  return "Good";
}

/** All data plausibility bands for filters. */
export function getPlausibilityBands(): PlausibilityBand[] {
  return ["Good", "Watch", "Review"];
}

/** @deprecated Alias for getPlausibilityBands */
export function getRiskBands(): PlausibilityBand[] {
  return getPlausibilityBands();
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

  // Reporting complete (all 4 MVP fields present)
  const reportingComplete = companies.filter(
    (c) => c.derived.completeness.score === 4,
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

    // Plausibility band filter (support both new and legacy field names)
    const band = company.derived.plausibilityBand ?? company.derived.riskBand;
    if (
      options.plausibilityBands.length > 0 &&
      (band === undefined || !options.plausibilityBands.includes(band))
    ) {
      return false;
    }

    // Incomplete only filter
    if (options.incompleteOnly && company.derived.completeness.score === 4) {
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
export function getIndustries(
  companies: SustainabilityCompany[],
): string[] {
  const industries = new Set<string>();
  for (const company of companies) {
    const industry = company.industry?.trim();
    if (industry) {
      industries.add(industry);
    }
  }
  return [...industries].sort();
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
 * Prefer Good plausibility; rank by similarity (scope12 band, diversion band, completeness).
 * Returns top 3–5 peers.
 */
export function getPeerStrategyExamples(
  selected: SustainabilityCompany,
  allCompanies: SustainabilityCompany[],
  maxPeers = 5,
): PeerStrategyExample[] {
  const industry = selected.industry ?? "General";
  const band = selected.derived.plausibilityBand ?? selected.derived.riskBand;
  const scope12 = selected.derived.scope12Total;
  const diversion = selected.derived.wasteDiversionRate;
  const score = selected.derived.completeness.score;

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
    const pBand = c.derived.plausibilityBand ?? c.derived.riskBand;
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
    if (pBand === "Good") similarity += 3;
    else if (pBand === "Watch") similarity += 1;
    if (s12B === scope12Band) similarity += 2;
    if (divB === diversionBand) similarity += 2;
    if (c.derived.completeness.score === 4) similarity += 1;
    if (c.derived.completeness.score === score) similarity += 1;
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
