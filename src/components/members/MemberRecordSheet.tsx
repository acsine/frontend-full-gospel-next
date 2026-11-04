"use client";

import React, { useState } from "react";

export interface MemberRecordData {
  id: string;
  membership_number?: string;
  matricule?: string;
  assembly_name?: string;
  assembly_city?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  profession?: string | null;
  nationality?: string | null;
  membership_date?: string | null;
  baptism_date?: string | null;
  status?: string;
  departments?: Array<{ id: string; name: string; role?: string }>;
  family_links?: Array<{ relation?: string; name?: string; phone?: string }>;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    avatar_url?: string | null;
    photo_url?: string | null;
  };
  [key: string]: any;
}

interface MemberRecordSheetProps {
  member: MemberRecordData;
  photoUrl?: string | null;
  id?: string;
  className?: string;
}

function formatFrenchDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "Non renseigné";
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

export function MemberRecordSheet({
  member,
  photoUrl,
  id = "printable-member-sheet",
  className = "",
}: MemberRecordSheetProps) {
  const [logoError, setLogoError] = useState(false);

  const firstName = member.user?.first_name || "";
  const lastName = member.user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Fidèle";
  const matricule = member.membership_number || member.matricule || `MBR-${member.id?.slice(0, 8).toUpperCase()}`;
  const assemblyName = member.assembly_name || "Assemblée Locale du Plein Évangile";

  // Calculate age
  let age: number | null = null;
  if (member.date_of_birth) {
    const birthYear = new Date(member.date_of_birth).getFullYear();
    if (!isNaN(birthYear)) age = 2026 - birthYear;
  }

  // Marital status label
  const maritalLabel =
    member.marital_status === "married" ? "Marié(e)" :
    member.marital_status === "single" ? "Célibataire" :
    member.marital_status === "widowed" ? "Veuf / Veuve" :
    member.marital_status === "divorced" ? "Divorcé(e)" :
    member.marital_status || "Non renseigné";

  // Canonical status badge
  const rawStatus = (member.status || "active").toLowerCase();
  const statusLabel =
    rawStatus.includes("cat") || rawStatus === "new" ? "Catéchumène" :
    rawStatus.includes("susp") ? "Sous discipline pastorale" :
    rawStatus.includes("trans") ? "Transféré" :
    "Membre Actif en Communion";

  const refCode = `MPEC-${(member.id || "00000000").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const todayFr = formatFrenchDate(new Date());

  const initials = `${(firstName[0] || "").toUpperCase()}${(lastName[0] || "").toUpperCase()}` || "FG";

  return (
    <div
      id={id}
      className={`printable-a4-sheet bg-white text-[#111111] shadow-2xl p-[14mm] sm:p-[18mm] mx-auto w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between font-['Helvetica',Arial,sans-serif] text-[10pt] leading-[1.45] border border-slate-200 print:shadow-none print:border-none print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      <div className="flex-1 flex flex-col space-y-4">
        {/* =================================================================== */}
        {/* 1. EN-TÊTE OFFICIEL DE L'ÉGLISE */}
        {/* =================================================================== */}
        <div className="flex items-center justify-between gap-4 pb-3">
          {/* Logo gauche */}
          <div className="w-[70px] h-[70px] shrink-0 flex items-center justify-center">
            {!logoError ? (
              <img
                src="/logo-mpec.jpg"
                alt="Logo MPEC"
                className="w-full h-full object-contain"
                onError={() => {
                  const img = document.querySelector(`img[alt="Logo MPEC"]`) as HTMLImageElement;
                  if (img && !img.src.endsWith("/logo.jpg")) {
                    img.src = "/logo.jpg";
                  } else {
                    setLogoError(true);
                  }
                }}
              />
            ) : (
              <div className="w-16 h-16 border-2 border-[#d4161a] rounded-xl flex flex-col items-center justify-center text-[#d4161a] font-bold">
                <span className="text-xl">✝</span>
                <span className="text-[9px]">MPEC</span>
              </div>
            )}
          </div>

          {/* Dénomination & Assemblée Locale */}
          <div className="flex-1 text-center sm:text-right">
            <h1 className="font-extrabold text-[12pt] sm:text-[13pt] text-[#111111] tracking-tight uppercase leading-snug">
              Mission du Plein Évangile Cameroun
            </h1>
            <p className="text-[10pt] font-semibold text-slate-700 tracking-normal">
              Full Gospel Mission Cameroon
            </p>
            <p className="text-[8.5pt] text-slate-500 italic mt-0.5">
              « Pas d'autre Christ, pas d'autre Évangile • 1961 »
            </p>
            <div className="mt-1 text-[9pt] font-bold text-[#d4161a] flex items-center justify-center sm:justify-end gap-1.5">
              <span>{assemblyName}</span>
              {member.assembly_city && <span>• {member.assembly_city}</span>}
            </div>
          </div>
        </div>

        {/* Filet rouge officiel sous l'en-tête */}
        <div className="w-full h-[2.5px] bg-[#d4161a] rounded-full" />

        {/* =================================================================== */}
        {/* 2. TITRE DU DOCUMENT & RÉFÉRENCE */}
        {/* =================================================================== */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="text-[8.5pt] font-bold uppercase tracking-wider text-[#d4161a] block">
              Document Officiel de Secrétariat Pastoral
            </span>
            <h2 className="text-[13pt] font-black text-slate-900 tracking-tight uppercase mt-0.5">
              Fiche Individuelle du Membre / Fidèle
            </h2>
          </div>
          <div className="text-center sm:text-right">
            <span className="inline-block px-3 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-[10pt] text-slate-900 shadow-xs">
              {matricule}
            </span>
            <span className="text-[8pt] text-slate-500 block mt-0.5">
              Édité le {todayFr}
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. IDENTITÉ CIVILE & PHOTO OFFICIELLE */}
        {/* =================================================================== */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Cadre Photo Officielle 35x45mm style carte */}
            <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-lg border-2 border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 shadow-xs">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-2">
                  <div className="text-2xl font-black text-slate-400 select-none">
                    {initials}
                  </div>
                  <span className="text-[7.5pt] text-slate-400 font-semibold block mt-1">
                    Photo officielle
                  </span>
                </div>
              )}
            </div>

            {/* Informations civiles */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-slate-100">
                <div>
                  <span className="text-[8pt] uppercase tracking-wider text-slate-500 font-semibold block">
                    Nom & Prénom(s)
                  </span>
                  <h3 className="text-[13pt] font-black text-slate-900 tracking-tight">
                    {fullName}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5pt] font-bold">
                  {statusLabel}
                </span>
              </div>

              {/* Grille 2 colonnes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9pt]">
                <div>
                  <span className="text-slate-500 text-[8pt] block">Sexe</span>
                  <span className="font-semibold text-slate-800">
                    {member.gender === "F" ? "Féminin (F)" : "Masculin (M)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8pt] block">Date de Naissance</span>
                  <span className="font-semibold text-slate-800">
                    {member.date_of_birth ? formatFrenchDate(member.date_of_birth) : "Non renseignée"}
                    {age !== null ? ` (${age} ans)` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8pt] block">État Matrimonial</span>
                  <span className="font-semibold text-slate-800">{maritalLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8pt] block">Nationalité</span>
                  <span className="font-semibold text-slate-800">{member.nationality || "Camerounaise"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8pt] block">Profession</span>
                  <span className="font-semibold text-slate-800">{member.profession || "Non renseignée"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[8pt] block">Téléphone / Contact</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {member.user?.phone || member.user?.whatsapp || "Non renseigné"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. PARCOURS SPIRITUEL & CANONIQUE */}
        {/* =================================================================== */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
          <h4 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-100">
            <span className="w-2 h-2 rounded-full bg-[#d4161a]" />
            <span>Parcours Spirituel & Rattachement Ecclésial</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[9pt]">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 text-[8pt] block font-medium">Assemblée de Fréquentation</span>
              <span className="font-bold text-slate-900 block mt-0.5">{assemblyName}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 text-[8pt] block font-medium">Date d'Enrôlement / Admission</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {formatFrenchDate(member.membership_date)}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 text-[8pt] block font-medium">Sacrement du Baptême d'Eau</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {member.baptism_date ? formatFrenchDate(member.baptism_date) : "Non encore baptisé (Eau)"}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 5. MINISTÈRES, DÉPARTEMENTS & ENGAGEMENT */}
        {/* =================================================================== */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
          <h4 className="text-[10pt] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-1 border-b border-slate-100">
            <span className="w-2 h-2 rounded-full bg-[#d4161a]" />
            <span>Départements & Activités au Sein de l'Assemblée</span>
          </h4>

          {member.departments && member.departments.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {member.departments.map((dept, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9pt] font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <span className="text-[#d4161a]">✦</span>
                  <span>{dept.name || (dept as any).department_name}</span>
                  {(dept.role || (dept as any).role_name) && (
                    <span className="text-slate-500 text-[8pt]">({dept.role || (dept as any).role_name})</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[9pt] text-slate-600 italic">
              Assemblée Générale • Participation régulière aux cultes d'adoration, études bibliques et réunions de prière.
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 6. CADRE D'ATTESTATION & VISA PASTORAL */}
        {/* =================================================================== */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <p className="text-[8.5pt] text-slate-700 italic leading-relaxed text-justify">
            « Nous soussigné, Pasteur Responsable d'Assemblée de la Mission du Plein Évangile Cameroun,
            certifions que le fidèle identifié ci-dessus est régulièrement inscrit(e) sur le registre
            ecclésial de notre communauté locale et jouit de la communion fraternelle selon la saine doctrine.
            La présente fiche lui est délivrée pour servir et valoir ce que de droit. »
          </p>

          <div className="grid grid-cols-2 gap-8 pt-3 text-[9pt]">
            {/* Secrétariat */}
            <div className="border-t border-slate-300 pt-2 text-center">
              <span className="font-bold text-slate-900 block text-[9.5pt]">
                Le Secrétariat de l'Assemblée
              </span>
              <span className="text-slate-500 text-[8pt] block">
                Contrôle des registres & visa
              </span>
              <div className="h-14 flex items-center justify-center text-slate-400 text-[8pt] italic">
                (Date et Visa)
              </div>
            </div>

            {/* Pasteur Responsable */}
            <div className="border-t border-slate-300 pt-2 text-center">
              <span className="font-bold text-slate-900 block text-[9.5pt]">
                Le Pasteur Responsable d'Assemblée
              </span>
              <span className="text-slate-500 text-[8pt] block">
                Signature et Cachet Officiel
              </span>
              <div className="h-14 flex items-center justify-center text-slate-400 text-[8pt] italic">
                (Cachet & Signature)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 7. PIED DE PAGE SÉCURISÉ */}
      {/* =================================================================== */}
      <div className="pt-3 border-t border-slate-200 mt-4 flex flex-col sm:flex-row items-center justify-between text-[8pt] text-slate-500 gap-1">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-bold text-slate-800">{refCode}</span>
          <span>•</span>
          <span>Matricule : {matricule}</span>
        </div>
        <div className="text-center sm:text-right">
          <span>Mission du Plein Évangile Cameroun • www.fullgospel.cm</span>
        </div>
      </div>
    </div>
  );
}

