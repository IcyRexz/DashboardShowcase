import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateChatResponse,
  type ChatIntent,
  type MetricGroup,
} from "@/lib/chatbot";

export const runtime = "nodejs";

const metricGroupSchema = z.enum([
  "emissions",
  "water",
  "energy",
  "fuel",
  "waste",
  "gfa",
]);

const intentSchema = z.enum([
  "EXTRACTION_EXPLANATION",
  "ANOMALY_EXPLANATION",
]);

const schema = z.object({
  message: z.string().min(1),
  context: z.object({
    intent: intentSchema.optional(),
    company: z.string().min(1),
    year: z.number().int().optional(),
    tickerSymbol: z.string().min(1).optional(),
    metricGroup: metricGroupSchema.optional(),
  }),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { message, context } = parsed.data;
  const metricGroup = context.metricGroup as MetricGroup | undefined;

  try {
    const response = await generateChatResponse({
      intent: context.intent as ChatIntent | undefined,
      company: context.company,
      message,
      year: context.year,
      tickerSymbol: context.tickerSymbol,
      metricGroup,
    });

    return NextResponse.json({
      ...response,
      message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat request failed.",
      },
      { status: 404 },
    );
  }
}
