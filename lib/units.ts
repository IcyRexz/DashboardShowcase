/**
 * Canonical unit normalization for sustainability metrics.
 * Treats blanks, "N/A", "na", "-" as null. Unknown units return null.
 *
 * Canonical units:
 * - Emissions: tCO2e
 * - Energy: kWh (1 GJ = 277.778 kWh; 1 MWh = 1000 kWh)
 * - Water: m³
 * - Waste: tonnes (metric)
 */

function isEmpty(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number" && isNaN(value)) return true;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    return t === "" || t === "n/a" || t === "na" || t === "-";
  }
  return false;
}

/**
 * Normalize emissions to tCO2e.
 * Supports: tCO2e, tonnesCO2e, tCO2, kgCO2e, kgCO2, ktCO2e, MtCO2e, MT CO2e, etc.
 */
export function normalizeEmissions(
  value: number | null,
  unit: string | null | undefined,
): number | null {
  if (value === null || isEmpty(value)) return null;
  if (unit === null || unit === undefined || isEmpty(unit)) return value;

  const u = unit.toLowerCase().trim().replace(/\s+/g, "");

  if (u.includes("kg")) return value / 1000;
  if (u.startsWith("mt") || u.includes("megaton")) return value * 1_000_000;
  if (u.startsWith("kt") || u.includes("kiloton")) return value * 1000;
  // tonnes, t, tco2e, tco2
  if (
    u.includes("t") &&
    !u.includes("kg") &&
    !u.includes("mt") &&
    !u.includes("kt")
  )
    return value;
  return value;
}

/** 1 GJ = 3.6 * 1e6 kJ; 1 kWh = 3600 kJ => 1 GJ = 1e6/3600 kWh = 277.778 kWh */
const GJ_TO_KWH = 1e6 / 3600;
const TJ_TO_KWH = GJ_TO_KWH * 1000;
const MWH_TO_KWH = 1000;
const GWH_TO_KWH = 1e6;
const WH_TO_KWH = 0.001;

/**
 * Normalize energy to kWh.
 * Supports: kWh, MWh, GWh, Wh, GJ, TJ.
 */
export function normalizeEnergyToKwh(
  value: number | null,
  unit: string | null | undefined,
): number | null {
  if (value === null || isEmpty(value)) return null;
  if (unit === null || unit === undefined || isEmpty(unit)) return null;

  const u = unit.toLowerCase().trim().replace(/\s+/g, "");

  if (u === "kwh") return value;
  if (u === "mwh") return value * MWH_TO_KWH;
  if (u === "gwh") return value * GWH_TO_KWH;
  if (u === "wh") return value * WH_TO_KWH;
  if (u === "gj") return value * GJ_TO_KWH;
  if (u === "tj") return value * TJ_TO_KWH;
  return null;
}

/** 1 ML = 1000 m³; 1 m³ = 1000 L */
const ML_TO_M3 = 1000;
const L_TO_M3 = 0.001;

/**
 * Normalize water to m³.
 * Supports: m3, m³, cubic meters, cubic metre, ML, megalitres, litre, L, liters, thousand m3 (value already in 1000s).
 */
export function normalizeWaterToM3(
  value: number | null,
  unit: string | null | undefined,
): number | null {
  if (value === null || isEmpty(value)) return null;
  if (unit === null || unit === undefined || isEmpty(unit)) return null;

  const u = unit.toLowerCase().trim().replace(/\s+/g, "");

  if (
    u === "m3" ||
    u === "m³" ||
    u === "m^3" ||
    u.includes("cubicmeter") ||
    u.includes("cubicmetre")
  )
    return value;
  if (u.includes("thousand") && u.includes("m3")) return value * 1000; // value in thousand m³
  if (u === "ml" || u.includes("megalitre") || u.includes("megaliter"))
    return value * ML_TO_M3;
  if (
    u === "l" ||
    u === "litre" ||
    u === "liter" ||
    u === "litres" ||
    u === "liters"
  )
    return value * L_TO_M3;
  if (u === "cum" || u === "cu m" || u === "cu.m") return value;
  return null;
}

/** 1 MT = 1 metric ton = 1 tonne; 1 kg = 0.001 tonnes */
const KG_TO_TONNES = 0.001;

/**
 * Normalize waste to tonnes (metric).
 * Supports: tonnes, t, metric tons, MT, kg.
 */
export function normalizeWasteToTonnes(
  value: number | null,
  unit: string | null | undefined,
): number | null {
  if (value === null || isEmpty(value)) return null;
  if (unit === null || unit === undefined || isEmpty(unit)) return value; // assume tonnes

  const u = unit.toLowerCase().trim().replace(/\s+/g, "");

  if (
    u === "tonnes" ||
    u === "tonne" ||
    u === "t" ||
    u.includes("metrictons") ||
    u.includes("metrict")
  )
    return value;
  if (u === "mt" && !u.includes("mwh")) return value; // MT as metric tonnes
  if (u === "kg") return value * KG_TO_TONNES;
  return null;
}
