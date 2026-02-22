import { describe, it, expect } from "vitest";
import {
  getLocations,
  filterCompanies,
  calculateKpis,
  calcScope12,
  calcWasteDiversion,
  calcCompleteness,
  calcTrust,
  calcRiskBand,
  normalizeToTCO2e,
  fmtPct,
  fmtNumber,
  fmtTCO2e,
  fmtEmissionsValue,
  fmtQuantity,
  getCountries,
  getPlausibilityBands,
  parseTargetsSummary,
  type SustainabilityCompany,
  type FilterOptions,
} from "./sustainability";

function makeCompany(
  overrides: Partial<SustainabilityCompany> = {},
): SustainabilityCompany {
  return {
    id: "company_1",
    name: "Test Company",
    reportName: "test_report",
    reportYear: 2023,
    industry: "General",
    country: "Singapore",
    city: "Marina Bay",
    lat: 1.28,
    lng: 103.86,
    emissions: {
      scope1: { value: 100, unit: "tCO2e" },
      scope2: { value: 200, unit: "tCO2e" },
      scope3: { value: null, unit: null },
      calculation: null,
      notes: null,
      status: null,
    },
    waste: {
      generated: { value: 500, unit: "tonnes" },
      disposed: { value: 300, unit: "tonnes" },
      recycled: { value: 200, unit: "tonnes" },
      calculation: null,
      notes: null,
      status: null,
    },
    water: {
      withdrawal: { value: 1000, unit: "m3" },
      discharge: { value: 800, unit: "m3" },
      consumption: { value: 200, unit: "m3" },
      recycled: { value: 50, unit: "m3" },
      calculation: null,
      notes: null,
      status: null,
    },
    energy: {
      total: { value: 5000, unit: "kWh" },
      breakdown: null,
      calculation: null,
      notes: null,
      status: null,
    },
    fuel: {
      consumption: { value: null, unit: null },
      breakdown: null,
      calculation: null,
      notes: null,
      status: null,
    },
    gfa: {
      value: { value: null, unit: null },
      calculation: null,
      notes: null,
      status: null,
    },
    targets: { json: null, notes: null, status: null },
    strategy: { summary: null, notes: null, status: null },
    meta: {
      extractionId: null,
      extractionDate: null,
      sourceImagesPrefix: null,
      processingSeconds: null,
      groupsExtracted: null,
      groupsFailed: 0,
      groupsSkipped: null,
      rawJsonPath: null,
      dataQualityScore: 80,
      verifiedByHuman: null,
    },
    normalized: {
      scope1TCO2e: 100,
      scope2TCO2e: 200,
      scope3TCO2e: null,
      totalEnergyKwh: 5000,
      waterWithdrawalM3: 1000,
      waterConsumptionM3: 200,
      waterRecycledM3: 50,
      wasteGeneratedTonnes: 500,
      wasteRecycledTonnes: 200,
      wasteDisposedTonnes: 300,
    },
    derived: {
      scope12Total: 300,
      wasteDiversionRate: 0.4,
      completeness: {
        hasScope1: true,
        hasScope2: true,
        hasWasteGenerated: true,
        hasWasteRecycled: true,
        score: 4,
      },
      trust: {
        extractionOk: true,
        dataQualityScore: 80,
        verifiedByHuman: null,
      },
      plausibilityBand: "Good",
      plausibilityReasons: [],
    },
    ...overrides,
  };
}

describe("getLocations", () => {
  it("returns one location per company", () => {
    const companies = [
      makeCompany({ id: "c1", city: "Marina Bay" }),
      makeCompany({ id: "c2", city: "Marina Bay" }),
      makeCompany({ id: "c3", city: "Jurong East" }),
    ];
    const locations = getLocations(companies);
    expect(locations).toHaveLength(3);
  });

  it("each location contains exactly one company", () => {
    const companies = [
      makeCompany({ id: "c1" }),
      makeCompany({ id: "c2" }),
    ];
    const locations = getLocations(companies);
    locations.forEach((loc) => {
      expect(loc.companies).toHaveLength(1);
    });
  });

  it("preserves company data in each location", () => {
    const company = makeCompany({ id: "c1", city: "Orchard", lat: 1.3, lng: 103.83 });
    const [location] = getLocations([company]);
    expect(location.id).toBe("c1");
    expect(location.city).toBe("Orchard");
    expect(location.lat).toBe(1.3);
    expect(location.lng).toBe(103.83);
    expect(location.companies[0]).toBe(company);
  });

  it("returns empty array for empty input", () => {
    expect(getLocations([])).toEqual([]);
  });
});

describe("filterCompanies", () => {
  const companies = [
    makeCompany({ id: "c1", name: "Alpha Corp", country: "Singapore", city: "Marina Bay" }),
    makeCompany({
      id: "c2",
      name: "Beta Ltd",
      country: "Singapore",
      city: "Jurong East",
      derived: {
        ...makeCompany().derived,
        plausibilityBand: "Review",
      },
    }),
    makeCompany({
      id: "c3",
      name: "Gamma Inc",
      country: "Singapore",
      city: "Changi",
      derived: {
        ...makeCompany().derived,
        plausibilityBand: "Watch",
      },
    }),
  ];

  it("returns all companies with no filters", () => {
    const opts: FilterOptions = {
      search: "",
      countries: [],
      plausibilityBands: [],
      incompleteOnly: false,
    };
    expect(filterCompanies(companies, opts)).toHaveLength(3);
  });

  it("filters by search term (name)", () => {
    const opts: FilterOptions = {
      search: "alpha",
      countries: [],
      plausibilityBands: [],
      incompleteOnly: false,
    };
    const result = filterCompanies(companies, opts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("filters by plausibility band", () => {
    const opts: FilterOptions = {
      search: "",
      countries: [],
      plausibilityBands: ["Review"],
      incompleteOnly: false,
    };
    const result = filterCompanies(companies, opts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c2");
  });

  it("filters by multiple plausibility bands", () => {
    const opts: FilterOptions = {
      search: "",
      countries: [],
      plausibilityBands: ["Good", "Watch"],
      incompleteOnly: false,
    };
    const result = filterCompanies(companies, opts);
    expect(result).toHaveLength(2);
  });
});

describe("calculateKpis", () => {
  it("calculates correct totals", () => {
    const companies = [
      makeCompany({ id: "c1", derived: { ...makeCompany().derived, scope12Total: 100 } }),
      makeCompany({ id: "c2", derived: { ...makeCompany().derived, scope12Total: 200 } }),
    ];
    const kpis = calculateKpis(companies);
    expect(kpis.totalCompanies).toBe(2);
    expect(kpis.totalScope12).toBe(300);
  });

  it("returns null for scope12 when no values", () => {
    const companies = [
      makeCompany({ derived: { ...makeCompany().derived, scope12Total: null } }),
    ];
    expect(calculateKpis(companies).totalScope12).toBeNull();
  });

  it("calculates average waste diversion", () => {
    const companies = [
      makeCompany({ derived: { ...makeCompany().derived, wasteDiversionRate: 0.4 } }),
      makeCompany({ derived: { ...makeCompany().derived, wasteDiversionRate: 0.6 } }),
    ];
    expect(calculateKpis(companies).avgWasteDiversion).toBe(0.5);
  });
});

describe("normalizeToTCO2e", () => {
  it("converts kg to tonnes", () => {
    expect(normalizeToTCO2e(5000, "kgCO2e")).toBe(5);
  });

  it("converts Mt to tonnes", () => {
    expect(normalizeToTCO2e(2, "MtCO2e")).toBe(2000000);
  });

  it("converts kt to tonnes", () => {
    expect(normalizeToTCO2e(3, "ktCO2e")).toBe(3000);
  });

  it("returns value as-is for tCO2e", () => {
    expect(normalizeToTCO2e(100, "tCO2e")).toBe(100);
  });

  it("returns null for null value", () => {
    expect(normalizeToTCO2e(null, "tCO2e")).toBeNull();
  });

  it("returns value when unit is null", () => {
    expect(normalizeToTCO2e(42, null)).toBe(42);
  });
});

describe("calcScope12", () => {
  it("sums scope1 and scope2", () => {
    const company = makeCompany();
    expect(calcScope12(company)).toBe(300);
  });

  it("returns null when both scopes are null", () => {
    const company = makeCompany({
      emissions: {
        ...makeCompany().emissions,
        scope1: { value: null, unit: null },
        scope2: { value: null, unit: null },
      },
    });
    expect(calcScope12(company)).toBeNull();
  });

  it("treats null scope as 0 when other is present", () => {
    const company = makeCompany({
      emissions: {
        ...makeCompany().emissions,
        scope1: { value: null, unit: null },
        scope2: { value: 200, unit: "tCO2e" },
      },
    });
    expect(calcScope12(company)).toBe(200);
  });
});

describe("calcWasteDiversion", () => {
  it("calculates diversion rate", () => {
    const company = makeCompany();
    expect(calcWasteDiversion(company)).toBe(0.4);
  });

  it("returns null when generated is null", () => {
    const company = makeCompany({
      waste: { ...makeCompany().waste, generated: { value: null, unit: null } },
    });
    expect(calcWasteDiversion(company)).toBeNull();
  });

  it("returns null when generated is zero", () => {
    const company = makeCompany({
      waste: { ...makeCompany().waste, generated: { value: 0, unit: "tonnes" } },
    });
    expect(calcWasteDiversion(company)).toBeNull();
  });

  it("caps diversion rate at 1", () => {
    const company = makeCompany({
      waste: {
        ...makeCompany().waste,
        generated: { value: 100, unit: "tonnes" },
        recycled: { value: 200, unit: "tonnes" },
      },
    });
    expect(calcWasteDiversion(company)).toBe(1);
  });
});

describe("calcCompleteness", () => {
  it("returns score 4 when all fields present", () => {
    const result = calcCompleteness(makeCompany());
    expect(result.score).toBe(4);
    expect(result.hasScope1).toBe(true);
    expect(result.hasScope2).toBe(true);
    expect(result.hasWasteGenerated).toBe(true);
    expect(result.hasWasteRecycled).toBe(true);
  });

  it("returns lower score for missing fields", () => {
    const company = makeCompany({
      emissions: {
        ...makeCompany().emissions,
        scope1: { value: null, unit: null },
      },
      waste: {
        ...makeCompany().waste,
        recycled: { value: null, unit: null },
      },
    });
    const result = calcCompleteness(company);
    expect(result.score).toBe(2);
    expect(result.hasScope1).toBe(false);
    expect(result.hasWasteRecycled).toBe(false);
  });
});

describe("calcTrust", () => {
  it("returns ok when no groups failed", () => {
    const result = calcTrust(makeCompany());
    expect(result.extractionOk).toBe(true);
    expect(result.dataQualityScore).toBe(80);
  });

  it("returns not ok when groups failed", () => {
    const company = makeCompany({
      meta: { ...makeCompany().meta, groupsFailed: 2 },
    });
    expect(calcTrust(company).extractionOk).toBe(false);
  });
});

describe("calcRiskBand", () => {
  it("returns Good for complete high-quality data", () => {
    expect(calcRiskBand(makeCompany())).toBe("Good");
  });

  it("returns Review for incomplete data", () => {
    const company = makeCompany({
      emissions: {
        ...makeCompany().emissions,
        scope1: { value: null, unit: null },
      },
    });
    expect(calcRiskBand(company)).toBe("Review");
  });

  it("returns Review for low data quality score", () => {
    const company = makeCompany({
      meta: { ...makeCompany().meta, dataQualityScore: 30 },
    });
    expect(calcRiskBand(company)).toBe("Review");
  });
});

describe("formatting helpers", () => {
  describe("fmtPct", () => {
    it("formats decimal as percentage", () => {
      expect(fmtPct(0.45)).toBe("45.0%");
    });
    it("returns N/A for null", () => {
      expect(fmtPct(null)).toBe("N/A");
    });
  });

  describe("fmtNumber", () => {
    it("formats with thousands separators", () => {
      expect(fmtNumber(1234567)).toBe("1,234,567");
    });
    it("returns N/A for null", () => {
      expect(fmtNumber(null)).toBe("N/A");
    });
  });

  describe("fmtTCO2e", () => {
    it("formats millions", () => {
      expect(fmtTCO2e(1500000)).toBe("1.50M tCO2e");
    });
    it("formats thousands", () => {
      expect(fmtTCO2e(2500)).toBe("2.5K tCO2e");
    });
    it("formats small values", () => {
      expect(fmtTCO2e(42)).toBe("42 tCO2e");
    });
    it("returns N/A for null", () => {
      expect(fmtTCO2e(null)).toBe("N/A");
    });
  });

  describe("fmtEmissionsValue", () => {
    it("formats millions without unit", () => {
      expect(fmtEmissionsValue(2000000)).toBe("2.00M");
    });
    it("formats thousands without unit", () => {
      expect(fmtEmissionsValue(3500)).toBe("3.5K");
    });
    it("returns N/A for null", () => {
      expect(fmtEmissionsValue(null)).toBe("N/A");
    });
  });

  describe("fmtQuantity", () => {
    it("formats value with unit", () => {
      expect(fmtQuantity({ value: 1000, unit: "m3" })).toBe("1,000 m3");
    });
    it("formats value without unit", () => {
      expect(fmtQuantity({ value: 500, unit: null })).toBe("500");
    });
    it("returns N/A for null value", () => {
      expect(fmtQuantity({ value: null, unit: "m3" })).toBe("N/A");
    });
  });
});

describe("getCountries", () => {
  it("returns unique sorted countries", () => {
    const companies = [
      makeCompany({ country: "Singapore" }),
      makeCompany({ country: "Malaysia" }),
      makeCompany({ country: "Singapore" }),
    ];
    expect(getCountries(companies)).toEqual(["Malaysia", "Singapore"]);
  });
});

describe("getPlausibilityBands", () => {
  it("returns all three bands", () => {
    expect(getPlausibilityBands()).toEqual(["Good", "Watch", "Review"]);
  });
});

describe("parseTargetsSummary", () => {
  it("returns null for null input", () => {
    expect(parseTargetsSummary(null)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(parseTargetsSummary("[]")).toBeNull();
  });

  it("parses target summary from JSON", () => {
    const json = JSON.stringify([
      { target_reduction: "30% reduction", target_year: "2030" },
    ]);
    const result = parseTargetsSummary(json);
    expect(result).toBe("30% reduction 2030");
  });

  it("joins multiple targets with semicolons", () => {
    const json = JSON.stringify([
      { target_reduction: "30% reduction", target_year: "2030" },
      { target_reduction: "50% reduction", target_year: "2050" },
    ]);
    const result = parseTargetsSummary(json);
    expect(result).toBe("30% reduction 2030; 50% reduction 2050");
  });

  it("limits to 3 targets", () => {
    const json = JSON.stringify([
      { target_reduction: "A", target_year: "2025" },
      { target_reduction: "B", target_year: "2030" },
      { target_reduction: "C", target_year: "2035" },
      { target_reduction: "D", target_year: "2040" },
    ]);
    const result = parseTargetsSummary(json);
    expect(result).not.toContain("D");
  });
});
