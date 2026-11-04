"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface RecommendationLetterData {
  title?: string;
  issued_date?: string;
  pastor_name?: string;
  pastor_title?: string;
  from_assembly_name?: string;
  from_assembly_phone?: string;
  from_assembly_email?: string;
  from_assembly_city?: string;
  to_assembly_name?: string;
  member_name?: string;
  content?: string;
  status?: string;
}

export interface TransferWithLetter {
  id?: string;
  member_id?: string;
  member_name?: string;
  from_assembly_id?: string;
  from_assembly_name?: string;
  from_assembly_phone?: string;
  from_assembly_email?: string;
  from_assembly_city?: string;
  to_assembly_id?: string;
  to_assembly_name?: string;
  transfer_date?: string;
  reason?: string;
  status?: string;
  approved_by_name?: string;
  recommendation_letter?: RecommendationLetterData | string | null;
  [key: string]: any;
}

export const RECOMMENDATION_STATUSES = [
  "Recommandé sans réserve",
  "Recommandé avec suivi pastoral",
  "Recommandé avec réserve",
  "Mutation administrative",
] as const;

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export interface RecommendationLetterValues {
  member_id: string;
  member_name: string;
  from_assembly_name?: string;
  from_assembly_city?: string;
  from_assembly_phone?: string;
  from_assembly_email?: string;
  to_assembly_id: string;
  to_assembly_name: string;
  transfer_date?: string;
  reason?: string;
  pastor_name?: string;
  pastor_title?: string;
  content: string;
  status: string;
  issued_date?: string;
}

/**
 * Format french date: "1 novembre 2026"
 */
export function formatFrenchDate(dateInput?: string | Date): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Builds the recommendation_letter payload as expected by backend FastAPI
 */
export function buildRecommendationLetterPayload(values: RecommendationLetterValues) {
  const today = new Date().toISOString().split("T")[0];
  const issuedDate = values.issued_date || today;

  return {
    to_assembly_id: values.to_assembly_id,
    reason: values.reason || "Mutation pastorale",
    transfer_date: values.transfer_date || today,
    recommendation_letter: {
      title: "Lettre de Recommandation Pastorale",
      issued_date: issuedDate,
      pastor_name: values.pastor_name || "Samuel Optimise_98d246",
      pastor_title: values.pastor_title || "Pasteur Responsable d’Assemblée",
      from_assembly_name: values.from_assembly_name || "Assemblée Béthel de Yaoundé",
      to_assembly_name: values.to_assembly_name || "Assemblée Grace Divine",
      member_name: values.member_name || "Fidèle",
      content: values.content,
      status: values.status || "Recommandé sans réserve",
    },
  };
}

/**
 * Export element to PDF via jsPDF and html2canvas
 */
export async function downloadRecommendationLetterPdf(
  elementId: string,
  filename = "Lettre_Recommandation_Pastorale.pdf"
) {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`FULLGOPE: Élément #${elementId} introuvable pour téléchargement PDF.`);
    return;
  }

  const html2canvas = (await import("html2canvas")).default;
  const jsPDF = (await import("jspdf")).default;

  const canvas = await html2canvas(element, {
    scale: 2.2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, 297));
  pdf.save(filename);
}

interface RecommendationLetterProps {
  transfer: TransferWithLetter;
  id?: string;
  className?: string;
}

/**
 * Standard A4 Pastoral Recommendation Letter Component
 */
export default function RecommendationLetter({
  transfer,
  id = "printable-recommendation-letter",
  className = "",
}: RecommendationLetterProps) {
  const [logoError, setLogoError] = useState(false);

  // Extract letter data
  const rawLetter = transfer.recommendation_letter;
  let letterObj: RecommendationLetterData = {};

  if (typeof rawLetter === "object" && rawLetter !== null) {
    letterObj = rawLetter;
  } else if (typeof rawLetter === "string" && rawLetter.trim()) {
    try {
      letterObj = JSON.parse(rawLetter);
    } catch {
      letterObj = { content: rawLetter };
    }
  }

  // Identity and Church info
  const memberName = letterObj.member_name || transfer.member_name || "Super Administrateur";
  const fromAssembly = letterObj.from_assembly_name || transfer.from_assembly_name || "Assemblée Béthel de Yaoundé";
  const toAssembly = letterObj.to_assembly_name || transfer.to_assembly_name || "Assemblée Grace Divine";
  
  const pastorName = letterObj.pastor_name || transfer.approved_by_name || "Samuel Optimise_98d246";
  const pastorTitle = letterObj.pastor_title || "Pasteur Responsable d’Assemblée";
  const pastorUpper = pastorName.toUpperCase();

  const pastorPhone = letterObj.from_assembly_phone || transfer.from_assembly_phone || "Tél. +237 6XX XX XX XX";
  const pastorEmail = letterObj.from_assembly_email || transfer.from_assembly_email || "contact@exemple.org";
  const city = letterObj.from_assembly_city || transfer.from_assembly_city || "Yaoundé";

  // Dates
  const transferDateRaw = transfer.transfer_date || letterObj.issued_date || "2026-11-01";
  const transferDateFr = formatFrenchDate(transferDateRaw);

  const issuedDateRaw = letterObj.issued_date || transferDateRaw;
  const issuedDateFr = formatFrenchDate(issuedDateRaw);

  const reason = transfer.reason || "Mutation professionnelle à Yaoundé";
  const status = letterObj.status || "Recommandé sans réserve";

  // Free text paragraphs split by \n\n
  const rawContent =
    letterObj.content ||
    "Le frère a fidèlement servi dans notre assemblée comme diacre et membre de la chorale. Il est de bonne moralité, baptisé du Saint-Esprit et engagé. Nous le recommandons avec joie.";

  const contentParagraphs = rawContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Reference Code (REF- + 8 first chars of transfer ID)
  const cleanId = (transfer.id || "e555a5a8").replace(/-/g, "").slice(0, 8).toUpperCase();
  const refCode = `REF-${cleanId}`;
  const generatedDateFr = formatFrenchDate(new Date());

  return (
    <div
      id={id}
      className={`printable-a4-sheet bg-white text-[#111111] shadow-2xl p-[16mm] sm:p-[20mm] mx-auto w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between font-['Helvetica',Arial,sans-serif] text-[11pt] leading-[1.5] border border-slate-200 print:shadow-none print:border-none print:p-0 ${className}`}
      style={{
        boxSizing: "border-box",
      }}
    >
      <div className="flex-1 flex flex-col">
        {/* =================================================================== */}
        {/* EN-TÊTE OFFICIEL */}
        {/* =================================================================== */}
        <div className="flex items-start justify-between gap-4">
          {/* Logo gauche */}
          <div className="w-[72px] h-[72px] shrink-0 flex items-center justify-center relative">
            {!logoError ? (
              <img
                src="/logo-mpec.jpg"
                alt="Logo Mission du Plein Évangile"
                className="w-full h-full object-contain"
                onError={() => {
                  // Fallback to /logo.jpg if logo-mpec.jpg fails
                  const img = document.querySelector(`img[alt="Logo Mission du Plein Évangile"]`) as HTMLImageElement;
                  if (img && !img.src.endsWith("/logo.jpg")) {
                    img.src = "/logo.jpg";
                  } else {
                    setLogoError(true);
                  }
                }}
              />
            ) : (
              <div className="w-16 h-16 border border-slate-300 rounded flex flex-col items-center justify-center text-primary text-[10px] font-bold">
                <span className="text-xl">✝</span>
                <span>MPEC</span>
              </div>
            )}
          </div>

          {/* Section droite : Pasteur | MPEC & Assemblée */}
          <div className="flex items-center">
            {/* Colonne Pasteur */}
            <div className="text-right">
              <div className="font-bold text-[11pt] tracking-tight text-black">
                {pastorUpper}
              </div>
              <div className="text-[9.5pt] text-[#222222]">
                {pastorTitle}
              </div>
            </div>

            {/* Barre verticale noire */}
            <div className="w-[2.5px] h-12 bg-black mx-4 self-stretch shrink-0" />

            {/* Colonne Assemblée */}
            <div className="text-left text-[9.5pt] text-[#222222] leading-[1.3]">
              <div className="font-bold text-black text-[10pt]">MPEC</div>
              <div className="font-bold text-black">{fromAssembly}</div>
              <div>{pastorPhone}</div>
              <div>{pastorEmail}</div>
            </div>
          </div>
        </div>

        {/* Filet rouge #d4161a sous l'en-tête */}
        <div className="w-full h-[2px] bg-[#d4161a] mt-4 mb-7" />

        {/* =================================================================== */}
        {/* CORPS DE LA LETTRE */}
        {/* =================================================================== */}
        {/* Date à droite */}
        <div className="text-right text-[11pt] text-[#111111] mb-6">
          {city}, le {issuedDateFr}
        </div>

        {/* Destinataire */}
        <div className="text-left text-[11pt] text-[#111111] mb-6">
          <div>À l’attention du Pasteur responsable de</div>
          <div className="font-bold">{toAssembly}</div>
        </div>

        {/* Titre centré en majuscules rouges */}
        <div className="text-center my-4">
          <h1 className="text-[#d4161a] font-bold text-[13.5pt] sm:text-[14pt] tracking-wide uppercase font-['Helvetica',Arial,sans-serif]">
            LETTRE DE RECOMMANDATION PASTORALE
          </h1>
        </div>

        {/* Objet */}
        <div className="text-left text-[11pt] text-[#111111] mb-5">
          <span className="font-bold">Objet : </span>
          recommandation de {memberName} – transfert d’assemblée
        </div>

        {/* Salutation */}
        <div className="text-left text-[11pt] text-[#111111] mb-4">
          Chers frères et sœurs en Christ,
        </div>

        {/* Paragraphe d'attestation */}
        <p className="text-justify text-[11pt] leading-[1.5] text-[#111111] mb-4">
          Par la présente, l’<strong>{fromAssembly}</strong> atteste que <strong>{memberName}</strong> est membre de notre assemblée et que son transfert vers l’<strong>{toAssembly}</strong> a été approuvé, avec effet au {transferDateFr}, pour le motif suivant : {reason}.
        </p>

        {/* Paragraphes de contenu (champ content découpé par \n\n) */}
        {contentParagraphs.map((para, idx) => (
          <p key={idx} className="text-justify text-[11pt] leading-[1.5] text-[#111111] mb-4">
            {para}
          </p>
        ))}

        {/* Encadré Appréciation pastorale */}
        <div className="my-4 p-3.5 bg-[#fbf5f5] rounded-lg border border-[#f3dada] text-[11pt] text-[#111111]">
          <span className="font-bold">Appréciation pastorale : </span>
          <span>{status}</span>
        </div>

        {/* Phrase de clôture */}
        <p className="text-justify text-[11pt] leading-[1.5] text-[#111111] mb-5">
          Nous vous le confions dans la prière et vous remercions de l’accueillir fraternellement. Que le Seigneur bénisse votre assemblée et fasse avancer son œuvre au milieu de vous.
        </p>

        {/* Formule de politesse */}
        <div className="text-left text-[11pt] text-[#111111] mb-4">
          Fraternellement en Christ,
        </div>

        {/* Espace de signature et cachet */}
        <div className="min-h-[55px] sm:min-h-[65px]" />

        {/* Nom, titre et assemblée du pasteur */}
        <div className="text-left text-[11pt] text-[#111111] space-y-0.5">
          <div className="font-bold text-black">{pastorName}</div>
          <div className="text-[#333333] text-[10pt]">{pastorTitle}</div>
          <div className="text-[#333333] text-[10pt]">{fromAssembly}</div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* PIED DE PAGE : Réf + Date de génération */}
      {/* =================================================================== */}
      <div className="pt-6 mt-8 border-t border-slate-200/60 flex items-center justify-between text-[#888888] text-[9pt] font-['Helvetica',Arial,sans-serif]">
        <span>{refCode}</span>
        <span>Document généré le {generatedDateFr}</span>
      </div>
    </div>
  );
}

