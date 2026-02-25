import { describe, it, expect } from "vitest";

function fmtCompact(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(0)}K`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

describe("fmtCompact", () => {
  it("returns N/A for null", () => {
    expect(fmtCompact(null)).toBe("N/A");
  });

  it("formats billions", () => {
    expect(fmtCompact(2_500_000_000)).toBe("2.5B");
  });

  it("formats millions", () => {
    expect(fmtCompact(1_500_000)).toBe("1.5M");
    expect(fmtCompact(12_345_678)).toBe("12.3M");
  });

  it("formats tens of thousands without decimal", () => {
    expect(fmtCompact(50_000)).toBe("50K");
    expect(fmtCompact(123_456)).toBe("123K");
    expect(fmtCompact(999_999)).toBe("1000K");
  });

  it("formats thousands with one decimal", () => {
    expect(fmtCompact(1_500)).toBe("1.5K");
    expect(fmtCompact(9_999)).toBe("10.0K");
  });

  it("formats small values as integers", () => {
    expect(fmtCompact(42)).toBe("42");
    expect(fmtCompact(999)).toBe("999");
    expect(fmtCompact(0)).toBe("0");
  });

  it("keeps output under 6 characters for typical values", () => {
    const testValues = [0, 42, 999, 1500, 9999, 50000, 999999, 1500000, 2500000000];
    for (const v of testValues) {
      const result = fmtCompact(v);
      expect(result.length).toBeLessThanOrEqual(6);
    }
  });
});
