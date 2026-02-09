#!/usr/bin/env npx tsx
/**
 * Build script to parse master_metrics_1.csv and generate sustainability.generated.ts
 *
 * Run with: npx tsx scripts/build-sustainability-data.ts
 */

import * as fs from "fs";
import * as path from "path";

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

// ============================================================================
// COUNTRY COORDINATES
// ============================================================================

interface Coords {
  lat: number;
  lng: number;
}

// Singapore-centric companies (SGX listed) - default coordinates
const SINGAPORE_COORDS: Coords = { lat: 1.3521, lng: 103.8198 };

// Seeded random for deterministic jitter
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Hash a string to a number for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get coordinates for a company with deterministic jitter
 */
function getCoordinates(companyName: string): Coords {
  // All companies are Singapore-based (SGX listed)
  // Add jitter to spread markers
  const seed = hashString(companyName);
  const jitterLat = (seededRandom(seed) - 0.5) * 0.15;
  const jitterLng = (seededRandom(seed + 1) - 0.5) * 0.15;

  return {
    lat: SINGAPORE_COORDS.lat + jitterLat,
    lng: SINGAPORE_COORDS.lng + jitterLng,
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

type RiskBand = "Good" | "Watch" | "Review";

function calcRiskBand(
  completeness: Completeness,
  groupsFailed: number | null,
  dataQualityScore: number | null,
  wasteDiversionRate: number | null,
): RiskBand {
  // Review conditions
  if (completeness.score < 4) return "Review";
  if (dataQualityScore !== null && dataQualityScore < 50) return "Review";
  if (groupsFailed !== null && groupsFailed > 0) return "Review";

  // Watch conditions
  if (wasteDiversionRate !== null && wasteDiversionRate < 0.3) return "Watch";

  return "Good";
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

function buildSustainabilityData(): void {
  console.log("Building sustainability data from CSV...");

  // Read CSV
  const csvPath = path.join(process.cwd(), "master_metrics_1.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  console.log(`Read CSV file: ${csvPath}`);

  // Parse CSV
  const rows = parseCsv(csvContent);
  console.log(`Parsed ${rows.length} companies from CSV`);

  // Transform to SustainabilityCompany objects
  const companies: unknown[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Extract values
    const rawName = row["company_name"] || `unknown_${i}`;
    const name = formatCompanyName(rawName);
    const coords = getCoordinates(rawName);

    const scope1Value = parseNumber(row["scope_1_value"]);
    const scope1Unit = parseString(row["scope_1_unit"]);
    const scope2Value = parseNumber(row["scope_2_value"]);
    const scope2Unit = parseString(row["scope_2_unit"]);
    const scope3Value = parseNumber(row["scope_3_value"]);
    const scope3Unit = parseString(row["scope_3_unit"]);

    const wasteGeneratedValue = parseNumber(row["waste_generated_value"]);
    const wasteGeneratedUnit = parseString(row["waste_generated_unit"]);
    const wasteDisposedValue = parseNumber(row["waste_disposed_value"]);
    const wasteDisposedUnit = parseString(row["waste_disposed_unit"]);
    const wasteRecycledValue = parseNumber(row["waste_recycled_value"]);
    const wasteRecycledUnit = parseString(row["waste_recycled_unit"]);

    const groupsFailed = parseNumber(row["total_groups_failed"]);
    const dataQualityScore = parseNumber(row["data_quality_score"]);

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
    const riskBand = calcRiskBand(
      completeness,
      groupsFailed,
      dataQualityScore,
      wasteDiversionRate,
    );

    const company = {
      id: `company_${i + 1}`,
      name,
      reportName: parseString(row["report_name"]),
      reportYear: 2023 as const,

      country: "Singapore",
      city: "Singapore",
      lat: coords.lat,
      lng: coords.lng,

      emissions: {
        scope1: { value: scope1Value, unit: scope1Unit },
        scope2: { value: scope2Value, unit: scope2Unit },
        scope3: { value: scope3Value, unit: scope3Unit },
        calculation: parseString(row["emissions_calculation"]),
        notes: parseString(row["emissions_notes"]),
        status: parseString(row["emissions_status"]),
      },

      waste: {
        generated: { value: wasteGeneratedValue, unit: wasteGeneratedUnit },
        disposed: { value: wasteDisposedValue, unit: wasteDisposedUnit },
        recycled: { value: wasteRecycledValue, unit: wasteRecycledUnit },
        calculation: parseString(row["waste_calculation"]),
        notes: parseString(row["waste_notes"]),
        status: parseString(row["waste_status"]),
      },

      water: {
        withdrawal: {
          value: parseNumber(row["water_withdrawal_value"]),
          unit: parseString(row["water_withdrawal_unit"]),
        },
        discharge: {
          value: parseNumber(row["water_discharge_value"]),
          unit: parseString(row["water_discharge_unit"]),
        },
        consumption: {
          value: parseNumber(row["water_consumption_value"]),
          unit: parseString(row["water_consumption_unit"]),
        },
        recycled: {
          value: parseNumber(row["water_recycled_value"]),
          unit: parseString(row["water_recycled_unit"]),
        },
        calculation: parseString(row["water_calculation"]),
        notes: parseString(row["water_notes"]),
        status: parseString(row["water_status"]),
      },

      energy: {
        total: {
          value: parseNumber(row["total_energy_value"]),
          unit: parseString(row["total_energy_unit"]),
        },
        breakdown: parseString(row["energy_breakdown"]),
        calculation: parseString(row["energy_calculation"]),
        notes: parseString(row["energy_notes"]),
        status: parseString(row["energy_status"]),
      },

      fuel: {
        consumption: {
          value: parseNumber(row["fuel_consumption_value"]),
          unit: parseString(row["fuel_consumption_unit"]),
        },
        breakdown: parseString(row["fuel_breakdown"]),
        calculation: parseString(row["fuel_calculation"]),
        notes: parseString(row["fuel_notes"]),
        status: parseString(row["fuel_status"]),
      },

      gfa: {
        value: {
          value: parseNumber(row["gfa_value"]),
          unit: parseString(row["gfa_unit"]),
        },
        calculation: parseString(row["gfa_calculation"]),
        notes: parseString(row["gfa_notes"]),
        status: parseString(row["gfa_status"]),
      },

      targets: {
        json: parseString(row["targets_json"]),
        notes: parseString(row["targets_notes"]),
        status: parseString(row["targets_status"]),
      },

      strategy: {
        summary: parseString(row["strategy_summary"]),
        notes: parseString(row["strategy_notes"]),
        status: parseString(row["strategy_status"]),
      },

      meta: {
        extractionId: parseString(row["extraction_id"]),
        extractionDate: parseString(row["extraction_date"]),
        sourceImagesPrefix: parseString(row["source_images_prefix"]),
        processingSeconds: parseNumber(row["processing_duration_seconds"]),
        groupsExtracted: parseNumber(row["total_groups_extracted"]),
        groupsFailed: groupsFailed,
        groupsSkipped: parseNumber(row["total_groups_skipped"]),
        rawJsonPath: parseString(row["raw_json_s3_path"]),
        dataQualityScore: dataQualityScore,
        verifiedByHuman: parseBoolean(row["verified_by_human"]),
      },

      derived: {
        scope12Total,
        wasteDiversionRate,
        completeness,
        trust: {
          extractionOk,
          dataQualityScore,
          verifiedByHuman: parseBoolean(row["verified_by_human"]),
        },
        riskBand,
      },
    };

    companies.push(company);
  }

  // Generate TypeScript output
  const output = `// ============================================================================
// GENERATED FILE - DO NOT EDIT MANUALLY
// Generated from master_metrics_1.csv by scripts/build-sustainability-data.ts
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
  const riskCounts = companies.reduce(
    (acc, c) => {
      const company = c as { derived: { riskBand: string } };
      acc[company.derived.riskBand] = (acc[company.derived.riskBand] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("\nSummary:");
  console.log(`  Total companies: ${companies.length}`);
  console.log(`  Risk distribution:`);
  console.log(`    Good: ${riskCounts["Good"] || 0}`);
  console.log(`    Watch: ${riskCounts["Watch"] || 0}`);
  console.log(`    Review: ${riskCounts["Review"] || 0}`);
}

// Run
buildSustainabilityData();
