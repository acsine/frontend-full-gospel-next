"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";
import { Can, usePermissions } from "@/components/auth/Can";
import { RoleLevel } from "@/lib/permissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";

export interface MediaResource {
  id: string;
  title: string;
  speaker: string;
  speaker_role?: string;
  category: "sermon" | "video" | "praise" | "document" | "photo";
  file_url: string;
  cover_url: string;
  duration?: string;
  date: string;
  assembly: string;
  tags: string[];
  views: number;
  downloads: number;
  description: string;
}

const DEFAULT_COVERS: Record<MediaResource["category"], string> = {
  video: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=800",
  praise: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
  photo: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800",
  sermon: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&q=80&w=800",
  document: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800",
};

export default function MediathequePage() {
  const { alert, confirm } = useConfirm();
  const { can: checkCan } = usePermissions();

  const [mediaList, setMediaList] = useState<MediaResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Active Media Playback state
  const [activeMedia, setActiveMedia] = useState<MediaResource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload Modal State (RBAC Guarded)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [uploadForm, setUploadForm] = useState({
    title: "",
    speaker: "Pasteur de Paroisse",
    speaker_role: "Ministère Pastoral",
    category: "sermon" as MediaResource["category"],
    assembly: "Temple Central de Tsinga (Yaoundé)",
    duration: "35 min",
    tags: "#Enseignement, #Foi",
    description: "",
    file_url: "",
  });

  // Fetch Live Media from backend API
  useEffect(() => {
    let isMounted = true;
    async function loadBackendMedia() {
      setIsLoading(true);
      try {
        const res = await api.media.list({ limit: 50 });
        const items = res?.data?.media;
        if (items && Array.isArray(items) && items.length > 0 && isMounted) {
          const mapped: MediaResource[] = items.map((m: any, idx: number) => {
            const rawCat = (m.category || "sermon").toLowerCase();
            const normCat: MediaResource["category"] =
              rawCat.includes("video") ? "video" :
                rawCat.includes("music") || rawCat.includes("praise") || rawCat.includes("audio") ? "praise" :
                  rawCat.includes("pdf") || rawCat.includes("document") ? "document" :
                    rawCat.includes("photo") || rawCat.includes("image") ? "photo" :
                      "sermon";

            return {
              id: m.id || `live-${idx}`,
              title: m.original_filename?.replace(/\.[^/.]+$/, "") || m.alt_text || "Enseignement Audio",
              speaker: m.alt_text || "Pasteur de l'Assemblée",
              speaker_role: "Mission du Plein Évangile",
              category: normCat,
              file_url: m.file_url || "#",
              cover_url: (DEFAULT_COVERS[normCat] || DEFAULT_COVERS.sermon || "") as string,
              duration: m.file_size ? `${Math.round(m.file_size / (1024 * 1024))} Mo` : "25 min",
              date: m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Récemment",
              assembly: "Temple de Tsinga",
              tags: ["#Édification", "#PleinÉvangile"],
              views: 0,
              downloads: 0,
              description: m.alt_text || "Ressource enregistrée pour l'édification spirituelle des fidèles.",
            };
          });

          setMediaList(mapped);
          setActiveMedia((prev) => prev || mapped[0] || null);
        } else {
          setMediaList([]);
          setActiveMedia(null);
        }
      } catch {
        setMediaList([]);
        setActiveMedia(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadBackendMedia();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Playback Toggle
  const handleTogglePlay = (media: MediaResource) => {
    if (activeMedia?.id === media.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setActiveMedia(media);
      setIsPlaying(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play().catch(() => { });
        }
      }, 100);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Upload Submission Handler (RBAC Guarded)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkCan({ minRole: RoleLevel.COMMUNICATOR, permission: "can:create_publication" })) {
      await alert({
        title: "Droits Insuffisants",
        message: "Seuls les chargés de communication (N3) et pasteurs (N4+) peuvent téléverser des archives dans la médiathèque.",
        variant: "danger",
      });
      return;
    }

    if (!uploadForm.title.trim()) {
      setFeedback({ type: "error", message: "Le titre de l'archive audiovisuelle est requis." });
      return;
    }

    setUploading(true);
    try {
      const rawTags = uploadForm.tags
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const newMedia: MediaResource = {
        id: `local-${Date.now()}`,
        title: uploadForm.title.trim(),
        speaker: uploadForm.speaker.trim(),
        speaker_role: uploadForm.speaker_role.trim(),
        category: uploadForm.category,
        file_url: uploadForm.file_url.trim() || "#",
        cover_url: (DEFAULT_COVERS[uploadForm.category] || DEFAULT_COVERS.sermon || "") as string,
        duration: uploadForm.duration || "40 min",
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        assembly: uploadForm.assembly,
        tags: rawTags.length > 0 ? rawTags : ["#PleinÉvangile"],
        views: 1,
        downloads: 0,
        description: uploadForm.description || "Enregistrement officiel de la Mission du Plein Évangile Cameroun.",
      };

      setMediaList((prev) => [newMedia, ...prev]);
      setFeedback({
        type: "success",
        message: `L'archive « ${newMedia.title} » a été ajoutée avec succès à la médiathèque.`,
      });
      setUploadModalOpen(false);

      // Reset form
      setUploadForm({
        title: "",
        speaker: "Pasteur de Paroisse",
        speaker_role: "Ministère Pastoral",
        category: "sermon",
        assembly: "Temple Central de Tsinga (Yaoundé)",
        duration: "35 min",
        tags: "#Enseignement, #Foi",
        description: "",
        file_url: "",
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors du téléversement." });
    } finally {
      setUploading(false);
    }
  };

  // Filtered Media List
  const filteredMedia = useMemo(() => {
    return mediaList.filter((m) => {
      if (selectedCategory !== "all" && m.category !== selectedCategory) return false;
      if (selectedAssembly !== "all" && !m.assembly.toLowerCase().includes(selectedAssembly.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchSpeaker = m.speaker.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchTags = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSpeaker && !matchDesc && !matchTags) return false;
      }
      return true;
    });
  }, [mediaList, selectedCategory, selectedAssembly, searchQuery]);

  return (
    <PortalShell activePath="/mediatheque" title="Médiathèque Numérique">
      <div className="space-y-6 max-w-7xl 2xl:max-w-[1700px] mx-auto pb-24">
        {/* Navigation Breadcrumb & Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium flex-wrap">
            <Link href="/dashboard" className="hover:text-primary">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Médiathèque Numérique &amp; Prédications</span>
          </nav>

          {/* Action Button Guarded by RBAC N3+ Communicator / N4+ Pastor */}
          <div className="flex items-center gap-2">
            <Can minRole={RoleLevel.COMMUNICATOR} permission="can:create_publication">
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>+ Déposer une Prédication / Média</span>
              </button>
            </Can>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
              }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Banner Header */}
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-surface-container-high shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">video_library</span>
                <span>Patrimoine Audiovisuel de la Mission</span>
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight font-display">
                Médiathèque Numérique &amp; Prédications Apostoliques
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Retrouvez l'ensemble des enseignements audio MP3 prêchés en chaire, captations vidéo des cultes de réveil, cantiques des chorales et recueils doctrinaux officiels de la Full Gospel Mission Cameroun.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container text-center">
                <span className="text-xs text-on-surface-variant font-medium block">Prédications</span>
                <strong className="text-xl font-black text-primary">120+ Heures</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container text-center">
                <span className="text-xs text-on-surface-variant font-medium block">Auditeurs</span>
                <strong className="text-xl font-black text-on-surface">15 400</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container text-center col-span-2 sm:col-span-1">
                <span className="text-xs text-on-surface-variant font-medium block">Qualité Audio</span>
                <strong className="text-xl font-black text-emerald-700">HD Stéréo</strong>
              </div>
            </div>
          </div>

          {/* Search & Assembly Filter Toolbar */}
          <div className="pt-4 border-t border-surface-container flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre de sermon, orateur, passage biblique ou mot-clé..."
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAssembly}
                onChange={(e) => setSelectedAssembly(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Toutes les Assemblées (National)</option>
                <option value="tsinga">Temple Central de Tsinga (Yaoundé)</option>
                <option value="bépanda">Grand Temple de Bépanda (Douala)</option>
                <option value="bamenda">Assemblée Mère de Bamenda</option>
                <option value="molyko">Temple de Molyko (Buea)</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="pt-2 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "Toutes les Archives", icon: "apps" },
              { id: "sermon", label: "Prédications & Sermons Audio", icon: "mic" },
              { id: "video", label: "Cultes & Directs Vidéo", icon: "smart_display" },
              { id: "praise", label: "Cantiques & Louange Chorale", icon: "music_note" },
              { id: "document", label: "Feuilles Liturgiques & PDF", icon: "description" },
              { id: "photo", label: "Conventions & Photothèque", icon: "photo_library" },
            ].map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${active
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                >
                  <span className="material-symbols-outlined text-[17px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* LECTEUR INTÉGRÉ PERSISTANT (ACTIVE PLAYER BANNER) */}
        {/* =================================================================== */}
        {activeMedia && (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <audio ref={audioRef} src={activeMedia.file_url} onEnded={() => setIsPlaying(false)} />

            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md">
                <img
                  src={activeMedia.cover_url}
                  alt={activeMedia.title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleTogglePlay(activeMedia)}
                  className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[28px] text-white">
                    {isPlaying ? "pause_circle" : "play_circle"}
                  </span>
                </button>
              </div>

              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-primary-fixed tracking-wider block">
                  En cours de lecture • {activeMedia.category.toUpperCase()}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {activeMedia.title}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {activeMedia.speaker} • {activeMedia.assembly}
                </p>
              </div>
            </div>

            {/* Playback Controls & Actions */}
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
              {/* Speed Controller */}
              <div className="flex items-center bg-slate-800 rounded-xl p-1 text-xs">
                {[1, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${playbackSpeed === spd
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:text-white"
                      }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Main Play/Pause Button */}
              <button
                type="button"
                onClick={() => handleTogglePlay(activeMedia)}
                className="h-10 px-4 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
                <span>{isPlaying ? "Mettre en pause" : "Écouter"}</span>
              </button>

              {/* Download Action */}
              <a
                href={activeMedia.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Télécharger l'enregistrement officiel"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </a>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* GRILLE DES ARCHIVES AUDIOVISUELLES & PRÉDICATIONS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-surface-container-lowest rounded-3xl border border-surface-container-high/60 overflow-hidden shadow-xs space-y-4 animate-pulse flex flex-col justify-between"
              >
                <div className="h-48 bg-surface-container-high/70 w-full" />
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-4/5 rounded-lg" />
                    <Skeleton className="h-3.5 w-1/2 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                  </div>
                  <div className="pt-3 border-t border-surface-container-high/40 flex justify-between items-center">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredMedia.map((m) => {
            const isCurrentPlaying = activeMedia?.id === m.id && isPlaying;

            return (
              <div
                key={m.id}
                className="bg-surface-container-lowest rounded-3xl border border-surface-container-high shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Media Card Thumbnail & Badges */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={m.cover_url}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 border border-white/10">
                      <span className="material-symbols-outlined text-[14px]">
                        {m.category === "sermon" ? "mic" :
                          m.category === "video" ? "smart_display" :
                            m.category === "praise" ? "music_note" :
                              m.category === "document" ? "description" : "photo_camera"}
                      </span>
                      <span>
                        {m.category === "sermon" ? "Prédication" :
                          m.category === "video" ? "Culte Vidéo" :
                            m.category === "praise" ? "Louange" :
                              m.category === "document" ? "Document" : "Photo"}
                      </span>
                    </span>
                  </div>

                  {/* Duration Badge */}
                  {m.duration && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-mono font-bold flex items-center gap-1 border border-white/10">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{m.duration}</span>
                    </div>
                  )}

                  {/* Play Trigger Center Overlay */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(m)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[28px]">
                        {isCurrentPlaying ? "pause" : "play_arrow"}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Media Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>{m.date}</span>
                      <span className="font-medium truncate max-w-[150px]">{m.assembly}</span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 leading-snug group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>

                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[10px]">
                        {m.speaker.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block truncate">
                          {m.speaker}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {m.speaker_role || "Mission du Plein Évangile"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
                      {m.description}
                    </p>
                  </div>

                  {/* Tags & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {m.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>{m.views.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>{m.downloads.toLocaleString()}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(m)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${isCurrentPlaying
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-primary text-white hover:bg-primary/90"
                            }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isCurrentPlaying ? "pause" : "play_arrow"}
                          </span>
                          <span>{isCurrentPlaying ? "Lecture" : "Écouter"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Empty Search Fallback */}
        {!isLoading && filteredMedia.length === 0 && (
          <div className="p-12 text-center bg-surface-container-lowest rounded-3xl border border-surface-container space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">search_off</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Aucun enregistrement trouvé</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Aucun fichier multimédia ne correspond à votre filtre. Réinitialisez la recherche ou changez de catégorie.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedAssembly("all");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL: TÉLÉVERSER UN MÉDIA DANS LA MÉDIATHÈQUE (RBAC N3 / N4+) */}
        {/* =================================================================== */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Archiver une Prédication ou un Média
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Médiathèque officielle de la Mission du Plein Évangile
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Titre de la prédication ou de l'archive *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Le Réveil Spirituel et la Marche par l'Esprit"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Catégorie de média *</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                    >
                      <option value="sermon">Prédication Audio (MP3)</option>
                      <option value="video">Culte ou Convention (Vidéo)</option>
                      <option value="praise">Cantiques / Louange Chorale</option>
                      <option value="document">Document / Recueil (PDF)</option>
                      <option value="photo">Photothèque / Événement</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Durée estimée (ex: 45 min)</label>
                    <input
                      type="text"
                      placeholder="Ex: 45 min 30 s"
                      value={uploadForm.duration}
                      onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Prédicateur / Intervenant *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nom du pasteur ou de la chorale"
                      value={uploadForm.speaker}
                      onChange={(e) => setUploadForm({ ...uploadForm, speaker: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assemblée ou Paroisse de captation</label>
                    <input
                      type="text"
                      value={uploadForm.assembly}
                      onChange={(e) => setUploadForm({ ...uploadForm, assembly: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">URL du fichier audio / vidéo / PDF (ou stockage CDN)</label>
                  <input
                    type="url"
                    placeholder="https://cdn.fullgope.cm/audio/sermon-2026-10.mp3"
                    value={uploadForm.file_url}
                    onChange={(e) => setUploadForm({ ...uploadForm, file_url: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Résumé &amp; Notes d'édification</label>
                  <textarea
                    rows={3}
                    placeholder="Courte présentation du message, passages bibliques clés, contexte de la convention..."
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thèmes &amp; Mots-clés (#)</label>
                  <input
                    type="text"
                    placeholder="#Doctrine, #SaintEsprit, #Foi"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {uploading ? "Indexation..." : "Enregistrer dans la Médiathèque"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

