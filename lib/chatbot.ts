import { loadCsv } from "@/lib/csv";
import { getExtractionPageSources, type MetricGroup as ExtractionPageMetricGroup } from "@/lib/extraction-pages";

export type ChatIntent = "EXTRACTION_EXPLANATION" | "ANOMALY_EXPLANATION";

export type MetricGroup =
  | "emissions"
  | "water"
  | "energy"
  | "fuel"
  | "waste"
  | "gfa";

export type ChatContext = {
  intent?: ChatIntent;
  company: string;
  message: string;
  year?: number;
  country?: string;
  tickerSymbol?: string | null;
  metricGroup?: MetricGroup;
};

export type ChatResponse = {
  intent: ChatIntent;
  answer: string;
  sources: string[];
  data?: Record<string, unknown>;
};

type CsvRow = Record<string, string>;

const EXTRACTION_COMPANY_COL = "company_name";
const EXTRACTION_YEAR_COL = "report_year";
const ANOMALY_TICKER_COL = "ticker_symbol";
const ANOMALY_DIRECTORY = "anomaly_detection";

const ANOMALY_HINTS = [
  "anomaly",
  "anomalous",
  "flagged",
  "outlier",
  "weird",
  "unusual",
  "suspicious",
];

const METRIC_HINTS: Array<{
  group: MetricGroup;
  keywords: string[];
}> = [
  {
    group: "emissions",
    keywords: ["emissions", "emission", "ghg", "carbon", "scope 1", "scope 2", "scope 3", "scope1", "scope2", "scope3"],
  },
  {
    group: "water",
    keywords: ["water", "withdrawal", "discharge", "consumption", "recycled water"],
  },
  {
    group: "energy",
    keywords: ["energy", "electricity", "steam", "heating", "cooling", "renewable"],
  },
  {
    group: "fuel",
    keywords: ["fuel", "diesel", "natural gas", "biomass", "lpg", "furnace oil"],
  },
  {
    group: "waste",
    keywords: ["waste", "disposed", "recycled", "generated", "diversion"],
  },
  {
    group: "gfa",
    keywords: ["gfa", "gross floor area", "floor area"],
  },
];

const METRIC_CONFIG: Record<
  MetricGroup,
  {
    calculationCol: string;
    notesCol: string;
    statusCol: string;
    valueFields: Array<{ label: string; valueCol: string; unitCol?: string }>;
  }
> = {
  emissions: {
    calculationCol: "emissions_calculation",
    notesCol: "emissions_notes",
    statusCol: "emissions_status",
    valueFields: [
      { label: "Scope 1", valueCol: "scope_1_value", unitCol: "scope_1_unit" },
      { label: "Scope 2", valueCol: "scope_2_value", unitCol: "scope_2_unit" },
      { label: "Scope 3", valueCol: "scope_3_value", unitCol: "scope_3_unit" },
    ],
  },
  water: {
    calculationCol: "water_calculation",
    notesCol: "water_notes",
    statusCol: "water_status",
    valueFields: [
      {
        label: "Water withdrawal",
        valueCol: "water_withdrawal_value",
        unitCol: "water_withdrawal_unit",
      },
      {
        label: "Water discharge",
        valueCol: "water_discharge_value",
        unitCol: "water_discharge_unit",
      },
      {
        label: "Water consumption",
        valueCol: "water_consumption_value",
        unitCol: "water_consumption_unit",
      },
      {
        label: "Water recycled",
        valueCol: "water_recycled_value",
        unitCol: "water_recycled_unit",
      },
    ],
  },
  energy: {
    calculationCol: "energy_calculation",
    notesCol: "energy_notes",
    statusCol: "energy_status",
    valueFields: [
      {
        label: "Electricity",
        valueCol: "energy_electricity_value",
        unitCol: "energy_electricity_unit",
      },
      { label: "Steam", valueCol: "energy_steam_value", unitCol: "energy_steam_unit" },
      {
        label: "Heating",
        valueCol: "energy_heating_value",
        unitCol: "energy_heating_unit",
      },
      {
        label: "Cooling",
        valueCol: "energy_cooling_value",
        unitCol: "energy_cooling_unit",
      },
      {
        label: "Renewables",
        valueCol: "energy_renewables_value",
        unitCol: "energy_renewables_unit",
      },
      {
        label: "Total stated energy",
        valueCol: "energy_total_stated_value",
        unitCol: "energy_total_stated_unit",
      },
    ],
  },
  fuel: {
    calculationCol: "fuel_calculation",
    notesCol: "fuel_notes",
    statusCol: "fuel_status",
    valueFields: [
      {
        label: "Total fuel",
        valueCol: "fuel_total_value",
        unitCol: "fuel_total_unit",
      },
      {
        label: "Stationary fuel",
        valueCol: "fuel_stationary_value",
        unitCol: "fuel_stationary_unit",
      },
      {
        label: "Mobile fuel",
        valueCol: "fuel_mobile_value",
        unitCol: "fuel_mobile_unit",
      },
    ],
  },
  waste: {
    calculationCol: "waste_calculation",
    notesCol: "waste_notes",
    statusCol: "waste_status",
    valueFields: [
      {
        label: "Waste generated",
        valueCol: "waste_generated_value",
        unitCol: "waste_generated_unit",
      },
      {
        label: "Waste disposed",
        valueCol: "waste_disposed_value",
        unitCol: "waste_disposed_unit",
      },
      {
        label: "Waste recycled",
        valueCol: "waste_recycled_value",
        unitCol: "waste_recycled_unit",
      },
    ],
  },
  gfa: {
    calculationCol: "gfa_calculation",
    notesCol: "gfa_notes",
    statusCol: "gfa_status",
    valueFields: [{ label: "Gross floor area", valueCol: "gfa_value", unitCol: "gfa_unit" }],
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readValue(row: CsvRow, key: string) {
  return String(row[key] ?? "").trim();
}

function formatAnomalyScore(score: string) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return score || null;
  if (numericScore === 0) return null;
  return numericScore.toFixed(2);
}

function humanizeMetricGroup(metricGroup: MetricGroup) {
  switch (metricGroup) {
    case "gfa":
      return "GFA";
    default:
      return metricGroup.charAt(0).toUpperCase() + metricGroup.slice(1);
  }
}

function formatSnapshotLine(entry: { label: string; value: string; unit?: string }) {
  return `- \`${entry.label}\`: \`${entry.value}${entry.unit ? ` ${entry.unit}` : ""}\``;
}

function inferMetricGroup(message: string): MetricGroup | undefined {
  const normalized = message.toLowerCase();
  return METRIC_HINTS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  )?.group;
}

function normalizeCountryForFileName(country: string) {
  return country.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeCountryForAnomalyFile(country: string) {
  const normalized = country.trim().toLowerCase();

  switch (normalized) {
    case "singapore":
      return "SG";
    case "indonesia":
      return "ID";
    case "malaysia":
      return "MY";
    default:
      throw new Error(
        `No anomaly file mapping exists for country="${country}". Expected Singapore, Indonesia, or Malaysia.`,
      );
  }
}

async function loadExtractionRows(country: string, year: number): Promise<{
  rows: CsvRow[];
  sourceFile: string;
}> {
  const sourceFile = `${normalizeCountryForFileName(country)}_${year}.csv`;
  const rows = await loadCsv(sourceFile);
  return { rows, sourceFile };
}

async function loadAnomalyRows(country: string, year: number): Promise<{
  rows: CsvRow[];
  sourceFile: string;
}> {
  const countryCode = normalizeCountryForAnomalyFile(country);
  const sourceFile = `${ANOMALY_DIRECTORY}/anomaly_detection_report_${year}${countryCode}.csv`;
  const rows = await loadCsv(sourceFile);
  return { rows, sourceFile };
}

function formatMetricSnapshot(
  row: CsvRow,
  metricGroup: MetricGroup,
): Array<{ label: string; value: string; unit?: string }> {
  return METRIC_CONFIG[metricGroup].valueFields
    .map(({ label, valueCol, unitCol }) => {
      const value = readValue(row, valueCol);
      const unit = unitCol ? readValue(row, unitCol) : "";
      if (!value) return null;
      return { label, value, unit: unit || undefined };
    })
    .filter((entry): entry is { label: string; value: string; unit?: string } => entry !== null);
}

function buildExtractionAnswer(
  row: CsvRow,
  company: string,
  country: string,
  year: number,
  metricGroup: MetricGroup,
  sourceFile: string,
) {
  const config = METRIC_CONFIG[metricGroup];
  const calculation = readValue(row, config.calculationCol);
  const notes = readValue(row, config.notesCol);
  const status = readValue(row, config.statusCol);
  const snapshot = formatMetricSnapshot(row, metricGroup);
  const reportName = readValue(row, "report_name");

  const sections = [
    `**${humanizeMetricGroup(metricGroup)} Extraction Explanation**`,
    `**${company}** · **${year}**`,
    `**Calculation**\n${calculation || "No stored calculation rationale is available for this metric group."}`,
  ];

  if (snapshot.length > 0) {
    sections.push(
      `**Extracted Values**\n${snapshot.map(formatSnapshotLine).join("\n")}`,
    );
  }

  if (notes) {
    sections.push(`**Supporting Notes**\n${notes}`);
  }

  if (status) {
    sections.push(`**Validation Status**\n- \`${status}\``);
  }

  return {
    intent: "EXTRACTION_EXPLANATION" as const,
    answer: sections.join("\n\n"),
    sources: [sourceFile],
    data: {
      company,
      country,
      year,
      metricGroup,
      reportName: reportName || undefined,
      metricSnapshot: snapshot,
      calculation: calculation || null,
      notes: notes || null,
      status: status || null,
      coverageScore: readValue(row, "coverage_score") || null,
      sectorRank: readValue(row, "sector_rank") || null,
      sectorPercentile: readValue(row, "sector_percentile") || null,
    },
  };
}

function buildAnomalyAnswer(
  row: CsvRow,
  company: string,
  tickerSymbol: string,
  sourceFile: string,
  year?: number,
) {
  const anomalyFlag = readValue(row, "anomaly_flag");
  const anomalyScore = formatAnomalyScore(readValue(row, "anomaly_score"));
  const anomalyTypes = readValue(row, "anomaly_types");
  const explanation =
    readValue(row, "anomaly_explanation") || "No anomaly explanation is stored for this row.";

  const sections = [
    "**Anomaly Detection Explanation**",
    year ? `**${company}** · **${year}**` : `**${company}**`,
    `**Ticker**\n- \`${tickerSymbol}\``,
    `**Finding**\n${
      anomalyFlag.toLowerCase() === "true"
        ? `${company} was flagged as an anomaly by the detection model.`
        : `${company} was not flagged as an anomaly by the detection model.`
    }`,
    `**Explanation**\n${explanation}`,
  ];

  if (anomalyTypes) {
    sections.push(`**Anomaly Types**\n- \`${anomalyTypes}\``);
  }

  if (anomalyScore) {
    sections.push(`**Anomaly Score**\n- \`${anomalyScore}\``);
  }

  return {
    intent: "ANOMALY_EXPLANATION" as const,
    answer: sections.join("\n\n"),
    sources: [
      sourceFile,
      ANOMALY_TICKER_COL,
      "anomaly_flag",
      "anomaly_score",
      "anomaly_types",
      "anomaly_explanation",
    ],
    data: {
      company,
      year: year ?? null,
      tickerSymbol,
      anomalyFlag: anomalyFlag || null,
      anomalyScore: anomalyScore || null,
      anomalyTypes: anomalyTypes || null,
      anomalyExplanation: explanation,
      metrics: {
        scope1Raw: readValue(row, "scope_1_raw") || null,
        scope1Unit: readValue(row, "scope_1_unit") || null,
        scope1Normalized: readValue(row, "scope_1_normalised_tCO2e") || null,
        scope2Raw: readValue(row, "scope_2_raw") || null,
        scope2Unit: readValue(row, "scope_2_unit") || null,
        scope2Normalized: readValue(row, "scope_2_normalised_tCO2e") || null,
        totalEnergyRaw: readValue(row, "total_energy_raw") || null,
        totalEnergyUnit: readValue(row, "total_energy_unit") || null,
        totalEnergyNormalized: readValue(row, "total_energy_normalised_GJ") || null,
      },
    },
  };
}

export function inferChatIntent(message: string): ChatIntent {
  const normalized = message.toLowerCase();
  const isAnomaly = ANOMALY_HINTS.some((hint) => normalized.includes(hint));

  if (isAnomaly) {
    return "ANOMALY_EXPLANATION";
  }

  return "EXTRACTION_EXPLANATION";
}

export async function generateChatResponse(context: ChatContext): Promise<ChatResponse> {
  const intent = context.intent ?? inferChatIntent(context.message);

  if (intent === "EXTRACTION_EXPLANATION") {
    const metricGroup = context.metricGroup ?? inferMetricGroup(context.message);

    if (!metricGroup) {
      throw new Error(
        "I could not infer the metric group. Mention a metric like emissions, water, energy, fuel, waste, or gfa.",
      );
    }

    const year = context.year ?? 2024;
    const country = context.country?.trim();
    if (!country) {
      throw new Error(
        `No country is available for ${context.company}, so extraction lookup cannot be resolved.`,
      );
    }

    const { rows, sourceFile } = await loadExtractionRows(country, year);
    const row = rows.find(
      (entry) =>
        normalize(readValue(entry, EXTRACTION_COMPANY_COL)) === normalize(context.company) &&
        Number(readValue(entry, EXTRACTION_YEAR_COL)) === year,
    );

    if (!row) {
      throw new Error(
        `No extraction row found for company_name="${context.company}" and report_year=${year}.`,
      );
    }

    const sourceImagesPrefix = readValue(row, "source_images_prefix");
    let pageSources: string[] = [];

    if (sourceImagesPrefix) {
      try {
        pageSources = await getExtractionPageSources({
          country,
          year,
          sourceImagesPrefix,
          metricGroup: metricGroup as ExtractionPageMetricGroup,
        });
      } catch {
        pageSources = [];
      }
    }

    const response = buildExtractionAnswer(
      row,
      readValue(row, EXTRACTION_COMPANY_COL),
      country,
      year,
      metricGroup,
      sourceFile,
    );

    response.sources = pageSources;
    return response;
  }

  const tickerSymbol = context.tickerSymbol?.trim();
  if (!tickerSymbol) {
    throw new Error(
      `No ticker symbol is available for ${context.company}, so anomaly lookup cannot be resolved.`,
    );
  }
  const year = context.year ?? 2024;
  const country = context.country?.trim();
  if (!country) {
    throw new Error(
      `No country is available for ${context.company}, so anomaly lookup cannot be resolved.`,
    );
  }

  const { rows, sourceFile } = await loadAnomalyRows(country, year);
  const row = rows.find(
    (entry) => normalize(readValue(entry, ANOMALY_TICKER_COL)) === normalize(tickerSymbol),
  );

  if (!row) {
    throw new Error(
      `No anomaly row found for ticker_symbol="${tickerSymbol}" in ${sourceFile}.`,
    );
  }

  return buildAnomalyAnswer(row, context.company, tickerSymbol, sourceFile, year);
}
