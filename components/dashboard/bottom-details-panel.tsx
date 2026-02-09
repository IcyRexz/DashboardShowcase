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
import type { SustainabilityCompany, RiskBand } from "@/data/sustainability";
import {
  fmtTCO2e,
  fmtPct,
  fmtQuantity,
  fmtNumber,
} from "@/data/sustainability";

interface BottomDetailsPanelProps {
  company: SustainabilityCompany | null;
  onClear: () => void;
}

export function BottomDetailsPanel({
  company,
  onClear,
}: BottomDetailsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  const getRiskColor = (riskBand: RiskBand): string => {
    switch (riskBand) {
      case "Good":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Watch":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Review":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  // Empty state
  if (!company) {
    return (
      <div className="w-full panel-glass rounded-lg p-6">
        <div className="flex items-center justify-center h-24 text-zinc-500">
          <Building2 className="h-5 w-5 mr-2" />
          <span className="text-sm">
            Select a marker or company to view sustainability details
          </span>
        </div>
      </div>
    );
  }

  const riskBand = company.derived.riskBand;
  const completeness = company.derived.completeness;

  // Minimized state
  if (isMinimized) {
    return (
      <div className="w-full panel-glass rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-100">
              {company.name}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${getRiskColor(riskBand)}`}
            >
              {riskBand}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              aria-label="Expand panel"
              title="Expand panel"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
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
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-zinc-400" />
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              {company.name}
            </h3>
            <p className="text-xs text-zinc-500">
              {company.city}, {company.country} · Report Year{" "}
              {company.reportYear}
            </p>
          </div>
          <Badge variant="outline" className={`ml-2 ${getRiskColor(riskBand)}`}>
            {riskBand}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Minimize panel"
            title="Minimize panel"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Close panel"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="px-4 pt-2 border-b border-zinc-800">
          <TabsList className="bg-transparent h-9 p-0 gap-4">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:border-b-2 data-[state=active]:border-zinc-100 rounded-none pb-2 px-0 text-zinc-500 hover:text-zinc-300"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="data-quality"
              className="data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:border-b-2 data-[state=active]:border-zinc-100 rounded-none pb-2 px-0 text-zinc-500 hover:text-zinc-300"
            >
              Data Quality
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:border-b-2 data-[state=active]:border-zinc-100 rounded-none pb-2 px-0 text-zinc-500 hover:text-zinc-300"
            >
              Notes & Strategy
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="m-0 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Scope 1 */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Scope 1</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.emissions.scope1)}
              </p>
            </div>

            {/* Scope 2 */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Scope 2</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.emissions.scope2)}
              </p>
            </div>

            {/* Scope 3 */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Scope 3</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.emissions.scope3)}
              </p>
            </div>

            {/* Total Scope 1+2 */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Scope 1+2 Total</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtTCO2e(company.derived.scope12Total)}
              </p>
            </div>

            {/* Waste Generated */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Waste Generated</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.waste.generated)}
              </p>
            </div>

            {/* Waste Recycled */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Waste Recycled</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.waste.recycled)}
              </p>
            </div>

            {/* Waste Disposed */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Waste Disposed</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.waste.disposed)}
              </p>
            </div>

            {/* Waste Diversion Rate */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Diversion Rate</span>
              </div>
              <p
                className={`text-sm font-medium ${
                  company.derived.wasteDiversionRate !== null &&
                  company.derived.wasteDiversionRate >= 0.5
                    ? "text-emerald-400"
                    : company.derived.wasteDiversionRate !== null &&
                        company.derived.wasteDiversionRate < 0.3
                      ? "text-amber-400"
                      : "text-zinc-100"
                }`}
              >
                {fmtPct(company.derived.wasteDiversionRate)}
              </p>
            </div>

            {/* Water Withdrawal */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Water Withdrawal</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.water.withdrawal)}
              </p>
            </div>

            {/* Water Consumption */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Water Consumption</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.water.consumption)}
              </p>
            </div>

            {/* Total Energy */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Total Energy</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.energy.total)}
              </p>
            </div>

            {/* Fuel Consumption */}
            <div className="bg-zinc-800/50 rounded-md p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500">Fuel Consumption</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {fmtQuantity(company.fuel.consumption)}
              </p>
            </div>
          </div>

          {/* Completeness Summary */}
          <div className="mt-4 p-3 bg-zinc-800/30 rounded-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  Data Completeness:
                </span>
                <Badge
                  variant="outline"
                  className={
                    completeness.score === 4
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : completeness.score >= 2
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {completeness.score}/4 fields
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className={
                    completeness.hasScope1 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  Scope 1 {completeness.hasScope1 ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasScope2 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  Scope 2 {completeness.hasScope2 ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasWasteGenerated
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  Waste Gen {completeness.hasWasteGenerated ? "✓" : "✗"}
                </span>
                <span
                  className={
                    completeness.hasWasteRecycled
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  Waste Rec {completeness.hasWasteRecycled ? "✓" : "✗"}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="data-quality" className="m-0 p-4">
          <div className="space-y-6">
            {/* Field Checklist */}
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">
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

            {/* Data Quality Score */}
            {company.meta.dataQualityScore !== null && (
              <div>
                <h4 className="text-sm font-medium text-zinc-300 mb-3">
                  Data Quality Score
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Extraction Quality</span>
                    <span
                      className={`font-medium ${
                        company.meta.dataQualityScore >= 80
                          ? "text-emerald-400"
                          : company.meta.dataQualityScore >= 50
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {company.meta.dataQualityScore}/100
                    </span>
                  </div>
                  <Progress
                    value={company.meta.dataQualityScore}
                    className="h-2 bg-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Extraction Metadata */}
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">
                Extraction Metadata
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {company.reportName && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Report</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {company.reportName.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
                {company.meta.extractionDate && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Extracted</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {new Date(
                        company.meta.extractionDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {company.meta.processingSeconds !== null && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500">
                        Processing Time
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {company.meta.processingSeconds.toFixed(1)}s
                    </p>
                  </div>
                )}
                {company.meta.groupsExtracted !== null && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-500">
                        Groups Extracted
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {company.meta.groupsExtracted}
                    </p>
                  </div>
                )}
                {company.meta.groupsFailed !== null && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-500">
                        Groups Failed
                      </span>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        company.meta.groupsFailed > 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {company.meta.groupsFailed}
                    </p>
                  </div>
                )}
                {company.meta.groupsSkipped !== null && (
                  <div className="bg-zinc-800/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-500">
                        Groups Skipped
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {company.meta.groupsSkipped}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Status */}
            <div className="p-3 bg-zinc-800/30 rounded-md">
              <div className="flex items-center gap-2">
                {company.meta.verifiedByHuman ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">
                        Human Verified
                      </p>
                      <p className="text-xs text-zinc-500">
                        This data has been reviewed and verified by a human
                        analyst.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">
                        Not Verified
                      </p>
                      <p className="text-xs text-zinc-500">
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
            {/* Emissions Notes */}
            {company.emissions.notes && (
              <div className="bg-zinc-800/30 rounded-md p-3">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">
                  Emissions Notes
                </h4>
                <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                  {company.emissions.notes}
                </p>
              </div>
            )}

            {/* Waste Notes */}
            {company.waste.notes && (
              <div className="bg-zinc-800/30 rounded-md p-3">
                <h4 className="text-sm font-medium text-zinc-300 mb-2">
                  Waste Notes
                </h4>
                <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                  {company.waste.notes}
                </p>
              </div>
            )}

            {/* Strategy Summary */}
            {company.strategy.summary && (
              <Collapsible open={showStrategy} onOpenChange={setShowStrategy}>
                <div className="bg-zinc-800/30 rounded-md overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-zinc-500" />
                        <h4 className="text-sm font-medium text-zinc-300">
                          Strategy Summary
                        </h4>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          showStrategy ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <p className="text-xs text-zinc-400 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {company.strategy.summary}
                      </p>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Targets JSON */}
            {company.targets.json && company.targets.json !== "[]" && (
              <Collapsible open={showTargets} onOpenChange={setShowTargets}>
                <div className="bg-zinc-800/30 rounded-md overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-zinc-500" />
                        <h4 className="text-sm font-medium text-zinc-300">
                          Targets Data
                        </h4>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          showTargets ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-900/50 p-2 rounded max-h-[200px] overflow-y-auto">
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

            {/* No Notes Fallback */}
            {!company.emissions.notes &&
              !company.waste.notes &&
              !company.strategy.summary &&
              (!company.targets.json || company.targets.json === "[]") && (
                <div className="flex items-center justify-center h-24 text-zinc-500">
                  <span className="text-sm">
                    No notes or strategy data available
                  </span>
                </div>
              )}
          </div>
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
        isPresent ? "bg-emerald-500/10" : "bg-red-500/10"
      }`}
    >
      {isPresent ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <X className="h-4 w-4 text-red-400" />
      )}
      <span
        className={`text-xs ${isPresent ? "text-emerald-400" : "text-red-400"}`}
      >
        {label}
      </span>
    </div>
  );
}
