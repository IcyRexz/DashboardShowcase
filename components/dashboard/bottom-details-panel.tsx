"use client";

import { useState } from "react";
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
  FileJson,
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
import type {
  SustainabilityCompany,
  PlausibilityBand,
} from "@/data/sustainability";
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
} from "@/data/sustainability";

interface BottomDetailsPanelProps {
  company: SustainabilityCompany | null;
  onClear: () => void;
  unitView?: UnitView;
  allCompanies?: SustainabilityCompany[];
}

export function BottomDetailsPanel({
  company,
  onClear,
  unitView = "Canonical",
  allCompanies = [],
}: BottomDetailsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showTargets, setShowTargets] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [expandedPeerId, setExpandedPeerId] = useState<string | null>(null);

  const getPlausibilityColor = (band: PlausibilityBand): string => {
    switch (band) {
      case "Good":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "Watch":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "Review":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

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

  const plausibilityBand =
    company.derived.plausibilityBand ?? company.derived.riskBand ?? "Review";
  const plausibilityReasons = company.derived.plausibilityReasons ?? [];
  const completeness = company.derived.completeness;
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
              className={`text-xs ${getPlausibilityColor(plausibilityBand)}`}
              title="Data plausibility"
            >
              {plausibilityBand}
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
    <div className="w-full panel-glass rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
            className={`ml-2 ${getPlausibilityColor(plausibilityBand)}`}
            title="Data plausibility"
          >
            {plausibilityBand}
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

      {/* Why flagged? */}
      {plausibilityReasons.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 bg-amber-50 border-l-2 border-l-amber-400">
          <h4 className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1.5">
            Why flagged?
          </h4>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            {plausibilityReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="px-4 pt-2 border-b border-gray-200">
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
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="m-0 p-4">
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
                className={`text-sm font-medium ${
                  company.derived.wasteDiversionRate !== null &&
                  company.derived.wasteDiversionRate >= 0.5
                    ? "text-emerald-600"
                    : company.derived.wasteDiversionRate !== null &&
                        company.derived.wasteDiversionRate < 0.3
                      ? "text-amber-600"
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Data Completeness:
                </span>
                <Badge
                  variant="outline"
                  className={
                    completeness.score === 4
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : completeness.score >= 2
                        ? "bg-amber-100 text-amber-700 border-amber-300"
                        : "bg-red-100 text-red-700 border-red-300"
                  }
                >
                  {completeness.score}/4 fields
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span
                  className={
                    completeness.hasScope1 ? "text-emerald-600" : "text-red-600"
                  }
                >
                  Scope 1 {completeness.hasScope1 ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasScope2 ? "text-emerald-600" : "text-red-600"
                  }
                >
                  Scope 2 {completeness.hasScope2 ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasWasteGenerated
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  Waste Gen {completeness.hasWasteGenerated ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasWasteRecycled
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  Waste Rec {completeness.hasWasteRecycled ? "✓" : "✗"}
                </span>
              </div>
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
        <TabsContent value="data-quality" className="m-0 p-4">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Core Field Completeness
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FieldCheckItem
                  label="Scope 1"
                  isPresent={completeness.hasScope1}
                />
                <FieldCheckItem
                  label="Scope 2"
                  isPresent={completeness.hasScope2}
                />
                <FieldCheckItem
                  label="Waste Generated"
                  isPresent={completeness.hasWasteGenerated}
                />
                <FieldCheckItem
                  label="Waste Recycled"
                  isPresent={completeness.hasWasteRecycled}
                />
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
                      className={`font-medium ${
                        company.meta.dataQualityScore >= 80
                          ? "text-emerald-600"
                          : company.meta.dataQualityScore >= 50
                            ? "text-amber-600"
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
                      className={`text-sm font-medium ${
                        company.meta.groupsFailed > 0
                          ? "text-amber-600"
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
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">
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
        <TabsContent value="notes" className="m-0 p-4">
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
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          showStrategy ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <p className="text-xs text-gray-500 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {company.strategy.summary}
                      </p>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {company.targets.json && company.targets.json !== "[]" && (
              <Collapsible open={showTargets} onOpenChange={setShowTargets}>
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-gray-400" />
                        <h4 className="text-sm font-medium text-gray-700">
                          Targets Data
                        </h4>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          showTargets ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-2 rounded border border-gray-200 max-h-[200px] overflow-y-auto">
                        {(() => {
                          try {
                            return JSON.stringify(
                              JSON.parse(company.targets.json),
                              null,
                              2,
                            );
                          } catch {
                            return company.targets.json;
                          }
                        })()}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {!company.emissions.notes &&
              !company.waste.notes &&
              !company.strategy.summary &&
              (!company.targets.json || company.targets.json === "[]") && (
                <div className="flex items-center justify-center h-24 text-gray-400">
                  <span className="text-sm">
                    No notes or strategy data available
                  </span>
                </div>
              )}
          </div>
        </TabsContent>

        {/* Peer Strategy Examples */}
        <TabsContent value="peers" className="m-0 p-4">
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
                  const peerBand =
                    peer.derived.plausibilityBand ?? peer.derived.riskBand ?? "Review";
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
                            className={`text-[10px] ${getPlausibilityColor(peerBand)}`}
                          >
                            {peerBand}
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
      </Tabs>
    </div>
  );
}

interface FieldCheckItemProps {
  label: string;
  isPresent: boolean;
}

function FieldCheckItem({ label, isPresent }: FieldCheckItemProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md ${
        isPresent ? "bg-emerald-50" : "bg-red-50"
      }`}
    >
      {isPresent ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <X className="h-4 w-4 text-red-600" />
      )}
      <span
        className={`text-xs ${isPresent ? "text-emerald-700" : "text-red-700"}`}
      >
        {label}
      </span>
    </div>
  );
}
