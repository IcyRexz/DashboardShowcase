import { describe, it, expect } from "vitest";

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

interface Coords {
  lat: number;
  lng: number;
}

interface LocationInfo {
  coords: Coords;
  district: string;
}

function getCoordinates(companyName: string): LocationInfo {
  const seed = hashString(companyName);
  const districtIndex = seed % SINGAPORE_DISTRICTS.length;
  const district = SINGAPORE_DISTRICTS[districtIndex];

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

function formatCompanyName(rawName: string): string {
  let name = rawName.replace(/_/g, " ");
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  name = name
    .replace(/\bLtd\b/gi, "Ltd")
    .replace(/\bPte\b/gi, "Pte")
    .replace(/\bCo\b/gi, "Co")
    .replace(/\bInc\b/gi, "Inc")
    .replace(/\bCorp\b/gi, "Corp");
  return name;
}

describe("hashString", () => {
  it("returns consistent hash for same input", () => {
    expect(hashString("test")).toBe(hashString("test"));
  });

  it("returns different hashes for different inputs", () => {
    expect(hashString("alpha")).not.toBe(hashString("beta"));
  });

  it("returns non-negative value", () => {
    expect(hashString("anything")).toBeGreaterThanOrEqual(0);
  });
});

describe("seededRandom", () => {
  it("returns value between 0 and 1", () => {
    for (let i = 0; i < 100; i++) {
      const val = seededRandom(i);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("is deterministic for same seed", () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
  });
});

describe("getCoordinates", () => {
  it("returns deterministic coordinates for same company", () => {
    const a = getCoordinates("test_company");
    const b = getCoordinates("test_company");
    expect(a.coords.lat).toBe(b.coords.lat);
    expect(a.coords.lng).toBe(b.coords.lng);
    expect(a.district).toBe(b.district);
  });

  it("returns coordinates within Singapore bounds", () => {
    const testNames = [
      "alpha_corp", "beta_ltd", "gamma_inc", "delta_holdings",
      "epsilon_group", "zeta_pte", "eta_international",
    ];
    for (const name of testNames) {
      const { coords } = getCoordinates(name);
      expect(coords.lat).toBeGreaterThan(1.2);
      expect(coords.lat).toBeLessThan(1.5);
      expect(coords.lng).toBeGreaterThan(103.6);
      expect(coords.lng).toBeLessThan(104.1);
    }
  });

  it("assigns a valid district name", () => {
    const districtNames = SINGAPORE_DISTRICTS.map((d) => d.name);
    const { district } = getCoordinates("some_company");
    expect(districtNames).toContain(district);
  });

  it("distributes companies across multiple districts", () => {
    const districts = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const { district } = getCoordinates(`company_${i}`);
      districts.add(district);
    }
    expect(districts.size).toBeGreaterThan(5);
  });

  it("applies small jitter within a district", () => {
    const { coords, district } = getCoordinates("jitter_test_company");
    const baseDistrict = SINGAPORE_DISTRICTS.find((d) => d.name === district)!;
    const latDiff = Math.abs(coords.lat - baseDistrict.lat);
    const lngDiff = Math.abs(coords.lng - baseDistrict.lng);
    expect(latDiff).toBeLessThan(0.005);
    expect(lngDiff).toBeLessThan(0.005);
  });
});

describe("formatCompanyName", () => {
  it("replaces underscores with spaces", () => {
    expect(formatCompanyName("test_company")).toBe("Test Company");
  });

  it("title cases words", () => {
    expect(formatCompanyName("alpha_beta")).toBe("Alpha Beta");
  });

  it("preserves abbreviation casing", () => {
    expect(formatCompanyName("alpha_ltd")).toBe("Alpha Ltd");
    expect(formatCompanyName("beta_pte")).toBe("Beta Pte");
    expect(formatCompanyName("gamma_inc")).toBe("Gamma Inc");
    expect(formatCompanyName("delta_corp")).toBe("Delta Corp");
  });
});
