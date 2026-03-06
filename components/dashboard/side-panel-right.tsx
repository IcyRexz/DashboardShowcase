"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Factory,
  Recycle,
  TrendingUp,
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

  const sectorBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; avgCoverage: number; totalCov: number }>();
    for (const c of companies) {
      const sector = c.industry ?? "General";
      const entry = map.get(sector) ?? { count: 0, avgCoverage: 0, totalCov: 0 };
      entry.count += 1;
      entry.totalCov += c.derived.coverageScore ?? 0;
      map.set(sector, entry);
    }
    const result: { sector: string; count: number; avgCoverage: number }[] = [];
    for (const [sector, entry] of map) {
      result.push({
        sector,
        count: entry.count,
        avgCoverage: entry.count > 0 ? Math.round(entry.totalCov / entry.count) : 0,
      });
    }
    return result.sort((a, b) => b.count - a.count);
  }, [companies]);

  const coverageStats = useMemo(() => {
    const scores = companies
      .map((c) => c.derived.coverageScore ?? 0)
      .sort((a, b) => a - b);
    if (scores.length === 0) return { avg: 0, median: 0, high: 0, low: 0 };
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const mid = Math.floor(scores.length / 2);
    const median =
      scores.length % 2 === 0
        ? Math.round((scores[mid - 1] + scores[mid]) / 2)
        : scores[mid];
    const high = scores.filter((s) => s >= 60).length;
    const low = scores.filter((s) => s < 30).length;
    return { avg, median, high, low };
  }, [companies]);

  const topCompanies = useMemo(() => {
    return [...companies]
      .sort((a, b) => (a.derived.coverageRank ?? Infinity) - (b.derived.coverageRank ?? Infinity))
      .slice(0, 5);
  }, [companies]);

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
    <div className="w-72 h-full panel-glass rounded-lg flex flex-col transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            Overview (2024)
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
                {kpis.totalCompanies}
              </p>
              <p className="text-xs text-zinc-500 truncate">Companies</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-3 overflow-hidden">
              <p className="text-2xl font-bold text-zinc-100 truncate">
                {sectorBreakdown.length}
              </p>
              <p className="text-xs text-zinc-500 truncate">Sectors</p>
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
              <p className="text-xs text-zinc-500 truncate">Scope 1+2 tCO2e</p>
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
              <p className="text-xs text-zinc-500 truncate">Avg Waste Div.</p>
            </div>
          </div>
        </div>

        {/* Coverage Distribution */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Coverage Score
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 rounded-md p-2.5">
              <p className="text-lg font-bold text-zinc-100">{coverageStats.avg}%</p>
              <p className="text-[10px] text-zinc-500">Average</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-2.5">
              <p className="text-lg font-bold text-zinc-100">{coverageStats.median}%</p>
              <p className="text-[10px] text-zinc-500">Median</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-2.5">
              <p className="text-lg font-bold text-emerald-400">{coverageStats.high}</p>
              <p className="text-[10px] text-zinc-500">High (60%+)</p>
            </div>
            <div className="bg-zinc-800/50 rounded-md p-2.5">
              <p className="text-lg font-bold text-red-400">{coverageStats.low}</p>
              <p className="text-[10px] text-zinc-500">Low (&lt;30%)</p>
            </div>
          </div>
        </div>

        {/* Top 5 by Coverage */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Top 5 by Coverage
          </h3>
          <div className="space-y-1.5">
            {topCompanies.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-600 font-mono w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-zinc-300 truncate flex-1" title={c.name}>
                  {c.name}
                </span>
                <span className="text-zinc-400 shrink-0 tabular-nums">
                  {c.derived.coverageScore ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Plausibility Distribution */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Data Plausibility
          </h3>
          <div className="space-y-2">
            {(["Good", "Watch", "Review"] as PlausibilityBand[]).map((b) => {
              const count = plausibilityBreakdown[b] || 0;
              const percentage =
                companies.length > 0
                  ? Math.round((count / companies.length) * 100)
                  : 0;
              return (
                <div key={b} className="space-y-1">
                  <div className="flex items-center justify-between text-xs min-w-0">
                    <span className="text-zinc-400 shrink-0">{b}</span>
                    <span className="text-zinc-300 truncate ml-2">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPlausibilityColor(b)} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sector Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            By Sector
          </h3>
          <div className="space-y-2">
            {sectorBreakdown.slice(0, 8).map(({ sector, count, avgCoverage }) => {
              const pct =
                companies.length > 0
                  ? Math.round((count / companies.length) * 100)
                  : 0;
              return (
                <div key={sector} className="space-y-1">
                  <div className="flex items-center justify-between text-xs min-w-0">
                    <span className="text-zinc-400 truncate flex-1">{sector}</span>
                    <span className="text-zinc-500 shrink-0 ml-2 tabular-nums">
                      {count} · {avgCoverage}% cov
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/70 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
