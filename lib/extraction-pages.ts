import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export type MetricGroup =
  | "emissions"
  | "water"
  | "energy"
  | "fuel"
  | "waste"
  | "gfa";

const GROUP_FOLDER_BY_METRIC: Record<MetricGroup, string> = {
  emissions: "Group_1_Emissions",
  water: "Group_2_Water",
  energy: "Group_3_Energy",
  fuel: "Group_4_Fuel",
  waste: "Group_5_Waste",
  gfa: "Group_6_GFA",
};

const pageCache = new Map<string, string[]>();

function normalizeCountryForTrimmedPng(country: string) {
  return country.trim().toLowerCase().replace(/\s+/g, "-");
}

function getAwsConfig() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 environment variables for extraction page lookup.");
  }

  return {
    region,
    bucket,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}

export function buildExtractionPagePrefix(
  country: string,
  year: number,
  sourceImagesPrefix: string,
  metricGroup: MetricGroup,
) {
  const segments = sourceImagesPrefix.split("/").filter(Boolean);
  const companyFolder = segments.at(-2);
  const reportStem = segments.at(-1);

  if (!companyFolder || !reportStem) {
    throw new Error("Could not derive extraction page prefix from source_images_prefix.");
  }

  return [
    "data-extraction",
    `trimmed-png-${normalizeCountryForTrimmedPng(country)}-${year}`,
    companyFolder,
    reportStem,
    GROUP_FOLDER_BY_METRIC[metricGroup],
    "",
  ].join("/");
}

export function parsePageNumberFromKey(key: string) {
  const match = key.match(/page_(\d+)\.png$/i);
  if (!match) return null;

  const pageNumber = Number(match[1]);
  if (!Number.isFinite(pageNumber)) return null;

  return `Page ${pageNumber}`;
}

export async function getExtractionPageSources(input: {
  country: string;
  year: number;
  sourceImagesPrefix: string;
  metricGroup: MetricGroup;
}) {
  const prefix = buildExtractionPagePrefix(
    input.country,
    input.year,
    input.sourceImagesPrefix,
    input.metricGroup,
  );

  if (pageCache.has(prefix)) {
    return pageCache.get(prefix)!;
  }

  const awsConfig = getAwsConfig();
  const client = new S3Client({
    region: awsConfig.region,
    credentials: awsConfig.credentials,
  });

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: awsConfig.bucket,
      Prefix: prefix,
    }),
  );

  const pageSources = (response.Contents ?? [])
    .map((item) => parsePageNumberFromKey(item.Key ?? ""))
    .filter((value): value is string => value !== null)
    .sort((left, right) => Number(left.replace("Page ", "")) - Number(right.replace("Page ", "")));

  pageCache.set(prefix, pageSources);
  return pageSources;
}
