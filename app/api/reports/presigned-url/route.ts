import { NextResponse } from "next/server";
import { z } from "zod";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { resolveReportPdfForCompany } from "@/lib/report-pdf";

export const runtime = "nodejs";

const schema = z.object({
  company: z.string().min(1),
  country: z.string().min(1),
  year: z.coerce.number().int(),
  tickerSymbol: z.string().min(1).optional(),
});

function getAwsConfig() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 environment variables for report PDF access.");
  }

  return {
    region,
    bucket,
    endpoint: `https://s3.${region}.amazonaws.com/`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse({
    company: url.searchParams.get("company"),
    country: url.searchParams.get("country"),
    year: url.searchParams.get("year"),
    tickerSymbol: url.searchParams.get("tickerSymbol") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const awsConfig = getAwsConfig();
    const report = await resolveReportPdfForCompany(parsed.data);
    const client = new S3Client({
      region: awsConfig.region,
      endpoint: awsConfig.endpoint,
      forcePathStyle: false,
      credentials: awsConfig.credentials,
    });

    const command = new GetObjectCommand({
      Bucket: awsConfig.bucket,
      Key: report.s3Key,
      ResponseContentType: "application/pdf",
    });

    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: 60 * 10,
    });

    return NextResponse.json({
      url: presignedUrl,
      s3Key: report.s3Key,
      sourceFile: report.sourceFile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate report URL.",
      },
      { status: 404 },
    );
  }
}
