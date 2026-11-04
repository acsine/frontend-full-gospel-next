"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { api } from "@/lib/api";
import { Publication } from "@/lib/publications";

export default function ArticleDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const id = rawId || "";

  const [article, setArticle] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchArticle() {
      try {
        const res = await api.publications.get(id);
        if (res && res.data && !res.error) {
          const item: any = res.data;
          setArticle({
            id: item.id || id,
            type: item.publication_type || item.type || "Enseignement",
            title: item.title,
            excerpt: item.excerpt || item.summary || "",
            content: item.content || item.body || "",
            date: item.created_at
              ? new Date(item.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Date officielle",
            readTime: item.read_time || "6 min de lecture",
            views: item.views_count || 0,
            author: {
              name: item.author_name || "Direction Nationale",
              role: item.author_role || "Conseil Exécutif MPEC",
              initials: "DN",
              avatar: item.author_avatar,
            },
            hasAudio: !!item.audio_url,
            audioUrl: item.audio_url,
            coverImage: item.cover_image || "/images/embleme/croix-noire.png",
            tags: item.tags || ["#Doctrine", "#Foi"],
            referenceNumber: item.reference_number || `MPEC/PUB-${id.slice(0, 8).toUpperCase()}`,
            biblicalVerse: item.biblical_verse,
            biblicalReference: item.biblical_reference,
            promulgationPlace: item.promulgation_place || "Siège National de Tsinga, Yaoundé",
            signatoryTitle: item.signatory_title || "Le Conseil Exécutif & Collège Pastoral",
          });
        } else {
          setArticle(null);
        }
      } catch (err) {
        setArticle(null);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [id]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-container-lowest text-on-surface">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-on-surface-variant">
              Chargement du document officiel...
            </p>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-container-lowest text-on-surface">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-error-container text-error mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <h1 className="text-xl font-bold font-display text-on-surface">
              Document non trouvé ou archivé
            </h1>
            <p className="text-sm text-on-surface-variant">
              Cette publication ou lettre pastorale n&apos;a pas pu être trouvée dans les archives canoniques.
            </p>
            <Link
              href="/publications"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Retour aux Publications</span>
            </Link>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-on-surface print:bg-white print:text-black">
      {/* Public Header (hidden in print) */}
      <div className="print:hidden">
        <PublicHeader />
      </div>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Navigation & Action Bar (Hidden in Print) */}
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/publications"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors bg-white px-3.5 py-2 rounded-xl shadow-xs border border-slate-200"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Toutes les publications</span>
          </Link>

          <div className="flex items-center gap-2">
            {article.hasAudio && (
              <button
                type="button"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border ${
                  isPlayingAudio
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-slate-700 hover:text-primary border-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isPlayingAudio ? "pause_circle" : "play_circle"}
                </span>
                <span>{isPlayingAudio ? "Pause Audio" : "Écouter l'enregistrement"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white text-slate-700 hover:text-primary border border-slate-200 shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copiedLink ? "check" : "share"}
              </span>
              <span>{copiedLink ? "Lien copié !" : "Partager"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Imprimer en Document A4</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* THE OFFICIAL DOCUMENT PAPER (DIGNIFIED LITURGICAL DOCUMENT LAYOUT) */}
        {/* ========================================================================= */}
        <article className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* Top Ecclesiastical Header Bar */}
          <div className="bg-gradient-to-r from-[#17050a] via-[#2a0815] to-[#120409] text-white p-6 sm:p-8 border-b-4 border-primary">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md border border-white/20 shrink-0 flex items-center justify-center">
                  <Image
                    src="/logo.jpg"
                    alt="Sceau officiel MPEC"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-[11px] tracking-widest font-black uppercase text-secondary-container">
                    Mission du Plein Évangile Cameroun • Full Gospel Mission
                  </div>
                  <div className="text-xs text-white/80 font-medium">
                    Fondée en 1961 à Bamenda • Décret Présidentiel N°69/DF/144
                  </div>
                  <div className="text-[10px] text-white/60 tracking-wider uppercase mt-0.5">
                    10 Régions • Districts &amp; Assemblées Territoriales
                  </div>
                </div>
              </div>

              {article.referenceNumber && (
                <div className="sm:text-right bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                  <div className="text-[10px] uppercase tracking-wider text-secondary-container font-black">
                    Réf. Officielle
                  </div>
                  <div className="font-mono text-xs font-bold text-white tracking-wider">
                    {article.referenceNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Official Motto */}
            <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-secondary-container tracking-wider font-display">
                « No Other Christ – No Other Gospel – No Other Spirit »
              </span>
              <span className="text-white/70 text-[11px]">
                {article.promulgationPlace}
              </span>
            </div>
          </div>

          {/* Document Body Padding */}
          <div className="p-6 sm:p-10 lg:p-14 space-y-8">
            {/* Meta Row: Type Badge, Date & Read Time */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {article.type}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {article.date}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>{article.readTime}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>{article.views} lectures</span>
                </span>
              </div>
            </div>

            {/* Document Main Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight font-display">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-serif italic border-l-4 border-primary pl-4">
                  {article.excerpt}
                </p>
              )}
            </div>

            {/* Biblical Verse Callout if available */}
            {article.biblicalVerse && (
              <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-800 text-[26px] shrink-0 mt-0.5">
                    auto_stories
                  </span>
                  <div>
                    <p className="text-sm sm:text-base font-serif italic text-amber-950 leading-relaxed">
                      {article.biblicalVerse}
                    </p>
                    {article.biblicalReference && (
                      <cite className="block text-xs font-bold uppercase tracking-wider text-amber-800 not-italic mt-2">
                        — {article.biblicalReference}
                      </cite>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Author Attribution Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                  {article.author.initials || "MP"}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {article.author.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {article.author.role}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Document Canonique Vérifié</span>
              </div>
            </div>

            {/* Main Document Content */}
            <div className="prose prose-slate max-w-none text-slate-800 text-base sm:text-lg leading-relaxed space-y-6 pt-2">
              {article.content.split("\n\n").map((paragraph, idx) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;

                // Section Headers (Roman numerals like I. or II.)
                if (/^[I|V|X]+\.\s/.test(trimmed)) {
                  return (
                    <h2
                      key={idx}
                      className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-4 pb-2 border-b border-slate-200 font-display flex items-center gap-2"
                    >
                      <span className="text-primary">•</span>
                      <span>{trimmed}</span>
                    </h2>
                  );
                }

                // Bullet Lists
                if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
                  const items = trimmed.split("\n").map((it) => it.replace(/^[•\-]\s*/, ""));
                  return (
                    <ul key={idx} className="list-disc list-inside space-y-2 pl-2 text-slate-700 font-normal">
                      {items.map((it, iIdx) => (
                        <li key={iIdx} className="leading-relaxed">
                          {it}
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Regular Paragraph
                return (
                  <p key={idx} className="text-justify leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Official Signatory / Visa Footer */}
            <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lieu et Date d&apos;Émission
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  Fait à {article.promulgationPlace}, le {article.date}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-right">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pour Approbation et Diffusion
                </div>
                <div className="text-xs font-black text-primary uppercase mt-1">
                  {article.signatoryTitle}
                </div>
                <div className="mt-3 flex items-center justify-center sm:justify-end gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Sceau Pastoral MPEC</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>

      {/* Public Footer (hidden in print) */}
      <div className="print:hidden">
        <PublicFooter />
      </div>
    </div>
  );
}
