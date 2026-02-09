"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  Filter,
  MapPin,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  type SustainabilityCompany,
  type RiskBand,
  type FilterOptions,
  getCountries,
  getRiskBands,
  fmtTCO2e,
  fmtPct,
} from "@/data/sustainability";

interface SidePanelLeftProps {
  companies: SustainabilityCompany[];
  allCompanies: SustainabilityCompany[];
  selectedCompany: SustainabilityCompany | null;
  onSelectCompany: (company: SustainabilityCompany) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function SidePanelLeft({
  companies,
  allCompanies,
  selectedCompany,
  onSelectCompany,
  filters,
  onFiltersChange,
}: SidePanelLeftProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [showRiskFilter, setShowRiskFilter] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const countries = getCountries(allCompanies);
  const riskBands = getRiskBands();

  // Scroll selected company into view
  useEffect(() => {
    if (selectedCompany && listContainerRef.current) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const element = listContainerRef.current?.querySelector(
          `[data-company-id="${selectedCompany.id}"]`,
        );
        if (element) {
          // Check for reduced motion preference
          const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "nearest",
          });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCompany]);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCountryToggle = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter((c) => c !== country)
      : [...filters.countries, country];
    onFiltersChange({ ...filters, countries: newCountries });
  };

  const handleRiskToggle = (risk: RiskBand) => {
    const newRiskBands = filters.riskBands.includes(risk)
      ? filters.riskBands.filter((r) => r !== risk)
      : [...filters.riskBands, risk];
    onFiltersChange({ ...filters, riskBands: newRiskBands });
  };

  const handleIncompleteToggle = (checked: boolean) => {
    onFiltersChange({ ...filters, incompleteOnly: checked });
  };

  const handleRemoveCountry = (country: string) => {
    onFiltersChange({
      ...filters,
      countries: filters.countries.filter((c) => c !== country),
    });
  };

  const handleRemoveRisk = (risk: RiskBand) => {
    onFiltersChange({
      ...filters,
      riskBands: filters.riskBands.filter((r) => r !== risk),
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      countries: [],
      riskBands: [],
      incompleteOnly: false,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.countries.length > 0 ||
    filters.riskBands.length > 0 ||
    filters.incompleteOnly;

  const hasActiveFilterChips =
    filters.countries.length > 0 ||
    filters.riskBands.length > 0 ||
    filters.incompleteOnly;

  const getRiskColor = (risk: RiskBand): string => {
    switch (risk) {
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
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="h-px w-6 bg-zinc-700" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Locations"
          title="Locations"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Companies"
          title="Companies"
        >
          <Building2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          aria-label="Filters"
          title="Filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full panel-glass rounded-lg flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100">Companies</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            aria-label="Collapse panel"
            title="Collapse panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search companies..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 h-9"
            aria-label="Search companies"
          />
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilterChips && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filters.countries.map((country) => (
              <Badge
                key={`country-${country}`}
                variant="secondary"
                className="h-6 px-2 text-xs bg-zinc-700/80 text-zinc-200 hover:bg-zinc-600 cursor-pointer flex items-center gap-1"
              >
                {country}
                <button
                  onClick={() => handleRemoveCountry(country)}
                  className="ml-0.5 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 rounded"
                  aria-label={`Remove ${country} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.riskBands.map((risk) => (
              <Badge
                key={`risk-${risk}`}
                variant="outline"
                className={`h-6 px-2 text-xs cursor-pointer flex items-center gap-1 ${getRiskColor(risk)}`}
              >
                {risk}
                <button
                  onClick={() => handleRemoveRisk(risk)}
                  className="ml-0.5 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current rounded"
                  aria-label={`Remove ${risk} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.incompleteOnly && (
              <Badge
                variant="outline"
                className="h-6 px-2 text-xs cursor-pointer flex items-center gap-1 border-amber-500/30 text-amber-400 bg-amber-500/10"
              >
                <AlertCircle className="h-3 w-3" />
                Incomplete
                <button
                  onClick={() => handleIncompleteToggle(false)}
                  className="ml-0.5 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current rounded"
                  aria-label="Remove incomplete filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-100"
              aria-label="Clear all filters"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Filters
          </span>
          {hasActiveFilters && !hasActiveFilterChips && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-100"
              aria-label="Clear all filters"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Country Filter */}
        <Collapsible
          open={showCountryFilter}
          onOpenChange={setShowCountryFilter}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-8 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
              aria-expanded={showCountryFilter}
            >
              <span className="flex items-center gap-2">
                Country
                {filters.countries.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-xs bg-zinc-700"
                  >
                    {filters.countries.length}
                  </Badge>
                )}
              </span>
              <ChevronRight
                className={`h-3 w-3 transition-transform ${
                  showCountryFilter ? "rotate-90" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {countries.map((country) => (
              <label
                key={country}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer"
              >
                <Checkbox
                  checked={filters.countries.includes(country)}
                  onCheckedChange={() => handleCountryToggle(country)}
                  className="border-zinc-600 data-[state=checked]:bg-zinc-100 data-[state=checked]:border-zinc-100"
                  aria-label={`Filter by ${country}`}
                />
                <span className="text-xs text-zinc-300">{country}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Risk Band Filter */}
        <Collapsible open={showRiskFilter} onOpenChange={setShowRiskFilter}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between h-8 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
              aria-expanded={showRiskFilter}
            >
              <span className="flex items-center gap-2">
                Risk Band
                {filters.riskBands.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-xs bg-zinc-700"
                  >
                    {filters.riskBands.length}
                  </Badge>
                )}
              </span>
              <ChevronRight
                className={`h-3 w-3 transition-transform ${
                  showRiskFilter ? "rotate-90" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {riskBands.map((risk) => (
              <label
                key={risk}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer"
              >
                <Checkbox
                  checked={filters.riskBands.includes(risk)}
                  onCheckedChange={() => handleRiskToggle(risk)}
                  className="border-zinc-600 data-[state=checked]:bg-zinc-100 data-[state=checked]:border-zinc-100"
                  aria-label={`Filter by ${risk} risk`}
                />
                <span className="text-xs text-zinc-300">{risk}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Incomplete Only Toggle */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <label
            htmlFor="incomplete-toggle"
            className="text-xs text-zinc-300 cursor-pointer flex items-center gap-2"
          >
            <AlertCircle className="h-3 w-3 text-amber-400" />
            Incomplete only
          </label>
          <Switch
            id="incomplete-toggle"
            checked={filters.incompleteOnly}
            onCheckedChange={handleIncompleteToggle}
            className="data-[state=checked]:bg-amber-500"
            aria-label="Show only companies with incomplete data"
          />
        </div>
      </div>

      {/* Company List */}
      <div className="flex-1 overflow-hidden">
        <div className="p-3 pb-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Companies ({companies.length})
          </span>
        </div>
        <ScrollArea className="h-[calc(100%-32px)] px-3 pb-3">
          <div ref={listContainerRef} className="space-y-1">
            {companies.map((company) => {
              const riskBand = company.derived.riskBand;
              return (
                <button
                  key={company.id}
                  data-company-id={company.id}
                  onClick={() => onSelectCompany(company)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 ${
                    selectedCompany?.id === company.id
                      ? "bg-zinc-100 text-zinc-900"
                      : "hover:bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <Building2
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      selectedCompany?.id === company.id
                        ? "text-zinc-700"
                        : "text-zinc-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        selectedCompany?.id === company.id
                          ? "text-zinc-900"
                          : "text-zinc-100"
                      }`}
                    >
                      {company.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${getRiskColor(riskBand)}`}
                      >
                        {riskBand}
                      </Badge>
                      {company.derived.scope12Total !== null && (
                        <span
                          className={`text-[10px] ${
                            selectedCompany?.id === company.id
                              ? "text-zinc-600"
                              : "text-zinc-500"
                          }`}
                        >
                          {fmtTCO2e(company.derived.scope12Total)}
                        </span>
                      )}
                    </div>
                    {company.derived.wasteDiversionRate !== null && (
                      <p
                        className={`text-[10px] mt-0.5 ${
                          selectedCompany?.id === company.id
                            ? "text-zinc-600"
                            : "text-zinc-500"
                        }`}
                      >
                        {fmtPct(company.derived.wasteDiversionRate)} waste
                        diverted
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
