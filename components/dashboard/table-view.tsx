"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  SustainabilityCompany,
  PlausibilityBand,
} from "@/data/sustainability";
import { fmtTCO2e, fmtPct } from "@/data/sustainability";

interface TableViewProps {
  companies: SustainabilityCompany[];
  selectedCompany: SustainabilityCompany | null;
  onSelectCompany: (company: SustainabilityCompany) => void;
}

type SortField =
  | "rank"
  | "name"
  | "industry"
  | "coverageScore"
  | "coveragePercentile"
  | "plausibility"
  | "scope12"
  | "wasteDiversion";
type SortDirection = "asc" | "desc";

const PLAUSIBILITY_ORDER: Record<string, number> = {
  Good: 0,
  Watch: 1,
  Review: 2,
};

function getPlausibilityColor(band: PlausibilityBand): string {
  switch (band) {
    case "Good":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Watch":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Review":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

function coverageBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function TableView({
  companies,
  selectedCompany,
  onSelectCompany,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...companies];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      switch (sortField) {
        case "rank": {
          const aR = a.derived.coverageRank ?? Infinity;
          const bR = b.derived.coverageRank ?? Infinity;
          return (aR - bR) * dir;
        }
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "industry":
          return (a.industry ?? "").localeCompare(b.industry ?? "") * dir;
        case "coverageScore": {
          const aS = a.derived.coverageScore ?? -1;
          const bS = b.derived.coverageScore ?? -1;
          return (aS - bS) * dir;
        }
        case "coveragePercentile": {
          const aP = a.derived.coveragePercentile ?? -1;
          const bP = b.derived.coveragePercentile ?? -1;
          return (aP - bP) * dir;
        }
        case "plausibility": {
          const aB =
            PLAUSIBILITY_ORDER[
              (a.derived.plausibilityBand ?? a.derived.riskBand) as string
            ] ?? 3;
          const bB =
            PLAUSIBILITY_ORDER[
              (b.derived.plausibilityBand ?? b.derived.riskBand) as string
            ] ?? 3;
          return (aB - bB) * dir;
        }
        case "scope12": {
          const aE = a.derived.scope12Total ?? -Infinity;
          const bE = b.derived.scope12Total ?? -Infinity;
          return (aE - bE) * dir;
        }
        case "wasteDiversion": {
          const aD = a.derived.wasteDiversionRate ?? -Infinity;
          const bD = b.derived.wasteDiversionRate ?? -Infinity;
          return (aD - bD) * dir;
        }
        default:
          return 0;
      }
    });

    return arr;
  }, [companies, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-zinc-600" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-zinc-300" />
    ) : (
      <ArrowDown className="h-3 w-3 text-zinc-300" />
    );
  };

  return (
    <div className="h-full flex flex-col panel-glass rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-100">
          Companies Ranked by Coverage
        </span>
        <span className="text-xs text-zinc-500 ml-auto">
          {companies.length} companies
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
            <tr className="border-b border-zinc-800">
              {(
                [
                  { field: "rank" as SortField, label: "#", width: "w-12" },
                  { field: "name" as SortField, label: "Company", width: "min-w-[180px]" },
                  { field: "industry" as SortField, label: "Sector", width: "w-32" },
                  { field: "coverageScore" as SortField, label: "Coverage", width: "w-32" },
                  { field: "coveragePercentile" as SortField, label: "Percentile", width: "w-24" },
                  { field: "plausibility" as SortField, label: "Plausibility", width: "w-24" },
                  { field: "scope12" as SortField, label: "Scope 1+2", width: "w-28" },
                  { field: "wasteDiversion" as SortField, label: "Waste Div.", width: "w-24" },
                ] as const
              ).map(({ field, label, width }) => (
                <th key={field} className={`${width} px-3 py-2 text-left`}>
                  <button
                    type="button"
                    onClick={() => toggleSort(field)}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {label}
                    <SortIcon field={field} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((company) => {
              const band = (company.derived.plausibilityBand ??
                company.derived.riskBand ??
                "Review") as PlausibilityBand;
              const isSelected = selectedCompany?.id === company.id;
              const covScore = company.derived.coverageScore ?? 0;

              return (
                <tr
                  key={company.id}
                  onClick={() => onSelectCompany(company)}
                  className={`cursor-pointer border-b border-zinc-800/50 transition-colors ${
                    isSelected
                      ? "bg-zinc-100/10"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Rank */}
                  <td className="px-3 py-2.5 text-xs font-mono text-zinc-500">
                    {company.derived.coverageRank ?? "—"}
                  </td>

                  {/* Company name */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span
                        className={`text-sm truncate max-w-[220px] ${
                          isSelected
                            ? "text-zinc-100 font-medium"
                            : "text-zinc-300"
                        }`}
                        title={company.name}
                      >
                        {company.name}
                      </span>
                    </div>
                  </td>

                  {/* Sector */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-zinc-400 truncate max-w-[120px] block">
                      {company.industry ?? "—"}
                    </span>
                  </td>

                  {/* Coverage */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden max-w-[60px]">
                        <div
                          className={`h-full rounded-full ${coverageBarColor(covScore)}`}
                          style={{ width: `${covScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums">
                        {covScore}%
                      </span>
                    </div>
                  </td>

                  {/* Percentile */}
                  <td className="px-3 py-2.5 text-xs text-zinc-400 tabular-nums">
                    {company.derived.coveragePercentile != null
                      ? `${company.derived.coveragePercentile}th`
                      : "—"}
                  </td>

                  {/* Plausibility */}
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${getPlausibilityColor(band)}`}
                    >
                      {band}
                    </Badge>
                  </td>

                  {/* Scope 1+2 */}
                  <td className="px-3 py-2.5 text-xs text-zinc-400 tabular-nums">
                    {company.derived.scope12Total !== null
                      ? fmtTCO2e(company.derived.scope12Total)
                      : "—"}
                  </td>

                  {/* Waste Diversion */}
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {company.derived.wasteDiversionRate !== null ? (
                      <span
                        className={
                          company.derived.wasteDiversionRate >= 0.5
                            ? "text-emerald-400"
                            : company.derived.wasteDiversionRate < 0.2
                              ? "text-red-400"
                              : "text-zinc-400"
                        }
                      >
                        {fmtPct(company.derived.wasteDiversionRate)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
