import { beforeEach, describe, expect, it } from "vitest";
import { clearCsvCache } from "./csv";
import { buildS3ReportKey, resolveReportPdfForCompany } from "./report-pdf";

describe("buildS3ReportKey", () => {
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

  it("derives the correct S3 key from the extraction CSV row", async () => {
    const result = await resolveReportPdfForCompany({
      company: "Midas Holdings Limited",
      country: "Singapore",
      year: 2022,
      tickerSymbol: "5EN.SI",
    });

    expect(result.sourceFile).toBe("singapore_2022.csv");
    expect(result.s3Key).toBe(
      "Webscrapping/Singapore/600_companies_reports/2022/midas_holdings_limited_2022_secondary_sustainability_report.pdf",
    );
  });
});
