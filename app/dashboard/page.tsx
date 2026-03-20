"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { X, Building2, Map, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidePanelLeft } from "@/components/dashboard/side-panel-left";
import { SidePanelRight } from "@/components/dashboard/side-panel-right";
import { BottomDetailsPanel } from "@/components/dashboard/bottom-details-panel";
import { TableView } from "@/components/dashboard/table-view";
import {
  type SustainabilityCompany,
  type PlausibilityBand,
  type FilterOptions,
  type KpiData,
  type UnitView,
  SUSTAINABILITY_COMPANIES,
  filterCompanies,
  getLocations,
  calculateKpis,
} from "@/data/sustainability";

const MapView = dynamic(
  () => import("@/components/dashboard/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 animate-pulse">Loading Map...</div>
      </div>
    ),
  },
);

type ViewMode = "map" | "table";

function getPlausibilityColor(band: PlausibilityBand): string {
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
}

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: typeof Map }[] = [
  { mode: "map", label: "Map", icon: Map },
  { mode: "table", label: "Table", icon: Table2 },
];

export default function DashboardPage() {
  const [selectedCompany, setSelectedCompany] =
    useState<SustainabilityCompany | null>(null);
  const [unitView, setUnitView] = useState<UnitView>("Canonical");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    countries: [],
    plausibilityBands: [],
    incompleteOnly: false,
    industries: [],
  });

  const allCompanies = SUSTAINABILITY_COMPANIES;

  const filteredCompanies = useMemo(() => {
    return filterCompanies(allCompanies, filters);
  }, [allCompanies, filters]);

  const filteredLocations = useMemo(() => {
    return getLocations(filteredCompanies);
  }, [filteredCompanies]);

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
    if (selectedCompany) {
      const stillVisible = filterCompanies(allCompanies, newFilters).some(
        (c) => c.id === selectedCompany.id,
      );
      if (!stillVisible) setSelectedCompany(null);
    }
  };

  const plausibilityBand = selectedCompany
    ? (selectedCompany.derived.plausibilityBand ??
      selectedCompany.derived.riskBand)
    : null;

  const isMapView = viewMode === "map";

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-50">
      {/* Map Background */}
      <div
        className={`absolute inset-0 z-0 ${isMapView ? "" : "invisible"}`}
      >
        <MapView
          locations={filteredLocations}
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
        />
      </div>

      {/* Table View */}
      {!isMapView && (
        <div className="absolute inset-x-0 top-[76px] bottom-0 z-5 px-4 pb-4 overflow-hidden">
          <TableView
            companies={filteredCompanies}
            selectedCompany={selectedCompany}
            onSelectCompany={handleSelectCompany}
          />
        </div>
      )}

      {/* Dashboard Content */}
      <div className="relative z-10 h-full flex flex-col p-4 pointer-events-none">
        {/* Header */}
        <header className="mb-4 pointer-events-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
                Sustainability Monitoring Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                ESG metrics for{" "}
                {filteredCompanies.length < allCompanies.length
                  ? `${filteredCompanies.length} of ${allCompanies.length}`
                  : `${allCompanies.length}`}{" "}
                listed companies across multiple countries (2021–2024)
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/90 border border-gray-200 rounded-lg p-0.5 shadow-sm">
                {VIEW_OPTIONS.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === mode
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    title={label}
                    aria-label={`Switch to ${label}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {selectedCompany && plausibilityBand && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 border border-gray-200 rounded-lg shadow-sm">
                    <Building2 className="h-4 w-4 text-gray-400" aria-hidden />
                    <span className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                      {selectedCompany.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${getPlausibilityColor(plausibilityBand)}`}
                      title="Data plausibility"
                    >
                      {plausibilityBand}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    className="border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 bg-white/90 shadow-sm"
                    aria-label="Clear selection"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4 mr-1.5" aria-hidden />
                    Clear
                  </Button>
                </>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Units:</span>
                <select
                  value={unitView}
                  onChange={(e) => setUnitView(e.target.value as UnitView)}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 shadow-sm"
                  aria-label="Unit view: Canonical or Raw"
                  title="Show values in canonical units (tCO2e, kWh, m3, tonnes) or raw extracted"
                >
                  <option value="Canonical">Canonical</option>
                  <option value="Raw">Raw</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 min-h-0 mb-4">
          {/* Left Panel */}
          {isMapView && (
            <div className="pointer-events-auto h-full">
              <SidePanelLeft
                companies={filteredCompanies}
                allCompanies={allCompanies}
                selectedCompany={selectedCompany}
                onSelectCompany={handleSelectCompany}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                unitView={unitView}
              />
            </div>
          )}

          {/* Center - Spacer */}
          <div className="flex-1" />

          {/* Right Panel - Overview (hidden in table view) */}
          {isMapView && (
            <div className="pointer-events-auto h-full hidden lg:block">
            <SidePanelRight
              kpis={kpis}
              companies={filteredCompanies}
            />
            </div>
          )}
        </div>

        {/* Bottom Details Panel */}
        <div className="pointer-events-auto">
          <BottomDetailsPanel
            company={selectedCompany}
            onClear={handleClearSelection}
            unitView={unitView}
            allCompanies={allCompanies}
          />
        </div>
      </div>
    </div>
  );
}
