"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SustainabilityCompany } from "@/data/sustainability";

type PdfResponse = {
  url?: string;
  s3Key?: string;
  sourceFile?: string;
  error?: string;
};

interface RawPdfTabContentProps {
  company: SustainabilityCompany;
}

export function RawPdfTabContent({ company }: RawPdfTabContentProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setPdfUrl(null);
      setSourceFile(null);
      setS3Key(null);
      setError(null);

      try {
        const params = new URLSearchParams({
          company: company.name,
          country: company.country,
          year: String(company.reportYear),
        });

        if (company.tickerSymbol) {
          params.set("tickerSymbol", company.tickerSymbol);
        }

        const response = await fetch(`/api/reports/presigned-url?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as PdfResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load PDF preview.");
        }

        if (cancelled) return;

        setPdfUrl(data.url ?? null);
        setSourceFile(data.sourceFile ?? null);
        setS3Key(data.s3Key ?? null);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load PDF preview.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
    };
  }, [company]);

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-lg border border-gray-200 bg-gray-50">
      {loading ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sustainability report PDF...
            </div>
            <p className="text-xs text-gray-500">
              Fetching a temporary signed URL from S3 for {company.name}.
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-md space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-red-700">
              <FileWarning className="h-4 w-4" />
              PDF preview unavailable
            </div>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <>
          {/* <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-2 text-xs text-gray-500">
            <div className="min-w-0">
              <div className="truncate">Source: {sourceFile}</div>
              <div className="truncate">S3 Key: {s3Key}</div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div> */}
          <iframe
            src={pdfUrl}
            title={`${company.name} sustainability report PDF`}
            className="min-h-0 flex-1 rounded-b-lg bg-white"
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-gray-600">No PDF URL was returned for this company.</p>
        </div>
      )}
    </div>
  );
}
