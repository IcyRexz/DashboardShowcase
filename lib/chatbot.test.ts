import { beforeEach, describe, expect, it } from "vitest";
import { clearCsvCache } from "./csv";
import { generateChatResponse, inferChatIntent } from "./chatbot";

describe("inferChatIntent", () => {
  it("routes anomaly-style prompts to anomaly explanation", () => {
    expect(inferChatIntent("Why was this company flagged as an anomaly?")).toBe(
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
    expect(response.sources[0]).toBe("anomaly_detection/anomaly_detection_report_2024SG.csv");
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
    expect(response.sources[0]).toBe("anomaly_detection/anomaly_detection_report_2021SG.csv");
    expect(response.data).toMatchObject({
      company: "Tai Sin Electric Limited",
      year: 2021,
      tickerSymbol: "500.SI",
      anomalyFlag: "False",
      anomalyScore: null,
    });
    expect(response.answer).not.toContain("**Anomaly Score**");
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
