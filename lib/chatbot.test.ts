import { beforeEach, describe, expect, it } from "vitest";
import { clearCsvCache } from "./csv";
import { generateChatResponse, inferChatIntent } from "./chatbot";

describe("inferChatIntent", () => {
  it("routes anomaly-style prompts to anomaly explanation", () => {
    expect(inferChatIntent("Why was this company flagged as an anomaly?")).toBe(
      "ANOMALY_EXPLANATION",
    );
  });

  it("routes outlier-style prompts to anomaly explanation", () => {
    expect(inferChatIntent("Why is this company an unusual outlier in the cohort?")).toBe(
      "ANOMALY_EXPLANATION",
    );
  });

  it("defaults to extraction explanation for metric prompts", () => {
    expect(inferChatIntent("Explain how water was derived from the extraction output.")).toBe(
      "EXTRACTION_EXPLANATION",
    );
  });
});

describe("generateChatResponse", () => {
  beforeEach(() => {
    clearCsvCache();
  });

  it("loads the correct country-year extraction file for Indonesia emissions", async () => {
    const response = await generateChatResponse({
      intent: "EXTRACTION_EXPLANATION",
      company: "PT Astra Agro Lestari Tbk",
      country: "Indonesia",
      year: 2024,
      tickerSymbol: "AALI.JK",
      message: "Explain how emissions was derived from the extraction output.",
    });

    expect(response.intent).toBe("EXTRACTION_EXPLANATION");
    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.data).toMatchObject({
      company: "PT Astra Agro Lestari Tbk",
      country: "Indonesia",
      year: 2024,
      metricGroup: "emissions",
      status: null,
    });
    expect(response.answer).toContain("**Emissions Extraction Explanation**");
    expect(response.answer).toContain("**Calculation**");
    expect(response.answer).toContain("765146 (Scope 1 + Scope 2 total)");
    expect(response.answer).toContain("**Supporting Notes**");
  });

  it("loads the correct country-year extraction file for Malaysia energy", async () => {
    const response = await generateChatResponse({
      intent: "EXTRACTION_EXPLANATION",
      company: "Able Global Berhad",
      country: "Malaysia",
      year: 2024,
      tickerSymbol: "7167.KL",
      message: "Explain how energy was derived from the extraction output.",
    });

    expect(response.intent).toBe("EXTRACTION_EXPLANATION");
    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.data).toMatchObject({
      company: "Able Global Berhad",
      country: "Malaysia",
      year: 2024,
      metricGroup: "energy",
      status: null,
    });
    expect(response.answer).toContain("**Energy Extraction Explanation**");
    expect(response.answer).toContain("**Extracted Values**");
    expect(response.answer).toContain("58068.0 GJ");
  });

  it("uses inferred intent and metric group for Singapore waste extraction", async () => {
    const response = await generateChatResponse({
      company: "Midas Holdings Limited",
      country: "Singapore",
      year: 2023,
      tickerSymbol: "5EN.SI",
      message: "Can you explain the waste metrics for this company?",
    });

    expect(response.intent).toBe("EXTRACTION_EXPLANATION");
    expect(response.data).toMatchObject({
      company: "Midas Holdings Limited",
      country: "Singapore",
      year: 2023,
      metricGroup: "waste",
      status: null,
    });
    expect(response.answer).toContain("**Waste Extraction Explanation**");
    expect(response.answer).not.toContain("**Validation Status**");
    expect(response.answer).toContain("Generated (5801) = Disposed (2454) + Recycled (3347)");
  });

  it("renders both location-based and market-based scope 2 values for emissions extraction", async () => {
    const response = await generateChatResponse({
      intent: "EXTRACTION_EXPLANATION",
      company: "Baker Technology Limited",
      country: "Singapore",
      year: 2024,
      tickerSymbol: "BTP.SI",
      message: "Explain how emissions was derived from the extraction output.",
    });

    const metricSnapshot = response.data?.metricSnapshot as Array<{ label: string; value: string }>;
    expect(metricSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Scope 2 (location-based)" }),
        expect.objectContaining({ label: "Scope 2 (market-based)" }),
      ]),
    );
    expect(response.answer).toContain("Scope 2 (location-based)");
    expect(response.answer).toContain("Scope 2 (market-based)");
  });

  it("returns GFA extraction explanation when the prompt mentions floor area", async () => {
    const response = await generateChatResponse({
      company: "Tai Sin Electric Limited",
      country: "Singapore",
      year: 2023,
      tickerSymbol: "500.SI",
      message: "Explain how gross floor area was derived from the extraction output.",
    });

    expect(response.intent).toBe("EXTRACTION_EXPLANATION");
    expect(response.data).toMatchObject({
      company: "Tai Sin Electric Limited",
      metricGroup: "gfa",
      status: null,
    });
    expect(response.answer).toContain("**GFA Extraction Explanation**");
    expect(response.answer).toContain("394700");
  });

  it("loads the correct country-year anomaly file and matches by ticker", async () => {
    const response = await generateChatResponse({
      intent: "ANOMALY_EXPLANATION",
      company: "AsiaMedic Limited",
      country: "Singapore",
      year: 2024,
      tickerSymbol: "505.SI",
      message: "Explain why this company was flagged as an anomaly.",
    });

    expect(response.intent).toBe("ANOMALY_EXPLANATION");
    expect(response.sources).toEqual([]);
    expect(response.data).toMatchObject({
      company: "AsiaMedic Limited",
      year: 2024,
      tickerSymbol: "505.SI",
      anomalyFlag: "False",
      anomalyScore: "0.51",
    });
    expect(response.answer).toContain("**Anomaly Detection Explanation**");
    expect(response.answer).toContain("**Ticker**");
    expect(response.answer).toContain("No anomalies detected. All reported values appear reasonable.");
    expect(response.answer).toContain("**Anomaly Score**");
  });

  it("uses inferred anomaly intent and renders anomaly types when a company is flagged", async () => {
    const response = await generateChatResponse({
      company: "Baker Technology Limited",
      country: "Singapore",
      year: 2024,
      tickerSymbol: "BTP.SI",
      message: "Why was this company flagged as an outlier?",
    });

    expect(response.intent).toBe("ANOMALY_EXPLANATION");
    expect(response.sources).toEqual([]);
    expect(response.data).toMatchObject({
      company: "Baker Technology Limited",
      year: 2024,
      tickerSymbol: "BTP.SI",
      anomalyFlag: "True",
      anomalyTypes: "SECTOR_ZSCORE_WATER_WITHDRAWAL",
      anomalyScore: "0.95",
    });
    expect(response.answer).toContain("was flagged as an anomaly");
    expect(response.answer).toContain("**Anomaly Types**");
    expect(response.answer).toContain("SECTOR_ZSCORE_WATER_WITHDRAWAL");
  });

  it("suppresses anomaly score when the source score is empty or zero-like", async () => {
    const response = await generateChatResponse({
      intent: "ANOMALY_EXPLANATION",
      company: "Tai Sin Electric Limited",
      country: "Singapore",
      year: 2021,
      tickerSymbol: "500.SI",
      message: "Explain why this company was flagged as an anomaly.",
    });

    expect(response.intent).toBe("ANOMALY_EXPLANATION");
    expect(response.sources).toEqual([]);
    expect(response.data).toMatchObject({
      company: "Tai Sin Electric Limited",
      year: 2021,
      tickerSymbol: "500.SI",
      anomalyFlag: "False",
      anomalyScore: null,
    });
    expect(response.answer).not.toContain("**Anomaly Score**");
  });

  it("throws a clear error when the anomaly row is missing for the selected ticker and year", async () => {
    await expect(
      generateChatResponse({
        intent: "ANOMALY_EXPLANATION",
        company: "AsiaMedic Limited",
        country: "Singapore",
        year: 2023,
        tickerSymbol: "NONEXISTENT.SI",
        message: "Explain why this company was flagged as an anomaly.",
      }),
    ).rejects.toThrow(
      'No anomaly row found for ticker_symbol="NONEXISTENT.SI" in anomaly_detection/anomaly_detection_report_2023SG.csv.',
    );
  });

  it("throws a clear error when the extraction row is missing for the selected company and year", async () => {
    await expect(
      generateChatResponse({
        intent: "EXTRACTION_EXPLANATION",
        company: "Nonexistent Company Ltd",
        country: "Singapore",
        year: 2024,
        tickerSymbol: "NONE.SI",
        message: "Explain how water was derived from the extraction output.",
      }),
    ).rejects.toThrow(
      'No extraction row found for company_name="Nonexistent Company Ltd" and report_year=2024.',
    );
  });

  it("throws a clear error when extraction country is missing", async () => {
    await expect(
      generateChatResponse({
        intent: "EXTRACTION_EXPLANATION",
        company: "Able Global Berhad",
        year: 2024,
        tickerSymbol: "7167.KL",
        message: "Explain how energy was derived from the extraction output.",
      }),
    ).rejects.toThrow(
      'No country is available for Able Global Berhad, so extraction lookup cannot be resolved.',
    );
  });

  it("throws a clear error when anomaly ticker is missing", async () => {
    await expect(
      generateChatResponse({
        intent: "ANOMALY_EXPLANATION",
        company: "AsiaMedic Limited",
        country: "Singapore",
        year: 2024,
        message: "Explain why this company was flagged as an anomaly.",
      }),
    ).rejects.toThrow(
      'No ticker symbol is available for AsiaMedic Limited, so anomaly lookup cannot be resolved.',
    );
  });

  it("throws a clear error when anomaly country is missing", async () => {
    await expect(
      generateChatResponse({
        intent: "ANOMALY_EXPLANATION",
        company: "AsiaMedic Limited",
        year: 2024,
        tickerSymbol: "505.SI",
        message: "Explain why this company was flagged as an anomaly.",
      }),
    ).rejects.toThrow(
      'No country is available for AsiaMedic Limited, so anomaly lookup cannot be resolved.',
    );
  });

  it("throws a clear error when the metric group cannot be inferred", async () => {
    await expect(
      generateChatResponse({
        intent: "EXTRACTION_EXPLANATION",
        company: "Able Global Berhad",
        country: "Malaysia",
        year: 2024,
        tickerSymbol: "7167.KL",
        message: "Explain this value.",
      }),
    ).rejects.toThrow(
      "I could not infer the metric group. Mention a metric like emissions, water, energy, fuel, waste, or gfa.",
    );
  });
});
