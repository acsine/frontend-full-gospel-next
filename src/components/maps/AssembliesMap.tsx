"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface AssemblyMapItem {
  id: string;
  name: string;
  city: string;
  district: string;
  pastor: string;
  phone: string;
  address: string;
  members: number;
  services: string[];
  type: "active" | "pioneer" | "historical";
  lat: number;
  lng: number;
}

interface AssembliesMapProps {
  assemblies: AssemblyMapItem[];
  selectedAssembly?: AssemblyMapItem | null;
  onSelectAssembly?: (assembly: AssemblyMapItem) => void;
  className?: string;
}

export function AssembliesMap({
  assemblies,
  selectedAssembly,
  onSelectAssembly,
  className = "w-full h-full",
}: AssembliesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;

    let isCancelled = false;

    async function initLeaflet() {
      const L = (await import("leaflet")).default;
      if (isCancelled || !containerRef.current) return;

      // Clean up previous instance if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Centre initial sur le Cameroun
      const map = L.map(containerRef.current, {
        center: [5.6, 11.8],
        zoom: 6.5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
      });

      // OpenStreetMap standard tiles (100% gratuit, open-source, sans aucune clé d'API)
      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors · Mission du Plein Évangile Cameroun',
          maxZoom: 19,
        }
      ).addTo(map);

      // Add Zoom Control at bottom right
      L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(map);

      mapRef.current = map;

      // Observe container size changes to automatically adapt Leaflet
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      // Initial marker sync & auto-fit
      syncMarkers(L, map, true);
    }

    initLeaflet();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Function to create DivIcon for assembly (compact, elegant, non-overlapping with pure SVG)
  const createIcon = (L: any, assembly: AssemblyMapItem, isSelected: boolean) => {
    const isHistorical = assembly.type === "historical";
    const isPioneer = assembly.type === "pioneer";

    let bgClass = "bg-[#c8102e] text-white";
    let dotColor = "";
    // Clean SVG Church Cross
    let iconSvg = `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-white"><path d="M11 2v4H7v3h4v13h2V9h4V6h-4V2h-2z"/></svg>`;

    if (isHistorical) {
      bgClass = "bg-amber-600 text-white";
      dotColor = "bg-amber-300";
      // Clean SVG Star
      iconSvg = `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-white"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    } else if (isPioneer) {
      bgClass = "bg-emerald-600 text-white";
      dotColor = "bg-emerald-300";
      // Clean SVG Sprout
      iconSvg = `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-white"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4a1 1 0 0 0 1.41 1.41l1.83-.62C9.17 20.65 10.54 21 12 21c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9zm0 2c3.87 0 7 3.13 7 7 0 1.37-.39 2.65-1.07 3.73l-1.44-1.44a1 1 0 0 0-1.41 1.41l1.44 1.44A6.96 6.96 0 0 1 12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7z"/></svg>`;
    }

    const selectedStyle = isSelected
      ? "ring-3 ring-[#c8102e] ring-offset-2 scale-110 z-50 shadow-xl"
      : "shadow hover:scale-105 opacity-95 hover:opacity-100";

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-150 ${selectedStyle}" style="width: 28px; height: 28px;">
        <div class="w-7 h-7 rounded-full ${bgClass} flex items-center justify-center border-2 border-white shadow-sm">
          ${iconSvg}
        </div>
        ${
          dotColor
            ? `<span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor} ring-1 ring-white"></span>`
            : ""
        }
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-assembly-marker",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  };

  // Sync Markers when assemblies or selection changes
  const syncMarkers = async (L?: any, mapInstance?: any, autoFit = false) => {
    const Leaflet = L || (await import("leaflet")).default;
    const map = mapInstance || mapRef.current;
    if (!map) return;

    // Remove obsolete markers
    const currentIds = new Set(assemblies.map((a) => a.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    const validCoords: [number, number][] = [];

    // Add or update markers
    assemblies.forEach((assembly) => {
      if (typeof assembly.lat !== "number" || typeof assembly.lng !== "number") return;
      validCoords.push([assembly.lat, assembly.lng]);

      const isSelected = selectedAssembly?.id === assembly.id;
      const icon = createIcon(Leaflet, assembly, isSelected);

      let marker = markersRef.current.get(assembly.id);
      if (!marker) {
        marker = Leaflet.marker([assembly.lat, assembly.lng], { icon }).addTo(map);

        marker.on("click", () => {
          if (onSelectAssembly) {
            onSelectAssembly(assembly);
          }
        });

        markersRef.current.set(assembly.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng([assembly.lat, assembly.lng]);
      }

      // Compact popup content
      const popupHtml = `
        <div class="p-1.5 min-w-[200px] max-w-[240px] font-sans">
          <div class="flex items-center justify-between pb-1 mb-1 border-b border-gray-100">
            <span class="text-[9px] font-bold text-red-600 uppercase tracking-wider">${assembly.district}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
              assembly.type === "historical" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
            }">${assembly.city}</span>
          </div>
          <h4 class="font-bold text-xs text-gray-900 leading-tight">${assembly.name}</h4>
          <p class="text-[11px] text-gray-500 mt-0.5 truncate">${assembly.address}</p>
          <div class="mt-1.5 pt-1.5 border-t border-gray-100 text-[10px] text-gray-600 flex items-center justify-between">
            <span class="truncate max-w-[120px]">👤 ${assembly.pastor}</span>
            <span class="font-bold text-red-700">${assembly.members} fidèles</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: "custom-leaflet-popup",
      });
    });

    // Auto-fit to bounds if requested and we have coordinates
    if (autoFit && validCoords.length > 0) {
      try {
        const bounds = Leaflet.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      } catch {
        // Fallback
      }
    }
  };

  useEffect(() => {
    syncMarkers();
  }, [assemblies, selectedAssembly]);

  // Fly to selected assembly when changed
  useEffect(() => {
    if (!mapRef.current || !selectedAssembly) return;
    if (typeof selectedAssembly.lat === "number" && typeof selectedAssembly.lng === "number") {
      mapRef.current.flyTo([selectedAssembly.lat, selectedAssembly.lng], 13, {
        duration: 1,
      });

      // Open popup for selected
      const marker = markersRef.current.get(selectedAssembly.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedAssembly]);

  // Reset view to Cameroon bounds
  const handleRecenter = async () => {
    if (!mapRef.current) return;
    const Leaflet = (await import("leaflet")).default;
    const validCoords: [number, number][] = assemblies
      .filter((a) => typeof a.lat === "number" && typeof a.lng === "number")
      .map((a) => [a.lat, a.lng]);

    if (validCoords.length > 0) {
      const bounds = Leaflet.latLngBounds(validCoords);
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } else {
      mapRef.current.flyTo([5.6, 11.8], 6.5, { duration: 0.8 });
    }
  };

  // Locate User GPS
  const handleLocateMe = () => {
    if (!mapRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 13, { duration: 1.5 });
        }
      },
      () => {
        // Fallback default Yaoundé
        if (mapRef.current) {
          mapRef.current.flyTo([3.8792, 11.5021], 12);
        }
      }
    );
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl shadow-inner ${className}`}>
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full min-h-[450px] z-10" />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-md border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all"
          title="Recentrer sur le Cameroun"
        >
          <svg className="w-3.5 h-3.5 text-[#c8102e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span className="hidden sm:inline">Cameroun</span>
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-md border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all"
          title="Ma position (GPS)"
        >
          <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="7"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
          <span className="hidden sm:inline">Ma Position</span>
        </button>
      </div>

      {/* Floating Badge Bottom-Left: Live Count & Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white rounded-xl px-3 py-1.5 shadow-md border border-slate-200 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-[#c8102e] animate-pulse" />
          <span>{assemblies.length} Assemblées</span>
        </div>
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-[11px] text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#c8102e]" /> Paroisses
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600" /> Berceau 1961
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Implantations
          </span>
        </div>
      </div>
    </div>
  );
}

export default AssembliesMap;

