"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { SidePanelLeft } from "@/components/dashboard/side-panel-left";
import { SidePanelRight } from "@/components/dashboard/side-panel-right";
import { BottomDetailsPanel } from "@/components/dashboard/bottom-details-panel";
import {
  type SustainabilityCompany,
  type RiskBand,
  type FilterOptions,
  type KpiData,
  SUSTAINABILITY_COMPANIES,
  filterCompanies,
  getLocations,
  calculateKpis,
} from "@/data/sustainability";

// Dynamic import for map to avoid SSR issues with Leaflet
const MapView = dynamic(
  () => import("@/components/dashboard/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400 animate-pulse">Loading Map...</div>
      </div>
    ),
  },
);

function getRiskColor(riskBand: RiskBand): string {
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
}

export default function DashboardPage() {
  const [selectedCompany, setSelectedCompany] =
    useState<SustainabilityCompany | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    countries: [],
    riskBands: [],
    incompleteOnly: false,
  });

  // All companies from generated data
  const allCompanies = SUSTAINABILITY_COMPANIES;

  // Filter companies based on current filters
  const filteredCompanies = useMemo(() => {
    return filterCompanies(allCompanies, filters);
  }, [allCompanies, filters]);

  // Get locations from filtered companies
  const filteredLocations = useMemo(() => {
    return getLocations(filteredCompanies);
  }, [filteredCompanies]);

  // Calculate KPIs from filtered companies
  const kpis: KpiData = useMemo(() => {
    return calculateKpis(filteredCompanies);
  }, [filteredCompanies]);

  const handleSelectCompany = (company: SustainabilityCompany) => {
    setSelectedCompany(company);
  };

  const handleClearSelection = () => {
    setSelectedCompany(null);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Clear selection if the selected company is no longer in filtered results
    if (selectedCompany) {
      const stillVisible = filterCompanies(allCompanies, newFilters).some(
        (c) => c.id === selectedCompany.id,
      );
      if (!stillVisible) {
        setSelectedCompany(null);
      }
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-900">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapView
          locations={filteredLocations}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
        />
      </div>

      {/* Subtle gradient overlay for better readability */}
      <div className="absolute inset-0 z-1 pointer-events-none bg-linear-to-b from-white/30 via-transparent to-white/20" />

      {/* Dashboard Content */}
      <div className="relative z-10 h-full flex flex-col p-4 pointer-events-none">
        {/* Header */}
        <header className="mb-4 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight">
                Sustainability Monitoring Dashboard
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                ESG metrics for {allCompanies.length} SGX-listed companies
                (2023)
              </p>
            </div>

            {selectedCompany && (
              <div className="flex items-center gap-3">
                {/* Selected Company Chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/90 border border-zinc-700 rounded-lg">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-100 max-w-[200px] truncate">
                    {selectedCompany.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 ${getRiskColor(selectedCompany.derived.riskBand)}`}
                  >
                    {selectedCompany.derived.riskBand}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 bg-zinc-900/80"
                  aria-label="Clear selection"
                  title="Clear selection"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* KPI Row */}
        <div className="mb-4 pointer-events-auto">
          <KpiRow kpis={kpis} />
        </div>

        {/* Main Content Area - Flexible center with side panels */}
        <div className="flex-1 flex gap-4 min-h-0 mb-4">
          {/* Left Panel - Locations & Companies */}
          <div className="pointer-events-auto h-full">
            <SidePanelLeft
              companies={filteredCompanies}
              allCompanies={allCompanies}
              selectedCompany={selectedCompany}
              onSelectCompany={handleSelectCompany}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Center - Spacer for map visibility */}
          <div className="flex-1" />

          {/* Right Panel - Overview */}
          <div className="pointer-events-auto h-full hidden lg:block">
            <SidePanelRight kpis={kpis} companies={filteredCompanies} />
          </div>
        </div>

        {/* Bottom Details Panel */}
        <div className="pointer-events-auto">
          <BottomDetailsPanel
            company={selectedCompany}
            onClear={handleClearSelection}
          />
        </div>
      </div>
    </div>
  );
}
