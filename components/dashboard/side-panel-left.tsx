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
  type FilterOptions,
  type UnitView,
  getCountries,
  getIndustries,
  fmtTCO2e,
  fmtPct,
  getCompletenessBadgeClass,
} from "@/data/sustainability";

interface SidePanelLeftProps {
  companies: SustainabilityCompany[];
  allCompanies: SustainabilityCompany[];
  selectedCompany: SustainabilityCompany | null;
  onSelectCompany: (company: SustainabilityCompany) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  unitView?: UnitView;
}

export function SidePanelLeft({
  companies,
  allCompanies,
  selectedCompany,
  onSelectCompany,
  filters,
  onFiltersChange,
  unitView = "Canonical",
}: SidePanelLeftProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [showIndustryFilter, setShowIndustryFilter] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const countries = getCountries(allCompanies);
  const industries = getIndustries(allCompanies);

  useEffect(() => {
    if (selectedCompany && listContainerRef.current) {
      const timeoutId = setTimeout(() => {
        const element = listContainerRef.current?.querySelector(
          `[data-company-id="${selectedCompany.id}"]`,
        );
        if (element) {
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

  const handleIncompleteToggle = (checked: boolean) => {
    onFiltersChange({ ...filters, incompleteOnly: checked });
  };

  const handleIndustryToggle = (industry: string) => {
    const next = filters.industries.includes(industry)
      ? filters.industries.filter((i) => i !== industry)
      : [...filters.industries, industry];
    onFiltersChange({ ...filters, industries: next });
  };

  const handleRemoveCountry = (country: string) => {
    onFiltersChange({
      ...filters,
      countries: filters.countries.filter((c) => c !== country),
    });
  };

  const handleRemoveIndustry = (industry: string) => {
    onFiltersChange({
      ...filters,
      industries: filters.industries.filter((i) => i !== industry),
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      countries: [],
      incompleteOnly: false,
      industries: [],
      reportYear: filters.reportYear,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.countries.length > 0 ||
    filters.incompleteOnly ||
    filters.industries.length > 0;

  const hasActiveFilterChips =
    filters.countries.length > 0 ||
    filters.incompleteOnly ||
    filters.industries.length > 0;

  if (isCollapsed) {
    return (
      <div className="w-12 h-full panel-collapsed rounded-lg flex flex-col items-center py-4 gap-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Expand panel"
          title="Expand panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="h-px w-6 bg-gray-200" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Locations"
          title="Locations"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Companies"
          title="Companies"
        >
          <Building2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Filters"
          title="Filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full panel-glass rounded-lg flex flex-col transition-all duration-300 min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Companies</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Collapse panel"
            title="Collapse panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search companies..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400 h-9"
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
                className="h-6 px-2 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer flex items-center gap-1"
              >
                {country}
                <button
                  onClick={() => handleRemoveCountry(country)}
                  className="ml-0.5 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 rounded"
                  aria-label={`Remove ${country} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.industries.map((industry) => (
              <Badge
                key={`industry-${industry}`}
                variant="secondary"
                className="h-6 px-2 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer flex items-center gap-1"
              >
                {industry}
                <button
                  onClick={() => handleRemoveIndustry(industry)}
                  className="ml-0.5 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 rounded"
                  aria-label={`Remove ${industry} industry filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.incompleteOnly && (
              <Badge
                variant="outline"
                className="h-6 px-2 text-xs cursor-pointer flex items-center gap-1 border-red-300 text-red-700 bg-red-50"
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
            {hasActiveFilterChips && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
                aria-label="Clear all filters"
                title="Clear all filters"
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {/* Filters */}
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Filters
            </span>
            {hasActiveFilters && !hasActiveFilterChips && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
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
                className="w-full justify-between h-8 px-2 text-xs text-gray-700 hover:bg-gray-100"
                aria-expanded={showCountryFilter}
              >
                <span className="flex items-center gap-2">
                  Country
                  {filters.countries.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs bg-gray-200"
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.countries.includes(country)}
                    onCheckedChange={() => handleCountryToggle(country)}
                    className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                    aria-label={`Filter by ${country}`}
                  />
                  <span className="text-xs text-gray-700">{country}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Industry Filter */}
          <Collapsible
            open={showIndustryFilter}
            onOpenChange={setShowIndustryFilter}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-8 px-2 text-xs text-gray-700 hover:bg-gray-100"
                aria-expanded={showIndustryFilter}
              >
                <span className="flex items-center gap-2">
                  Industry
                  {filters.industries.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs bg-gray-200"
                    >
                      {filters.industries.length}
                    </Badge>
                  )}
                </span>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    showIndustryFilter ? "rotate-90" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1">
              {industries.map((industry) => (
                <label
                  key={industry}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <Checkbox
                    checked={filters.industries.includes(industry)}
                    onCheckedChange={() => handleIndustryToggle(industry)}
                    className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                    aria-label={`Filter by ${industry} industry`}
                  />
                  <span className="text-xs text-gray-700">{industry}</span>
                </label>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Incomplete Only Toggle */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <label
              htmlFor="incomplete-toggle"
              className="text-xs text-gray-700 cursor-pointer flex items-center gap-2"
            >
              <AlertCircle className="h-3 w-3 text-red-600" />
              Below 6/12 fields
            </label>
            <Switch
              id="incomplete-toggle"
              checked={filters.incompleteOnly}
              onCheckedChange={handleIncompleteToggle}
              className="data-[state=checked]:bg-red-500"
              aria-label="Show only companies below the 6 of 12 overview completeness threshold"
            />
          </div>
        </div>

        {/* Company List */}
        <div className="p-3 pb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Companies ({companies.length})
          </span>
        </div>

        <div ref={listContainerRef} className="space-y-1 px-3 pb-3">
          {companies.map((company) => {
            const comp = company.derived.completeness;
            return (
              <button
                type="button"
                key={company.id}
                data-company-id={company.id}
                onClick={() => onSelectCompany(company)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCompany(company);
                  }
                }}
                className={`w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white ${
                  selectedCompany?.id === company.id
                    ? "bg-gray-900 text-white"
                    : "hover:bg-gray-100 text-gray-900"
                }`}
              >
                <Building2
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    selectedCompany?.id === company.id
                      ? "text-gray-300"
                      : "text-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      selectedCompany?.id === company.id
                        ? "text-white"
                        : "text-gray-900"
                    }`}
                  >
                    {company.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${getCompletenessBadgeClass(comp.meetsGreenThreshold)}`}
                      title="Data completeness (overview fields)"
                    >
                      {comp.score12}/12
                    </Badge>
                    {company.derived.coverageScore != null && (
                      <span
                        className={`text-[10px] ${
                          selectedCompany?.id === company.id
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                        title="Coverage score (key ESG fields present)"
                      >
                        {company.derived.coverageScore}% cov
                        {company.derived.coverageRank != null &&
                          ` · #${company.derived.coverageRank}`}
                      </span>
                    )}
                    {company.derived.scope12Total !== null && (
                      <span
                        className={`text-[10px] ${
                          selectedCompany?.id === company.id
                            ? "text-gray-400"
                            : "text-gray-500"
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
                          ? "text-gray-400"
                          : "text-gray-500"
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
  );
}
