// ============================================================================
// SUSTAINABILITY MONITORING DATA MODEL (Real Dataset)
// ============================================================================

export type Year = 2023; // Single year only (no time-series data available)

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

export type RiskBand = "Good" | "Watch" | "Review";

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

export interface DerivedMetrics {
  scope12Total: number | null; // scope1 + scope2 (normalized to tCO2e)
  wasteDiversionRate: number | null; // recycled / generated (0-1)
  completeness: Completeness;
  trust: TrustMetrics;
  riskBand: RiskBand;
}

// ============================================================================
// MAIN COMPANY TYPE
// ============================================================================

export interface SustainabilityCompany {
  id: string;
  name: string;
  reportName: string | null;
  reportYear: Year;

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
  riskBands: RiskBand[];
  incompleteOnly: boolean;
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
 * Calculate risk band based on MVP rules:
 * - Review: incomplete (score < 4) OR dataQualityScore < 50 OR groupsFailed > 0
 * - Watch: wasteDiversion < 0.30
 * - Good: otherwise
 */
export function calcRiskBand(company: SustainabilityCompany): RiskBand {
  const completeness = calcCompleteness(company);
  const trust = calcTrust(company);
  const diversion = calcWasteDiversion(company);

  // Review conditions
  if (completeness.score < 4) return "Review";
  if (trust.dataQualityScore !== null && trust.dataQualityScore < 50) {
    return "Review";
  }
  if (!trust.extractionOk) return "Review";

  // Watch conditions
  if (diversion !== null && diversion < 0.3) return "Watch";

  return "Good";
}

/**
 * Get all risk bands
 */
export function getRiskBands(): RiskBand[] {
  return ["Good", "Watch", "Review"];
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
 * Format quantity with unit
 */
export function fmtQuantity(qty: QuantityRaw): string {
  if (qty.value === null) return "N/A";
  const formatted = fmtNumber(qty.value);
  return qty.unit ? `${formatted} ${qty.unit}` : formatted;
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

  // Total Scope 1+2
  const scope12Values = companies
    .map((c) => c.derived.scope12Total)
    .filter((v): v is number => v !== null);
  const totalScope12 =
    scope12Values.length > 0
      ? scope12Values.reduce((sum, v) => sum + v, 0)
      : null;

  // Avg Waste Diversion
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

    // Risk band filter
    if (
      options.riskBands.length > 0 &&
      !options.riskBands.includes(company.derived.riskBand)
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

// ============================================================================
// LOCATION HELPERS
// ============================================================================

/**
 * Group companies by location (city + country)
 */
export function getLocations(companies: SustainabilityCompany[]): Location[] {
  const locationMap = new Map<string, Location>();

  companies.forEach((company) => {
    const key = `${company.city}-${company.country}`;
    if (!locationMap.has(key)) {
      locationMap.set(key, {
        id: key,
        city: company.city,
        country: company.country,
        lat: company.lat,
        lng: company.lng,
        companies: [],
      });
    }
    locationMap.get(key)!.companies.push(company);
  });

  return Array.from(locationMap.values());
}

// ============================================================================
// RE-EXPORT GENERATED DATA
// ============================================================================

// This will be populated by the build script
export { SUSTAINABILITY_COMPANIES } from "./sustainability.generated";
