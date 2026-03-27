import { beforeEach, describe, expect, it } from "vitest";
import { clearCsvCache } from "./csv";
import { buildS3ReportKey, resolveReportPdfForCompany } from "./report-pdf";

describe("buildS3ReportKey", () => {
  const directoryCases = [
    {
      country: "Singapore",
      year: 2021,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-singapore-2021/tai/tai_sin_electric_limited_2021_secondary_sustainability_report/",
      expected:
        "Webscrapping/Singapore/600_companies_reports/2021/tai_sin_electric_limited_2021_secondary_sustainability_report.pdf",
    },
    {
      country: "Singapore",
      year: 2022,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-singapore-2022/midas/midas_holdings_limited_2022_secondary_sustainability_report/",
      expected:
        "Webscrapping/Singapore/600_companies_reports/2022/midas_holdings_limited_2022_secondary_sustainability_report.pdf",
    },
    {
      country: "Singapore",
      year: 2023,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-singapore-2023/midas_holdings_limited/midas_holdings_limited_2023_sustainability_report/",
      expected:
        "Webscrapping/Singapore/600_companies_reports/2023/midas_holdings_limited/midas_holdings_limited_2023_sustainability_report.pdf",
    },
    {
      country: "Singapore",
      year: 2024,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-singapore-2024/hutchison/hutchison_port_holdings_trust_2022_secondary_sustainability_report/",
      expected:
        "Webscrapping/Singapore/600_companies_reports/2024/hutchison_port_holdings_trust_2024_secondary_sustainability_report.pdf",
    },
    {
      country: "Malaysia",
      year: 2022,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-malaysia-2022/able/able_global_berhad_2022_sustainability_report/",
      expected:
        "Webscrapping/Malaysia/2022/able_global_berhad_2022_sustainability_report.pdf",
    },
    {
      country: "Malaysia",
      year: 2023,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-malaysia-2023/able/able_global_berhad_2023_sustainability_report/",
      expected:
        "Webscrapping/Malaysia/2023/able_global_berhad_2023_sustainability_report.pdf",
    },
    {
      country: "Malaysia",
      year: 2024,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-malaysia-2024/able/able_global_berhad_2024_sustainability_report/",
      expected:
        "Webscrapping/Malaysia/2024/able_global_berhad_2024_sustainability_report.pdf",
    },
    {
      country: "Indonesia",
      year: 2022,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-indonesia-2022/essa/essa_industries_indonesia_tbk._2022_sustainability_report/",
      expected:
        "Webscrapping/Indonesia/2022/essa_industries_indonesia_tbk._2022_sustainability_report.pdf",
    },
    {
      country: "Indonesia",
      year: 2023,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-indonesia-2023/astra/astra_agro_lestari_tbk._2023_sustainability_report/",
      expected:
        "Webscrapping/Indonesia/2023/astra_agro_lestari_tbk._2023_sustainability_report.pdf",
    },
    {
      country: "Indonesia",
      year: 2024,
      sourceImagesPrefix:
        "data-extraction/trimmed-png-indonesia-2024/astra/astra_agro_lestari_tbk._2024_sustainability_report/",
      expected:
        "Webscrapping/Indonesia/2024/astra_agro_lestari_tbk._2024_sustainability_report.pdf",
    },
  ] as const;

  it.each(directoryCases)(
    "builds the correct raw PDF key for $country $year",
    ({ country, year, sourceImagesPrefix, expected }) => {
      expect(buildS3ReportKey(country, year, sourceImagesPrefix)).toBe(expected);
    },
  );

  it("uses the special Singapore directory layout", () => {
    expect(
      buildS3ReportKey(
        "Singapore",
        2022,
        "data-extraction/trimmed-png-singapore-2022/midas/midas_holdings_limited_2022_secondary_sustainability_report/",
      ),
    ).toBe(
      "Webscrapping/Singapore/600_companies_reports/2022/midas_holdings_limited_2022_secondary_sustainability_report.pdf",
    );
  });

  it("uses the extra company folder for Singapore 2023", () => {
    expect(
      buildS3ReportKey(
        "Singapore",
        2023,
        "data-extraction/trimmed-png-singapore-2023/sia_engineering_company_limited/sia_engineering_company_limited_2023_sustainability_report/",
      ),
    ).toBe(
      "Webscrapping/Singapore/600_companies_reports/2023/sia_engineering_company_limited/sia_engineering_company_limited_2023_sustainability_report.pdf",
    );
  });

  it("rewrites the embedded report year to match the selected year", () => {
    expect(
      buildS3ReportKey(
        "Singapore",
        2024,
        "data-extraction/trimmed-png-singapore-2024/hutchison/hutchison_port_holdings_trust_2022_secondary_sustainability_report/",
      ),
    ).toBe(
      "Webscrapping/Singapore/600_companies_reports/2024/hutchison_port_holdings_trust_2024_secondary_sustainability_report.pdf",
    );
  });

  it("uses the standard Malaysia directory layout", () => {
    expect(
      buildS3ReportKey(
        "Malaysia",
        2023,
        "data-extraction/trimmed-png-malaysia-2023/able/able_global_berhad_2023_sustainability_report/",
      ),
    ).toBe(
      "Webscrapping/Malaysia/2023/able_global_berhad_2023_sustainability_report.pdf",
    );
  });
});

describe("resolveReportPdfForCompany", () => {
  beforeEach(() => {
    clearCsvCache();
  });

  const resolutionCases = [
    {
      company: "Tai Sin Electric Limited",
      country: "Singapore",
      year: 2021,
      tickerSymbol: "500.SI",
      sourceFile: "singapore_2021.csv",
      s3Key:
        "Webscrapping/Singapore/600_companies_reports/2021/tai_sin_electric_limited_2021_secondary_sustainability_report.pdf",
    },
    {
      company: "Able Global Berhad",
      country: "Malaysia",
      year: 2024,
      tickerSymbol: "7167.KL",
      sourceFile: "malaysia_2024.csv",
      s3Key:
        "Webscrapping/Malaysia/2024/able_global_berhad_2024_sustainability_report.pdf",
    },
    {
      company: "PT Astra Agro Lestari Tbk",
      country: "Indonesia",
      year: 2024,
      tickerSymbol: "AALI.JK",
      sourceFile: "indonesia_2024.csv",
      s3Key:
        "Webscrapping/Indonesia/2024/astra_agro_lestari_tbk._2024_sustainability_report.pdf",
    },
  ] as const;

  it.each(resolutionCases)(
    "derives the correct S3 key from the extraction CSV row for $country $year",
    async ({ company, country, year, tickerSymbol, sourceFile, s3Key }) => {
      const result = await resolveReportPdfForCompany({
        company,
        country,
        year,
        tickerSymbol,
      });

      expect(result.sourceFile).toBe(sourceFile);
      expect(result.s3Key).toBe(s3Key);
    },
  );
});
