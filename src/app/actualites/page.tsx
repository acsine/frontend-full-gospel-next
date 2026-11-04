"use client";

import React, { useState, useEffect, useMemo } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";

interface CommentItem {
  id: string;
  postId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}



interface CommunityPost {
  id: string;
  author: {
    name: string;
    role: string;
    assembly: string;
    avatar: string;
    isPastor?: boolean;
  };
  timestamp: string;
  type: "Texte & Médias" | "Verset du Jour" | "Requête d'Intercession" | "Témoignage";
  space_type?: "all" | "public" | "assembly" | "department" | "dept" | "prayer" | "group" | string;
  space_label?: string;
  verseRef?: string;
  content: string;
  image?: string;
  amensCount: number;
  commentsCount: number;
  hasAmened?: boolean;
  prayerBadge?: string;
}

export default function ActualitesPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [postType, setPostType] = useState<CommunityPost["type"]>("Texte & Médias");
  const [composerText, setComposerText] = useState("");
  const [verseRefInput, setVerseRefInput] = useState("");

  // Comment and sharing states
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Fetch posts from backend API and subscribe to live feed
  useEffect(() => {
    let isMounted = true;
    async function fetchLivePosts() {
      try {
        const spaceParam =
          activeTab === "all"
            ? undefined
            : activeTab === "assembly"
            ? "assembly"
            : activeTab === "dept"
            ? "department"
            : "group";

        const res = await api.social.listPosts({ space_type: spaceParam, limit: 30 });
        const list = (res.data as any)?.posts || (res.data as any)?.items;
        if (list && Array.isArray(list) && list.length > 0 && isMounted) {
          const mapped: CommunityPost[] = list.map((item: any, idx: number) => {
            const rawType = (item.post_type || "").toLowerCase();
            const type: CommunityPost["type"] =
              rawType.includes("verset")
                ? "Verset du Jour"
                : rawType.includes("priere") || rawType.includes("intercession")
                ? "Requête d'Intercession"
                : rawType.includes("temoignage")
                ? "Témoignage"
                : "Texte & Médias";

            const rawSpace = item.space_type || "public";
            const space_type =
              rawSpace === "department"
                ? "dept"
                : rawSpace === "group"
                ? "prayer"
                : rawSpace;

            return {
              id: item.id || `live-post-${idx}`,
              author: {
                name: item.author_name || "Frère / Sœur en Christ",
                role: item.author_role || "Membre d'Assemblée",
                assembly: item.assembly_name || "Temple Central Tsinga",
                avatar: item.author_avatar || "/logo.jpg",
                isPastor: (item.author_role || "").toLowerCase().includes("pasteur"),
              },
              timestamp: item.created_at
                ? new Date(item.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : "Récemment",
              type,
              space_type,
              space_label:
                space_type === "assembly"
                  ? "Assemblée Locale"
                  : space_type === "dept"
                  ? "Département"
                  : space_type === "prayer"
                  ? "Cellule de Prière"
                  : "Public",
              verseRef: item.verse_reference,
              content: item.content,
              image: item.media_url || item.image_url,
              amensCount: item.reactions_count?.amen || item.amens_count || 12,
              commentsCount: item.comments_count || 0,
              hasAmened: item.user_has_reacted,
              prayerBadge: type === "Requête d'Intercession" ? "Requête de Prière" : undefined,
            };
          });

          setPosts(mapped);
        } else if (isMounted) {
          setPosts([]);
        }
      } catch {
        if (isMounted) setPosts([]);
      }
    }

    fetchLivePosts();

    // Setup live Server-Sent Events (SSE) feed
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== "undefined" && window.EventSource) {
        const streamUrl = api.social.getFeedStreamUrl(
          activeTab === "all" ? "public" : activeTab === "dept" ? "department" : activeTab === "prayer" ? "group" : "assembly"
        );
        eventSource = new EventSource(streamUrl);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.content && isMounted) {
              setPosts((prev) => [
                {
                  id: data.id || `stream-${Date.now()}`,
                  author: {
                    name: data.author_name || "Fidèle Connecté",
                    role: data.author_role || "Membre",
                    assembly: data.assembly_name || "Mission Plein Évangile",
                    avatar: data.author_avatar || "/logo.jpg",
                  },
                  timestamp: "À l'instant (En direct)",
                  type: "Texte & Médias",
                  space_type: activeTab,
                  content: data.content,
                  amensCount: 1,
                  commentsCount: 0,
                },
                ...prev,
              ]);
            }
          } catch {
            // Ignore non-json heartbeats
          }
        };
      }
    } catch {
      // SSE not available or network error
    }

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
    };
  }, [activeTab]);

  // Compute posts filtered by active space pill
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (activeTab === "all") return true;

      if (activeTab === "assembly") {
        return (
          p.space_type === "assembly" ||
          p.space_type === "parish" ||
          p.space_label?.toLowerCase().includes("assemblée") ||
          p.prayerBadge === "Vie de l'Assemblée"
        );
      }

      if (activeTab === "dept") {
        return (
          p.space_type === "department" ||
          p.space_type === "dept" ||
          p.space_label?.toLowerCase().includes("département") ||
          p.space_label?.toLowerCase().includes("louange")
        );
      }

      if (activeTab === "prayer") {
        return (
          p.space_type === "prayer" ||
          p.space_type === "group" ||
          p.type === "Requête d'Intercession" ||
          p.prayerBadge === "Sujet Urgent de Prière" ||
          (p.space_label && p.space_label.toLowerCase().includes("prière")) ||
          (p.space_label && p.space_label.toLowerCase().includes("intercession"))
        );
      }

      return true;
    });
  }, [posts, activeTab]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    const targetSpace =
      activeTab === "all"
        ? "public"
        : activeTab === "assembly"
        ? "assembly"
        : activeTab === "dept"
        ? "department"
        : "group";

    const targetLabel =
      activeTab === "all"
        ? "Public • Église Nationale"
        : activeTab === "assembly"
        ? "Assemblée • Temple Tsinga"
        : activeTab === "dept"
        ? "Département • Louange & Chorale CGL"
        : "Cellule de Prière • Sentinelles d'Aurore";

    const newP: CommunityPost = {
      id: `post-${Date.now()}`,
      author: {
        name: "Fr. Jean-Claude Fossouo",
        role: "Chantre & Responsable Louange",
        assembly: "Temple Central de Tsinga",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDRQJxQWfMmJrOfY-1nMFwxPbs5ga3Fu8-6RbZ1t3CuCmcbg6JvaXcBv58ULUNkPUwTnMCXwnVwwA8myXkMuWOaz54HA96KRrnDdC50ZbIR53lMs55SLS_99ONwSLb7GurSeATRAXckkkdUuUgIbkgTwLrbByIf_whmyL62UhCEju57sbPp8TnUwEdNs6HJvFagydtublsS7t_OaMexf3uaGkXsrz2a_RPUcU7OXNE",
      },
      timestamp: "À l'instant",
      type: postType,
      space_type: activeTab,
      space_label: targetLabel,
      verseRef: postType === "Verset du Jour" ? verseRefInput : undefined,
      content: composerText,
      amensCount: 1,
      commentsCount: 0,
      hasAmened: true,
      prayerBadge: postType === "Requête d'Intercession" ? "Requête de Prière" : undefined,
    };

    setPosts([newP, ...posts]);

    // Asynchronously dispatch to live backend
    api.social
      .createPost({
        content: composerText,
        space_type: targetSpace,
        post_type:
          postType === "Verset du Jour"
            ? "verse"
            : postType === "Requête d'Intercession"
            ? "prayer"
            : "standard",
        verse_reference: verseRefInput || undefined,
      })
      .catch(() => {});

    setComposerText("");
    setVerseRefInput("");
  };

  const toggleAmen = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const hasAmened = !p.hasAmened;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
          if (isUuid) {
            if (hasAmened) {
              api.social.addReaction(postId, "amen").catch(() => {});
            } else {
              api.social.removeReaction(postId).catch(() => {});
            }
          }
          return {
            ...p,
            hasAmened,
            amensCount: hasAmened ? p.amensCount + 1 : Math.max(0, p.amensCount - 1),
          };
        }
        return p;
      })
    );
  };

  // Toggle comments section & fetch live comments if backend post
  const toggleComments = async (postId: string) => {
    const nextState = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: nextState }));

    if (nextState) {
      setTimeout(() => {
        document.getElementById(`comment-input-${postId}`)?.focus();
      }, 150);
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
    if (nextState && isUuid && (!commentsMap[postId] || commentsMap[postId].length === 0)) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await api.social.listComments(postId);
        if (res.data) {
          const rawComments = Array.isArray(res.data)
            ? res.data
            : (res.data as any).comments || (res.data as any).items || [];

          const mapped: CommentItem[] = rawComments.map((c: any) => ({
            id: c.id || `c-${Date.now()}-${Math.random()}`,
            postId,
            authorName: c.author_name || "Fidèle",
            authorRole: c.author_role || "Membre",
            authorAvatar: c.author_avatar,
            content: c.content || "",
            createdAt: c.created_at
              ? new Date(c.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "Récemment",
          }));

          setCommentsMap((prev) => ({
            ...prev,
            [postId]: mapped,
          }));
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Add new comment
  const handleAddComment = async (postId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    const user = getStoredUser();
    const authorName = user?.full_name || user?.name || "Fr. Jean-Claude Fossouo";
    const authorRole = user?.role_name || user?.role || "Chantre & Responsable Louange";
    const authorAvatar = user?.avatar_url;

    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      postId,
      authorName,
      authorRole,
      authorAvatar,
      content: text,
      createdAt: "À l'instant",
    };

    // Optimistically prepend comment
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: [newComment, ...(prev[postId] || [])],
    }));

    // Optimistically increment comment counter on post
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );

    // Clear input
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

    // Send to backend if post is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
    if (isUuid) {
      setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
      try {
        await api.social.addComment(postId, text);
      } catch {
        // UI stays updated optimistically
      } finally {
        setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Share post URL to clipboard
  const handleShare = (post: CommunityPost) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/actualites#${post.id}`).then(() => {
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2500);
      });
    }
  };

  return (
    <PortalShell hideSidebar={true} activePath="reseau-social" title="Fil Fraternel & Communauté">
      <div className="flex flex-col gap-6 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-bold">
                Koinōnia • Communion Fraternelle
              </span>
              <span className="text-xs text-on-surface-variant italic">« Un seul corps et un seul Esprit »</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-display">
              Fil Fraternel &amp; Communauté
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
              Partage d'édification, témoignages vivants, requêtes d'intercession et soutien mutuel au sein de la Mission.
            </p>
          </div>

          {/* Live Prayer Badge */}
          <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-2.5 rounded-2xl border border-surface-container shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary">
              <span className="material-symbols-outlined text-[20px]">radio</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface">Prière d'Aurore</span>
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              </div>
              <span className="text-[11px] text-on-surface-variant">05:30 - 06:30 • 324 frères en ligne</span>
            </div>
          </div>
        </div>

        {/* Space navigation pills (Boutons de filtrage dynamiques) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "Public (Tous les fidèles)", icon: "public" },
            { id: "assembly", label: "Mon Assemblée (Temple Tsinga)", icon: "church" },
            { id: "dept", label: "Mon Département (Louange CGL)", icon: "diversity_3" },
            { id: "prayer", label: "Cellules de Prière", icon: "groups" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  const feedEl = document.getElementById("communaute-feed");
                  if (feedEl) {
                    feedEl.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`h-9 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  active
                    ? "bg-primary text-on-primary shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                    : "bg-surface-container-lowest text-on-surface-variant border border-surface-container-high hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main 12-Col Desktop Multi-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: User Profile & Ministries (3 cols on xl) */}
          <div className="hidden xl:flex xl:col-span-3 flex-col gap-5 sticky top-24">
            {/* User Profile Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary font-black text-sm flex items-center justify-center ring-2 ring-primary/20">
                    JF
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-on-surface block truncate">
                    Jean-Claude Fossouo
                  </span>
                  <span className="text-[11px] text-on-surface-variant block truncate">
                    Chantre &amp; Responsable Louange
                  </span>
                  <span className="text-[10px] text-primary font-semibold block">
                    Temple Central de Tsinga
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-surface-container text-xs">
                <div className="bg-surface-container-low rounded-xl p-2">
                  <span className="text-sm font-black text-primary block">142</span>
                  <span className="text-[10px] text-on-surface-variant">Amens reçus</span>
                </div>
                <div className="bg-surface-container-low rounded-xl p-2">
                  <span className="text-sm font-black text-secondary block">18</span>
                  <span className="text-[10px] text-on-surface-variant">Intercessions</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("assembly")}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === "assembly"
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">church</span>
                  <span>Paroisse de Tsinga</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prayer")}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === "prayer"
                      ? "bg-secondary/10 text-secondary font-bold"
                      : "hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">volunteer_activism</span>
                  <span>Sentinelles d'aurore</span>
                </button>
              </div>
            </div>

            {/* Communities of Service */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Mes Fraternités
              </span>
              <div className="space-y-2 text-xs">
                <div
                  onClick={() => setActiveTab("dept")}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    activeTab === "dept"
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold truncate">Chorale Générale CGL</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-bold">48 m.</span>
                </div>
                <div
                  onClick={() => setActiveTab("prayer")}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    activeTab === "prayer"
                      ? "bg-secondary/10 border border-secondary/30"
                      : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-semibold truncate">Cellule de Prière Secteur 4</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-bold">16 m.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Feed (6 cols on xl, 8 cols on lg) */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-6 flex flex-col gap-6">
            {/* Post Composer */}
            <form
              onSubmit={handleCreatePost}
              className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-xs flex flex-col gap-4"
            >
              {/* Target Space Indicator */}
              <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="text-[11px] font-bold text-slate-500">Destination :</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    {activeTab === "all"
                      ? "Public (Tous les fidèles)"
                      : activeTab === "assembly"
                      ? "Mon Assemblée (Temple Tsinga)"
                      : activeTab === "dept"
                      ? "Mon Département (Louange CGL)"
                      : "Cellules de Prière"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {filteredPosts.length} publication(s) visible(s)
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {(["Texte & Médias", "Verset du Jour", "Requête d'Intercession", "Témoignage"] as const).map((t) => {
                  const active = postType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPostType(t)}
                      className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                        active
                          ? "bg-primary text-on-primary shadow-xs"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {t === "Verset du Jour" ? "auto_stories" : t === "Requête d'Intercession" ? "volunteer_activism" : "edit_note"}
                      </span>
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>

              {postType === "Verset du Jour" && (
                <input
                  type="text"
                  value={verseRefInput}
                  onChange={(e) => setVerseRefInput(e.target.value)}
                  placeholder="Référence biblique (ex: Psaume 23:1 ou Romains 8:28)..."
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-xs text-on-surface outline-none border border-surface-container"
                />
              )}

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-bold text-xs flex items-center justify-center shrink-0">
                  JF
                </div>
                <textarea
                  required
                  rows={3}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Partagez une bénédiction, un verset édifiant ou une requête d'intercession avec le corps du Christ..."
                  className="flex-1 p-3 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-none border border-transparent focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <button type="button" className="p-1.5 rounded-lg hover:bg-surface-container" title="Ajouter une image">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </button>
                  <button type="button" className="p-1.5 rounded-lg hover:bg-surface-container" title="Méditation audio">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                  </button>
                  <span className="text-[11px] text-on-surface-variant hidden sm:inline">
                    Modération fraternelle active
                  </span>
                </div>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-full bg-primary text-on-primary font-bold text-xs shadow-xs hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Publier dans la communion</span>
                </button>
              </div>
            </form>

            {/* Posts Feed Header & Counter */}
            <div id="communaute-feed" className="flex items-center justify-between px-2 pt-1 scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">dynamic_feed</span>
                <h2 className="text-sm font-bold text-on-surface">
                  {activeTab === "all"
                    ? "Fil Public de la Mission (Tous les fidèles)"
                    : activeTab === "assembly"
                    ? "Publications de la Paroisse (Temple Tsinga)"
                    : activeTab === "dept"
                    ? "Département (Louange & Chorale CGL)"
                    : "Chaînes des Cellules de Prière"}
                </h2>
              </div>
              <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                {filteredPosts.length} publication{filteredPosts.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Posts List (Filtered by Active Space Tab) */}
            <div className="flex flex-col gap-5">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-xs flex flex-col gap-4 animate-in fade-in duration-150"
                  >
                    {/* Post Author & Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-on-surface font-display">{post.author.name}</span>
                            {post.author.isPastor && (
                              <span className="material-symbols-outlined text-primary text-[16px]" title="Ministre ordonné">
                                verified
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-on-surface-variant block">
                            {post.author.role} • {post.author.assembly}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {post.space_label && (
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-slate-700 text-[10px] font-bold border border-surface-container-high">
                            {post.space_label}
                          </span>
                        )}
                        {post.prayerBadge && (
                          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                            {post.prayerBadge}
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant">{post.timestamp}</span>
                      </div>
                    </div>

                    {/* Verse Reference block if any */}
                    {post.verseRef && (
                      <div className="p-3 rounded-xl bg-surface-container-low border-l-4 border-primary text-xs">
                        <span className="font-bold text-primary block">{post.verseRef}</span>
                      </div>
                    )}

                    {/* Post Content */}
                    <p className="text-xs md:text-sm text-on-surface leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Post Image */}
                    {post.image && (
                      <div className="rounded-xl overflow-hidden max-h-80 shadow-xs">
                        <img src={post.image} alt="Publication" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Interaction bar */}
                    <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Amen reaction button */}
                        <button
                          type="button"
                          onClick={() => toggleAmen(post.id)}
                          className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            post.hasAmened
                              ? "bg-primary text-white shadow-xs"
                              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">favorite</span>
                          <span>Amen ! ({post.amensCount})</span>
                        </button>

                        {/* Interactive Comment toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleComments(post.id)}
                          className={`h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            openComments[post.id]
                              ? "bg-primary text-on-primary shadow-xs ring-2 ring-primary/20"
                              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                          }`}
                          title={openComments[post.id] ? "Masquer les commentaires" : "Afficher et ajouter des commentaires"}
                        >
                          <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                          <span>Commentaires ({post.commentsCount})</span>
                          <span className="material-symbols-outlined text-[14px]">
                            {openComments[post.id] ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      </div>

                      {/* Share button with feedback */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => handleShare(post)}
                          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                            copiedPostId === post.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-surface-container text-on-surface-variant"
                          }`}
                          title="Partager le lien de la publication"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {copiedPostId === post.id ? "done" : "share"}
                          </span>
                        </button>
                        {copiedPostId === post.id && (
                          <span className="absolute right-0 -top-8 px-2 py-1 rounded-md bg-inverse-surface text-inverse-on-surface text-[10px] font-bold shadow-sm whitespace-nowrap animate-fadeIn">
                            Lien copié !
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section Commentaires dépliable et interactive */}
                    {openComments[post.id] && (
                      <div className="mt-3 pt-3 border-t border-surface-container/60 flex flex-col gap-3">
                        {/* En-tête de la section */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-primary">forum</span>
                            <span>Commentaires &amp; Échanges ({post.commentsCount})</span>
                          </span>
                          <span className="text-[10px] text-on-surface-variant">Modération fraternelle active</span>
                        </div>

                        {/* Formulaire d'ajout d'un nouveau commentaire */}
                        <form
                          onSubmit={(e) => handleAddComment(post.id, e)}
                          className="flex items-center gap-2 bg-surface-container-low/70 rounded-2xl p-1.5 pl-3 border border-surface-container focus-within:border-primary transition-colors"
                        >
                          <input
                            id={`comment-input-${post.id}`}
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            placeholder="Déposer une parole d'édification, un mot fraternel ou une prière..."
                            className="flex-1 bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/70 outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!(commentInputs[post.id] || "").trim() || submittingComment[post.id]}
                            className="h-8 px-3.5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center gap-1 hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                          >
                            {submittingComment[post.id] ? (
                              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span className="material-symbols-outlined text-[14px]">send</span>
                            )}
                            <span className="hidden sm:inline">Publier</span>
                          </button>
                        </form>

                        {/* Indicateur de chargement */}
                        {loadingComments[post.id] && (
                          <div className="py-2 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                            <span className="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Chargement des commentaires...</span>
                          </div>
                        )}

                        {/* Liste des commentaires */}
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                          {(commentsMap[post.id] || []).length > 0 ? (
                            (commentsMap[post.id] || []).map((c) => (
                              <div
                                key={c.id}
                                className="flex items-start gap-2.5 bg-surface-container-lowest rounded-xl p-2.5 border border-surface-container/60 shadow-2xs"
                              >
                                <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-primary/20">
                                  {c.authorAvatar ? (
                                    <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full object-cover" />
                                  ) : (
                                    c.authorName.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-on-surface leading-none">
                                        {c.authorName}
                                      </span>
                                      {c.authorRole && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[9px] font-semibold">
                                          {c.authorRole}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant shrink-0">
                                      {c.createdAt}
                                    </span>
                                  </div>
                                  <p className="text-xs text-on-surface mt-1 leading-relaxed break-words">
                                    {c.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            !loadingComments[post.id] && (
                              <div className="text-center py-3 text-xs text-on-surface-variant italic bg-surface-container-lowest/50 rounded-xl border border-dashed border-surface-container">
                                Soyez le premier à commenter cette publication !
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl p-12 border border-surface-container text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
                  </div>
                  <h4 className="text-sm font-bold text-on-surface">Aucune publication dans cet espace</h4>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                    Soyez le premier à partager une exhortation fraternelle, une requête de prière ou un témoignage édifiant dans cet espace !
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Column (3 cols on xl, 4 cols on lg) */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-5 sticky top-24">
            {/* Verse of the month */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Thème Canonique 2025
                </span>
                <span className="material-symbols-outlined text-secondary text-[16px]">menu_book</span>
              </div>
              <p className="text-xs italic text-on-surface leading-relaxed">
                « Mais sanctifiez dans vos cœurs Christ le Seigneur, étant toujours prêts à vous défendre, avec douceur et respect, devant quiconque vous demande raison de l'espérance qui est en vous. »
              </p>
              <span className="text-xs font-bold text-primary">1 Pierre 3:15</span>
            </div>

            {/* Prayer Chain */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface font-display">Chaîne d'Intercession 24h/7</span>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse" />
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Des sentinelles se relaient jour et nuit pour la paix au Cameroun, la sainteté de l'Église et la guérison des malades.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("prayer")}
                className="w-full h-10 rounded-xl bg-surface-container text-primary font-bold text-xs hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                <span>Prendre un créneau de veille</span>
              </button>
            </div>

            {/* Urgent Intercession Requests */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface font-display">Urgences de Prière</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[10px] font-bold">
                  3 Actives
                </span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div
                  onClick={() => setActiveTab("prayer")}
                  className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container/60 space-y-1 cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">Maman Marie (Santé)</span>
                    <span className="text-[10px] text-primary font-bold">Intercession</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Opération délicate à l'Hôpital Central de Yaoundé ce matin.
                  </p>
                </div>
                <div
                  onClick={() => setActiveTab("prayer")}
                  className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container/60 space-y-1 cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">Pasteur Pionnier Garoua</span>
                    <span className="text-[10px] text-secondary font-bold">Mission</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Implantation nouvelle assemblée rurale et protection spirituelle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
