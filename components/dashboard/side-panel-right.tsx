"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Factory,
  Recycle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type KpiData,
  type SustainabilityCompany,
  type PlausibilityBand,
  type UnitView,
  fmtPct,
} from "@/data/sustainability";

function fmtCompact(value: number | null): string {
  if (value === null) return "N/A";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(0)}K`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

interface SidePanelRightProps {
  kpis: KpiData;
  companies: SustainabilityCompany[];
  unitView?: UnitView;
}

export function SidePanelRight({
  kpis,
  companies,
  unitView = "Canonical",
}: SidePanelRightProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const band = (c: SustainabilityCompany) =>
    c.derived.plausibilityBand ?? c.derived.riskBand;
  const plausibilityBreakdown = companies.reduce(
    (acc, company) => {
      const b = band(company);
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    },
    {} as Record<PlausibilityBand, number>,
  );

  const completenessBreakdown = companies.reduce(
    (acc, company) => {
      const score = company.derived.completeness.score;
      const key = score === 4 ? "Complete" : score >= 2 ? "Partial" : "Missing";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const extractionBreakdown = companies.reduce(
    (acc, company) => {
      const key = company.derived.trust.extractionOk ? "Success" : "Issues";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const getPlausibilityColor = (b: PlausibilityBand): string => {
    switch (b) {
      case "Good":
        return "bg-emerald-500";
      case "Watch":
        return "bg-amber-500";
      case "Review":
        return "bg-red-500";
      default:
        return "bg-zinc-500";
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full panel-collapsed rounded-lg flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Expand panel"
          title="Expand panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="h-px w-6 bg-zinc-700" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Overview"
          title="Overview"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Emissions"
          title="Emissions"
        >
          <Factory className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Waste"
          title="Waste"
        >
          <Recycle className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full panel-glass rounded-lg flex flex-col transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            Overview (2023)
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Collapse panel"
            title="Collapse panel"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {/* Summary Stats */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Summary
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 rounded-md p-3 overflow-hidden">
              <p className="text-2xl font-bold text-zinc-100 truncate">
                {kpis.reportingComplete}
              </p>
              <p className="text-xs text-zinc-500 truncate">Complete</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-3 overflow-hidden">
              <p
                className="text-lg font-bold text-zinc-100 truncate"
                title={
                  kpis.totalScope12 !== null
                    ? `${kpis.totalScope12.toLocaleString()} tCO2e`
                    : "N/A"
                }
              >
                {fmtCompact(kpis.totalScope12)}
              </p>
              <p className="text-xs text-zinc-500 truncate">Scope 1+2</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-3 overflow-hidden">
              <p
                className={`text-lg font-bold truncate ${
                  kpis.avgWasteDiversion !== null &&
                  kpis.avgWasteDiversion >= 0.5
                    ? "text-emerald-400"
                    : kpis.avgWasteDiversion !== null &&
                        kpis.avgWasteDiversion < 0.3
                      ? "text-amber-400"
                      : "text-zinc-100"
                }`}
              >
                {fmtPct(kpis.avgWasteDiversion)}
              </p>
              <p className="text-xs text-zinc-500 truncate">Avg Diversion</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-3 overflow-hidden">
              <p
                className={`text-lg font-bold truncate ${
                  kpis.avgDataQuality !== null && kpis.avgDataQuality >= 70
                    ? "text-emerald-400"
                    : kpis.avgDataQuality !== null && kpis.avgDataQuality < 50
                      ? "text-amber-400"
                      : "text-zinc-100"
                }`}
              >
                {kpis.avgDataQuality !== null
                  ? `${kpis.avgDataQuality.toFixed(0)}`
                  : "N/A"}
              </p>
              <p className="text-xs text-zinc-500 truncate">Avg Quality</p>
            </div>
          </div>
        </div>

        {/* Data Plausibility Distribution */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Data Plausibility
          </h3>
          <div className="space-y-2">
            {(["Good", "Watch", "Review"] as PlausibilityBand[]).map((band) => {
              const count = plausibilityBreakdown[band] || 0;
              const percentage =
                companies.length > 0
                  ? Math.round((count / companies.length) * 100)
                  : 0;
              return (
                <div key={band} className="space-y-1">
                  <div className="flex items-center justify-between text-xs min-w-0">
                    <span className="text-zinc-400 shrink-0">{band}</span>
                    <span className="text-zinc-300 truncate ml-2">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPlausibilityColor(band)} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Completeness */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Data Completeness
          </h3>
          <div className="space-y-2">
            {Object.entries(completenessBreakdown)
              .sort(([a], [b]) => {
                const order = { Complete: 0, Partial: 1, Missing: 2 };
                return (
                  (order[a as keyof typeof order] || 3) -
                  (order[b as keyof typeof order] || 3)
                );
              })
              .map(([status, count]) => {
                const percentage =
                  companies.length > 0
                    ? Math.round((count / companies.length) * 100)
                    : 0;
                const color =
                  status === "Complete"
                    ? "bg-emerald-500"
                    : status === "Partial"
                      ? "bg-amber-500"
                      : "bg-red-500";
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs min-w-0">
                      <span className="text-zinc-400 shrink-0">{status}</span>
                      <span className="text-zinc-300 truncate ml-2">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Extraction Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Extraction Status
          </h3>
          <div className="space-y-2">
            {Object.entries(extractionBreakdown)
              .sort(([a]) => (a === "Success" ? -1 : 1))
              .map(([status, count]) => {
                const percentage =
                  companies.length > 0
                    ? Math.round((count / companies.length) * 100)
                    : 0;
                const color =
                  status === "Success" ? "bg-emerald-500" : "bg-amber-500";
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs min-w-0">
                      <span className="text-zinc-400 shrink-0">{status}</span>
                      <span className="text-zinc-300 truncate ml-2">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Total Companies Footer */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Total Companies</span>
            <span className="text-zinc-300 font-medium">
              {kpis.totalCompanies}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
