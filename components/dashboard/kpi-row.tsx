"use client";

import { Building2, Factory, Recycle, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type KpiData,
  fmtTCO2e,
  fmtPct,
  fmtNumber,
} from "@/data/sustainability";

interface KpiRowProps {
  kpis: KpiData;
}

export function KpiRow({ kpis }: KpiRowProps) {
  const diversionIsGood =
    kpis.avgWasteDiversion !== null && kpis.avgWasteDiversion >= 0.5;
  const qualityIsGood =
    kpis.avgDataQuality !== null && kpis.avgDataQuality >= 70;
  const completionRate =
    kpis.totalCompanies > 0
      ? (kpis.reportingComplete / kpis.totalCompanies) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              icon={Building2}
              title="Reporting Complete"
              value={`${kpis.reportingComplete}/${kpis.totalCompanies}`}
              subValue={`${completionRate.toFixed(0)}%`}
              isGood={completionRate >= 50}
              isAlert={completionRate < 30}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-center bg-zinc-800 text-zinc-100 border-zinc-700"
        >
          Companies with all 4 core metrics reported: Scope 1, Scope 2, Waste
          Generated, and Waste Recycled
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              icon={Factory}
              title="Total Scope 1+2"
              value={fmtTCO2e(kpis.totalScope12).replace(" tCO2e", "")}
              unit="tCO2e"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-center bg-zinc-800 text-zinc-100 border-zinc-700"
        >
          Sum of direct (Scope 1) and energy indirect (Scope 2) greenhouse gas
          emissions across all filtered companies
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              icon={Recycle}
              title="Avg Waste Diversion"
              value={fmtPct(kpis.avgWasteDiversion)}
              isGood={diversionIsGood}
              isAlert={
                kpis.avgWasteDiversion !== null && kpis.avgWasteDiversion < 0.3
              }
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-center bg-zinc-800 text-zinc-100 border-zinc-700"
        >
          Average percentage of waste recycled vs generated. Higher is better
          (50%+ is good, 30%- needs attention).
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              icon={ShieldCheck}
              title="Avg Data Quality"
              value={
                kpis.avgDataQuality !== null
                  ? `${kpis.avgDataQuality.toFixed(0)}`
                  : "N/A"
              }
              unit="/100"
              isGood={qualityIsGood}
              isAlert={kpis.avgDataQuality !== null && kpis.avgDataQuality < 50}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[240px] text-center bg-zinc-800 text-zinc-100 border-zinc-700"
        >
          Average data extraction quality score. Higher scores indicate more
          reliable data extraction from sustainability reports.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subValue?: string;
  unit?: string;
  isAlert?: boolean;
  isGood?: boolean;
}

function KpiCard({
  icon: Icon,
  title,
  value,
  subValue,
  unit,
  isAlert,
  isGood,
}: KpiCardProps) {
  return (
    <div className="panel-glass rounded-lg p-4 cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <p
              className={`text-2xl font-bold ${
                isAlert
                  ? "text-amber-400"
                  : isGood
                    ? "text-emerald-400"
                    : "text-zinc-100"
              }`}
            >
              {value}
            </p>
            {unit && <span className="text-xs text-zinc-500">{unit}</span>}
            {subValue && (
              <span className="text-sm text-zinc-400 ml-1">({subValue})</span>
            )}
          </div>
        </div>
        <div
          className={`p-2 rounded-md ${
            isAlert
              ? "bg-amber-500/10"
              : isGood
                ? "bg-emerald-500/10"
                : "bg-zinc-800"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              isAlert
                ? "text-amber-400"
                : isGood
                  ? "text-emerald-400"
                  : "text-zinc-500"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
