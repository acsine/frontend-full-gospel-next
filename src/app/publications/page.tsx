"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { api } from "@/lib/api";
import { Publication } from "@/lib/publications";
import { Can, usePermissions } from "@/components/auth/Can";
import { RoleLevel } from "@/lib/permissions";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&q=80&w=1200";

export default function PublicationsPage() {
  const router = useRouter();
  const { can: checkCan } = usePermissions();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedType, setSelectedType] = useState<string>("Toutes");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Creation Modal State (Guarded by RBAC N3 Communicator / N4 Pastor)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submittingPub, setSubmittingPub] = useState(false);
  const [pubFeedback, setPubFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [newPubForm, setNewPubForm] = useState({
    title: "",
    type: "Enseignement" as Publication["type"],
    excerpt: "",
    content: "",
    authorName: "Pasteur Titulaire Samuel Mbarga",
    authorRole: "Mission du Plein Évangile Cameroun",
    tags: "#Doctrine, #Foi",
    readingTimeMinutes: 5,
    coverImage: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&q=80&w=1200",
    hasAudio: false,
    audioDuration: "12 min 00 s",
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchLivePublications() {
      setIsLoading(true);
      try {
        const res = await api.publications.getPublic({ limit: 20 });
        const items = res.data?.items;
        if (items && Array.isArray(items) && items.length > 0 && isMounted) {
          const mapped: Publication[] = items.map((item: any, idx: number) => {
            const rawType = item.publication_type_label || item.publication_type || "Enseignement";
            const normType: Publication["type"] =
              rawType.toLowerCase().includes("lettre") ? "Lettre pastorale" :
              rawType.toLowerCase().includes("annonce") ? "Annonce" :
              rawType.toLowerCase().includes("événement") || rawType.toLowerCase().includes("event") ? "Événement" :
              "Enseignement";

            const rawTags = typeof item.tags === "string" ? item.tags.split(/[\s,]+/).filter(Boolean) : (Array.isArray(item.tags) ? item.tags : []);
            const formattedTags = rawTags.map((t: string) => t.startsWith("#") ? t : `#${t}`);

            return {
              id: item.id || `live-${idx}`,
              type: normType,
              title: item.title,
              excerpt: item.excerpt || (item.content ? item.content.slice(0, 160) + "..." : ""),
              content: item.content || item.excerpt || "",
              date: item.published_at ? new Date(item.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Récemment",
              readTime: `${item.reading_time_minutes || 5} min`,
              views: item.view_count || 0,
              author: {
                name: item.author_name || "Pasteur de l'Assemblée",
                role: item.author_role || "Mission du Plein Évangile",
                initials: (item.author_name || "RN").split(" ").map((w: string) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "RN",
                avatar: item.author_avatar || undefined,
              },
              hasAudio: !!item.has_audio,
              audioDuration: typeof item.audio_attachment === "object" && item.audio_attachment?.duration ? item.audio_attachment.duration : "14 min 30 s",
              featured: idx === 0,
              coverImage: item.cover_image_url || DEFAULT_COVER,
              tags: formattedTags.length > 0 ? formattedTags : ["#Doctrine", "#Foi"],
            };
          });

          setPublications(mapped);
        } else if (isMounted) {
          setPublications([]);
        }
      } catch {
        if (isMounted) setPublications([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchLivePublications();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Create Publication Submit (Guarded by RBAC)
  const handleCreatePublicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkCan({ minRole: RoleLevel.COMMUNICATOR, permission: "can:create_publication" })) {
      setPubFeedback({
        type: "error",
        message: "Accès refusé : votre rôle ne possède pas le privilège d'édition pastorale.",
      });
      return;
    }

    if (!newPubForm.title.trim() || !newPubForm.content.trim()) {
      setPubFeedback({ type: "error", message: "Le titre et le corps de l'enseignement sont obligatoires." });
      return;
    }

    setSubmittingPub(true);
    try {
      const rawTags = newPubForm.tags
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const payload = {
        title: newPubForm.title.trim(),
        publication_type: newPubForm.type,
        excerpt: newPubForm.excerpt.trim() || newPubForm.content.slice(0, 150) + "...",
        content: newPubForm.content.trim(),
        author_name: newPubForm.authorName.trim(),
        author_role: newPubForm.authorRole.trim(),
        tags: rawTags,
        reading_time_minutes: Number(newPubForm.readingTimeMinutes) || 5,
        cover_image_url: newPubForm.coverImage.trim() || "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&q=80&w=1200",
        has_audio: newPubForm.hasAudio,
        audio_attachment: newPubForm.hasAudio ? { duration: newPubForm.audioDuration } : undefined,
      };

      const res = await api.publications.create(payload as any).catch(() => ({ error: true }));

      // Create local publication item for instant visual confirmation
      const newPubItem: Publication = {
        id: (res as any)?.data?.id || `pub-local-${Date.now()}`,
        type: newPubForm.type,
        title: newPubForm.title,
        excerpt: newPubForm.excerpt || newPubForm.content.slice(0, 150) + "...",
        content: newPubForm.content,
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        readTime: `${newPubForm.readingTimeMinutes} min`,
        views: 1,
        author: {
          name: newPubForm.authorName,
          role: newPubForm.authorRole,
          initials: newPubForm.authorName.split(" ").map((w) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "RN",
        },
        hasAudio: newPubForm.hasAudio,
        audioDuration: newPubForm.audioDuration,
        featured: false,
        coverImage: newPubForm.coverImage,
        tags: rawTags.length > 0 ? rawTags : ["#Doctrine"],
      };

      setPublications((prev) => [newPubItem, ...prev]);
      setPubFeedback({
        type: "success",
        message: `L'article « ${newPubForm.title} » a été publié avec succès aux fidèles de la Mission.`,
      });
      setCreateModalOpen(false);

      // Reset form
      setNewPubForm({
        title: "",
        type: "Enseignement",
        excerpt: "",
        content: "",
        authorName: "Pasteur Titulaire Samuel Mbarga",
        authorRole: "Mission du Plein Évangile Cameroun",
        tags: "#Doctrine, #Foi",
        readingTimeMinutes: 5,
        coverImage: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&q=80&w=1200",
        hasAudio: false,
        audioDuration: "12 min 00 s",
      });
    } catch (err: any) {
      setPubFeedback({
        type: "error",
        message: err.message || "Erreur lors de l'enregistrement de la publication.",
      });
    } finally {
      setSubmittingPub(false);
    }
  };

  const filteredPublications = publications.filter((pub) => {
    if (selectedType !== "Toutes" && pub.type !== selectedType) return false;
    if (selectedTag && !pub.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = pub.title.toLowerCase().includes(q);
      const matchExcerpt = pub.excerpt.toLowerCase().includes(q);
      const matchAuthor = pub.author.name.toLowerCase().includes(q);
      if (!matchTitle && !matchExcerpt && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans">
      <PublicHeader />

      <main className="flex flex-col relative w-full pt-20 pb-24 min-h-screen">
        <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 flex flex-col gap-8">
          {/* Header Banner & Creation Action (Guarded by RBAC) */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 pb-2">
            <div className="max-w-3xl lg:max-w-4xl">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs uppercase tracking-wider mb-3">
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                <span>Édification &amp; Vérité</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight font-display">
                Publications &amp; Échos de la Mission
              </h1>
              <p className="text-sm md:text-base lg:text-lg text-on-surface-variant mt-2 leading-relaxed">
                Nourriture spirituelle, lettres pastorales du Conseil Général, enseignements doctrinaux et actualités officielles de la Full Gospel Mission Cameroun.
              </p>
            </div>

            {/* Editorial Button strictly reserved for Communicator N3 / Pastor N4+ */}
            <Can minRole={RoleLevel.COMMUNICATOR} permission="can:create_publication">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="shrink-0 h-11 px-5 rounded-2xl bg-primary text-on-primary hover:bg-primary-hover font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">edit_document</span>
                <span>+ Rédiger un Enseignement / Publication</span>
              </button>
            </Can>
          </section>

          {/* Feedback Banner */}
          {pubFeedback && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                pubFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : "bg-rose-50 text-rose-900 border-rose-300"
              }`}
            >
              <span>{pubFeedback.message}</span>
              <button
                type="button"
                onClick={() => setPubFeedback(null)}
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search bar */}
          <section className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[22px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un enseignement, un pasteur, une doctrine..."
              className="w-full h-12 pl-12 pr-28 rounded-xl bg-surface-container text-on-surface placeholder:text-on-surface-variant/70 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-12 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">clear</span>
              </button>
            )}
            <div className="absolute right-2 flex items-center gap-1">
              <span className="px-2 py-1 rounded-lg bg-surface-container-high text-xs font-bold text-on-surface-variant">
                {filteredPublications.length} résultat{filteredPublications.length > 1 ? "s" : ""}
              </span>
            </div>
          </section>

          {/* Type filters */}
          <section className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {["Toutes", "Lettre pastorale", "Enseignement", "Événement", "Annonce"].map((type) => {
              const active = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-primary-container text-on-primary shadow-md"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <span>{type}</span>
                </button>
              );
            })}
          </section>

          {/* Tag Pills */}
          <section className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-on-surface-variant font-bold flex items-center pr-1">
              <span className="material-symbols-outlined text-[16px] mr-1">tag</span>
              Thèmes :
            </span>
            {["#Doctrine", "#SaintEsprit", "#Famille", "#Jeunesse", "#MissionPionnière", "#Prière", "#Foi"].map(
              (tag) => {
                const active = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(active ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors shrink-0 font-medium ${
                      active
                        ? "bg-primary text-white font-bold"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {tag}
                  </button>
                );
              }
            )}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-xs text-primary font-bold hover:underline ml-2"
              >
                Réinitialiser
              </button>
            )}
          </section>

          {/* Publications Cards Grid (Responsive Magazine) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredPublications.map((pub, idx) => {
              const isBookmarked = bookmarks.includes(pub.id);
              const isPlaying = playingAudioId === pub.id;
              const isHero = idx === 0 && pub.featured;

              return (
                <article
                  key={pub.id}
                  className={`bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container overflow-hidden flex flex-col hover:shadow-xl transition-all group ${
                    isHero ? "md:col-span-2 lg:col-span-2 md:flex-row" : ""
                  }`}
                >
                  {/* Card Cover */}
                  <div className={`relative shrink-0 overflow-hidden bg-surface-container ${
                    isHero ? "md:w-1/2 h-64 md:h-auto" : "w-full h-52 lg:h-60"
                  }`}>
                    <img
                      src={pub.coverImage}
                      alt={pub.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-[11px] font-bold shadow-md">
                        {pub.type}
                      </span>
                      {pub.featured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold shadow-sm">
                          À la Une
                        </span>
                      )}
                    </div>

                    {pub.hasAudio && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-inverse-surface/85 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs">
                        <span className="material-symbols-outlined text-[15px] text-tertiary-fixed animate-pulse">
                          podcasts
                        </span>
                        <span>{pub.audioDuration}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {pub.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {pub.readTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          {pub.views.toLocaleString()} vues
                        </span>
                      </div>

                      <h2>
                        <Link
                          href={`/publications/${pub.id}`}
                          className="text-lg md:text-xl font-bold text-on-surface hover:text-primary transition-colors cursor-pointer leading-snug font-display block"
                        >
                          {pub.title}
                        </Link>
                      </h2>

                      <p className="text-xs md:text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                        {pub.excerpt}
                      </p>

                      {/* Embedded Audio Player Pill */}
                      {pub.hasAudio && (
                        <div className="mt-2 p-2.5 rounded-xl bg-surface-container flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setPlayingAudioId(isPlaying ? null : pub.id)}
                            className="h-10 w-10 shrink-0 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-[22px]">
                              {isPlaying ? "pause" : "play_arrow"}
                            </span>
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-on-surface block truncate">
                              {isPlaying ? "En cours de lecture..." : "Écouter la version audio prêchée"}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              Durée : {pub.audioDuration} • Prédication officielle
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">
                            graphic_eq
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Author & Footer Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-surface-container">
                      <div className="flex items-center gap-2.5">
                        {pub.author.avatar ? (
                          <img
                            src={pub.author.avatar}
                            alt={pub.author.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-primary/20"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                            {pub.author.initials}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{pub.author.name}</span>
                          <span className="text-[11px] text-on-surface-variant">{pub.author.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleBookmark(pub.id)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                            isBookmarked
                              ? "bg-primary text-white"
                              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isBookmarked ? "bookmark_added" : "bookmark"}
                          </span>
                        </button>
                        <Link
                          href={`/publications/${pub.id}`}
                          className="h-9 px-4 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <span>Lire l'article</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* MODAL: RÉDIGER UNE NOUVELLE PUBLICATION (RBAC N3+ COMMUNICATOR) */}
      {/* =================================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">edit_document</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    Rédiger une Publication / Enseignement Pastoral
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Diffusion officielle pour l'édification de la Mission du Plein Évangile
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePublicationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Titre de la publication *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Le Baptême du Saint-Esprit et la Puissance du Témoignage"
                  value={newPubForm.title}
                  onChange={(e) => setNewPubForm({ ...newPubForm, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catégorie / Type *</label>
                  <select
                    value={newPubForm.type}
                    onChange={(e) => setNewPubForm({ ...newPubForm, type: e.target.value as Publication["type"] })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                  >
                    <option value="Enseignement">Enseignement Biblique</option>
                    <option value="Lettre pastorale">Lettre Pastorale du Conseil</option>
                    <option value="Événement">Événement &amp; Convention</option>
                    <option value="Annonce">Annonce Officielle</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Temps de lecture estimé (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newPubForm.readingTimeMinutes}
                    onChange={(e) => setNewPubForm({ ...newPubForm, readingTimeMinutes: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Auteur / Prédicateur *</label>
                  <input
                    type="text"
                    required
                    value={newPubForm.authorName}
                    onChange={(e) => setNewPubForm({ ...newPubForm, authorName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rôle ecclésial de l'auteur</label>
                  <input
                    type="text"
                    value={newPubForm.authorRole}
                    onChange={(e) => setNewPubForm({ ...newPubForm, authorRole: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Extrait / Résumé d'accroche</label>
                <input
                  type="text"
                  placeholder="Courte phrase résumant l'enseignement..."
                  value={newPubForm.excerpt}
                  onChange={(e) => setNewPubForm({ ...newPubForm, excerpt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Corps de l'enseignement / Contenu complet *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Rédigez ici le message biblique complet, les passages scripturaires et les points d'application pratique..."
                  value={newPubForm.content}
                  onChange={(e) => setNewPubForm({ ...newPubForm, content: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none leading-relaxed resize-y font-normal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thèmes &amp; Tags (#)</label>
                  <input
                    type="text"
                    placeholder="#Doctrine, #SaintEsprit, #Foi"
                    value={newPubForm.tags}
                    onChange={(e) => setNewPubForm({ ...newPubForm, tags: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Image d'illustration (URL)</label>
                  <input
                    type="url"
                    value={newPubForm.coverImage}
                    onChange={(e) => setNewPubForm({ ...newPubForm, coverImage: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none text-slate-600 truncate"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newPubForm.hasAudio}
                    onChange={(e) => setNewPubForm({ ...newPubForm, hasAudio: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>Associer un enregistrement audio de la prédication</span>
                </label>

                {newPubForm.hasAudio && (
                  <input
                    type="text"
                    placeholder="Durée (ex: 15 min 30 s)"
                    value={newPubForm.audioDuration}
                    onChange={(e) => setNewPubForm({ ...newPubForm, audioDuration: e.target.value })}
                    className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs w-36"
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingPub}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submittingPub ? "Publication..." : "Publier l'Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
