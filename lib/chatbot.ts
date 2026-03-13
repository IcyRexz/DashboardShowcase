import { loadCsv } from "@/lib/csv";

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
  metricGroup?: MetricGroup;
};

export type ChatResponse = {
  intent: ChatIntent;
  answer: string;
  sources: string[];
  data?: Record<string, unknown>;
};

type CsvRow = Record<string, string>;

const EXTRACTION_FILE = "singapore_2024_merged_with_coverage_rank.csv";
const ANOMALY_FILE = "anomaly_detection_report-3.csv";
const EXTRACTION_COMPANY_COL = "company_name_left";
const EXTRACTION_YEAR_COL = "report_year";
const ANOMALY_COMPANY_COL = "company_name";

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
    keywords: ["emissions", "emission", "ghg", "carbon", "scope 1", "scope 2", "scope 3"],
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

function normalizeTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === "inv") return "investment";
      if (token === "trt") return "trust";
      if (token === "corp") return "corporation";
      return token;
    })
    .filter(
      (token) =>
        token &&
        !["limited", "ltd", "company", "co", "corp", "corporation"].includes(token),
    );
}

function tokensMatch(left: string, right: string) {
  const leftTokens = normalizeTokens(left);
  const rightTokens = normalizeTokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;

  const overlap = leftTokens.filter((token) => rightTokens.includes(token)).length;
  const target = Math.min(leftTokens.length, rightTokens.length);

  return overlap >= Math.max(2, target - 1);
}

function inferMetricGroup(message: string): MetricGroup | undefined {
  const normalized = message.toLowerCase();
  return METRIC_HINTS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  )?.group;
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
  year: number,
  metricGroup: MetricGroup,
) {
  const config = METRIC_CONFIG[metricGroup];
  const calculation = readValue(row, config.calculationCol);
  const notes = readValue(row, config.notesCol);
  const status = readValue(row, config.statusCol);
  const snapshot = formatMetricSnapshot(row, metricGroup);
  const reportName = readValue(row, "report_name");

  const sections = [
    `${company} (${year}) ${metricGroup} extraction explanation.`,
    calculation || "No stored calculation rationale is available for this metric group.",
  ];

  if (notes) {
    sections.push(`Supporting notes: ${notes}`);
  }

  if (status) {
    sections.push(`Validation status: ${status}`);
  }

  return {
    intent: "EXTRACTION_EXPLANATION" as const,
    answer: sections.join("\n\n"),
    sources: [
      EXTRACTION_FILE,
      config.calculationCol,
      config.notesCol,
      config.statusCol,
    ],
    data: {
      company,
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

function buildAnomalyAnswer(row: CsvRow, company: string) {
  const anomalyFlag = readValue(row, "anomaly_flag");
  const anomalyScore = readValue(row, "anomaly_score");
  const anomalyTypes = readValue(row, "anomaly_types");
  const explanation =
    readValue(row, "anomaly_explanation") || "No anomaly explanation is stored for this row.";

  const sections = [
    anomalyFlag.toLowerCase() === "true"
      ? `${company} was flagged as an anomaly by the detection model.`
      : `${company} was not flagged as an anomaly by the detection model.`,
    explanation,
  ];

  if (anomalyTypes) {
    sections.push(`Anomaly types: ${anomalyTypes}`);
  }

  if (anomalyScore) {
    sections.push(`Anomaly score: ${anomalyScore}`);
  }

  return {
    intent: "ANOMALY_EXPLANATION" as const,
    answer: sections.join("\n\n"),
    sources: [
      ANOMALY_FILE,
      "anomaly_flag",
      "anomaly_score",
      "anomaly_types",
      "anomaly_explanation",
    ],
    data: {
      company,
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

    const rows = await loadCsv(EXTRACTION_FILE);
    const year = context.year ?? 2024;
    const row = rows.find(
      (entry) =>
        normalize(readValue(entry, EXTRACTION_COMPANY_COL)) === normalize(context.company) &&
        Number(readValue(entry, EXTRACTION_YEAR_COL)) === year,
    );

    if (!row) {
      throw new Error(
        `No extraction row found for company_name_left="${context.company}" and report_year=${year}.`,
      );
    }

    return buildExtractionAnswer(row, readValue(row, EXTRACTION_COMPANY_COL), year, metricGroup);
  }

  const rows = await loadCsv(ANOMALY_FILE);
  const row = rows.find(
    (entry) =>
      normalize(readValue(entry, ANOMALY_COMPANY_COL)) === normalize(context.company) ||
      tokensMatch(readValue(entry, ANOMALY_COMPANY_COL), context.company),
  );

  if (!row) {
    throw new Error(`No anomaly row found for company_name="${context.company}".`);
  }

  return buildAnomalyAnswer(row, readValue(row, ANOMALY_COMPANY_COL));
}
