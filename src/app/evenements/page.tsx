"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface ChurchEvent {
  id: string;
  title: string;
  category: "convention" | "veillee" | "conference" | "culte";
  month: string;
  days: string;
  dateStr: string;
  timeStr: string;
  location: string;
  speaker: string;
  description: string;
  delegations: string;
}

export default function EvenementsPage() {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveEvents() {
      setIsLoading(true);
      try {
        const res = await api.events.list({ limit: 50 });
        const items = (res.data as any)?.events || (res.data as any)?.items;
        if (items && Array.isArray(items) && items.length > 0 && isMounted) {
          const mapped: ChurchEvent[] = items.map((item: any, idx: number) => {
            const startDate = item.start_datetime ? new Date(item.start_datetime) : new Date();
            const monthNames = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOUT", "SEPT", "OCT", "NOV", "DEC"];
            const month = monthNames[startDate.getMonth()] || "MAI";
            const dayNum = String(startDate.getDate()).padStart(2, "0");

            const rawCat = (item.event_type || "").toLowerCase();
            const category: ChurchEvent["category"] =
              rawCat.includes("convention") || rawCat.includes("concert") ? "convention" :
                rawCat.includes("veille") || rawCat.includes("prière") ? "veillee" :
                  rawCat.includes("conference") ? "conference" :
                    "culte";

            return {
              id: item.id || `live-ev-${idx}`,
              title: item.title,
              category,
              month,
              days: dayNum,
              dateStr: startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
              timeStr: `${startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} - 18h00`,
              location: item.location_name || item.location_address || "Temple Central Full Gospel",
              speaker: item.organizer_name || "Bureau National & Pasteurs Invités",
              description: item.description || "Temps fort de communion spirituelle, de prédication de la parole et de louange au Seigneur Jésus.",
              delegations: `${item.attendees_count || 12} fidèles et serviteurs inscrits`,
            };
          });

          setEvents(mapped);
        } else if (isMounted) {
          setEvents([]);
        }
      } catch {
        if (isMounted) setEvents([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchLiveEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = events.filter((e) => filter === "all" || e.category === filter);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <PublicHeader />

      <main className="flex-1 pt-20 pb-24 w-full px-4 md:px-8 lg:px-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
              <span>AGENDA SPIRITUEL &amp; RASSEMBLEMENTS NATIONAUX</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight font-headline-lg">
              Calendrier des Conventions &amp; Événements
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl leading-relaxed">
              Cultes solennels de réveil, veillées d'intercession, conventions nationales et synodes à travers les 10 régions du Cameroun et la diaspora.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span>{events.length} Rassemblements Annuels</span>
            </span>
          </div>
        </div>

        {/* Featured Convention Showcase Card (Full Width on Desktop) */}
        {isLoading ? (
          <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-6 md:p-8 lg:p-10 border border-surface-container-high/60 animate-pulse">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <Skeleton className="h-6 w-48 rounded-full" />
                <Skeleton className="h-10 w-3/4 rounded-xl" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>
              <div className="lg:col-span-4 space-y-3">
                <div className="bg-surface-container-lowest/60 rounded-2xl p-6 border border-surface-container-high/40 text-center space-y-2">
                  <Skeleton className="h-3 w-28 mx-auto rounded" />
                  <Skeleton className="h-8 w-24 mx-auto rounded-lg" />
                  <Skeleton className="h-3 w-36 mx-auto rounded" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="flex-1 h-12 rounded-xl" />
                  <Skeleton className="flex-1 h-12 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ) : events[0] ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-[#650013] text-on-primary p-6 md:p-8 lg:p-10 shadow-xl border border-primary-container">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider">
                    Événement Majeur National
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    {events[0].dateStr} • {events[0].timeStr}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-display leading-tight">
                  {events[0].title}
                </h2>
                <p className="text-xs sm:text-sm text-white/90 max-w-2xl leading-relaxed">
                  {events[0].description}
                </p>
                <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    <span>{events[0].location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                    <span>{events[0].speaker}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 block">
                    Mobilisation Apostolique
                  </span>
                  <span className="text-2xl font-black text-white mt-0.5 block">
                    15 000+
                  </span>
                  <span className="text-[11px] text-white/80">
                    Délégués attendus des 10 Régions
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(events[0]!)}
                    className="flex-1 h-12 rounded-xl bg-white text-primary font-bold text-xs hover:bg-surface-container-lowest transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    <span>Programme complet</span>
                  </button>
                  <Link
                    href="/dons"
                    className="flex-1 h-12 rounded-xl bg-secondary-fixed text-on-secondary-fixed font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                    <span>Soutenir</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 12-Column Desktop Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Filter & Event Cards (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-semibold pb-1">
              {[
                { id: "all", label: "Tous les événements" },
                { id: "convention", label: "Conventions Nationales" },
                { id: "conference", label: "Conférences Ministères" },
                { id: "veillee", label: "Veillées de Prière" },
                { id: "culte", label: "Cultes Spéciaux" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${filter === f.id
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Events Cards List */}
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse"
                  >
                    <div className="flex items-start gap-4 min-w-0 w-full md:w-3/4">
                      <Skeleton className="w-[76px] h-16 rounded-2xl shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-20 rounded-full" />
                          <Skeleton className="h-4 w-28 rounded" />
                        </div>
                        <Skeleton className="h-5 w-3/4 rounded-lg" />
                        <Skeleton className="h-3.5 w-full rounded" />
                        <Skeleton className="h-3.5 w-48 rounded" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                      <Skeleton className="h-10 w-36 rounded-xl" />
                      <Skeleton className="h-10 w-28 rounded-xl" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="bg-surface-container-lowest p-12 rounded-2xl border border-dashed border-surface-container-high text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[42px] text-on-surface-variant/40">event_busy</span>
                  <p className="font-bold text-sm text-on-surface">Aucun événement au programme</p>
                  <p className="text-xs text-on-surface-variant max-w-sm">
                    Aucune convention ou rassemblement n&apos;est actuellement programmé pour cette catégorie. Consultez les cultes réguliers ou revenez bientôt.
                  </p>
                </div>
              ) : (
                filtered.map((e) => (
                  <div
                    key={e.id}
                    className="bg-surface-container-lowest p-4 sm:p-6 rounded-2xl shadow-sm border border-surface-container-high/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 hover:shadow-md transition-all group min-w-0 overflow-hidden"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Date badge */}
                      <div
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-center leading-none flex flex-col justify-center min-w-[64px] sm:min-w-[76px] shrink-0 shadow-sm ${e.category === "convention"
                            ? "bg-primary text-on-primary"
                            : e.category === "conference"
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-inverse-surface text-inverse-on-surface"
                          }`}
                      >
                        <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider block opacity-90">
                          {e.month}
                        </span>
                        <span className="text-lg sm:text-xl font-black mt-1 block tracking-tight">
                          {e.days}
                        </span>
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${e.category === "convention"
                                ? "bg-primary-fixed text-primary"
                                : "bg-surface-container text-on-surface-variant"
                              }`}
                          >
                            {e.category}
                          </span>
                          <span className="text-xs text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                            <span>{e.timeStr}</span>
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-on-surface group-hover:text-primary transition-colors break-words">
                          {e.title}
                        </h3>

                        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed break-words">
                          {e.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-on-surface-variant pt-1 min-w-0">
                          <span className="material-symbols-outlined text-[16px] text-primary shrink-0">location_on</span>
                          <span className="truncate">{e.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(e)}
                        className="h-10 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors"
                      >
                        Programme &amp; Orateurs
                      </button>
                      <Link
                        href="/dons"
                        className="h-10 px-5 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <span>Soutenir</span>
                      </Link>
                    </div>
                  </div>
                )))}
            </div>
          </div>

          {/* Right Column: Sticky Calendar & Broadcast Widget (4 cols) */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            {/* Calendar Mini Strip */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                <span className="capitalize">Agenda Mensuel • {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                <span className="text-[11px] text-primary font-semibold">Temps forts</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {["Lun 15", "Mar 16", "Mer 17", "Jeu 18", "Ven 19", "Sam 20", "Dim 21"].map((d, i) => (
                  <div
                    key={i}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center font-bold ${i >= 3 && i <= 5
                        ? "bg-primary-container text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface"
                      }`}
                  >
                    <span className="text-[10px] font-normal opacity-80">{d.split(" ")[0]}</span>
                    <span className="text-sm mt-0.5">{d.split(" ")[1]}</span>
                    {i >= 3 && i <= 5 && <span className="w-1.5 h-1.5 rounded-full bg-on-primary mt-1" />}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant pt-2 border-t border-surface-container">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary-container" /> Convention
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary-container" /> Conférence
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-inverse-surface" /> Veillée
                </span>
              </div>
            </div>

            {/* Live Broadcast Card */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">live_tv</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Diffusion Nationale en Direct</h4>
                  <span className="text-[11px] text-on-surface-variant">Radio &amp; Streaming Web</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Toutes les plénières des conventions nationales sont retransmises en direct pour les fidèles de l'intérieur et de la diaspora.
              </p>
              <Link
                href="/publications"
                className="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">podcasts</span>
                <span>Accéder aux retransmissions</span>
              </Link>
            </div>

            {/* Pèlerins & Accueil Contact Card */}
            <div className="p-5 rounded-2xl bg-secondary-fixed/20 border border-secondary-fixed-dim/40 text-xs space-y-2 text-on-surface">
              <div className="flex items-center gap-2 font-bold text-secondary">
                <span className="material-symbols-outlined text-[18px]">hotel</span>
                <span>Accueil &amp; Hébergement des Délégués</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Une permanence logistique accueille les délégations venant des régions de l'Adamaoua, du Nord, de l'Extrême-Nord et du Grand Ouest.
              </p>
              <span className="font-mono font-bold text-primary block text-xs pt-1">
                Permanence : +237 6 77 00 11 22
              </span>
            </div>
          </div>
        </div>

        {/* Modal Event Detail */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl p-6 sm:p-8 border border-surface-container-high space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-surface-container-high">
                <div>
                  <span className="text-[11px] font-bold uppercase text-primary tracking-wider">
                    Détail du Rassemblement Canonique
                  </span>
                  <h3 className="text-xl font-bold text-on-surface mt-1">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-4 rounded-xl bg-surface-container-low space-y-2">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Dates :</span>
                    <strong className="text-on-surface">{selectedEvent.dateStr}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Horaires :</span>
                    <strong className="text-on-surface">{selectedEvent.timeStr}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Lieu :</span>
                    <strong className="text-on-surface">{selectedEvent.location}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Orateurs :</span>
                    <strong className="text-primary">{selectedEvent.speaker}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface mb-1">Présentation Spirituelle</h4>
                  <p className="text-on-surface-variant leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface mb-1">Délégations &amp; Accueil</h4>
                  <p className="text-on-surface-variant leading-relaxed">
                    {selectedEvent.delegations}. Un dispositif d'hébergement pour les pèlerins venus des régions reculées et de la diaspora est mis en place par la commission logistique nationale.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
