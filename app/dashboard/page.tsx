"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { X, Building2, Map, Table2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidePanelLeft } from "@/components/dashboard/side-panel-left";
import { SidePanelRight } from "@/components/dashboard/side-panel-right";
import { BottomDetailsPanel } from "@/components/dashboard/bottom-details-panel";
import { TableView } from "@/components/dashboard/table-view";
import {
  type SustainabilityCompany,
  type FilterOptions,
  type KpiData,
  type UnitView,
  type Year,
  SUSTAINABILITY_COMPANIES,
  filterCompanies,
  getLocations,
  calculateKpis,
  getAvailableReportYears,
  getDefaultReportYear,
  getCompletenessBadgeClass,
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

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: typeof Map }[] = [
  { mode: "map", label: "Map", icon: Map },
  { mode: "table", label: "Table", icon: Table2 },
];

export default function DashboardPage() {
  const [selectedCompany, setSelectedCompany] =
    useState<SustainabilityCompany | null>(null);
  const [unitView, setUnitView] = useState<UnitView>("Canonical");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [filters, setFilters] = useState<FilterOptions>(() => ({
    search: "",
    countries: [],
    incompleteOnly: false,
    industries: [],
    reportYear: getDefaultReportYear(SUSTAINABILITY_COMPANIES),
  }));

  const allCompanies = SUSTAINABILITY_COMPANIES;

  const availableYears = useMemo(
    () => getAvailableReportYears(allCompanies),
    [allCompanies],
  );

  const companiesForSelectedYear = useMemo(
    () =>
      allCompanies.filter((c) => c.reportYear === filters.reportYear),
    [allCompanies, filters.reportYear],
  );

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

  const handleReportYearChange = (year: Year) => {
    handleFiltersChange({ ...filters, reportYear: year });
  };

  const shiftReportYear = (delta: -1 | 1) => {
    const idx = availableYears.indexOf(filters.reportYear);
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= availableYears.length) return;
    handleReportYearChange(availableYears[nextIdx]);
  };

  const completeness = selectedCompany?.derived.completeness;

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
                {filteredCompanies.length < companiesForSelectedYear.length
                  ? `${filteredCompanies.length} of ${companiesForSelectedYear.length}`
                  : `${companiesForSelectedYear.length}`}{" "}
                listed companies ({filters.reportYear}
                {availableYears.length > 1
                  ? ` · ${availableYears[0]}–${availableYears[availableYears.length - 1]}`
                  : ""}
                )
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
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

              {availableYears.length > 0 && (
                <div className="flex items-center gap-1 bg-white/90 border border-gray-200 rounded-lg px-1 py-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => shiftReportYear(-1)}
                    disabled={availableYears.indexOf(filters.reportYear) <= 0}
                    className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Previous report year"
                    title="Previous year"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span
                    className="text-xs font-medium text-gray-800 tabular-nums min-w-12 text-center"
                    title="Report year"
                  >
                    {filters.reportYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => shiftReportYear(1)}
                    disabled={
                      availableYears.indexOf(filters.reportYear) >=
                      availableYears.length - 1
                    }
                    className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Next report year"
                    title="Next year"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {selectedCompany && completeness && (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 border border-gray-200 rounded-lg shadow-sm">
                    <Building2 className="h-4 w-4 text-gray-400" aria-hidden />
                    <span className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                      {selectedCompany.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${getCompletenessBadgeClass(completeness.meetsGreenThreshold)}`}
                      title="Data completeness (overview fields filled)"
                    >
                      {completeness.score12}/12
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
              reportYear={filters.reportYear}
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
            allCompanies={filteredCompanies}
          />
        </div>
      </div>
    </div>
  );
}
