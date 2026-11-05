"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { useIntl } from "@/intl";
import { api } from "@/lib/api";

function normalizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function HomePage() {
  const router = useRouter();
  const { locale, t } = useIntl();
  const [isSkeleton, setIsSkeleton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [searchCity, setSearchCity] = useState("");
  const [assembliesList, setAssembliesList] = useState<any[]>([]);
  const [backendStats, setBackendStats] = useState<{
    total_regions: number;
    total_districts: number;
    total_assemblies: number;
    active_assemblies: number;
    planting_assemblies: number;
    suspended_assemblies?: number;
    total_members: number;
  } | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [teachings, setTeachings] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const cities = ["Yaoundé", "Douala", "Bamenda", "Bafoussam", "Buea", "Garoua"];

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      setLoading(true);
      try {
        const [statsRes, eventsRes, pubRes, campRes, asmRes] = await Promise.allSettled([
          api.organizations.getStats(),
          api.events.list({ limit: 10 }),
          api.publications.getPublic({ limit: 10 }),
          api.donations.listCampaigns(),
          api.organizations.listAssemblies({ limit: 100 }),
        ]);

        if (!isMounted) return;

        if (statsRes.status === "fulfilled" && statsRes.value.data) {
          setBackendStats(statsRes.value.data as any);
        }
        if (asmRes.status === "fulfilled" && asmRes.value.data) {
          const rawAsm = (asmRes.value.data as any)?.assemblies || (asmRes.value.data as any)?.items || (Array.isArray(asmRes.value.data) ? asmRes.value.data : []);
          setAssembliesList(rawAsm);
        }
        if (eventsRes.status === "fulfilled" && eventsRes.value.data) {
          const rawEvents = (eventsRes.value.data as any)?.events || (Array.isArray(eventsRes.value.data) ? eventsRes.value.data : []);
          const uniqueTitles = new Set<string>();
          const filtered = rawEvents.filter((ev: any) => {
            if (!ev || !ev.title) return false;
            if (uniqueTitles.has(ev.title)) return false;
            uniqueTitles.add(ev.title);
            return true;
          });
          setEvents(filtered.slice(0, 3));
        }
        if (pubRes.status === "fulfilled" && pubRes.value.data) {
          const rawItems = (pubRes.value.data as any)?.items || [];
          setTeachings(rawItems);
        }
        if (campRes.status === "fulfilled" && campRes.value.data) {
          const campaigns = (campRes.value.data as any)?.campaigns || (Array.isArray(campRes.value.data) ? campRes.value.data : []);
          if (campaigns && campaigns.length > 0) {
            setCampaign(campaigns[0]);
          }
        }
      } catch (err) {
        console.warn("Erreur chargement données accueil:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Lecture audio bloquée par le navigateur:", err);
          setIsPlaying((prev) => !prev);
        });
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatEventBadge = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr);
    if (isNaN(start.getTime())) {
      return { month: "DATE", day: "—", timeStr: "" };
    }
    const month = start
      .toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { month: "short" })
      .replace(".", "")
      .toUpperCase();
    const startDay = start.getDate();
    let day = String(startDay);
    if (endStr) {
      const end = new Date(endStr);
      if (!isNaN(end.getTime()) && end.getDate() !== startDay) {
        day = `${startDay}-${end.getDate()}`;
      }
    }
    const startTime = `${String(start.getHours()).padStart(2, "0")}h${String(start.getMinutes()).padStart(2, "0")}`;
    let timeStr = startTime;
    if (endStr) {
      const end = new Date(endStr);
      if (!isNaN(end.getTime())) {
        timeStr = `${startTime} - ${String(end.getHours()).padStart(2, "0")}h${String(end.getMinutes()).padStart(2, "0")}`;
      }
    }
    return { month, day, timeStr };
  };

  // Audio teaching selection from backend
  const audioTeaching =
    teachings.find((p) => p.has_audio && p.audio_attachment?.url) ||
    teachings.find((p) => p.audio_attachment?.url) || null;

  // Written teaching selection from backend
  const writtenTeaching =
    teachings.find(
      (p) => p.id !== audioTeaching?.id && (p.publication_type === "teaching" || p.publication_type === "pastoral_letter")
    ) ||
    teachings.find((p) => p.id !== audioTeaching?.id) || null;

  const displayedEvents = events || [];

  // Donation campaign computation (strictly dynamic from live backend)
  const campaignGoal = Number(campaign?.target_amount) || 0;
  const campaignCurrent = Number(campaign?.current_amount) || 0;
  const campaignPercent = campaignGoal > 0 ? Math.min(100, Math.round((campaignCurrent / campaignGoal) * 100)) : 0;
  const campaignRemaining = Math.max(0, campaignGoal - campaignCurrent);

  // Suggestions d'assemblées en direct et gestion de la recherche
  const liveMatchingAssemblies =
    searchCity.trim().length > 0
      ? assembliesList
          .filter((a: any) => {
            const norm = normalizeText(searchCity);
            return (
              normalizeText(a.name).includes(norm) ||
              normalizeText(a.city).includes(norm) ||
              normalizeText(a.district_name || a.district).includes(norm) ||
              normalizeText(a.address).includes(norm)
            );
          })
          .slice(0, 5)
      : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity.trim()) {
      router.push(`/assemblees?q=${encodeURIComponent(searchCity.trim())}`);
    } else {
      router.push("/assemblees");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <PublicHeader />

      <main className="flex-1 pt-16 pb-20 md:pb-0">
        {/* ============================================================== */}
        {/* 1. HERO SECTION FULL WIDTH */}
        {/* ============================================================== */}
        <section className="relative w-full overflow-hidden bg-inverse-surface text-on-primary">
          {/* Authentic Church worship background image */}
          <div className="absolute inset-0 z-0">
            <img
              alt="Assemblée Full Gospel Mission en célébration vivante"
              className="w-full h-full object-cover object-center scale-105 transform duration-1000 ease-out opacity-45"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJRenLuMDzAL9YGidusBINcmK8PejNUV1WLd4GA-DNO3n_VDBpJBdm2hvz2cc6eE6j3IgwYMox8wA9No6gPxzR9oqnjBBiWjKL_-f2HbdC85DUZSMzLPEeDE8GxmE7siE14qTvXAJyUDGfaueg-SpQadsBY1JkexlFfmtoxnlh2pj-m9gMN8yTmc6mR7Q8YRwVd-mlrfRQ2ofDWc-c8vr6N6VKIe7wr8y3qBknPqg"
            />
            <div className="absolute inset-0 bg-inverse-surface/75 backdrop-blur-[0.5px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-inverse-surface/80" />
          </div>

          <div className="relative z-10 w-full px-4 md:px-8 lg:px-12 pt-6 sm:pt-14 md:pt-20 lg:pt-28 pb-12 sm:pb-20 md:pb-28 lg:pb-36 flex flex-col items-center text-center">
            {/* Decree & Year institutional badge */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3 sm:mb-5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] sm:text-xs tracking-wider uppercase text-white font-extrabold">
                {locale === "en" ? "Since 1961 • Presidential Decree N°69/DF/144" : "Depuis 1961 • Décret Présidentiel N°69/DF/144"}
              </span>
            </div>

            {/* Title & Subtitle - Hiérarchisé, noble et sans répétition */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight font-display drop-shadow-md leading-tight max-w-4xl">
              {locale === "en" ? "Full Gospel Mission" : "Mission du Plein Évangile"}
              <span className="block text-secondary-container text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-normal mt-1 sm:mt-2">
                {locale === "en" ? "Cameroon • 10 Apostolic Regions" : "Cameroun • 10 Régions Apostoliques"}
              </span>
            </h1>

            {/* Slogan officiel canonique - Texte blanc pur sans carte, sans fond et sans bordure */}
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold tracking-wide text-white drop-shadow-sm my-2 sm:my-3 font-sans">
              {t("hero.motto")}
            </p>

            {/* Subtitle / Description narrative */}
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/85 max-w-xl lg:max-w-3xl mb-4 sm:mb-6 leading-relaxed font-normal">
              {t("hero.description")}
            </p>

            {/* Action buttons - Duo symétrique optimisé mobile (grid-cols-2 côte-à-côte) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-xs sm:max-w-md mx-auto mb-2">
              <Link
                href="/assemblees"
                className="h-11 sm:h-12 px-3 sm:px-5 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-container text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-black/30 active:scale-95 transition-all text-center"
              >
                <span className="material-symbols-outlined text-[18px]">church</span>
                <span className="truncate">{t("hero.findAssembly")}</span>
              </Link>
              <Link
                href="/dons"
                className="h-11 sm:h-12 px-3 sm:px-5 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 backdrop-blur-md border border-white/25 shadow-md active:scale-95 transition-all text-center"
              >
                <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                <span className="truncate">{t("hero.supportMission")}</span>
              </Link>
            </div>

            {/* Desktop Highlights Strip */}
            <div className="hidden lg:flex items-center justify-center gap-8 mt-10 pt-6 border-t border-white/15 text-xs lg:text-sm text-surface-container-high w-full max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="font-semibold text-surface-bright">60+ Ans d&apos;Héritage Apostolique</span>
              </div>
              <span className="text-surface-container-lowest/30">•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="font-semibold text-surface-bright">
                  {backendStats
                    ? `${backendStats.total_assemblies} ${locale === "en" ? "Assemblies across" : "Assemblées dans les"} ${backendStats.total_regions} ${locale === "en" ? "Regions" : "Régions"}`
                    : (locale === "en" ? "Assemblies across 10 Regions" : "Assemblées dans les 10 Régions")}
                </span>
              </div>
              <span className="text-surface-container-lowest/30">•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="font-semibold text-surface-bright">Reconnue par Décret N°69/DF/144</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 2. FLOATING ASSEMBLY SEARCH BAR (Overlapping Hero ProMax) */}
        {/* ============================================================== */}
        <div className="relative z-20 max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 -mt-6 sm:-mt-10 lg:-mt-14 mb-10 sm:mb-16 lg:mb-20">
          <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-7 shadow-2xl border border-surface-container-high/80">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Card Top Label & Live Stats */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px] sm:text-[20px]">explore</span>
                  <span className="text-xs sm:text-sm font-black text-on-surface tracking-tight font-display">
                    {locale === "en" ? "Find a place of worship" : "Trouver un lieu de culte au Cameroun"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {backendStats?.total_assemblies
                      ? `${backendStats.total_assemblies} ${locale === "en" ? "assemblies" : "assemblées"}`
                      : (locale === "en" ? "Assemblies mapped" : "Assemblées cartographiées")}
                  </span>
                </div>
              </div>

              {/* Main Search Input with integrated Form & GPS */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 text-on-surface-variant pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder={locale === "en" ? "City, neighborhood or assembly..." : "Ville, quartier ou assemblée..."}
                    className="w-full h-11 sm:h-12 pl-10 pr-22 rounded-xl bg-surface-container-low text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all border border-surface-container-high focus:border-primary font-medium"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 h-8 sm:h-9 px-3 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <span>{locale === "en" ? "Search" : "Chercher"}</span>
                  </button>

                  {/* Dropdown de suggestions en direct sous la barre de recherche */}
                  {searchCity.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 text-left">
                      <div className="px-3 py-2 bg-surface-container-low border-b border-surface-container text-[11px] font-bold text-on-surface-variant flex items-center justify-between">
                        <span>Résultats suggérés ({liveMatchingAssemblies.length})</span>
                        <button
                          type="button"
                          onClick={() => setSearchCity("")}
                          className="text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer"
                        >
                          Effacer ✕
                        </button>
                      </div>
                      {liveMatchingAssemblies.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto divide-y divide-surface-container">
                          {liveMatchingAssemblies.map((a: any) => (
                            <Link
                              key={a.id}
                              href={`/assemblees?q=${encodeURIComponent(a.name)}`}
                              className="p-3 flex items-start gap-3 hover:bg-surface-container transition-colors text-left"
                            >
                              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">church</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-on-surface">{a.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">
                                    {a.city || "Cameroun"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                                  {a.address || a.district_name || "Assemblée locale"}
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-on-surface-variant text-[16px] self-center">arrow_forward</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-xs text-on-surface-variant font-medium">
                            Aucune assemblée ne correspond directement à &laquo; <strong>{searchCity}</strong> &raquo;.
                          </p>
                          <Link
                            href={`/assemblees?q=${encodeURIComponent(searchCity)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-2"
                          >
                            <span>Consulter toutes les assemblées sur la carte</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* GPS Near me - Épuré et compact */}
                <Link
                  href="/assemblees"
                  className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border border-surface-container-high transition-all shrink-0 active:scale-98"
                  title={locale === "en" ? "Find assemblies near my location" : "Localiser les assemblées proches de ma position"}
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">my_location</span>
                  <span>{locale === "en" ? "Near me (GPS)" : "Près de moi (GPS)"}</span>
                </Link>
              </form>

              {/* Quick cities & Map link */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container text-xs overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-on-surface-variant font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0 mr-0.5">
                    {locale === "en" ? "Cities:" : "Villes :"}
                  </span>
                  {cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setSearchCity(city);
                        router.push(`/assemblees?q=${encodeURIComponent(city)}`);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        searchCity === city
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>

                <Link
                  href="/assemblees"
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-primary hover:underline shrink-0 ml-auto whitespace-nowrap"
                >
                  <span>{locale === "en" ? "Interactive map" : "Carte interactive"}</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Simulation toggle (Figma Feature) */}
        <div className="w-full px-4 md:px-8 mb-6 flex justify-end">
          <button
            onClick={() => setIsSkeleton((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${isSkeleton
                ? "bg-primary-container text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isSkeleton ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </>
              )}
            </svg>
            <span>{isSkeleton ? "Revenir à la vue complète" : "Simuler chargement réseau (Skeleton)"}</span>
          </button>
        </div>

        {/* Skeleton Display Area */}
        {isSkeleton ? (
          <div className="w-full px-4 md:px-8 animate-pulse space-y-8">
            <div className="h-44 rounded-2xl bg-surface-container-highest" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-28 rounded-2xl bg-surface-container-highest" />
              <div className="h-28 rounded-2xl bg-surface-container-highest" />
              <div className="h-28 rounded-2xl bg-surface-container-highest" />
              <div className="h-28 rounded-2xl bg-surface-container-highest" />
            </div>
            <div className="h-64 rounded-2xl bg-surface-container-highest" />
          </div>
        ) : (
          <div className="w-full px-4 md:px-8 lg:px-12 space-y-20 lg:space-y-28">
            {/* ============================================================== */}
            {/* 3. SECTION: HERITAGE & KEY METRICS */}
            {/* ============================================================== */}
            <section className="space-y-8 lg:space-y-10">
              <div className="max-w-3xl lg:max-w-4xl">
                <span className="text-xs lg:text-sm uppercase tracking-wider text-primary font-bold">
                  HÉRITAGE &amp; VISION HISTORIQUE
                </span>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight mt-2">
                  Plus de 60 ans d'impact spirituel au Cameroun
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-on-surface-variant mt-3 leading-relaxed">
                  Née du souffle apostolique en 1961 à Bamenda et reconnue officiellement par l'État du Cameroun par Décret Présidentiel n°69/DF/144, la Mission du Plein Évangile proclame inlassablement la Parole de vérité et l'Évangile intégral.
                </p>
              </div>

              {/* 4 Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <div className="bg-surface-container-lowest p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 group min-w-0 overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary mb-3 sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-secondary tracking-tight block truncate">
                      {backendStats?.total_regions ?? 10}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-on-surface mt-1 block break-words leading-tight">
                      {locale === "en" ? "Regions covered" : "Régions couvertes"}
                    </span>
                    <span className="text-[10px] sm:text-[11px] lg:text-xs text-on-surface-variant mt-0.5 block break-words leading-snug">
                      {locale === "en" ? "100% of Cameroon territory" : "100% du territoire camerounais"}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 group min-w-0 overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary mb-3 sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <circle cx="19" cy="5" r="2"/>
                      <circle cx="5" cy="5" r="2"/>
                      <circle cx="5" cy="19" r="2"/>
                      <circle cx="19" cy="19" r="2"/>
                      <line x1="17.2" y1="6.8" x2="13.8" y2="10.2"/>
                      <line x1="6.8" y1="6.8" x2="10.2" y2="10.2"/>
                      <line x1="6.8" y1="17.2" x2="10.2" y2="13.8"/>
                      <line x1="17.2" y1="17.2" x2="13.8" y2="13.8"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-secondary tracking-tight block truncate">
                      {backendStats?.total_districts ?? 8}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-on-surface mt-1 block break-words leading-tight">
                      {locale === "en" ? "Apostolic Districts" : "Districts apostoliques"}
                    </span>
                    <span className="text-[10px] sm:text-[11px] lg:text-xs text-on-surface-variant mt-0.5 block break-words leading-snug">
                      {locale === "en" ? "Under superintendents' care" : "Supervision de surintendants"}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 group min-w-0 overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary mb-3 sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M10 4h4"/>
                      <path d="m18 8-6-4-6 4v14h12V8Z"/>
                      <path d="M10 22v-6h4v6"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-secondary tracking-tight block truncate">
                      {backendStats?.total_assemblies ? backendStats.total_assemblies.toLocaleString() : "8"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-on-surface mt-1 block break-words leading-tight">
                      {locale === "en" ? "Local Assemblies" : "Assemblées locales"}
                    </span>
                    <span className="text-[10px] sm:text-[11px] lg:text-xs text-on-surface-variant mt-0.5 block break-words leading-snug">
                      {backendStats?.active_assemblies ? `${backendStats.active_assemblies} ${locale === "en" ? "active" : "actives"}` : (locale === "en" ? "Active assemblies" : "Assemblées actives")}
                      {backendStats?.planting_assemblies ? ` • ${backendStats.planting_assemblies} ${locale === "en" ? "plants" : "implant."}` : ""}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 group min-w-0 overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary mb-3 sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-2xl sm:text-4xl lg:text-5xl font-black text-secondary tracking-tight block truncate">
                      {backendStats?.total_members ? backendStats.total_members.toLocaleString() : "20"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-on-surface mt-1 block break-words leading-tight">
                      {locale === "en" ? "Registered Members" : "Membres enregistrés"}
                    </span>
                    <span className="text-[10px] sm:text-[11px] lg:text-xs text-on-surface-variant mt-0.5 block break-words leading-snug">
                      {locale === "en" ? "Active community" : "Communauté canonique active"}
                    </span>
                  </div>
                </div>
              </div>


            </section>

            {/* ============================================================== */}
            {/* 4. SECTION: SPIRITUAL IDENTITY & SEAL SYMBOLISM */}
            {/* ============================================================== */}
            <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-10 lg:p-14 shadow-sm border border-surface-container-high/60 space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md border border-surface-container-high overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt={t("seal.title")}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-xs lg:text-sm uppercase tracking-wider text-primary font-bold">
                    {t("seal.badge")}
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-on-surface mt-0.5">
                    {t("seal.title")}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-on-surface-variant max-w-4xl leading-relaxed">
                {t("seal.description")}
              </p>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pt-2">
                {/* 1. LE VASE BLANC */}
                <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-surface-container flex flex-col justify-between gap-4 sm:gap-5 border border-surface-container-high hover:border-primary/40 hover:shadow-md transition-all min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm border border-surface-container-high/80 p-2 sm:p-2.5 overflow-hidden shrink-0">
                      <Image
                        src="/images/embleme/vase-blanc.png"
                        alt={t("seal.clayVessel")}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="px-2.5 sm:px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-surface-container-highest text-on-surface-variant text-right leading-tight max-w-[68%] sm:max-w-none break-words">
                      {t("seal.clayVesselRef")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-on-surface text-base sm:text-xl tracking-wide break-words">{t("seal.clayVessel")}</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed break-words">
                      {t("seal.clayVesselDesc")}
                    </p>
                  </div>
                </div>

                {/* 2. LA FLAMME */}
                <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-primary-fixed/20 flex flex-col justify-between gap-4 sm:gap-5 border border-primary-fixed/80 hover:shadow-md transition-all min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm border border-primary-fixed/80 p-2 sm:p-2.5 overflow-hidden shrink-0">
                      <Image
                        src="/images/embleme/flamme-rouge.png"
                        alt={t("seal.redFlame")}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="px-2.5 sm:px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-primary text-on-primary text-right leading-tight max-w-[68%] sm:max-w-none break-words">
                      {t("seal.redFlameRef")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-primary text-base sm:text-xl tracking-wide break-words">{t("seal.redFlame")}</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed break-words">
                      {t("seal.redFlameDesc")}
                    </p>
                  </div>
                </div>

                {/* 3. LA CROIX */}
                <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-surface-container flex flex-col justify-between gap-4 sm:gap-5 border border-surface-container-high hover:border-primary/40 hover:shadow-md transition-all min-w-0">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm border border-surface-container-high/80 p-2 sm:p-2.5 overflow-hidden shrink-0">
                      <Image
                        src="/images/embleme/croix-noire.png"
                        alt={t("seal.blackCross")}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="px-2.5 sm:px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-surface-container-highest text-on-surface-variant text-right leading-tight max-w-[68%] sm:max-w-none break-words">
                      {t("seal.blackCrossRef")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-on-surface text-base sm:text-xl tracking-wide break-words">{t("seal.blackCross")}</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed break-words">
                      {t("seal.blackCrossDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Directive Charte Officielle & Logos Non Conformes */}
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2.5 text-red-700 font-bold text-sm uppercase tracking-wide">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  <span>{locale === "en" ? "Official Standard & Non-Compliant Logos" : "Charte Graphique Officielle & Logos Non Conformes"}</span>
                </div>
                <p className="text-xs sm:text-sm text-red-900/80 leading-relaxed">
                  {t("seal.authenticNotice")}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5 max-w-full break-words text-[11px] sm:text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span>{locale === "en" ? "No slanted cross" : "Pas de croix inclinée"}</span>
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5 max-w-full break-words text-[11px] sm:text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span>{locale === "en" ? "No multicolor ring" : "Pas de contour circulaire vert-rouge-jaune"}</span>
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5 max-w-full break-words text-[11px] sm:text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span>{locale === "en" ? "No golden/earthen pot (White vessel only)" : "Pas de vase doré ou en terre (Vase blanc sur base noire uniquement)"}</span>
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 font-bold max-w-full break-words text-[11px] sm:text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span>{locale === "en" ? "Official seal: Upright cross + Red flame + White vessel" : "Sceau Officiel : Croix droite + Flamme rouge + Vase blanc"}</span>
                  </span>
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* 5. SECTION: NATIONAL MINISTRIES */}
            {/* ============================================================== */}
            <section className="space-y-6 lg:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs lg:text-sm uppercase tracking-wider text-primary font-bold">
                    COMMUNAUTÉ ACTIVE
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight mt-1">
                    Nos Ministères Nationaux
                  </h2>
                </div>
                <Link
                  href="/departements"
                  className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <span>Tous les 6 départements officiels</span>
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* 1. Dames */}
                <div className="rounded-2xl sm:rounded-3xl bg-surface-container-lowest p-4 sm:p-6 lg:p-7 shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary-fixed/40 text-secondary flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="10" r="4"/>
                        <path d="M6 21v-2a6 6 0 0 1 12 0v2"/>
                        <path d="M12 4V2"/>
                      </svg>
                    </div>
                    <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-surface-container text-on-surface-variant inline-block">
                      Dorcas Ministry
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-on-surface mt-2 break-words">Ministère des Femmes</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed break-words">
                      Prière fervente, affermissement des foyers chrétiens, œuvres d'entraide et évangélisation de proximité.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-surface-container flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-bold text-[11px] sm:text-xs">120+ Groupes Locaux</span>
                    <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>

                {/* 2. Hommes */}
                <div className="rounded-2xl sm:rounded-3xl bg-surface-container-lowest p-4 sm:p-6 lg:p-7 shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="7" r="4"/>
                        <path d="M6 21v-2a6 6 0 0 1 12 0v2"/>
                      </svg>
                    </div>
                    <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-surface-container text-on-surface-variant inline-block">
                      Men of Action
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-on-surface mt-2 break-words">Hommes d'Action</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed break-words">
                      Leadership éthique, bâtisseurs d'églises locales, intendance rigoureuse et mentorat des jeunes pères de famille.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-surface-container flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-bold text-[11px] sm:text-xs">95+ Sections Actives</span>
                    <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>

                {/* 3. Jeunesse */}
                <div className="rounded-2xl sm:rounded-3xl bg-surface-container-lowest p-4 sm:p-6 lg:p-7 shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-tertiary-fixed text-tertiary flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                    <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-surface-container text-on-surface-variant inline-block">
                      Youth for Christ
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-on-surface mt-2 break-words">Jeunesse &amp; Campus</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed break-words">
                      Une génération consacrée enflammée pour la mission, l'excellence académique, la sainteté et l'action civique.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-surface-container flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-bold text-[11px] sm:text-xs">45K+ Jeunes Actifs</span>
                    <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>

                {/* 4. ECODIM */}
                <div className="rounded-2xl sm:rounded-3xl bg-surface-container-lowest p-4 sm:p-6 lg:p-7 shadow-sm border border-surface-container-high/60 flex flex-col justify-between hover:shadow-lg transition-all hover:-translate-y-1 min-w-0 overflow-hidden">
                  <div className="min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-surface-container-high text-on-surface flex items-center justify-center mb-3 sm:mb-4 shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9"/>
                        <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                        <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                        <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
                      </svg>
                    </div>
                    <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-surface-container text-on-surface-variant inline-block">
                      ECODIM
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-on-surface mt-2 break-words">École du Dimanche</h4>
                    <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed break-words">
                      Formation spirituelle, morale et scripturaire adaptée aux enfants dès le plus jeune âge dans chaque assemblée.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-surface-container flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-bold text-[11px] sm:text-xs">Chaque Dimanche</span>
                    <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </div>


            </section>

            {/* ============================================================== */}
            {/* 6. SECTION: UPCOMING EVENTS */}
            {/* ============================================================== */}
            <section className="space-y-6 lg:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs lg:text-sm uppercase tracking-wider text-primary font-bold">
                    {locale === "en" ? "SPIRITUAL CALENDAR" : "AGENDA SPIRITUEL"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight mt-1">
                    {locale === "en" ? "Major National Gatherings" : "Grands Rendez-vous & Conventions"}
                  </h2>
                </div>
                <Link
                  href="/evenements"
                  className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <span>{locale === "en" ? "View full national calendar" : "Voir tout l'agenda national"}</span>
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              </div>

              {displayedEvents.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3 text-primary font-bold text-xs uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span>Chaque Dimanche</span>
                      </div>
                      <h3 className="font-bold text-on-surface text-base sm:text-lg break-words">Culte Dominical d'Adoration</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed break-words">
                        Célébration spirituelle, louange vivante, prédication apostolique et sainte cène.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container text-xs font-bold text-on-surface flex items-center justify-between">
                      <span>08h30 - 11h30</span>
                      <span className="text-primary truncate">Toutes assemblées</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3 text-secondary font-bold text-xs uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                        <span>Chaque Mercredi</span>
                      </div>
                      <h3 className="font-bold text-on-surface text-base sm:text-lg break-words">Étude Biblique &amp; Enseignement</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed break-words">
                        Approfondissement scripturaire de la saine doctrine pour affermir la foi des disciples.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container text-xs font-bold text-on-surface flex items-center justify-between">
                      <span>17h30 - 19h00</span>
                      <span className="text-secondary truncate">En direct &amp; paroisses</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3 text-tertiary font-bold text-xs uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
                        <span>Chaque Vendredi</span>
                      </div>
                      <h3 className="font-bold text-on-surface text-base sm:text-lg break-words">Soirée d'Intercession &amp; Prière</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed break-words">
                        Prière pour les malades, le salut des âmes et le réveil spirituel au Cameroun.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-surface-container text-xs font-bold text-on-surface flex items-center justify-between">
                      <span>18h00 - 20h00</span>
                      <span className="text-tertiary truncate">Intercession générale</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {displayedEvents.map((ev, index) => {
                    const badge = formatEventBadge(ev.start_datetime, ev.end_datetime);
                    const isConference = ev.event_type === "conference" || ev.scope_type === "national";
                    const isSeminar = ev.event_type === "seminar";
                    const bgHeader = isConference
                      ? "bg-primary text-on-primary"
                      : isSeminar
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-inverse-surface text-inverse-on-surface";
                    const tagBg = isConference
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : isSeminar
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-high text-on-surface";
                    const tagLabel = isConference
                      ? "National"
                      : isSeminar
                      ? (locale === "en" ? "Seminar" : "Séminaire National")
                      : (locale === "en" ? "Intercession Vigil" : "Veillée d'Intercession");

                    return (
                      <div
                        key={ev.id || index}
                        className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-5 sm:gap-6 hover:shadow-lg transition-all hover:-translate-y-1 group min-w-0 overflow-hidden"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 sm:gap-3.5 mb-3 sm:mb-4 min-w-0">
                            <div className={`px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl ${bgHeader} text-center leading-none shadow-sm shrink-0 min-w-[58px] sm:min-w-[64px]`}>
                              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block">
                                {badge.month}
                              </span>
                              <span className="text-lg sm:text-xl font-black block mt-0.5">
                                {badge.day}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${tagBg} uppercase inline-block`}>
                                {tagLabel}
                              </span>
                              <h3 className="font-bold text-on-surface text-sm sm:text-base lg:text-lg mt-0.5 sm:mt-1 line-clamp-2 break-words leading-tight">
                                {ev.title}
                              </h3>
                            </div>
                          </div>
                          <div className="space-y-1.5 sm:space-y-2 text-xs lg:text-sm text-on-surface-variant min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              <span className="truncate">{ev.location_name || ev.location_address || "Temple Central"}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <span className="truncate">{badge.timeStr ? `${badge.timeStr} • Rassemblement officiel` : "Célébration officielle"}</span>
                            </div>
                            {ev.description && (
                              <p className="text-[11px] lg:text-xs text-on-surface-variant/80 line-clamp-2 pt-1 border-t border-surface-container/60 break-words">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/evenements?id=${ev.id}`}
                          className="w-full h-10 sm:h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
                        >
                          <span>{locale === "en" ? "Details & Full Program" : "Détails & Programme complet"}</span>
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ============================================================== */}
            {/* 7. SECTION: TEACHINGS & AUDIO PODCAST PLAYER */}
            {/* ============================================================== */}
            <section className="space-y-6 lg:space-y-8">
              <div>
                <span className="text-xs lg:text-sm uppercase tracking-wider text-primary font-bold">
                  {locale === "en" ? "SCRIPTURE & SPIRITUAL NOURISHMENT" : "PAROLE & ÉDIFICATION SPIRITUELLE"}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight mt-1">
                  {locale === "en" ? "Teachings & Revival Broadcasts" : "Enseignements & Échos du Réveil"}
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                {/* Teaching Card 1: Written publication */}
                {writtenTeaching ? (
                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-5 sm:gap-6 hover:shadow-lg transition-all min-w-0 overflow-hidden">
                    <div className="space-y-2.5 sm:space-y-3 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                        <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-primary text-on-primary">
                          {writtenTeaching.publication_type_label || (locale === "en" ? "Teaching" : "Enseignement")}
                        </span>
                        <span className="text-xs lg:text-sm text-on-surface-variant truncate max-w-[200px] sm:max-w-none">
                          {writtenTeaching.author_role || writtenTeaching.author_name || "Bureau Exécutif National (Yaoundé)"}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface leading-snug break-words">
                        « {writtenTeaching.title} »
                      </h3>
                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed line-clamp-3 break-words">
                        {writtenTeaching.excerpt || writtenTeaching.content?.replace(/^#+ .*\n/, "").slice(0, 200)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-surface-container flex-wrap gap-2 text-xs">
                      <span className="text-xs text-on-surface-variant font-medium">
                        {locale === "en" ? "Reading time" : "Temps de lecture"} : {writtenTeaching.reading_time_minutes || 4} min
                      </span>
                      <Link
                        href={writtenTeaching.slug ? `/publications/${writtenTeaching.slug}` : `/publications`}
                        className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5 hover:underline"
                      >
                        <span>{locale === "en" ? "Read full message" : "Lire l'enseignement complet"}</span>
                        <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-4 min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant inline-block">
                        Publications Pastorales
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-on-surface mt-2.5 break-words">Édification et Enseignements</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed break-words">
                        Retrouvez l'ensemble des méditations, lettres pastorales et synthèses doctrinales officielles.
                      </p>
                    </div>
                    <Link
                      href="/publications"
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <span>Accéder aux recueils d'enseignements</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  </div>
                )}

                {/* Audio Sermon Player */}
                {audioTeaching ? (
                  <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-5 sm:gap-6 hover:shadow-lg transition-all min-w-0 overflow-hidden">
                    <div className="space-y-2.5 sm:space-y-3 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-secondary-fixed text-on-secondary-fixed shrink-0">
                            {locale === "en" ? "Podcast & Sermon" : "Podcast & Prédication"}
                          </span>
                          <span className="text-xs lg:text-sm text-on-surface-variant truncate">
                            {audioTeaching.author_role || audioTeaching.author_name || "Mission Nationale"}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs lg:text-sm text-tertiary font-bold flex items-center gap-1.5 shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full bg-tertiary ${isPlaying ? "animate-ping" : ""}`} />
                          {audioTeaching.audio_attachment?.duration || "14 min 30 s"}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-on-surface leading-snug break-words">
                        {audioTeaching.title}
                      </h3>
                    </div>

                    {/* Interactive Audio Player Component */}
                    <div className="bg-surface-container rounded-2xl p-4 lg:p-5 flex flex-col gap-3.5">
                      <audio
                        ref={audioRef}
                        src={audioTeaching.audio_attachment?.url}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            setCurrentTime(audioRef.current.currentTime);
                            if (audioRef.current.duration) setAudioDuration(audioRef.current.duration);
                          }
                        }}
                        onEnded={() => setIsPlaying(false)}
                        preload="metadata"
                      />
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={togglePlayAudio}
                          className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-lg active:scale-95 transition-transform hover:bg-primary"
                          title={isPlaying ? "Pause" : "Écouter"}
                        >
                          {isPlaying ? (
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16"/>
                              <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-on-surface truncate block">
                            {audioTeaching.audio_attachment?.name || audioTeaching.title}
                          </span>
                          <span className="text-xs text-on-surface-variant mt-0.5 block">
                            {isPlaying
                              ? (locale === "en" ? "Playing audio..." : "Lecture audio en cours...")
                              : (locale === "en" ? "Click to play sermon" : "Cliquer pour écouter la prédication")}
                          </span>
                        </div>
                      </div>

                      <div className="w-full flex items-center gap-3 pt-1 text-xs text-on-surface-variant font-mono">
                        <span>{formatSeconds(currentTime)}</span>
                        <div
                          className="flex-1 h-2 rounded-full bg-surface-container-highest overflow-hidden relative cursor-pointer"
                          onClick={(e) => {
                            if (audioRef.current && audioDuration) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pct = (e.clientX - rect.left) / rect.width;
                              audioRef.current.currentTime = pct * audioDuration;
                              setCurrentTime(pct * audioDuration);
                            }
                          }}
                        >
                          <div
                            className="h-full bg-primary-container rounded-full transition-all duration-150"
                            style={{
                              width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : isPlaying ? 35 : 0}%`,
                            }}
                          />
                        </div>
                        <span>
                          {audioDuration > 0
                            ? formatSeconds(audioDuration)
                            : audioTeaching.audio_attachment?.duration || "14:30"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-4">
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant">
                        Médiathèque Audio
                      </span>
                      <h3 className="text-lg font-bold text-on-surface mt-3">Prédications &amp; Louanges</h3>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                        Écoutez les chants d'assemblée, messages des conventions et cantiques inspirés de la Mission.
                      </p>
                    </div>
                    <Link
                      href="/mediatheque"
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <span>Parcourir la médiathèque audio</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* ============================================================== */}
            {/* 8. SECTION: NATIONAL IMPACT PROJECT / DONATION CALL */}
            {/* ============================================================== */}
            <section className="rounded-2xl sm:rounded-3xl bg-inverse-surface text-inverse-on-surface p-5 sm:p-10 lg:p-14 shadow-2xl min-w-0 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center min-w-0">
                {/* Left 7 cols: Content & Progress */}
                <div className="lg:col-span-7 space-y-4 sm:space-y-6 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary-fixed-dim truncate">
                      {campaign?.title || (locale === "en" ? "National Impact Project & Builders" : "Projet d'Impact National & Bâtisseurs")}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-surface-bright leading-tight break-words">
                      {campaign?.description || (locale === "en" ? "Supporting Missions, Church Plants & Pioneer Evangelism" : "Soutenir la mission, les orphelins et l'évangélisation pionnière")}
                    </h2>
                    <p className="text-xs sm:text-base text-surface-variant/90 mt-2 sm:mt-3 leading-relaxed break-words">
                      {locale === "en"
                        ? "Actively participate in the expansion of regional theological centers, youth empowerment and sending missionaries across Cameroon."
                        : "Participez activement à la construction du nouveau Complexe Théologique Régional et à l'envoi de missionnaires dans les zones reculées du Cameroun."}
                    </p>
                  </div>

                  {/* Progress gauge */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-sm space-y-2.5 sm:space-y-3 border border-surface-container-lowest/10 min-w-0">
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <span className="text-xl sm:text-3xl font-extrabold text-secondary-container">
                        {campaignCurrent.toLocaleString()} FCFA
                      </span>
                      <span className="text-xs sm:text-sm text-surface-variant font-medium">
                        {locale === "en" ? "Goal" : "Objectif"} : {campaignGoal.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="w-full h-3 sm:h-3.5 rounded-full bg-surface-container-highest/20 overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full transition-all duration-500"
                        style={{ width: `${campaignPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] sm:text-sm text-surface-variant pt-0.5 sm:pt-1 font-medium flex-wrap gap-1">
                      <span>{campaignPercent}% {locale === "en" ? "funded" : "financés par la grâce de Dieu"}</span>
                      <span>{locale === "en" ? "Remaining" : "Reste"} : {campaignRemaining.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Instant Donation Card */}
                <div className="lg:col-span-5 bg-surface-container-lowest/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-surface-container-lowest/15 space-y-4 sm:space-y-5 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-surface-bright break-words">
                    Faire une offrande instantanée
                  </h3>
                  <p className="text-xs text-surface-variant break-words">
                    Opérateurs agréés Cameroun (MTN MoMo, Orange Money, Cartes) avec reçu certifié.
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {["5 000", "10 000", "25 000", "50 000"].map((amt) => (
                      <Link
                        key={amt}
                        href={`/dons?amount=${amt.replace(" ", "")}`}
                        className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-center font-bold text-xs sm:text-sm text-surface-bright border border-surface-container-lowest/15 transition-all active:scale-95"
                      >
                        {amt} FCFA
                      </Link>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 sm:pt-2 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#FF7900] shrink-0" />
                      <span className="text-[11px] sm:text-xs font-bold text-surface-bright">Orange #150#</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#FFCC00] shrink-0" />
                      <span className="text-[11px] sm:text-xs font-bold text-surface-bright">MTN *126#</span>
                    </div>
                  </div>

                  <Link
                    href="/dons"
                    className="h-11 sm:h-12 w-full rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-3 sm:mt-4"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                      <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    <span>Accéder au formulaire de don</span>
                  </Link>
                </div>
              </div>


            </section>

            {/* ============================================================== */}
            {/* 9. SECTION: FAITHFUL TESTIMONIES */}
            {/* ============================================================== */}
            <section className="space-y-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-primary font-bold">
                  FRATERNITÉ &amp; TÉMOIGNAGES
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-0.5">
                  Témoignages de nos fidèles
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Testimony 1 */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-4 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold text-sm sm:text-base shrink-0">
                      EA
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-on-surface text-sm sm:text-base truncate">Elder Emmanuel A.</h4>
                      <span className="text-xs text-on-surface-variant block truncate">Assemblée Centrale Tsinga, Yaoundé</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-on-surface leading-relaxed italic break-words">
                    « Depuis plus de 35 ans dans la Mission du Plein Évangile, j'ai vu la main puissante du Seigneur restaurer des familles entières, délivrer des cœurs et former des serviteurs fidèles selon la pureté de la Parole. Gloire à Jésus ! »
                  </p>
                  <div className="flex items-center text-amber-500 text-xs gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                    <span className="text-on-surface-variant ml-2 font-medium">Fidélité éprouvée</span>
                  </div>
                </div>

                {/* Testimony 2 */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 shadow-sm border border-surface-container-high/60 flex flex-col justify-between gap-4 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-sm sm:text-base shrink-0">
                      CN
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-on-surface text-sm sm:text-base truncate">Sœur Clarisse N.</h4>
                      <span className="text-xs text-on-surface-variant block truncate">District Bonamoussadi, Douala</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-on-surface leading-relaxed italic break-words">
                    « Le ministère Dorcas m'a relevée après une épreuve très difficile. Au travers de la prière constante et de l'amour sans faux-semblant des sœurs, j'ai retrouvé la joie du service et la paix divine dans mon foyer. »
                  </p>
                  <div className="flex items-center text-amber-500 text-xs gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                    <span className="text-on-surface-variant ml-2 font-medium">Ministère Dorcas</span>
                  </div>
                </div>
              </div>


            </section>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
}
