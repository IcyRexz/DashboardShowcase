"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type {
  SustainabilityCompany,
  Location,
  PlausibilityBand,
} from "@/data/sustainability";
import { fmtTCO2e } from "@/data/sustainability";

interface MapViewProps {
  locations: Location[];
  selectedCompany: SustainabilityCompany | null;
  onSelectCompany: (company: SustainabilityCompany) => void;
}

const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;

const BAND_COLORS: Record<PlausibilityBand, string> = {
  Good: "#22c55e",
  Watch: "#f59e0b",
  Review: "#ef4444",
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

function getMarkerColor(location: Location): string {
  const band = (c: SustainabilityCompany) =>
    c.derived.plausibilityBand ?? c.derived.riskBand;
  const hasReview = location.companies.some((c) => band(c) === "Review");
  const hasWatch = location.companies.some((c) => band(c) === "Watch");
  if (hasReview) return BAND_COLORS.Review;
  if (hasWatch) return BAND_COLORS.Watch;
  return BAND_COLORS.Good;
}

export function MapView({
  locations,
  selectedCompany,
  onSelectCompany,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [activePopup, setActivePopup] = useState<{
    companies: SustainabilityCompany[];
    title: string;
    subtitle: string;
  } | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isMapReady, setIsMapReady] = useState(false);

  const clearLayers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      clusterGroupRef.current.remove();
      clusterGroupRef.current = null;
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    const container = mapRef.current;
    let isMounted = true;
    let mapInstance: L.Map | null = null;

    const initMap = () => {
      if (!isMounted || mapInstanceRef.current) return;

      const leafletContainer = container as HTMLElement & {
        _leaflet_id?: number;
      };
      if (leafletContainer._leaflet_id) {
        try {
          delete leafletContainer._leaflet_id;
          container.innerHTML = "";
        } catch {
          /* ignore */
        }
      }

      try {
        if (!isMounted || mapInstanceRef.current) return;

        mapInstance = L.map(container, {
          center: [1.3521, 103.8198],
          zoom: 11,
          zoomControl: false,
          attributionControl: false,
        });

        const tileLayer = L.tileLayer(DARK_TILES.url, {
          maxZoom: 19,
          attribution: DARK_TILES.attribution,
        }).addTo(mapInstance);

        tileLayerRef.current = tileLayer;
        L.control.zoom({ position: "bottomright" }).addTo(mapInstance);
        mapInstanceRef.current = mapInstance;

        if (isMounted) setIsMapReady(true);

        mapInstance.on("click", () => setActivePopup(null));
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch {
          /* ignore */
        }
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
      if (mapInstance && mapInstance !== mapInstanceRef.current) {
        try {
          mapInstance.off();
          mapInstance.remove();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  // Render clustered markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;

    clearLayers();

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (clusterObj) => {
        const childMarkers = clusterObj.getAllChildMarkers();
        const count = childMarkers.length;

        let good = 0;
        let watch = 0;
        let review = 0;
        for (const m of childMarkers) {
          const band = (m.options as { _band?: PlausibilityBand })._band;
          if (band === "Good") good++;
          else if (band === "Watch") watch++;
          else review++;
        }

        const pGood = (good / count) * 100;
        const pWatch = (watch / count) * 100;
        const conicGradient = `conic-gradient(${BAND_COLORS.Good} 0% ${pGood}%, ${BAND_COLORS.Watch} ${pGood}% ${pGood + pWatch}%, ${BAND_COLORS.Review} ${pGood + pWatch}% 100%)`;

        const size = count < 10 ? 40 : count < 50 ? 48 : 56;
        const inner = size - 8;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${conicGradient};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 12px rgba(0,0,0,0.4);
          "><div style="
            width:${inner}px;height:${inner}px;
            background:rgba(24,24,27,0.88);
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-weight:600;font-size:${count < 10 ? 13 : 12}px;
          ">${count}</div></div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2),
        });
      },
    });

    for (const location of locations) {
      const color = getMarkerColor(location);
      const isSelected =
        selectedCompany &&
        location.companies.some((c) => c.id === selectedCompany.id);
      const band = (location.companies[0]?.derived.plausibilityBand ??
        location.companies[0]?.derived.riskBand ??
        "Review") as PlausibilityBand;

      const markerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div class="relative cursor-pointer group">
            <div class="w-4 h-4 rounded-full border-2 border-white transition-all duration-300 ${isSelected ? "scale-125" : ""}" 
                 style="background-color: ${color}; box-shadow: 0 2px 8px rgba(0,0,0,0.25);"></div>
            ${
              isSelected
                ? `<div class="absolute -top-1 -left-1 w-6 h-6 rounded-full animate-ping opacity-30" style="background-color: ${color};"></div>`
                : ""
            }
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([location.lat, location.lng], {
        icon: markerIcon,
        _band: band,
      } as L.MarkerOptions);

      marker.on("click", (e) => {
        if (location.companies.length === 1) {
          onSelectCompany(location.companies[0]);
          setActivePopup(null);
        } else {
          const containerPoint = map.latLngToContainerPoint(e.latlng);
          setPopupPosition({ x: containerPoint.x, y: containerPoint.y });
          setActivePopup({
            companies: location.companies,
            title: location.city,
            subtitle: `${location.country} · ${location.companies.length} companies`,
          });
        }
      });

      cluster.addLayer(marker);
      markersRef.current.push(marker);
    }

    map.addLayer(cluster);
    clusterGroupRef.current = cluster;
  }, [locations, selectedCompany, isMapReady, clearLayers, onSelectCompany]);

  // Pan to selected company — gentle: only pan, don't change zoom unless too far out
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCompany || !isMapReady) return;
    const map = mapInstanceRef.current;
    const currentZoom = map.getZoom();
    const targetLatLng = L.latLng(selectedCompany.lat, selectedCompany.lng);
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isVisible = map.getBounds().contains(targetLatLng);
    const minZoom = 12;

    if (isVisible && currentZoom >= minZoom) {
      map.panTo(targetLatLng, {
        animate: !reducedMotion,
        duration: reducedMotion ? 0 : 0.4,
      });
    } else {
      const targetZoom = Math.max(currentZoom, minZoom);
      map.setView(targetLatLng, targetZoom, {
        animate: !reducedMotion,
        duration: reducedMotion ? 0 : 0.5,
      });
    }
  }, [selectedCompany, isMapReady]);

  const handleCompanyClick = (company: SustainabilityCompany) => {
    onSelectCompany(company);
    setActivePopup(null);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {activePopup && isMapReady && (
        <div
          className="absolute z-1000 min-w-[280px] max-w-[340px] backdrop-blur-md border rounded-lg shadow-xl bg-zinc-900/95 border-zinc-700"
          style={{
            left: Math.min(
              popupPosition.x + 15,
              (mapRef.current?.clientWidth ?? 1200) - 360,
            ),
            top: popupPosition.y - 10,
            transform: "translateY(-50%)",
          }}
        >
          <div className="p-3 border-b border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-100">
              {activePopup.title}
            </h4>
            <p className="text-xs text-zinc-500">{activePopup.subtitle}</p>
          </div>

          <div className="p-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            <div className="space-y-1">
              {activePopup.companies.map((company) => {
                const plausibilityBand =
                  (company.derived.plausibilityBand ??
                    company.derived.riskBand ??
                    "Review") as PlausibilityBand;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleCompanyClick(company)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-all focus-visible:ring-2 focus-visible:ring-offset-1 ${
                      selectedCompany?.id === company.id
                        ? "bg-zinc-100 text-zinc-900 focus-visible:ring-zinc-400"
                        : "hover:bg-zinc-800 text-zinc-100 focus-visible:ring-zinc-500"
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
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 h-4 ${getPlausibilityColor(plausibilityBand)}`}
                          title="Data plausibility"
                        >
                          {plausibilityBand}
                        </Badge>
                        {company.derived.coverageScore != null && (
                          <span
                            className={`text-[10px] ${
                              selectedCompany?.id === company.id
                                ? "text-zinc-600"
                                : "text-zinc-500"
                            }`}
                          >
                            {company.derived.coverageScore}% cov
                          </span>
                        )}
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
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
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
