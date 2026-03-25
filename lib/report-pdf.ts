import { loadCsv } from "@/lib/csv";

type CsvRow = Record<string, string>;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readValue(row: CsvRow, key: string) {
  return String(row[key] ?? "").trim();
}

function normalizeCountryForFileName(country: string) {
  return country.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeCountryForS3(country: string) {
  const normalized = country.trim().toLowerCase();

  switch (normalized) {
    case "singapore":
      return "Singapore";
    case "malaysia":
      return "Malaysia";
    case "indonesia":
      return "Indonesia";
    default:
      throw new Error(`Unsupported country "${country}" for report PDF lookup.`);
  }
}

function getReportStemFromSourceImagesPrefix(sourceImagesPrefix: string) {
  const segments = sourceImagesPrefix.split("/").filter(Boolean);
  const stem = segments.at(-1);

  if (!stem) {
    throw new Error("Could not derive report PDF name from source_images_prefix.");
  }

  return stem;
}

export function buildS3ReportKey(
  country: string,
  year: number,
  sourceImagesPrefix: string,
) {
  const countryFolder = normalizeCountryForS3(country);
  const reportStem = getReportStemFromSourceImagesPrefix(sourceImagesPrefix);
  const yearFolder = String(year);

  if (countryFolder === "Singapore") {
    return `Webscrapping/${countryFolder}/600_companies_reports/${yearFolder}/${reportStem}.pdf`;
  }

  return `Webscrapping/${countryFolder}/${yearFolder}/${reportStem}.pdf`;
}

async function loadExtractionRows(country: string, year: number) {
  const sourceFile = `${normalizeCountryForFileName(country)}_${year}.csv`;
  const rows = await loadCsv(sourceFile);
  return { rows, sourceFile };
}

export async function resolveReportPdfForCompany(context: {
  company: string;
  country: string;
  year: number;
  tickerSymbol?: string | null;
}) {
  const { rows, sourceFile } = await loadExtractionRows(context.country, context.year);

  const row = rows.find((entry) => {
    const rowTicker = readValue(entry, "ticker_symbol");
    if (context.tickerSymbol && rowTicker) {
      return normalize(rowTicker) === normalize(context.tickerSymbol);
    }

    return normalize(readValue(entry, "company_name")) === normalize(context.company);
  });

  if (!row) {
    throw new Error(
      `No extraction row found for report PDF lookup in ${sourceFile} for company="${context.company}".`,
    );
  }

  const sourceImagesPrefix = readValue(row, "source_images_prefix");
  if (!sourceImagesPrefix) {
    throw new Error(`No source_images_prefix is stored for ${context.company}.`);
  }

  return {
    sourceFile,
    sourceImagesPrefix,
    s3Key: buildS3ReportKey(context.country, context.year, sourceImagesPrefix),
  };
}
