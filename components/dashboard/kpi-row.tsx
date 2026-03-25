"use client";

import { Building2, Factory, Recycle, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type KpiData,
  type UnitView,
  fmtTCO2e,
  fmtPct,
  fmtNumber,
} from "@/data/sustainability";

interface KpiRowProps {
  kpis: KpiData;
  unitView?: UnitView;
}

export function KpiRow({ kpis, unitView = "Canonical" }: KpiRowProps) {
  const diversionIsGood =
    kpis.avgWasteDiversion !== null && kpis.avgWasteDiversion >= 0.5;
  const qualityIsGood =
    kpis.avgDataQuality !== null && kpis.avgDataQuality >= 70;
  const completionRate =
    kpis.totalCompanies > 0
      ? (kpis.reportingComplete / kpis.totalCompanies) * 100
      : 0;
  const completionIsGood =
    kpis.totalCompanies > 0 &&
    kpis.reportingComplete / kpis.totalCompanies >= 0.5;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <KpiCard
              icon={Building2}
              title="Strong completeness"
              value={`${kpis.reportingComplete}/${kpis.totalCompanies}`}
              subValue={`${completionRate.toFixed(0)}%`}
              isGood={completionIsGood}
              isAlert={
                kpis.totalCompanies > 0 &&
                kpis.reportingComplete / kpis.totalCompanies < 0.3
              }
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[280px] text-center bg-white text-gray-900 border-gray-200 shadow-lg"
        >
          Companies with at least 6 of 12 overview metrics filled (emissions,
          waste, water, energy, fuel, etc.). Green KPI styling when at least half
          of companies meet that bar.
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
          className="max-w-[280px] text-center bg-white text-gray-900 border-gray-200 shadow-lg"
        >
          Sum of direct (Scope 1) and energy indirect (Scope 2) GHG emissions in
          tCO2e (canonical). Excludes non-convertible rows.
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
          className="max-w-[280px] text-center bg-white text-gray-900 border-gray-200 shadow-lg"
        >
          Average waste diversion (recycled / generated). Higher is better (50%+
          is strong; below 30% is weak).
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
          className="max-w-[280px] text-center bg-white text-gray-900 border-gray-200 shadow-lg"
        >
          Average extraction quality score from the source pipeline.
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
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <p
              className={`text-2xl font-bold ${
                isAlert
                  ? "text-red-600"
                  : isGood
                    ? "text-emerald-600"
                    : "text-gray-900"
              }`}
            >
              {value}
            </p>
            {unit && <span className="text-xs text-gray-500">{unit}</span>}
            {subValue && (
              <span className="text-sm text-gray-400 ml-1">({subValue})</span>
            )}
          </div>
        </div>
        <div
          className={`p-2 rounded-md ${
            isAlert
              ? "bg-red-50"
              : isGood
                ? "bg-emerald-50"
                : "bg-gray-100"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              isAlert
                ? "text-red-600"
                : isGood
                  ? "text-emerald-600"
                  : "text-gray-400"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
