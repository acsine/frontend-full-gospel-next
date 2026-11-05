"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { api } from "@/lib/api";
import { useIntl } from "@/intl";
import type { AssemblyMapItem } from "@/components/maps/AssembliesMap";

// Normalisation robuste insensible aux accents, majuscules et espaces
function normalizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Dynamic import of Leaflet map (client-only to prevent SSR errors)
const AssembliesMap = dynamic(
  () => import("@/components/maps/AssembliesMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-surface-container-low text-on-surface-variant font-bold text-xs gap-3">
        <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Chargement de la Carte Leaflet...</span>
      </div>
    ),
  }
);

export interface Assembly extends AssemblyMapItem {
  latPercent?: number;
  lngPercent?: number;
}

const defaultCityCoords: Record<string, { lat: number; lng: number }> = {
  "Yaoundé": { lat: 3.8792, lng: 11.5021 },
  "Douala": { lat: 4.0615, lng: 9.7348 },
  "Bamenda": { lat: 5.9597, lng: 10.1593 },
  "Bafoussam": { lat: 5.4778, lng: 10.4179 },
  "Buea": { lat: 4.1534, lng: 9.2415 },
  "Garoua": { lat: 9.3014, lng: 13.3977 },
  "Maroua": { lat: 10.5956, lng: 14.3247 },
  "Ngaoundéré": { lat: 7.3195, lng: 13.5843 },
  "Bertoua": { lat: 4.5773, lng: 13.6846 },
  "Ebolowa": { lat: 2.9150, lng: 11.1500 },
  "Limbe": { lat: 4.0167, lng: 9.2167 },
  "Kumba": { lat: 4.6363, lng: 9.4469 },
};

// Pure SVG Icons for reliable, zero-latency rendering (immune to font loading failures)
const SvgIcons = {
  Search: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Pin: () => (
    <svg className="w-3.5 h-3.5 text-[#c8102e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-3.5 h-3.5 text-[#c8102e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5 text-[#c8102e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Map: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  List: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Sidebar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  HeartGive: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Directions: () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  ),
};

function AssembleesContent() {
  const { t } = useIntl();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") || "";

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(qParam);
  const [selectedType, setSelectedType] = useState<"all" | "active" | "pioneer" | "historical">("all");
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  // Synchroniser le terme de recherche avec l'URL en direct
  useEffect(() => {
    if (qParam !== undefined) {
      setSearchTerm(qParam);
    }
  }, [qParam]);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveAssemblies() {
      setIsLoading(true);
      try {
        const res = await api.organizations.listAssemblies({ limit: 100 });
        const list = (res.data as any)?.assemblies || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
        if (list && Array.isArray(list) && list.length > 0 && isMounted) {
          const mapped: Assembly[] = list.map((item: any, idx: number) => {
            const cityName = item.city || "Yaoundé";
            const fallbackCoord = defaultCityCoords[cityName] || {
              lat: 3.8792 + (Math.random() - 0.5) * 0.1,
              lng: 11.5021 + (Math.random() - 0.5) * 0.1,
            };

            return {
              id: item.id || `live-asm-${idx}`,
              name: item.name,
              city: cityName,
              district: item.district_name || (item.district_id ? "District Rattaché" : "District Centre"),
              pastor: item.pastor_name || item.pastor || item.email || "Pasteur Titulaire",
              phone: item.phone || "+237 6 99 00 11 22",
              address: item.address || `${cityName}, Cameroun`,
              members: Number(item.member_count || item.members) || 0,
              services: ["Dimanche : 08h30 - 11h30", "Mercredi (Enseignement) : 17h30"],
              type: item.status === "planting" ? "pioneer" : "active",
              lat: item.latitude || fallbackCoord.lat,
              lng: item.longitude || fallbackCoord.lng,
            };
          });

          setAssemblies(mapped);
          setSelectedAssembly(mapped[0] || null);
        } else if (isMounted) {
          setAssemblies([]);
          setSelectedAssembly(null);
        }
      } catch {
        if (isMounted) {
          setAssemblies([]);
          setSelectedAssembly(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchLiveAssemblies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrage intelligent insensible aux accents et caractères spéciaux
  const filteredAssemblies = assemblies.filter((a) => {
    const normSearch = normalizeText(searchTerm);
    const matchType = selectedType === "all" || a.type === selectedType;
    if (!matchType) return false;
    if (!normSearch) return true;

    const matchName = normalizeText(a.name).includes(normSearch);
    const matchCity = normalizeText(a.city).includes(normSearch);
    const matchDistrict = normalizeText(a.district).includes(normSearch);
    const matchAddress = normalizeText(a.address).includes(normSearch);
    const matchPastor =
      a.pastor &&
      a.pastor !== "Pasteur Titulaire" &&
      !a.pastor.includes("@") &&
      normalizeText(a.pastor).includes(normSearch);

    return matchName || matchCity || matchDistrict || matchAddress || matchPastor;
  });

  // Synchronisation stricte de l'assemblée sélectionnée avec les résultats filtrés
  useEffect(() => {
    if (filteredAssemblies.length > 0) {
      // Si la sélection actuelle ne fait plus partie des résultats filtrés, basculer sur le 1er résultat
      if (!selectedAssembly || !filteredAssemblies.some((a) => a.id === selectedAssembly.id)) {
        setSelectedAssembly(filteredAssemblies[0] || null);
        setShowDetails(true);
      }
    } else {
      // 0 résultat : désélectionner pour ne jamais afficher une mauvaise assemblée hors-sujet
      setSelectedAssembly(null);
      setShowDetails(false);
    }
  }, [searchTerm, selectedType, assemblies]);

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      <PublicHeader />

      <main className="flex-1 pt-16 flex flex-col bg-white">
        {/* Top Control Bar */}
        <div className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 shadow-xs">
          <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SvgIcons.Search />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par temple, ville, quartier ou pasteur..."
                className="w-full h-10 pl-9 pr-16 bg-slate-50 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 border border-slate-200 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-[11px] font-semibold"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <button
                onClick={() => setSelectedType("all")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectedType === "all"
                    ? "bg-[#c8102e] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <span>Toutes</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedType === "all" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {assemblies.length}
                </span>
              </button>
              <button
                onClick={() => setSelectedType("active")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectedType === "active"
                    ? "bg-[#9e001f] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#c8102e]" />
                <span>Actives</span>
              </button>
              <button
                onClick={() => setSelectedType("pioneer")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectedType === "pioneer"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Implantations</span>
              </button>
              <button
                onClick={() => setSelectedType("historical")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectedType === "historical"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>1961 Berceau</span>
              </button>

              {/* Sidebar toggle button (in map view) */}
              {viewMode === "map" && (
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    showSidebar
                      ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      : "bg-[#c8102e]/10 border-[#c8102e]/30 text-[#c8102e] hover:bg-[#c8102e]/15"
                  }`}
                  title={showSidebar ? "Masquer la liste" : "Afficher la liste des assemblées"}
                >
                  <SvgIcons.Sidebar />
                  <span>{showSidebar ? "Plein Écran Carte" : "Afficher Liste"}</span>
                </button>
              )}

              {/* View Switcher */}
              <div className="flex items-center bg-slate-100 rounded-full p-0.5 ml-1 border border-slate-200">
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-1.5 px-2 rounded-full transition-all flex items-center gap-1 text-xs font-bold ${
                    viewMode === "map"
                      ? "bg-white text-[#c8102e] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vue Carte Leaflet"
                >
                  <SvgIcons.Map />
                  <span className="hidden sm:inline">Carte</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 px-2 rounded-full transition-all flex items-center gap-1 text-xs font-bold ${
                    viewMode === "list"
                      ? "bg-white text-[#c8102e] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Vue Liste"
                >
                  <SvgIcons.List />
                  <span className="hidden sm:inline">Liste</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {viewMode === "list" ? (
          <div className="flex-1 w-full p-4 md:p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {filteredAssemblies.length} Assemblée{filteredAssemblies.length > 1 ? "s" : ""} trouvée{filteredAssemblies.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setViewMode("map")}
                className="px-3.5 py-1.5 rounded-xl bg-[#c8102e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <SvgIcons.Map />
                <span>Afficher la Carte Leaflet</span>
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-4 w-14 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-5 w-4/5 rounded-lg bg-slate-200" />
                    <div className="h-3 w-3/5 rounded bg-slate-200" />
                    <div className="p-2.5 rounded-xl bg-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-3/4 rounded bg-slate-200" />
                        <div className="h-2.5 w-1/2 rounded bg-slate-200" />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <div className="h-8 flex-1 rounded-lg bg-slate-100" />
                      <div className="h-8 flex-1 rounded-lg bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAssemblies.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <SvgIcons.Pin />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Aucune assemblée locale répertoriée</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Aucun lieu de culte ne correspond à votre recherche ou la base de données est en cours d'actualisation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAssemblies.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 text-slate-900 min-w-0 overflow-hidden"
                  >
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8102e] truncate">
                          {a.district}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                            a.type === "historical"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : a.type === "pioneer"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {a.type === "historical" ? "1961" : a.type === "pioneer" ? "Plantation" : "Active"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold leading-tight text-slate-900 break-words">
                        {a.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 min-w-0">
                        <SvgIcons.Pin />
                        <span className="truncate">{a.address}</span>
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#c8102e] flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-xs">
                          PA
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-900 truncate block">{a.pastor}</span>
                          <span className="text-[10px] text-[#c8102e] font-semibold block truncate">{a.phone}</span>
                        </div>
                      </div>

                      {a.services.length > 0 && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 pt-0.5 min-w-0">
                          <SvgIcons.Clock />
                          <span className="truncate">{a.services[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 min-w-0">
                      <button
                        onClick={() => {
                          setSelectedAssembly(a);
                          setShowDetails(true);
                          setViewMode("map");
                        }}
                        className="flex-1 h-8 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <SvgIcons.Map />
                        <span className="truncate">Carte</span>
                      </button>
                      <Link
                        href={`/dons?assembly=${a.id}`}
                        className="flex-1 h-8 px-1.5 rounded-lg bg-[#c8102e] hover:bg-[#9e001f] text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all truncate"
                      >
                        <SvgIcons.HeartGive />
                        <span className="truncate">Don / Dîme</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 relative flex flex-row overflow-hidden min-h-[550px] lg:min-h-[700px] bg-white">
            {/* Desktop Left Directory Bar (collapsible, compact, pure white) */}
            {showSidebar && (
              <div className="hidden lg:flex w-72 xl:w-80 bg-white border-r border-slate-200 flex-col overflow-y-auto no-scrollbar shrink-0 shadow-xs z-10 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {filteredAssemblies.length} Assemblées
                  </span>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                    title="Masquer la liste"
                  >
                    <SvgIcons.ChevronLeft />
                  </button>
                </div>
                <div className="p-2 space-y-1.5 bg-white">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-2.5 rounded-xl border border-slate-200/60 bg-white space-y-2 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="h-2.5 w-20 rounded bg-slate-200" />
                          <div className="h-3 w-12 rounded bg-slate-200" />
                        </div>
                        <div className="h-3.5 w-4/5 rounded bg-slate-200" />
                        <div className="h-2.5 w-3/5 rounded bg-slate-100" />
                      </div>
                    ))
                  ) : filteredAssemblies.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Aucune assemblée répertoriée.
                    </div>
                  ) : (
                    filteredAssemblies.map((a) => {
                      const isSelected = selectedAssembly?.id === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => {
                            setSelectedAssembly(a);
                            setShowDetails(true);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-white border-2 border-[#c8102e] shadow-sm ring-2 ring-[#c8102e]/10"
                              : "bg-white hover:bg-slate-50 border-slate-200/80 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-bold uppercase truncate max-w-[130px] text-[#c8102e]">
                              {a.district}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${isSelected ? "bg-[#c8102e] text-white" : "bg-slate-100 text-slate-600"}`}>
                              {a.city}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs leading-snug truncate text-slate-900">{a.name}</h4>
                          <p className="text-[11px] mt-0.5 truncate text-slate-500">
                            {a.address}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* LEAFLET MAP HERO SECTION */}
            <div className="flex-1 relative bg-white h-full w-full">
              <AssembliesMap
                assemblies={filteredAssemblies}
                selectedAssembly={selectedAssembly || undefined}
                onSelectAssembly={(a) => {
                  setSelectedAssembly(a as Assembly);
                  setShowDetails(true);
                }}
                className="w-full h-full min-h-[550px] lg:min-h-full"
              />

              {/* Alerte visuelle claire quand la recherche ne donne aucun résultat */}
              {filteredAssemblies.length === 0 && !isLoading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-200 text-xs text-slate-800 flex items-center gap-3 max-w-md w-[calc(100%-32px)] animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-[#c8102e] flex items-center justify-center shrink-0">
                    <SvgIcons.Pin />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">Aucune assemblée trouvée</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Aucun lieu de culte ne correspond à « {searchTerm} »
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedType("all");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#c8102e] text-white text-[11px] font-bold shrink-0 hover:bg-[#9e001f] transition-colors"
                  >
                    Effacer
                  </button>
                </div>
              )}

              {/* Floating button to reopen sidebar on desktop when hidden */}
              {!showSidebar && (
                <button
                  type="button"
                  onClick={() => setShowSidebar(true)}
                  className="hidden lg:flex absolute top-3 left-3 z-20 h-8 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-md border border-slate-200 items-center gap-1.5 active:scale-95 transition-all"
                  title="Afficher la liste des assemblées"
                >
                  <SvgIcons.Sidebar />
                  <span>Liste ({filteredAssemblies.length})</span>
                </button>
              )}

              {/* FLOATING ADAPTIVE DETAILS CARD (PURE WHITE CARD) */}
              {selectedAssembly && showDetails && (
                <div className="absolute right-3 sm:right-5 bottom-3 sm:bottom-5 z-20 w-[calc(100vw-24px)] sm:w-88 md:w-96 max-h-[75vh] sm:max-h-[500px] bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xl overflow-y-auto space-y-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200 text-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#c8102e]">
                          {selectedAssembly.district}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                            selectedAssembly.type === "historical"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : selectedAssembly.type === "pioneer"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          {selectedAssembly.type === "historical"
                            ? "Berceau 1961"
                            : selectedAssembly.type === "pioneer"
                            ? "Implantation"
                            : "Paroisse"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">
                        {selectedAssembly.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                        <SvgIcons.Pin />
                        <span className="truncate">{selectedAssembly.address}</span>
                      </p>
                    </div>

                    {/* Close button */}
                    <button
                      type="button"
                      onClick={() => setShowDetails(false)}
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors"
                      title="Fermer la fiche"
                    >
                      <SvgIcons.Close />
                    </button>
                  </div>

                  {/* Pastor info (White container) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#c8102e] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                      PA
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate-500 block font-medium">Pasteur Titulaire</span>
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {selectedAssembly.pastor}
                      </span>
                      <a
                        href={`tel:${selectedAssembly.phone}`}
                        className="text-xs text-[#c8102e] font-semibold flex items-center gap-1 hover:underline mt-0.5"
                      >
                        <SvgIcons.Phone />
                        <span>{selectedAssembly.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Service schedules (White container) */}
                  {selectedAssembly.services.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Horaires des Cultes
                      </span>
                      <div className="space-y-1 text-xs">
                        {selectedAssembly.services.slice(0, 2).map((s, idx) => (
                          <div
                            key={idx}
                            className="p-2 px-3 rounded-lg bg-slate-50 text-slate-800 flex items-center gap-2 border border-slate-200/70 text-[11px]"
                          >
                            <SvgIcons.Clock />
                            <span className="truncate">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={`/dons?assembly=${selectedAssembly.id}`}
                      className="h-10 rounded-xl bg-[#c8102e] hover:bg-[#9e001f] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all active:scale-95"
                    >
                      <SvgIcons.HeartGive />
                      <span>Dîme / Don</span>
                    </Link>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedAssembly.lat},${selectedAssembly.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                    >
                      <SvgIcons.Directions />
                      <span>Itinéraire</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

export default function AssembleesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#c8102e] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AssembleesContent />
    </Suspense>
  );
}
