#!/usr/bin/env npx tsx
/**
 * Build script to parse master_metrics_1.csv and generate sustainability.generated.ts
 * - Canonical unit normalization (emissions, energy kWh, water m³, waste tonnes)
 * - Data plausibility (industry-based percentiles + consistency checks) with reasons
 *
 * Run with: npx tsx scripts/build-sustainability-data.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  normalizeEmissions,
  normalizeEnergyToKwh,
  normalizeWaterToM3,
  normalizeWasteToTonnes,
} from "../lib/units";
import type { Year } from "../data/sustainability";

// ============================================================================
// CSV PARSING
// ============================================================================

interface CsvRow {
  [key: string]: string;
}

/**
 * Parse CSV content handling quoted fields with embedded commas AND newlines
 */
function parseCsv(content: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let headers: string[] = [];

  // State machine to handle multiline quoted fields
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let isFirstRow = true;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ""
        currentField += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      // End of row (skip \r in \r\n)
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      // Finalize current field and row
      currentRow.push(currentField);
      currentField = "";

      if (isFirstRow) {
        headers = currentRow;
        isFirstRow = false;
      } else if (currentRow.length === headers.length) {
        const row: CsvRow = {};
        headers.forEach((header, idx) => {
          row[header] = currentRow[idx];
        });
        rows.push(row);
      } else if (currentRow.length > 1 || currentRow[0].trim() !== "") {
        // Skip empty rows but warn about mismatched rows
        console.warn(
          `Row has ${currentRow.length} values but expected ${headers.length}, skipping`,
        );
      }

      currentRow = [];
    } else {
      // Regular character
      currentField += char;
    }
  }

  // Handle last row if no trailing newline
  if (currentRow.length > 0 || currentField.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length === headers.length) {
      const row: CsvRow = {};
      headers.forEach((header, idx) => {
        row[header] = currentRow[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Parse a numeric value from string, handling N/A
 */
function parseNumber(value: string | undefined): number | null {
  if (!value || value === "N/A" || value.trim() === "") return null;
  // Remove commas and parse
  const cleaned = value.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse a boolean value from string
 */
function parseBoolean(value: string | undefined): boolean | null {
  if (!value || value === "N/A" || value.trim() === "") return null;
  const lower = value.toLowerCase().trim();
  if (lower === "true" || lower === "1" || lower === "yes") return true;
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return null;
}

/**
 * Parse a string value, returning null for N/A or empty
 */
function parseString(value: string | undefined): string | null {
  if (!value || value === "N/A" || value.trim() === "") return null;
  return value.trim();
}

/**
 * Get first defined row value from CSV row (tries multiple column names for 2024SG_Merged vs legacy).
 */
function getRow(row: CsvRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

/** Key ESG fields for coverage score (Option A): 11 dimensions. */
const COVERAGE_KEY_FIELDS = [
  "scope_1_value",
  "scope_2_value",
  "scope_3_value",
  "water_withdrawal_value",
  "water_consumption_value",
  "energy_total_stated_value", // 2024SG_Merged; legacy uses total_energy_value
  "waste_generated_value",
  "waste_recycled_value",
  "gfa_value",
  "targets_json",
  "strategy_summary",
] as const;

/**
 * Compute coverage count (0–11) and score (0–100) from a CSV row.
 */
function computeCoverageFromRow(row: CsvRow): { count: number; score: number } {
  let count = 0;
  for (const key of COVERAGE_KEY_FIELDS) {
    const raw =
      key === "energy_total_stated_value"
        ? getRow(row, "energy_total_stated_value", "total_energy_value")
        : getRow(row, key);
    if (raw === undefined) continue;
    if (key === "targets_json" || key === "strategy_summary") {
      const s = parseString(raw);
      if (s && s !== "[]" && s.length > 2) count += 1;
    } else {
      if (parseNumber(raw) !== null) count += 1;
    }
  }
  const score =
    COVERAGE_KEY_FIELDS.length > 0
      ? Math.round((count / COVERAGE_KEY_FIELDS.length) * 100)
      : 0;
  return { count, score };
}

// ============================================================================
// COUNTRY COORDINATES
// ============================================================================

interface Coords {
  lat: number;
  lng: number;
}

interface LocationInfo {
  coords: Coords;
  district: string;
}

const SINGAPORE_DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Marina Bay", lat: 1.2812, lng: 103.8587 },
  { name: "Raffles Place", lat: 1.2839, lng: 103.8515 },
  { name: "Tanjong Pagar", lat: 1.275, lng: 103.8428 },
  { name: "Shenton Way", lat: 1.2764, lng: 103.8468 },
  { name: "Bugis", lat: 1.3005, lng: 103.8555 },
  { name: "Orchard", lat: 1.3048, lng: 103.8318 },
  { name: "Novena", lat: 1.3204, lng: 103.8438 },
  { name: "Bishan", lat: 1.3504, lng: 103.848 },
  { name: "Ang Mo Kio", lat: 1.3691, lng: 103.8454 },
  { name: "Woodlands", lat: 1.4382, lng: 103.7891 },
  { name: "Jurong East", lat: 1.3334, lng: 103.7427 },
  { name: "Jurong West", lat: 1.34, lng: 103.709 },
  { name: "Tuas", lat: 1.32, lng: 103.64 },
  { name: "Clementi", lat: 1.3152, lng: 103.765 },
  { name: "Buona Vista", lat: 1.3067, lng: 103.79 },
  { name: "Queenstown", lat: 1.2947, lng: 103.7994 },
  { name: "Changi", lat: 1.3644, lng: 103.9915 },
  { name: "Tampines", lat: 1.353, lng: 103.9447 },
  { name: "Pasir Ris", lat: 1.3735, lng: 103.9499 },
  { name: "Bedok", lat: 1.324, lng: 103.9272 },
  { name: "Sengkang", lat: 1.3922, lng: 103.8953 },
  { name: "Punggol", lat: 1.4033, lng: 103.9022 },
  { name: "Hougang", lat: 1.3612, lng: 103.8862 },
  { name: "Serangoon", lat: 1.3497, lng: 103.8715 },
  { name: "Paya Lebar", lat: 1.318, lng: 103.893 },
];

const MALAYSIA_DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
  { name: "Petaling Jaya", lat: 3.1073, lng: 101.6067 },
  { name: "Shah Alam", lat: 3.0738, lng: 101.5183 },
  { name: "Subang Jaya", lat: 3.043, lng: 101.5805 },
  { name: "Johor Bahru", lat: 1.4927, lng: 103.7414 },
  { name: "Penang Island", lat: 5.4164, lng: 100.3327 },
  { name: "Ipoh", lat: 4.5975, lng: 101.0901 },
  { name: "Kuching", lat: 1.5533, lng: 110.3593 },
  { name: "Kota Kinabalu", lat: 5.9804, lng: 116.0735 },
];

const INDONESIA_DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { name: "Surabaya", lat: -7.2575, lng: 112.7521 },
  { name: "Bandung", lat: -6.9175, lng: 107.6191 },
  { name: "Medan", lat: 3.5952, lng: 98.6722 },
  { name: "Semarang", lat: -6.9667, lng: 110.4167 },
  { name: "Makassar", lat: -5.1477, lng: 119.4327 },
  { name: "Balikpapan", lat: -1.2379, lng: 116.8523 },
  { name: "Denpasar", lat: -8.65, lng: 115.2167 },
  { name: "Palembang", lat: -2.9909, lng: 104.7566 },
];

function getCountryDistricts(
  country: string,
): { name: string; lat: number; lng: number }[] {
  const upper = country.toUpperCase();
  if (upper === "MALAYSIA") return MALAYSIA_DISTRICTS;
  if (upper === "INDONESIA") return INDONESIA_DISTRICTS;
  return SINGAPORE_DISTRICTS;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getCoordinates(companyName: string, country: string): LocationInfo {
  const seed = hashString(`${companyName}|${country}`);
  const districts = getCountryDistricts(country);
  const districtIndex = seed % districts.length;
  const district = districts[districtIndex];

  const jitterLat = (seededRandom(seed) - 0.5) * 0.008;
  const jitterLng = (seededRandom(seed + 1) - 0.5) * 0.008;

  return {
    coords: {
      lat: district.lat + jitterLat,
      lng: district.lng + jitterLng,
    },
    district: district.name,
  };
}

// ============================================================================
// COMPANY NAME FORMATTING
// ============================================================================

/**
 * Format company name from extraction ID to readable name
 */
function formatCompanyName(rawName: string): string {
  // Replace underscores with spaces
  let name = rawName.replace(/_/g, " ");
  // Title case
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  // Fix common abbreviations
  name = name
    .replace(/\bLtd\b/gi, "Ltd")
    .replace(/\bPte\b/gi, "Pte")
    .replace(/\bCo\b/gi, "Co")
    .replace(/\bInc\b/gi, "Inc")
    .replace(/\bCorp\b/gi, "Corp");
  return name;
}

// ============================================================================
// DERIVED METRICS CALCULATION
// ============================================================================

interface QuantityRaw {
  value: number | null;
  unit: string | null;
}

function normalizeToTCO2e(
  value: number | null,
  unit: string | null,
): number | null {
  if (value === null) return null;
  if (unit === null) return value;

  const unitLower = unit.toLowerCase().trim();

  if (unitLower.includes("kg")) {
    return value / 1000;
  }
  if (unitLower.startsWith("mt") || unitLower.includes("megaton")) {
    return value * 1000000;
  }
  if (unitLower.startsWith("kt") || unitLower.includes("kiloton")) {
    return value * 1000;
  }

  return value;
}

function calcScope12(scope1: QuantityRaw, scope2: QuantityRaw): number | null {
  const s1 = normalizeToTCO2e(scope1.value, scope1.unit);
  const s2 = normalizeToTCO2e(scope2.value, scope2.unit);

  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
}

function calcWasteDiversion(
  generated: number | null,
  recycled: number | null,
): number | null {
  if (generated === null || recycled === null || generated === 0) {
    return null;
  }
  const rate = recycled / generated;
  return Math.min(1, Math.max(0, rate));
}

interface Completeness {
  hasScope1: boolean;
  hasScope2: boolean;
  hasWasteGenerated: boolean;
  hasWasteRecycled: boolean;
  score: number;
}

function calcCompleteness(
  scope1: number | null,
  scope2: number | null,
  wasteGenerated: number | null,
  wasteRecycled: number | null,
): Completeness {
  const hasScope1 = scope1 !== null;
  const hasScope2 = scope2 !== null;
  const hasWasteGenerated = wasteGenerated !== null;
  const hasWasteRecycled = wasteRecycled !== null;

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

type PlausibilityBand = "Good" | "Watch" | "Review";

const MIN_PEERS_FOR_PERCENTILE = 10;

/** Sorted ascending; return value at percentile (0-100). */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

/** Consistency checks (hard rules). Returns list of reason strings if any. */
function consistencyReasons(
  scope1: number | null,
  scope2: number | null,
  wasteGen: number | null,
  wasteRec: number | null,
  waterWith: number | null,
  waterRec: number | null,
  groupsFailed: number | null,
  completenessScore: number,
  dataQualityScore: number | null,
): string[] {
  const reasons: string[] = [];
  if (wasteGen != null && wasteRec != null && wasteRec > wasteGen) {
    reasons.push("Waste recycled exceeds waste generated");
  }
  if (waterWith != null && waterRec != null && waterRec > waterWith) {
    reasons.push("Water recycled exceeds water withdrawal");
  }
  if (
    (scope1 != null && scope1 < 0) ||
    (scope2 != null && scope2 < 0) ||
    (wasteGen != null && wasteGen < 0) ||
    (wasteRec != null && wasteRec < 0)
  ) {
    reasons.push("Negative value in key metric");
  }
  if (groupsFailed != null && groupsFailed > 0) {
    reasons.push("Extraction had failed groups");
  }
  if (completenessScore < 4) {
    const missing: string[] = [];
    if (scope1 === null) missing.push("Scope 1");
    if (scope2 === null) missing.push("Scope 2");
    if (wasteGen === null) missing.push("Waste generated");
    if (wasteRec === null) missing.push("Waste recycled");
    reasons.push(`Incomplete reporting: missing ${missing.join(", ")}`);
  }
  if (dataQualityScore != null && dataQualityScore < 50) {
    reasons.push("Data quality score below 50");
  }
  return reasons;
}

/** Assign plausibility band and reasons using percentiles (global cohort) and consistency. */
function calcPlausibility(
  company: {
    normalized?: {
      scope1TCO2e: number | null;
      scope2TCO2e: number | null;
      scope3TCO2e: number | null;
      totalEnergyKwh: number | null;
      waterWithdrawalM3: number | null;
      wasteGeneratedTonnes: number | null;
    };
    derived: {
      scope12Total: number | null;
      wasteDiversionRate: number | null;
      completeness: Completeness;
      trust: { extractionOk: boolean; dataQualityScore: number | null };
    };
    meta: { groupsFailed: number | null };
    water: { withdrawal: QuantityRaw; recycled: QuantityRaw };
  },
  stats: {
    scope12P95: number;
    energyP95: number;
    waterP95: number;
    wasteP95: number;
    diversionP10: number;
    cohortSize: number;
  },
): { band: PlausibilityBand; reasons: string[] } {
  const reasons: string[] = [];
  const scope12 = company.derived.scope12Total;
  const scope1 = company.normalized?.scope1TCO2e ?? null;
  const scope2 = company.normalized?.scope2TCO2e ?? null;
  const wasteGen = company.normalized?.wasteGeneratedTonnes ?? null;
  const wasteRec =
    company.normalized?.wasteRecycledTonnes ??
    company.waste?.recycled?.value ??
    null;
  const waterWith =
    company.normalized?.waterWithdrawalM3 ??
    company.water?.withdrawal?.value ??
    null;
  const waterRec =
    company.normalized?.waterRecycledM3 ??
    company.water?.recycled?.value ??
    null;

  const consistency = consistencyReasons(
    scope1,
    scope2,
    wasteGen,
    wasteRec,
    waterWith,
    waterRec,
    company.meta.groupsFailed,
    company.derived.completeness.score,
    company.derived.trust.dataQualityScore ?? null,
  );
  if (consistency.length > 0) {
    return { band: "Review", reasons: consistency };
  }

  // Review: extraction failed or completeness < 4 (already in consistency)
  if (!company.derived.trust.extractionOk) {
    return { band: "Review", reasons: ["Extraction had failed groups"] };
  }
  if (company.derived.completeness.score < 4) {
    return {
      band: "Review",
      reasons: [
        "Incomplete reporting: missing one or more of Scope 1, Scope 2, Waste generated, Waste recycled",
      ],
    };
  }
  if (
    company.derived.trust.dataQualityScore != null &&
    company.derived.trust.dataQualityScore < 50
  ) {
    return { band: "Review", reasons: ["Data quality score below 50"] };
  }

  // Watch: high outlier or low diversion (only when enough peers)
  const n = stats.cohortSize;
  if (n >= MIN_PEERS_FOR_PERCENTILE) {
    if (scope12 !== null && scope12 >= stats.scope12P95) {
      reasons.push("Scope 1+2 emissions at or above 95th percentile in cohort");
    }
    const energy = company.normalized?.totalEnergyKwh;
    if (energy !== null && energy >= stats.energyP95) {
      reasons.push("Total energy at or above 95th percentile in cohort");
    }
    const water = company.normalized?.waterWithdrawalM3;
    if (water !== null && water >= stats.waterP95) {
      reasons.push("Water withdrawal at or above 95th percentile in cohort");
    }
    const waste = company.normalized?.wasteGeneratedTonnes;
    if (waste !== null && waste >= stats.wasteP95) {
      reasons.push("Waste generated at or above 95th percentile in cohort");
    }
    const div = company.derived.wasteDiversionRate;
    if (div !== null && (div <= stats.diversionP10 || div < 0.2)) {
      reasons.push(
        div < 0.2
          ? "Waste diversion rate below 20%"
          : "Waste diversion at or below 10th percentile in cohort",
      );
    }
  } else {
    const div = company.derived.wasteDiversionRate;
    if (div !== null && div < 0.2) {
      reasons.push("Waste diversion rate below 20%");
    }
  }

  if (reasons.length > 0) return { band: "Watch", reasons };
  return { band: "Good", reasons: [] };
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

function buildSustainabilityData(): void {
  console.log("Building sustainability data from singapore_2024_merged_with_coverage_rank.csv...");

  const csvPath = path.join(
    process.cwd(),
    "CSV Data",
    "singapore_2024_merged_with_coverage_rank.csv",
  );
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  console.log(`Read CSV file: ${csvPath}`);
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} rows`);

  const companies: unknown[] = [];
  const country = "Singapore";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Column names: 2024SG_Merged uses company_name_left, company_name_right; legacy used company_name
    const rawName =
      getRow(row, "company_name_right", "company_name") ||
      getRow(row, "company_name_left", "company_name") ||
      `unknown_${i}`;
    const name =
      parseString(getRow(row, "company_name_left", "company_name")) ||
      formatCompanyName(rawName);
    const locationInfo = getCoordinates(rawName, country);

    const reportYearNumber = parseNumber(getRow(row, "report_year"));
    const reportYear: Year =
      (reportYearNumber as Year | null) ?? (2024 as Year);

    const scope1Value = parseNumber(getRow(row, "scope_1_value"));
    const scope1Unit = parseString(getRow(row, "scope_1_unit"));
    const scope2Value = parseNumber(getRow(row, "scope_2_value"));
    const scope2Unit = parseString(getRow(row, "scope_2_unit"));
    const scope3Value = parseNumber(getRow(row, "scope_3_value"));
    const scope3Unit = parseString(getRow(row, "scope_3_unit"));

    const wasteGeneratedValue = parseNumber(
      getRow(row, "waste_generated_value"),
    );
    const wasteGeneratedUnit = parseString(getRow(row, "waste_generated_unit"));
    const wasteDisposedValue = parseNumber(getRow(row, "waste_disposed_value"));
    const wasteDisposedUnit = parseString(getRow(row, "waste_disposed_unit"));
    const wasteRecycledValue = parseNumber(getRow(row, "waste_recycled_value"));
    const wasteRecycledUnit = parseString(getRow(row, "waste_recycled_unit"));

    const groupsFailed = parseNumber(getRow(row, "total_groups_failed"));
    const dataQualityScore = parseNumber(getRow(row, "data_quality_score"));

    const waterWithdrawalValue = parseNumber(
      getRow(row, "water_withdrawal_value"),
    );
    const waterConsumptionValue = parseNumber(
      getRow(row, "water_consumption_value"),
    );
    const totalEnergyValue = parseNumber(
      getRow(row, "energy_total_stated_value", "total_energy_value"),
    );
    const totalEnergyUnit = parseString(
      getRow(row, "energy_total_stated_unit", "total_energy_unit"),
    );
    const gfaValue = parseNumber(getRow(row, "gfa_value"));
    const targetsJson = parseString(getRow(row, "targets_json"));
    const strategySummary = parseString(getRow(row, "strategy_summary"));

    // Coverage: prefer pre-computed from CSV, fallback to local computation
    const csvCoverageScore = parseNumber(getRow(row, "coverage_score"));
    const coverageScore =
      csvCoverageScore !== null
        ? Math.round(csvCoverageScore)
        : computeCoverageFromRow(row).score;
    const csvSectorRank = parseNumber(getRow(row, "sector_rank"));
    const csvSectorPercentile = parseNumber(getRow(row, "sector_percentile"));

    // Calculate derived metrics
    const scope1: QuantityRaw = { value: scope1Value, unit: scope1Unit };
    const scope2: QuantityRaw = { value: scope2Value, unit: scope2Unit };
    const scope12Total = calcScope12(scope1, scope2);
    const wasteDiversionRate = calcWasteDiversion(
      wasteGeneratedValue,
      wasteRecycledValue,
    );
    const completeness = calcCompleteness(
      scope1Value,
      scope2Value,
      wasteGeneratedValue,
      wasteRecycledValue,
    );
    const extractionOk = groupsFailed === null || groupsFailed === 0;

    // Canonical normalization
    const scope1TCO2e = normalizeEmissions(scope1Value, scope1Unit);
    const scope2TCO2e = normalizeEmissions(scope2Value, scope2Unit);
    const scope3TCO2e = normalizeEmissions(scope3Value, scope3Unit);
    const totalEnergyKwh = normalizeEnergyToKwh(
      totalEnergyValue,
      totalEnergyUnit,
    );
    const waterWithdrawalM3 = normalizeWaterToM3(
      waterWithdrawalValue,
      parseString(getRow(row, "water_withdrawal_unit")),
    );
    const waterConsumptionM3 = normalizeWaterToM3(
      waterConsumptionValue,
      parseString(getRow(row, "water_consumption_unit")),
    );
    const waterRecycledM3 = normalizeWaterToM3(
      parseNumber(getRow(row, "water_recycled_value")),
      parseString(getRow(row, "water_recycled_unit")),
    );
    const wasteGeneratedTonnes = normalizeWasteToTonnes(
      wasteGeneratedValue,
      wasteGeneratedUnit,
    );
    const wasteRecycledTonnes = normalizeWasteToTonnes(
      wasteRecycledValue,
      wasteRecycledUnit,
    );
    const wasteDisposedTonnes = normalizeWasteToTonnes(
      wasteDisposedValue,
      wasteDisposedUnit,
    );

    const normalized = {
      scope1TCO2e,
      scope2TCO2e,
      scope3TCO2e,
      totalEnergyKwh,
      waterWithdrawalM3,
      waterConsumptionM3,
      waterRecycledM3,
      wasteGeneratedTonnes,
      wasteRecycledTonnes,
      wasteDisposedTonnes,
    };

    const sectorSsic = parseString(getRow(row, "sector_ssic"));
    const industry = sectorSsic && sectorSsic.trim() ? sectorSsic.trim() : "General";

    const company = {
      id: `company_${i + 1}`,
      name,
      reportName: parseString(getRow(row, "report_name")),
      reportYear,
      industry,
      tickerSymbol: parseString(getRow(row, "ticker_symbol")),
      companySize: parseNumber(getRow(row, "company_size")),
      annualRevenue: parseNumber(getRow(row, "annual_revenue_in_millions")),
      revenueCurrency: parseString(getRow(row, "revenue_currency")),
      marketCap: parseNumber(getRow(row, "market_cap_in_millions")),

      country,
      city: locationInfo.district,
      lat: locationInfo.coords.lat,
      lng: locationInfo.coords.lng,

      emissions: {
        scope1: { value: scope1Value, unit: scope1Unit },
        scope2: { value: scope2Value, unit: scope2Unit },
        scope3: { value: scope3Value, unit: scope3Unit },
        calculation: parseString(getRow(row, "emissions_calculation")),
        notes: parseString(getRow(row, "emissions_notes")),
        status: parseString(getRow(row, "emissions_status")),
      },

      waste: {
        generated: { value: wasteGeneratedValue, unit: wasteGeneratedUnit },
        disposed: { value: wasteDisposedValue, unit: wasteDisposedUnit },
        recycled: { value: wasteRecycledValue, unit: wasteRecycledUnit },
        calculation: parseString(getRow(row, "waste_calculation")),
        notes: parseString(getRow(row, "waste_notes")),
        status: parseString(getRow(row, "waste_status")),
      },

      water: {
        withdrawal: {
          value: waterWithdrawalValue,
          unit: parseString(getRow(row, "water_withdrawal_unit")),
        },
        discharge: {
          value: parseNumber(getRow(row, "water_discharge_value")),
          unit: parseString(getRow(row, "water_discharge_unit")),
        },
        consumption: {
          value: waterConsumptionValue,
          unit: parseString(getRow(row, "water_consumption_unit")),
        },
        recycled: {
          value: parseNumber(getRow(row, "water_recycled_value")),
          unit: parseString(getRow(row, "water_recycled_unit")),
        },
        calculation: parseString(getRow(row, "water_calculation")),
        notes: parseString(getRow(row, "water_notes")),
        status: parseString(getRow(row, "water_status")),
      },

      energy: {
        total: { value: totalEnergyValue, unit: totalEnergyUnit },
        breakdown: parseString(getRow(row, "energy_breakdown")),
        calculation: parseString(getRow(row, "energy_calculation")),
        notes: parseString(getRow(row, "energy_notes")),
        status: parseString(getRow(row, "energy_status")),
      },

      fuel: {
        consumption: {
          value: parseNumber(getRow(row, "fuel_consumption_value")),
          unit: parseString(getRow(row, "fuel_consumption_unit")),
        },
        breakdown: parseString(getRow(row, "fuel_breakdown")),
        calculation: parseString(getRow(row, "fuel_calculation")),
        notes: parseString(getRow(row, "fuel_notes")),
        status: parseString(getRow(row, "fuel_status")),
      },

      gfa: {
        value: {
          value: gfaValue,
          unit: parseString(getRow(row, "gfa_unit")),
        },
        calculation: parseString(getRow(row, "gfa_calculation")),
        notes: parseString(getRow(row, "gfa_notes")),
        status: parseString(getRow(row, "gfa_status")),
      },

      targets: {
        json: targetsJson,
        notes: parseString(getRow(row, "targets_notes")),
        status: parseString(getRow(row, "targets_status")),
      },

      strategy: {
        summary: strategySummary,
        notes: parseString(getRow(row, "strategy_notes")),
        status: parseString(getRow(row, "strategy_status")),
      },

      meta: {
        extractionId: parseString(getRow(row, "extraction_id")),
        extractionDate: parseString(getRow(row, "extraction_date")),
        sourceImagesPrefix: parseString(getRow(row, "source_images_prefix")),
        processingSeconds: parseNumber(
          getRow(row, "processing_duration_seconds"),
        ),
        groupsExtracted: parseNumber(getRow(row, "total_groups_extracted")),
        groupsFailed,
        groupsSkipped: parseNumber(getRow(row, "total_groups_skipped")),
        rawJsonPath: parseString(getRow(row, "raw_json_s3_path")),
        dataQualityScore,
        verifiedByHuman: parseBoolean(getRow(row, "verified_by_human")),
      },

      normalized,

      derived: {
        scope12Total,
        wasteDiversionRate,
        completeness,
        trust: {
          extractionOk,
          dataQualityScore,
          verifiedByHuman: parseBoolean(getRow(row, "verified_by_human")),
        },
        plausibilityBand: "Good" as PlausibilityBand,
        plausibilityReasons: [] as string[],
        coverageScore,
        coverageRank: csvSectorRank !== null ? Math.round(csvSectorRank) : (null as number | null),
        coveragePercentile: csvSectorPercentile !== null ? Math.round(csvSectorPercentile * 100) / 100 : (null as number | null),
      },
    };

    companies.push(company);
  }

  // Fallback: compute rank/percentile for companies where CSV didn't provide them
  type WithDerived = {
    derived: {
      coverageScore: number;
      coverageRank?: number | null;
      coveragePercentile?: number | null;
    };
  };
  const withDerived = companies as WithDerived[];
  const needsRank = withDerived.some((c) => c.derived.coverageRank == null);
  if (needsRank) {
    withDerived.sort(
      (a, b) => b.derived.coverageScore - a.derived.coverageScore,
    );
    const N = withDerived.length;
    for (let r = 0; r < N; r++) {
      if (withDerived[r].derived.coverageRank == null) {
        withDerived[r].derived.coverageRank = r + 1;
      }
      if (withDerived[r].derived.coveragePercentile == null) {
        withDerived[r].derived.coveragePercentile =
          N > 0 ? Math.round(((N - r) / N) * 100) : 0;
      }
    }
  }

  // Compute global cohort percentiles (industry = General for all)
  type CompanyRow = {
    derived: { scope12Total: number | null; wasteDiversionRate: number | null };
    normalized?: {
      totalEnergyKwh: number | null;
      waterWithdrawalM3: number | null;
      wasteGeneratedTonnes: number | null;
    };
  };
  const scope12Arr = (companies as CompanyRow[])
    .map((c) => c.derived.scope12Total)
    .filter((v): v is number => v !== null && v > 0);
  const energyArr = (companies as CompanyRow[])
    .map((c) => c.normalized?.totalEnergyKwh)
    .filter((v): v is number => v !== null && v > 0);
  const waterArr = (companies as CompanyRow[])
    .map((c) => c.normalized?.waterWithdrawalM3)
    .filter((v): v is number => v !== null && v > 0);
  const wasteArr = (companies as CompanyRow[])
    .map((c) => c.normalized?.wasteGeneratedTonnes)
    .filter((v): v is number => v !== null && v > 0);
  const diversionArr = (companies as CompanyRow[])
    .map((c) => c.derived.wasteDiversionRate)
    .filter((v): v is number => v !== null);

  scope12Arr.sort((a, b) => a - b);
  energyArr.sort((a, b) => a - b);
  waterArr.sort((a, b) => a - b);
  wasteArr.sort((a, b) => a - b);
  diversionArr.sort((a, b) => a - b);

  const stats = {
    scope12P95: scope12Arr.length > 0 ? percentile(scope12Arr, 95) : Infinity,
    energyP95: energyArr.length > 0 ? percentile(energyArr, 95) : Infinity,
    waterP95: waterArr.length > 0 ? percentile(waterArr, 95) : Infinity,
    wasteP95: wasteArr.length > 0 ? percentile(wasteArr, 95) : Infinity,
    diversionP10: diversionArr.length > 0 ? percentile(diversionArr, 10) : 0,
    cohortSize: companies.length,
  };

  // Assign plausibility band and reasons to each company
  for (const c of companies as unknown[]) {
    const company = c as {
      normalized?: {
        scope1TCO2e: number | null;
        scope2TCO2e: number | null;
        waterWithdrawalM3: number | null;
        waterRecycledM3: number | null;
        wasteGeneratedTonnes: number | null;
        wasteRecycledTonnes: number | null;
        totalEnergyKwh: number | null;
      };
      derived: {
        scope12Total: number | null;
        wasteDiversionRate: number | null;
        completeness: Completeness;
        trust: { extractionOk: boolean; dataQualityScore: number | null };
        plausibilityBand: PlausibilityBand;
        plausibilityReasons: string[];
      };
      meta: { groupsFailed: number | null };
      water: { withdrawal: QuantityRaw; recycled: QuantityRaw };
      waste: { recycled: QuantityRaw };
    };
    const { band, reasons } = calcPlausibility(company, stats);
    company.derived.plausibilityBand = band;
    company.derived.plausibilityReasons = reasons;
  }

  // Generate TypeScript output
  const output = `// ============================================================================
// GENERATED FILE - DO NOT EDIT MANUALLY
// Generated from CSV Data/singapore_2024_merged_with_coverage_rank.csv by scripts/build-sustainability-data.ts
// Generated at: ${new Date().toISOString()}
// Total companies: ${companies.length}
// ============================================================================

import type { SustainabilityCompany } from "./sustainability";

export const SUSTAINABILITY_COMPANIES: SustainabilityCompany[] = ${JSON.stringify(companies, null, 2)};
`;

  // Write output
  const outputPath = path.join(
    process.cwd(),
    "data",
    "sustainability.generated.ts",
  );
  fs.writeFileSync(outputPath, output);
  console.log(`Generated ${outputPath}`);

  // Print summary
  const bandCounts = (
    companies as { derived: { plausibilityBand: string } }[]
  ).reduce(
    (acc, c) => {
      const b = c.derived.plausibilityBand;
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("\nSummary:");
  console.log(`  Total companies: ${companies.length}`);
  console.log(`  Data plausibility distribution:`);
  console.log(`    Good: ${bandCounts["Good"] || 0}`);
  console.log(`    Watch: ${bandCounts["Watch"] || 0}`);
  console.log(`    Review: ${bandCounts["Review"] || 0}`);
}

// Run
buildSustainabilityData();
