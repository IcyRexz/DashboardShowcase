"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Building2, ChevronRight, Sun, Moon, X, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  SustainabilityCompany,
  Location,
  RiskBand,
} from "@/data/sustainability";
import { fmtTCO2e, fmtPct } from "@/data/sustainability";

interface MapViewProps {
  locations: Location[];
  selectedCompany: SustainabilityCompany | null;
  onSelectCompany: (company: SustainabilityCompany) => void;
}

type MapStyle = "light" | "dark";

const TILE_PRESETS = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

const RISK_COLORS = {
  Good: { bg: "#22c55e", label: "Good" },
  Watch: { bg: "#f59e0b", label: "Watch" },
  Review: { bg: "#ef4444", label: "Review" },
} as const;

interface MapLegendProps {
  mapStyle: MapStyle;
  onDismiss: () => void;
}

function MapLegend({ mapStyle, onDismiss }: MapLegendProps) {
  const isDark = mapStyle === "dark";

  return (
    <div
      className={`absolute bottom-20 left-4 z-1000 min-w-[180px] rounded-lg shadow-lg border ${
        isDark
          ? "bg-zinc-900/95 border-zinc-700 text-zinc-100"
          : "bg-white/95 border-zinc-300 text-zinc-900"
      } backdrop-blur-md`}
    >
      <div
        className={`flex items-center justify-between p-3 border-b ${
          isDark ? "border-zinc-700" : "border-zinc-200"
        }`}
      >
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Legend
        </h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className={`h-6 w-6 ${
            isDark
              ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
          aria-label="Dismiss legend"
          title="Dismiss legend"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <p
          className={`text-xs font-medium mb-2 ${
            isDark ? "text-zinc-400" : "text-zinc-600"
          }`}
        >
          Risk Band
        </p>
        {Object.entries(RISK_COLORS).map(([risk, { bg, label }]) => (
          <div key={risk} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: bg }}
            />
            <span
              className={`text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
            >
              {label}
            </span>
          </div>
        ))}

        <div
          className={`mt-3 pt-3 border-t text-xs ${
            isDark
              ? "border-zinc-700 text-zinc-500"
              : "border-zinc-200 text-zinc-500"
          }`}
        >
          <p className="mb-2">Risk is based on:</p>
          <ul className="space-y-1 text-[10px]">
            <li>• Data completeness</li>
            <li>• Extraction quality</li>
            <li>• Waste diversion rate</li>
          </ul>
        </div>

        <div
          className={`mt-3 pt-3 border-t ${
            isDark ? "border-zinc-700" : "border-zinc-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium ${
                isDark
                  ? "bg-zinc-800 border border-zinc-600 text-zinc-300"
                  : "bg-zinc-100 border border-zinc-300 text-zinc-700"
              }`}
            >
              3
            </div>
            <span
              className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}
            >
              Companies at location
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MapStyleToggleProps {
  mapStyle: MapStyle;
  onToggle: () => void;
}

function MapStyleToggle({ mapStyle, onToggle }: MapStyleToggleProps) {
  const isDark = mapStyle === "dark";
  const ariaLabel = isDark ? "Switch to light map" : "Switch to dark map";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className={`absolute top-4 right-4 z-1000 h-9 w-9 shadow-md ${
        isDark
          ? "bg-zinc-800/90 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
          : "bg-white/90 border-zinc-300 text-zinc-900 hover:bg-zinc-100"
      }`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function MapView({
  locations,
  selectedCompany,
  onSelectCompany,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [activePopup, setActivePopup] = useState<Location | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");
  const [showLegend, setShowLegend] = useState(true);

  const getRiskColor = (riskBand: RiskBand): string => {
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
  };

  const getMarkerColor = (location: Location): string => {
    // Get worst risk band among companies at this location
    const hasReview = location.companies.some(
      (c) => c.derived.riskBand === "Review",
    );
    const hasWatch = location.companies.some(
      (c) => c.derived.riskBand === "Watch",
    );

    if (hasReview) return "#ef4444"; // red
    if (hasWatch) return "#f59e0b"; // amber
    return "#22c55e"; // green
  };

  const handleToggleMapStyle = useCallback(() => {
    setMapStyle((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const handleDismissLegend = useCallback(() => {
    setShowLegend(false);
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    const container = mapRef.current;

    // Track if this effect instance is still mounted
    let isMounted = true;
    let mapInstance: L.Map | null = null;

    const initMap = async () => {
      // Double check we haven't been unmounted or already initialized
      if (!isMounted) return;
      if (mapInstanceRef.current) return;

      // Check if container already has a Leaflet map (from HMR or Strict Mode)
      const leafletContainer = container as HTMLElement & {
        _leaflet_id?: number;
      };
      if (leafletContainer._leaflet_id) {
        // Container already has a map, try to clean it up first
        try {
          // Remove the old map instance by clearing the container
          delete leafletContainer._leaflet_id;
          container.innerHTML = "";
        } catch {
          // Ignore cleanup errors
        }
      }

      try {
        await import("leaflet/dist/leaflet.css");

        // Final check before creating map
        if (!isMounted || mapInstanceRef.current) return;

        // Center on Singapore since all companies are Singapore-based
        mapInstance = L.map(container, {
          center: [1.35, 103.82],
          zoom: 11,
          zoomControl: false,
          attributionControl: false,
        });

        const tilePreset = TILE_PRESETS[mapStyle];
        const tileLayer = L.tileLayer(tilePreset.url, {
          maxZoom: 19,
          attribution: tilePreset.attribution,
        }).addTo(mapInstance);

        tileLayerRef.current = tileLayer;

        L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

        mapInstanceRef.current = mapInstance;

        if (isMounted) {
          setIsMapReady(true);
        }

        // Close popup when clicking on map (but not markers)
        mapInstance.on("click", () => {
          setActivePopup(null);
        });
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    };

    initMap();

    return () => {
      isMounted = false;

      // Clean up map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }

      // Also try to clean up if mapInstance was created but not assigned to ref
      if (mapInstance && mapInstance !== mapInstanceRef.current) {
        try {
          mapInstance.off();
          mapInstance.remove();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Update tile layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;
    const tilePreset = TILE_PRESETS[mapStyle];

    // Remove old tile layer
    tileLayerRef.current.remove();

    // Add new tile layer
    const newTileLayer = L.tileLayer(tilePreset.url, {
      maxZoom: 19,
      attribution: tilePreset.attribution,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;

    // Update container class for CSS variable switching
    if (mapRef.current) {
      if (mapStyle === "dark") {
        mapRef.current.classList.add("map-dark");
      } else {
        mapRef.current.classList.remove("map-dark");
      }
    }
  }, [mapStyle, isMapReady]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach((location) => {
      const color = getMarkerColor(location);
      const isSelected =
        selectedCompany &&
        location.companies.some((c) => c.id === selectedCompany.id);

      // Updated marker with white border and shadow for light map visibility
      const markerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div class="relative cursor-pointer group">
            <div class="w-4 h-4 rounded-full border-2 border-white transition-all duration-300 ${isSelected ? "scale-125" : ""}" 
                 style="background-color: ${color}; box-shadow: 0 2px 8px rgba(0,0,0,0.25);"></div>
            <div class="absolute -top-1 -left-1 w-6 h-6 rounded-full animate-ping opacity-30 marker-ping" 
                 style="background-color: ${color};"></div>
            ${
              location.companies.length > 1
                ? `<div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-zinc-300 rounded-full flex items-center justify-center text-[9px] text-zinc-700 font-medium shadow-sm">${location.companies.length}</div>`
                : ""
            }
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([location.lat, location.lng], {
        icon: markerIcon,
      }).addTo(map);

      marker.on("click", (e) => {
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        setPopupPosition({ x: containerPoint.x, y: containerPoint.y });
        setActivePopup(location);
      });

      markersRef.current.push(marker);
    });
  }, [locations, selectedCompany, isMapReady]);

  // Pan to selected company
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCompany || !isMapReady) return;

    mapInstanceRef.current.setView(
      [selectedCompany.lat, selectedCompany.lng],
      13,
      {
        animate: true,
        duration: 0.5,
      },
    );
  }, [selectedCompany, isMapReady]);

  const handleCompanyClick = (company: SustainabilityCompany) => {
    onSelectCompany(company);
    setActivePopup(null);
  };

  const isDark = mapStyle === "dark";

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Map Style Toggle */}
      <MapStyleToggle mapStyle={mapStyle} onToggle={handleToggleMapStyle} />

      {/* Map Legend */}
      {showLegend && (
        <MapLegend mapStyle={mapStyle} onDismiss={handleDismissLegend} />
      )}

      {/* Custom Popup */}
      {activePopup && isMapReady && (
        <div
          className={`absolute z-1000 min-w-[280px] max-w-[340px] backdrop-blur-md border rounded-lg shadow-xl ${
            isDark
              ? "bg-zinc-900/95 border-zinc-700"
              : "bg-white/95 border-zinc-300"
          }`}
          style={{
            left: Math.min(popupPosition.x + 15, window.innerWidth - 360),
            top: popupPosition.y - 10,
            transform: "translateY(-50%)",
          }}
        >
          <div
            className={`p-3 border-b ${
              isDark ? "border-zinc-800" : "border-zinc-200"
            }`}
          >
            <h4
              className={`text-sm font-semibold ${
                isDark ? "text-zinc-100" : "text-zinc-900"
              }`}
            >
              {activePopup.city}
            </h4>
            <p
              className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-600"}`}
            >
              {activePopup.country} · {activePopup.companies.length}{" "}
              {activePopup.companies.length === 1 ? "company" : "companies"}
            </p>
          </div>

          <div className="p-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            <div className="space-y-1">
              {activePopup.companies.map((company) => {
                const riskBand = company.derived.riskBand;
                return (
                  <button
                    key={company.id}
                    onClick={() => handleCompanyClick(company)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-1 ${
                      selectedCompany?.id === company.id
                        ? isDark
                          ? "bg-zinc-100 text-zinc-900 focus-visible:ring-zinc-400"
                          : "bg-zinc-900 text-zinc-100 focus-visible:ring-zinc-600"
                        : isDark
                          ? "hover:bg-zinc-800 text-zinc-100 focus-visible:ring-zinc-500"
                          : "hover:bg-zinc-100 text-zinc-900 focus-visible:ring-zinc-400"
                    }`}
                  >
                    <Building2
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        selectedCompany?.id === company.id
                          ? isDark
                            ? "text-zinc-700"
                            : "text-zinc-400"
                          : isDark
                            ? "text-zinc-500"
                            : "text-zinc-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          selectedCompany?.id === company.id
                            ? isDark
                              ? "text-zinc-900"
                              : "text-zinc-100"
                            : isDark
                              ? "text-zinc-100"
                              : "text-zinc-900"
                        }`}
                      >
                        {company.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 h-4 ${getRiskColor(riskBand)}`}
                        >
                          {riskBand}
                        </Badge>
                        {company.derived.scope12Total !== null && (
                          <span
                            className={`text-[10px] ${
                              selectedCompany?.id === company.id
                                ? isDark
                                  ? "text-zinc-600"
                                  : "text-zinc-400"
                                : isDark
                                  ? "text-zinc-500"
                                  : "text-zinc-500"
                            }`}
                          >
                            {fmtTCO2e(company.derived.scope12Total)}
                          </span>
                        )}
                        {company.derived.wasteDiversionRate !== null && (
                          <span
                            className={`text-[10px] ${
                              selectedCompany?.id === company.id
                                ? isDark
                                  ? "text-zinc-600"
                                  : "text-zinc-400"
                                : isDark
                                  ? "text-zinc-500"
                                  : "text-zinc-500"
                            }`}
                          >
                            · {fmtPct(company.derived.wasteDiversionRate)} div
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${
                        selectedCompany?.id === company.id
                          ? isDark
                            ? "text-zinc-600"
                            : "text-zinc-400"
                          : "text-zinc-600"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
