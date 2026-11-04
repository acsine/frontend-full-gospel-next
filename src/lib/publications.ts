/**
 * Module central des publications, enseignements et lettres pastorales.
 * Mission du Plein Évangile Cameroun (Full Gospel Mission Cameroon).
 */

export interface PublicationAuthor {
  name: string;
  role: string;
  initials: string;
  avatar?: string;
}

export interface Publication {
  id: string;
  type: "Lettre pastorale" | "Enseignement" | "Événement" | "Annonce";
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  views: number;
  author: PublicationAuthor;
  audioDuration?: string;
  audioUrl?: string;
  hasAudio: boolean;
  featured?: boolean;
  coverImage: string;
  tags: string[];
  referenceNumber?: string;
  biblicalVerse?: string;
  biblicalReference?: string;
  promulgationPlace?: string;
  signatoryTitle?: string;
}

export const CANONICAL_PUBLICATIONS: Publication[] = [];

/**
 * Recherche une publication par identifiant ou slug via l'API backend.
 */
export async function getPublicationById(id: string): Promise<Publication | null> {
  try {
    const { api } = await import("./api");
    const res = await api.publications.get(id);
    const rawData = res.data as any;
    const item = rawData?.publication || rawData;
    if (item && item.id) {
      const rawType = item.publication_type_label || item.publication_type || "Enseignement";
      const normType: Publication["type"] =
        rawType.toLowerCase().includes("lettre") ? "Lettre pastorale" :
        rawType.toLowerCase().includes("annonce") ? "Annonce" :
        rawType.toLowerCase().includes("événement") || rawType.toLowerCase().includes("event") ? "Événement" :
        "Enseignement";

      const rawTags = typeof item.tags === "string" ? item.tags.split(/[\s,]+/).filter(Boolean) : (Array.isArray(item.tags) ? item.tags : []);

      return {
        id: item.id,
        type: normType,
        title: item.title,
        excerpt: item.excerpt || (item.content ? item.content.slice(0, 160) + "..." : ""),
        content: item.content || item.excerpt || "",
        date: item.published_at ? new Date(item.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Récemment",
        readTime: `${item.reading_time_minutes || 5} min de lecture`,
        views: item.view_count || 0,
        author: {
          name: item.author_name || "Direction Nationale",
          role: item.author_role || "Conseil Exécutif MPEC",
          initials: (item.author_name || "DN").split(" ").map((w: string) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "DN",
          avatar: item.author_avatar || undefined,
        },
        hasAudio: !!item.has_audio,
        audioDuration: typeof item.audio_attachment === "object" && item.audio_attachment?.duration ? item.audio_attachment.duration : undefined,
        coverImage: item.cover_image_url || "/images/embleme/croix-noire.png",
        tags: rawTags,
        referenceNumber: item.reference_number || undefined,
        biblicalVerse: item.biblical_verse || undefined,
        biblicalReference: item.biblical_reference || undefined,
        promulgationPlace: item.promulgation_place || undefined,
        signatoryTitle: item.signatory_title || undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}
