"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  FileText,
  Calendar,
  ShieldCheck,
  ShieldX,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SustainabilityCompany } from "@/data/sustainability";
import {
  fmtTCO2e,
  fmtPct,
  fmtQuantity,
  fmtNumber,
  fmtEnergy,
  fmtWater,
  fmtWaste,
  type UnitView,
  getPeerStrategyExamples,
  getCompletenessBadgeClass,
  getCompletenessFieldRows,
  COMPLETENESS_GREEN_MIN,
} from "@/data/sustainability";
import { CompanyAiChatPanel } from "@/components/dashboard/company-ai-chat-panel";
import { RawPdfTabContent } from "@/components/dashboard/raw-pdf-tab-content";

interface BottomDetailsPanelProps {
  company: SustainabilityCompany | null;
  onClear: () => void;
  unitView?: UnitView;
  allCompanies?: SustainabilityCompany[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanizeKey(key: string): string {
  const withSpaces = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function toReadableText(value: unknown, indent = 0): string[] {
  const pad = " ".repeat(indent);

  if (value === null || value === undefined) {
    return [`${pad}-`];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [`${pad}${String(value)}`];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${pad}None`];
    }

    const lines: string[] = [];
    value.forEach((entry, index) => {
      if (isRecord(entry)) {
        const objectLines = toReadableText(entry, indent + 2);
        lines.push(`${pad}Item ${index + 1}`);
        lines.push(...objectLines);
      } else {
        const primitive = toReadableText(entry, 0)[0] ?? "-";
        lines.push(`${pad}- ${primitive}`);
      }
    });
    return lines;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, v]) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string" && v.trim().length === 0) return false;
      return true;
    });

    if (entries.length === 0) {
      return [`${pad}No details available`];
    }

    const lines: string[] = [];
    entries.forEach(([key, entryValue]) => {
      const label = humanizeKey(key);

      if (
        typeof entryValue === "string" ||
        typeof entryValue === "number" ||
        typeof entryValue === "boolean"
      ) {
        lines.push(`${pad}${label}: ${String(entryValue)}`);
      } else {
        lines.push(`${pad}${label}:`);
        lines.push(...toReadableText(entryValue, indent + 2));
      }
    });
    return lines;
  }

  return [`${pad}${String(value)}`];
}

function formatPossiblyJsonText(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as unknown;
    return toReadableText(parsed).join("\n");
  } catch {
    return text;
  }
}

export function BottomDetailsPanel({
  company,
  onClear,
  unitView = "Canonical",
  allCompanies = [],
}: BottomDetailsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showStrategy, setShowStrategy] = useState(false);
  const [expandedPeerId, setExpandedPeerId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(560);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );

  useEffect(() => {
    if (company) {
      setIsMinimized(false);
      setIsAiOpen(false);
    }
  }, [company]);

  useEffect(() => {
    const nextHeight = Math.round(window.innerHeight * 0.66);
    setPanelHeight(Math.min(Math.max(nextHeight, 420), Math.round(window.innerHeight * 0.82)));
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaY = resizeState.startY - event.clientY;
      const maxHeight = Math.round(window.innerHeight * 0.9);
      const nextHeight = Math.min(
        Math.max(resizeState.startHeight + deltaY, 360),
        maxHeight,
      );

      setPanelHeight(nextHeight);
    }

    function handlePointerUp() {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: panelHeight,
    };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }

  if (!company) {
    return (
      <div className="w-full panel-glass rounded-lg p-6">
        <div className="flex items-center justify-center h-24 text-gray-400">
          <Building2 className="h-5 w-5 mr-2" />
          <span className="text-sm">
            Select a marker or company to view sustainability details
          </span>
        </div>
      </div>
    );
  }

  const completeness = company.derived.completeness;
  const completenessStrong = completeness.meetsGreenThreshold;
  const completenessFieldRows = getCompletenessFieldRows(company);
  const peerExamples =
    allCompanies.length > 0
      ? getPeerStrategyExamples(company, allCompanies)
      : [];

  if (isMinimized) {
    return (
      <div className="w-full panel-glass rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {company.name}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${getCompletenessBadgeClass(completenessStrong)}`}
              title="Data completeness (overview fields filled)"
            >
              {completeness.score12}/12
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Expand panel"
              title="Expand panel"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Close panel"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-col panel-glass rounded-lg overflow-hidden"
      style={{ height: panelHeight }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom panel"
        onPointerDown={handleResizeStart}
        className="group flex h-4 cursor-ns-resize items-center justify-center border-b border-gray-200 bg-white/80"
      >
        <div className="h-1 w-14 rounded-full bg-gray-300 transition-colors group-hover:bg-gray-400" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {company.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {company.city}, {company.country} · Report Year{" "}
                  {company.reportYear}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`ml-2 ${getCompletenessBadgeClass(completenessStrong)}`}
                title="Data completeness (overview fields filled)"
              >
                {completeness.score12}/12
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Minimize panel"
                title="Minimize panel"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Close panel"
                title="Close panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 pt-2">
              <TabsList className="bg-transparent h-9 p-0 gap-4">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-0 text-gray-400 hover:text-gray-700"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="data-quality"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-0 text-gray-400 hover:text-gray-700"
                >
                  Data Quality
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-0 text-gray-400 hover:text-gray-700"
                >
                  Notes & Strategy
                </TabsTrigger>
                <TabsTrigger
                  value="peers"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-0 text-gray-400 hover:text-gray-700"
                >
                  Peer Examples
                </TabsTrigger>
                <TabsTrigger
                  value="raw-pdf"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-0 text-gray-400 hover:text-gray-700"
                >
                  Raw PDF
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAiOpen((current) => !current)}
                className="mb-2 h-9 rounded-md border-emerald-300 bg-emerald-50 px-3 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
              >
                Ask AI
              </Button>
            </div>

            <TabsContent value="overview" className="m-0 h-full overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Scope 1</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {unitView === "Canonical" &&
                      company.normalized?.scope1TCO2e != null
                      ? `${fmtNumber(company.normalized.scope1TCO2e)} tCO2e`
                      : fmtQuantity(company.emissions.scope1)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Scope 2</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {unitView === "Canonical" &&
                      company.normalized?.scope2TCO2e != null
                      ? `${fmtNumber(company.normalized.scope2TCO2e)} tCO2e`
                      : fmtQuantity(company.emissions.scope2)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Scope 3</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {unitView === "Canonical" &&
                      company.normalized?.scope3TCO2e != null
                      ? `${fmtNumber(company.normalized.scope3TCO2e)} tCO2e`
                      : fmtQuantity(company.emissions.scope3)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Scope 1+2 Total</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtTCO2e(company.derived.scope12Total)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Waste Generated</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtWaste(
                      company.waste.generated,
                      company.normalized?.wasteGeneratedTonnes,
                      unitView,
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Waste Recycled</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtWaste(
                      company.waste.recycled,
                      company.normalized?.wasteRecycledTonnes,
                      unitView,
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Waste Disposed</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtWaste(
                      company.waste.disposed,
                      company.normalized?.wasteDisposedTonnes,
                      unitView,
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Diversion Rate</span>
                  </div>
                  <p
                    className={`text-sm font-medium ${company.derived.wasteDiversionRate !== null &&
                      company.derived.wasteDiversionRate >= 0.5
                      ? "text-emerald-600"
                      : company.derived.wasteDiversionRate !== null &&
                        company.derived.wasteDiversionRate < 0.3
                        ? "text-red-600"
                        : "text-gray-900"
                      }`}
                  >
                    {fmtPct(company.derived.wasteDiversionRate)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Water Withdrawal</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtWater(
                      company.water.withdrawal,
                      company.normalized?.waterWithdrawalM3,
                      unitView,
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Water Consumption</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtWater(
                      company.water.consumption,
                      company.normalized?.waterConsumptionM3,
                      unitView,
                    )}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Total Energy</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtEnergy(company, unitView)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">Fuel Consumption</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {fmtQuantity(company.fuel.consumption)}
                  </p>
                </div>
              </div>

              {/* Completeness Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Data completeness:
                    </span>
                    <Badge
                      variant="outline"
                      className={getCompletenessBadgeClass(completenessStrong)}
                    >
                      {completeness.score12} / 12
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    Green when at least {COMPLETENESS_GREEN_MIN} of 12 overview
                    fields are filled (zero counts as filled).
                  </span>
                </div>
              </div>

              {/* Coverage */}
              {(company.derived.coverageScore != null ||
                company.derived.coverageRank != null ||
                company.derived.coveragePercentile != null) && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs text-gray-500">
                        Coverage (key ESG fields):
                      </span>
                      {company.derived.coverageScore != null && (
                        <span className="text-sm font-medium text-gray-900">
                          {company.derived.coverageScore}%
                        </span>
                      )}
                      {company.derived.coverageRank != null && (
                        <span className="text-xs text-gray-500">
                          Rank #{company.derived.coverageRank}
                        </span>
                      )}
                      {company.derived.coveragePercentile != null && (
                        <span className="text-xs text-gray-500">
                          {company.derived.coveragePercentile}th percentile
                        </span>
                      )}
                    </div>
                  </div>
                )}
            </TabsContent>

            {/* Data Quality Tab */}
            <TabsContent value="data-quality" className="m-0 h-full overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Overview field completeness (12)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {completenessFieldRows.map((row) => (
                      <FieldCheckItem
                        key={row.label}
                        label={row.label}
                        isPresent={row.filled}
                        softMissing={completenessStrong}
                      />
                    ))}
                  </div>
                </div>

                {company.meta.dataQualityScore !== null && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Data Quality Score
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Extraction Quality</span>
                        <span
                          className={`font-medium ${company.meta.dataQualityScore >= 80
                            ? "text-emerald-600"
                            : company.meta.dataQualityScore >= 50
                              ? "text-gray-700"
                              : "text-red-600"
                            }`}
                        >
                          {company.meta.dataQualityScore}/100
                        </span>
                      </div>
                      <Progress
                        value={company.meta.dataQualityScore}
                        className="h-2 bg-gray-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Extraction Metadata
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {company.reportName && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">Report</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {company.reportName.replace(/_/g, " ")}
                        </p>
                      </div>
                    )}
                    {company.meta.extractionDate && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">Extracted</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(
                            company.meta.extractionDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {company.meta.processingSeconds !== null && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Processing Time
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {company.meta.processingSeconds.toFixed(1)}s
                        </p>
                      </div>
                    )}
                    {company.meta.groupsExtracted !== null && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">
                            Groups Extracted
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {company.meta.groupsExtracted}
                        </p>
                      </div>
                    )}
                    {company.meta.groupsFailed !== null && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">
                            Groups Failed
                          </span>
                        </div>
                        <p
                          className={`text-sm font-medium ${company.meta.groupsFailed > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                            }`}
                        >
                          {company.meta.groupsFailed}
                        </p>
                      </div>
                    )}
                    {company.meta.groupsSkipped !== null && (
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">
                            Groups Skipped
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {company.meta.groupsSkipped}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    {company.meta.verifiedByHuman ? (
                      <>
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-emerald-600">
                            Human Verified
                          </p>
                          <p className="text-xs text-gray-500">
                            This data has been reviewed and verified by a human
                            analyst.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-600">
                            Not Verified
                          </p>
                          <p className="text-xs text-gray-500">
                            This data was extracted automatically and has not been
                            verified by a human.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notes & Strategy Tab */}
            <TabsContent value="notes" className="m-0 h-full overflow-y-auto p-4">
              <div className="space-y-4">
                {company.emissions.notes && (
                  <div className="bg-gray-50 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Emissions Notes
                    </h4>
                    <p className="text-xs text-gray-500 whitespace-pre-wrap">
                      {company.emissions.notes}
                    </p>
                  </div>
                )}

                {company.waste.notes && (
                  <div className="bg-gray-50 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Waste Notes
                    </h4>
                    <p className="text-xs text-gray-500 whitespace-pre-wrap">
                      {company.waste.notes}
                    </p>
                  </div>
                )}

                {company.strategy.summary && (
                  <Collapsible open={showStrategy} onOpenChange={setShowStrategy}>
                    <div className="bg-gray-50 rounded-md overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-400" />
                            <h4 className="text-sm font-medium text-gray-700">
                              Strategy Summary
                            </h4>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${showStrategy ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3">
                          <p className="text-xs text-gray-500 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {formatPossiblyJsonText(company.strategy.summary)}
                          </p>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {!company.emissions.notes &&
                  !company.waste.notes &&
                  !company.strategy.summary &&
                  (
                    <div className="flex items-center justify-center h-24 text-gray-400">
                      <span className="text-sm">
                        No notes or strategy data available
                      </span>
                    </div>
                  )}
              </div>
            </TabsContent>

            {/* Peer Strategy Examples */}
            <TabsContent value="peers" className="m-0 h-full overflow-y-auto p-4">
              <p className="text-xs text-gray-500 mb-3">
                These are strategies extracted from similar companies in the same
                industry. Use as references, not prescriptions.
              </p>
              {peerExamples.length === 0 ? (
                <div className="text-sm text-gray-400 py-4">
                  No peer strategy examples available.
                </div>
              ) : (
                <div className="space-y-3">
                  {peerExamples.map(
                    ({ company: peer, snippet, targetsSummary }) => {
                      const peerComp = peer.derived.completeness;
                      const isExpanded = expandedPeerId === peer.id;
                      return (
                        <div
                          key={peer.id}
                          className="bg-gray-50 rounded-md overflow-hidden border border-gray-200"
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-sm font-medium text-gray-900">
                                {peer.name}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getCompletenessBadgeClass(peerComp.meetsGreenThreshold)}`}
                              >
                                {peerComp.score12}/12
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {snippet}
                            </p>
                            {targetsSummary && (
                              <p className="text-[11px] text-gray-400 mt-1.5">
                                Targets: {targetsSummary}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPeerId(isExpanded ? null : peer.id)
                              }
                              className="text-xs text-blue-600 hover:text-blue-500 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded ? "Show less" : "Show more strategy"
                              }
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          </div>
                          {isExpanded && peer.strategy.summary && (
                            <div className="px-3 pb-3 pt-0 border-t border-gray-200 mt-0">
                              <p className="text-xs text-gray-500 whitespace-pre-wrap max-h-[180px] overflow-y-auto pt-2">
                                {peer.strategy.summary}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw-pdf" className="m-0 h-full overflow-y-auto p-4">
              <RawPdfTabContent company={company} />
            </TabsContent>
          </Tabs>
        </div>

        <CompanyAiChatPanel
          company={company}
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
        />
      </div>
    </div>
  );
}

interface FieldCheckItemProps {
  label: string;
  isPresent: boolean;
  /** When 6+/12 overview fields are filled, style missing fields neutrally (not red). */
  softMissing?: boolean;
}

function FieldCheckItem({
  label,
  isPresent,
  softMissing = false,
}: FieldCheckItemProps) {
  const missingSoft = !isPresent && softMissing;
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md ${isPresent ? "bg-emerald-50" : missingSoft ? "bg-gray-100" : "bg-red-50"
        }`}
    >
      {isPresent ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <X
          className={`h-4 w-4 ${missingSoft ? "text-gray-400" : "text-red-600"}`}
        />
      )}
      <span
        className={`text-xs ${isPresent
          ? "text-emerald-700"
          : missingSoft
            ? "text-gray-600"
            : "text-red-700"
          }`}
      >
        {label}
      </span>
    </div>
  );
}
