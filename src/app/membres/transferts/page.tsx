"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import RecommendationLetter, {
  TransferWithLetter,
  RecommendationLetterValues,
  RECOMMENDATION_STATUSES,
  buildRecommendationLetterPayload,
  downloadRecommendationLetterPdf,
  formatFrenchDate,
} from "@/components/members/RecommendationLetter";

// Clean inline SVGs
const SvgIcons = {
  ChevronRight: () => (
    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Printer: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Block: () => (
    <svg className="w-5 h-5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  DoneAll: () => (
    <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m2 12 5 5L18 6" />
      <path d="m12 12 5 5L22 10" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

export default function TransfertsPage() {
  const { alert } = useConfirm();
  const [transfers, setTransfers] = useState<TransferWithLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<"Tous" | "pending" | "approved" | "rejected">("Tous");
  const [selectedTransfer, setSelectedTransfer] = useState<TransferWithLetter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Studio / Modal: Creation of new transfer with live recommendation letter preview
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [availableAssemblies, setAvailableAssemblies] = useState<any[]>([]);

  // Form values for new transfer & letter
  const [formMemberId, setFormMemberId] = useState("");
  const [formToAssemblyId, setFormToAssemblyId] = useState("");
  const [formTransferDate, setFormTransferDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formReason, setFormReason] = useState("Mutation professionnelle");
  const [formStatus, setFormStatus] = useState<string>("Recommandé sans réserve");
  const [formPastorName, setFormPastorName] = useState(() => {
    const user = getStoredUser();
    return user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.name || "" : "";
  });
  const [formPastorTitle, setFormPastorTitle] = useState("Pasteur Responsable d'Assemblée");
  const [formContent, setFormContent] = useState(
    "Le fidèle a fidèlement servi dans notre assemblée locale. Il est de bonne moralité et engagé dans la vie fraternelle. Nous le recommandons avec joie."
  );

  const [submittingStudio, setSubmittingStudio] = useState(false);
  const [studioFeedback, setStudioFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  // Decision modal state (for approving/rejecting existing transfers)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<"approve" | "reject">("approve");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionLetter, setDecisionLetter] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  // Fetch transfers from backend
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.members.listTransfers();
      const raw = (res.data as any)?.transfers || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
      setTransfers(raw);
      if (raw.length > 0 && !selectedTransfer) {
        setSelectedTransfer(raw[0]);
      } else if (selectedTransfer) {
        const updated = raw.find((t: any) => t.id === selectedTransfer.id);
        if (updated) setSelectedTransfer(updated);
      }
    } catch (err) {
      console.error("FULLGOPE: Erreur chargement transferts", err);
    } finally {
      setLoading(false);
    }
  };

  // Load members and assemblies
  const loadPrerequisites = async () => {
    try {
      const [membersRes, assRes] = await Promise.all([
        api.members.list({ limit: 100 }),
        api.organizations.listAssemblies({ limit: 100 }),
      ]);

      const mList = (membersRes.data as any)?.members || (membersRes.data as any)?.items || [];
      const aList = (assRes.data as any)?.assemblies || (assRes.data as any)?.items || [];

      setAvailableMembers(mList);
      setAvailableAssemblies(aList);

      if (mList.length > 0 && !formMemberId) {
        setFormMemberId(mList[0].id);
      }
      if (aList.length > 0 && !formToAssemblyId) {
        setFormToAssemblyId(aList[0].id);
      }
    } catch (err) {
      console.error("FULLGOPE: Erreur chargement prérequis", err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    loadPrerequisites();
  }, []);

  // Compute live preview transfer object for Studio
  const selectedMemberObj = availableMembers.find((m: any) => m.id === formMemberId);
  const selectedToAssObj = availableAssemblies.find((a: any) => a.id === formToAssemblyId);

  const previewMemberName = selectedMemberObj
    ? `${selectedMemberObj.first_name || selectedMemberObj.user?.first_name || ""} ${selectedMemberObj.last_name || selectedMemberObj.user?.last_name || ""}`.trim() || "Super Administrateur"
    : "Super Administrateur";

  const previewFromAssembly = selectedMemberObj?.assembly_name || "Assemblée Béthel de Yaoundé";
  const previewToAssembly = selectedToAssObj?.name || "Assemblée Grace Divine";

  const previewTransfer: TransferWithLetter = {
    id: "REF-PREVIEW",
    member_id: formMemberId || "preview-id",
    member_name: previewMemberName,
    from_assembly_name: previewFromAssembly,
    from_assembly_city: selectedMemberObj?.city || "Yaoundé",
    from_assembly_phone: "Tél. +237 6XX XX XX XX",
    from_assembly_email: "contact@exemple.org",
    to_assembly_name: previewToAssembly,
    transfer_date: formTransferDate,
    reason: formReason,
    status: "approved",
    recommendation_letter: {
      title: "Lettre de Recommandation Pastorale",
      issued_date: formTransferDate,
      pastor_name: formPastorName,
      pastor_title: formPastorTitle,
      from_assembly_name: previewFromAssembly,
      from_assembly_city: "Yaoundé",
      from_assembly_phone: "Tél. +237 6XX XX XX XX",
      from_assembly_email: "contact@exemple.org",
      to_assembly_name: previewToAssembly,
      member_name: previewMemberName,
      content: formContent,
      status: formStatus,
    },
  };

  // PDF Download Handler
  const handleDownloadPdf = async (targetId: string, filename: string) => {
    setPdfDownloading(true);
    try {
      await downloadRecommendationLetterPdf(targetId, filename);
    } catch (err) {
      console.error("Erreur téléchargement PDF :", err);
      alert({
        title: "Erreur de génération",
        message: "Une erreur est survenue lors de la génération du document PDF.",
        variant: "danger",
      });
    } finally {
      setPdfDownloading(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Submit Studio (Create Transfer & Save Recommendation Letter)
  const handleStudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId || !formToAssemblyId) {
      setStudioFeedback({ type: "error", message: "Veuillez sélectionner un fidèle et une assemblée de destination." });
      return;
    }

    setSubmittingStudio(true);
    setStudioFeedback(null);

    const letterValues: RecommendationLetterValues = {
      member_id: formMemberId,
      member_name: previewMemberName,
      from_assembly_name: previewFromAssembly,
      from_assembly_city: "Yaoundé",
      to_assembly_id: formToAssemblyId,
      to_assembly_name: previewToAssembly,
      transfer_date: formTransferDate,
      reason: formReason,
      pastor_name: formPastorName,
      pastor_title: formPastorTitle,
      content: formContent,
      status: formStatus,
      issued_date: formTransferDate,
    };

    const payload = buildRecommendationLetterPayload(letterValues);

    try {
      // 1. Create transfer in backend
      const res = await api.members.requestTransfer(formMemberId, {
        to_assembly_id: payload.to_assembly_id,
        reason: payload.reason,
        transfer_date: payload.transfer_date,
      });

      if (res.error) {
        const errMsg = res.message || "Impossible de créer la demande de transfert.";
        showToast(errMsg, "error");
        setStudioFeedback({
          type: "error",
          message: errMsg,
        });
        return;
      }

      const created = (res.data as any)?.transfer;
      if (created?.id) {
        // 2. Decide and attach the recommendation letter
        await api.members.decideTransfer(created.id, {
          approved: true,
          reason: payload.reason,
          recommendation_letter: payload.recommendation_letter.content,
        });
      }

      showToast("Lettre de recommandation pastorale et transfert enregistrés avec succès !", "success");
      setStudioFeedback({
        type: "success",
        message: "Lettre de recommandation pastorale et transfert enregistrés avec succès !",
      });

      await fetchTransfers();
      if (created) {
        setSelectedTransfer(created);
      }

      setTimeout(() => {
        setIsStudioOpen(false);
        setStudioFeedback(null);
      }, 1400);
    } catch (err: any) {
      const errMsg = `Erreur réseau : ${err?.message || "Échec de l'enregistrement."}`;
      showToast(errMsg, "error");
      setStudioFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setSubmittingStudio(false);
    }
  };

  // Submit Decision for existing transfer
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer || !selectedTransfer.id) return;
    setSubmittingDecision(true);
    setDecisionFeedback(null);

    const approved = decisionAction === "approve";

    try {
      const res = await api.members.decideTransfer(selectedTransfer.id, {
        approved,
        reason: decisionReason || (approved ? "Visa canonique accordé" : "Refus canonique"),
        recommendation_letter: decisionLetter || "Le frère a fidèlement servi dans notre assemblée comme diacre et membre de la chorale. Il est de bonne moralité, baptisé du Saint-Esprit et engagé. Nous le recommandons avec joie.",
      });

      if (res.error) {
        const errMsg = res.message || "Impossible d'enregistrer la décision.";
        showToast(errMsg, "error");
        setDecisionFeedback(`Erreur : ${errMsg}`);
      } else {
        const successMsg = approved
          ? `Le transfert a été approuvé avec visa officiel. La lettre de recommandation est prête.`
          : `Le transfert a été refusé avec mention transmise à l'assemblée d'origine.`;
        showToast(successMsg, "success");
        setDecisionFeedback(successMsg);
        setTimeout(() => {
          setIsDecisionModalOpen(false);
          setDecisionFeedback(null);
          setDecisionReason("");
          setDecisionLetter("");
          fetchTransfers();
        }, 1500);
      }
    } catch (err: any) {
      const errMsg = `Erreur réseau : ${err?.message}`;
      showToast(errMsg, "error");
      setDecisionFeedback(errMsg);
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Filter transfers
  const filteredTransfers = transfers.filter((trf) => {
    if (selectedStatus !== "Tous" && trf.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (trf.member_name || "").toLowerCase().includes(q);
      const matchFrom = (trf.from_assembly_name || "").toLowerCase().includes(q);
      const matchTo = (trf.to_assembly_name || "").toLowerCase().includes(q);
      const matchReason = (trf.reason || "").toLowerCase().includes(q);
      if (!matchName && !matchFrom && !matchTo && !matchReason) return false;
    }
    return true;
  });

  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const approvedCount = transfers.filter((t) => t.status === "approved").length;
  const rejectedCount = transfers.filter((t) => t.status === "rejected").length;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return { label: "Approuvé", cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" };
      case "rejected":
        return { label: "Refusé", cls: "bg-rose-50 text-rose-800 border-rose-300 font-bold" };
      default:
        return { label: "En attente", cls: "bg-amber-50 text-amber-800 border-amber-300 font-bold" };
    }
  };

  return (
    <PortalShell activePath="membres" title="Gestion des Transferts">
      <div className="flex flex-col gap-6 w-full pb-16">
        {/* Toast Notification Flottante */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[9999] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top duration-200 ${
              toast.type === "error"
                ? "bg-rose-950 text-rose-100 border-rose-800"
                : toast.type === "success"
                ? "bg-emerald-950 text-emerald-100 border-emerald-800"
                : "bg-inverse-surface text-inverse-on-surface border-inverse-on-surface/20"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                toast.type === "error" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            <div className="flex flex-col max-w-md">
              <span className="font-bold text-xs uppercase tracking-wide">
                {toast.type === "error" ? "Erreur de validation" : "Confirmation"}
              </span>
              <span className="text-xs font-medium leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-white/70 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/membres" className="text-xs text-on-surface-variant hover:text-primary">
                Annuaire Membres
              </Link>
              <SvgIcons.ChevronRight />
              <span className="text-xs font-bold text-primary">Transferts &amp; Mutations Pastorales</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                Gestion des Transferts &amp; Lettres de Recommandation
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Format Canonique MPEC
              </span>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Génération des lettres officielles de recommandation pastorale au format A4 pour les mouvements inter-assemblées.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Can permission="can:create_transfer" minRole={4}>
              <button
                type="button"
                onClick={() => {
                  setStudioFeedback(null);
                  setIsStudioOpen(true);
                }}
                className="h-10 px-4 rounded-xl bg-primary hover:brightness-110 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <SvgIcons.Plus />
                <span>Rédiger une Lettre &amp; Créer un Transfert</span>
              </button>
            </Can>
            <Link
              href="/membres"
              className="h-10 px-4 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-bold border border-surface-container-high/60 flex items-center gap-2 transition-all"
            >
              <span>Annuaire Membres</span>
            </Link>
          </div>
        </div>

        {/* 3 Live KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <SvgIcons.Clock />
              </div>
              <div>
                <span className="text-2xl font-black text-on-surface block font-mono">
                  {loading ? "..." : pendingCount}
                </span>
                <span className="text-xs text-on-surface-variant">En attente de visa</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
              Instruction
            </span>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <SvgIcons.CheckCircle />
              </div>
              <div>
                <span className="text-2xl font-black text-on-surface block font-mono">
                  {loading ? "..." : approvedCount}
                </span>
                <span className="text-xs text-on-surface-variant">Approuvés canoniquement</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
              Lettres prêtes
            </span>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high/60 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <SvgIcons.Block />
              </div>
              <div>
                <span className="text-2xl font-black text-on-surface block font-mono">
                  {loading ? "..." : rejectedCount}
                </span>
                <span className="text-xs text-on-surface-variant">Refusés ou suspendus</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
              Contrôle
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-surface-container-lowest p-3 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { id: "Tous", label: `Tous les transferts (${transfers.length})` },
              { id: "approved", label: `Approuvés (${approvedCount})` },
              { id: "pending", label: `En attente (${pendingCount})` },
              { id: "rejected", label: `Refusés (${rejectedCount})` },
            ].map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id as any)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              <SvgIcons.Search />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher fidèle, assemblée, motif..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low text-xs text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-transparent font-medium"
            />
          </div>
        </div>

        {/* Main Grid: List of Transfers (Left) + A4 Sheet Recommendation Letter (Right) */}
        {loading ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center border border-surface-container-high/60">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-on-surface-variant">Chargement des transferts en base de données...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center border border-surface-container-high/60 space-y-3">
            <p className="text-base font-bold text-on-surface">Aucun transfert dans cette catégorie</p>
            <p className="text-xs text-on-surface-variant">Vous pouvez rédiger une lettre et créer une demande de transfert à tout moment.</p>
            <Can permission="can:create_transfer" minRole={4}>
              <button
                type="button"
                onClick={() => setIsStudioOpen(true)}
                className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <SvgIcons.Plus />
                <span>Créer une mutation avec lettre pastorale</span>
              </button>
            </Can>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (5 cols): Transfers List */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Dossiers de Transfert ({filteredTransfers.length})
                </span>
              </div>

              {filteredTransfers.map((trf) => {
                const isSelected = selectedTransfer?.id === trf.id;
                const badge = getStatusBadge(trf.status);
                const initials = (trf.member_name || "Membre")
                  .split(" ")
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={trf.id}
                    onClick={() => setSelectedTransfer(trf)}
                    className={`p-4 rounded-2xl bg-surface-container-lowest border shadow-xs cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/2"
                        : "border-surface-container-high/60 hover:border-surface-container-highest"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 border border-primary/20">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-on-surface font-display">{trf.member_name || "Fidèle"}</h3>
                          <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <SvgIcons.Briefcase />
                            <span>{trf.reason || "Mutation pastorale"}</span>
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="my-2.5 p-2 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 text-xs border border-surface-container-high/40">
                      <span className="font-semibold text-on-surface truncate text-[11px]">{trf.from_assembly_name || "Départ"}</span>
                      <span className="text-primary shrink-0 font-bold">➔</span>
                      <span className="font-semibold text-on-surface truncate text-[11px] text-right">{trf.to_assembly_name || "Accueil"}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-2 border-t border-surface-container-high/40">
                      <span>Effet : {trf.transfer_date ? formatFrenchDate(trf.transfer_date) : "Récent"}</span>
                      <span className="text-primary font-bold flex items-center gap-1">
                        <SvgIcons.FileText />
                        <span>Lettre A4</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column (7 cols): Full Recommendation Letter Sheet & Controls */}
            {selectedTransfer && (
              <div className="lg:col-span-7 flex flex-col gap-4 sticky top-20">
                {/* Action Bar */}
                <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface">
                      Lettre Pastorale : <strong className="text-primary">{selectedTransfer.member_name}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedTransfer.status).cls}`}>
                      {getStatusBadge(selectedTransfer.status).label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadPdf(
                          "selected-transfer-letter",
                          `Lettre_Recommandation_${(selectedTransfer.member_name || "Membre").replace(/\s+/g, "_")}.pdf`
                        )
                      }
                      disabled={pdfDownloading}
                      className="h-9 px-3.5 rounded-xl bg-primary hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      <SvgIcons.Download />
                      <span>{pdfDownloading ? "Génération PDF..." : "Télécharger en PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="h-9 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="Imprimer directement la feuille A4"
                    >
                      <SvgIcons.Printer />
                      <span>Imprimer</span>
                    </button>

                    {selectedTransfer.status === "pending" && (
                      <Can permission="can:approve_transfer" minRole={4}>
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionAction("approve");
                            setDecisionReason("Visa canonique accordé");
                            setDecisionLetter(
                              "Le frère a fidèlement servi dans notre assemblée comme diacre et membre de la chorale. Il est de bonne moralité, baptisé du Saint-Esprit et engagé. Nous le recommandons avec joie."
                            );
                            setIsDecisionModalOpen(true);
                          }}
                          className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                        >
                          <SvgIcons.CheckCircle />
                          <span>Viser</span>
                        </button>
                      </Can>
                    )}
                  </div>
                </div>

                {/* The Canonical Recommendation Letter A4 Sheet */}
                <div className="overflow-x-auto pb-4">
                  <RecommendationLetter
                    transfer={selectedTransfer}
                    id="selected-transfer-letter"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* STUDIO MODAL: CREATION AVEC APERÇU EN DIRECT (LIVE PREVIEW) */}
        {/* =================================================================== */}
        {isStudioOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-[96vw] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
              {/* Studio Topbar */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#d4161a] text-white flex items-center justify-center font-bold">
                    <SvgIcons.FileText />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm sm:text-base">
                      Rédaction de Lettre de Recommandation &amp; Création de Transfert
                    </h2>
                    <p className="text-[11px] text-slate-300">
                      L'aperçu de la lettre pastorale A4 se met à jour en direct lors de la saisie
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadPdf(
                        "live-preview-letter",
                        `Lettre_Recommandation_${previewMemberName.replace(/\s+/g, "_")}.pdf`
                      )
                    }
                    disabled={pdfDownloading}
                    className="h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <SvgIcons.Download />
                    <span>{pdfDownloading ? "PDF..." : "Télécharger en PDF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <SvgIcons.Printer />
                    <span className="hidden sm:inline">Imprimer A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStudioOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-1"
                  >
                    <SvgIcons.Close />
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {studioFeedback && (
                <div
                  className={`p-3 text-xs font-semibold shrink-0 ${
                    studioFeedback.type === "error"
                      ? "bg-rose-50 text-rose-800 border-b border-rose-200"
                      : "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                  }`}
                >
                  {studioFeedback.message}
                </div>
              )}

              {/* Studio Body: Split View (Form on Left, Live Sheet on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* Left Column (5 cols): Live Form */}
                <div className="lg:col-span-5 p-5 bg-slate-50 border-r border-slate-200 overflow-y-auto space-y-4 text-xs">
                  <form onSubmit={handleStudioSubmit} id="studio-form" className="space-y-4">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                      <span className="font-bold text-slate-900 block text-xs border-b pb-1.5">
                        1. Identification &amp; Destination
                      </span>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Fidèle concerné <span className="text-[#d4161a]">*</span> :
                        </label>
                        <select
                          value={formMemberId}
                          onChange={(e) => setFormMemberId(e.target.value)}
                          required
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                        >
                          <option value="">-- Choisir un fidèle --</option>
                          {availableMembers.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.first_name || m.user?.first_name} {m.last_name || m.user?.last_name} ({m.membership_number || "Fidèle"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Assemblée d'accueil (destination) <span className="text-[#d4161a]">*</span> :
                        </label>
                        <select
                          value={formToAssemblyId}
                          onChange={(e) => setFormToAssemblyId(e.target.value)}
                          required
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                        >
                          <option value="">-- Choisir l'assemblée d'accueil --</option>
                          {availableAssemblies.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.city || "Cameroun"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Date d'effet :</label>
                          <input
                            type="date"
                            value={formTransferDate}
                            max={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setFormTransferDate(e.target.value)}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5">La date ne peut pas être située dans le futur</span>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Statut d'évaluation :</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value)}
                            className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                          >
                            {RECOMMENDATION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Motif canonique du transfert :</label>
                        <input
                          type="text"
                          value={formReason}
                          onChange={(e) => setFormReason(e.target.value)}
                          placeholder="ex: Mutation professionnelle à Yaoundé"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                      <span className="font-bold text-slate-900 block text-xs border-b pb-1.5">
                        2. Pasteur Signataire
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Nom du Pasteur :</label>
                          <input
                            type="text"
                            value={formPastorName}
                            onChange={(e) => setFormPastorName(e.target.value)}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Titre ecclésial :</label>
                          <input
                            type="text"
                            value={formPastorTitle}
                            onChange={(e) => setFormPastorTitle(e.target.value)}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-900 block text-xs">
                          3. Témoignage &amp; Recommandation Pastorale :
                        </label>
                        <span className="text-[10px] text-slate-500 italic">(\n\n = nouveau paragraphe)</span>
                      </div>
                      <textarea
                        rows={5}
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="Saisissez le témoignage spirituel du fidèle..."
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 resize-none font-medium leading-relaxed"
                        required
                      />
                      <span className="text-[10px] text-slate-500 block">
                        Chaque saut de ligne double forme un paragraphe distinct dans la feuille officielle A4.
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submittingStudio}
                        className="w-full h-11 rounded-xl bg-primary hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        {submittingStudio ? "Enregistrement en cours..." : "Valider & Enregistrer la Recommandation"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column (7 cols): Live A4 Sheet Preview */}
                <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-200/80 overflow-y-auto flex justify-center items-start">
                  <div className="w-full max-w-[210mm]">
                    <div className="mb-2 text-center text-xs font-semibold text-slate-600">
                      Aperçu de la feuille A4 (Mise à jour en temps réel)
                    </div>
                    <RecommendationLetter
                      transfer={previewTransfer}
                      id="live-preview-letter"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* DECISION MODAL (FOR APPROVING / REJECTING TRANSFERS) */}
        {/* =================================================================== */}
        {isDecisionModalOpen && selectedTransfer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  {decisionAction === "approve" ? <SvgIcons.CheckCircle /> : <SvgIcons.Block />}
                  <span>
                    {decisionAction === "approve"
                      ? "Approbation pastorale du transfert"
                      : "Refus du dossier de transfert"}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <SvgIcons.Close />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Membre : <strong className="text-slate-900">{selectedTransfer.member_name}</strong> | Destination : <strong className="text-slate-900">{selectedTransfer.to_assembly_name}</strong>
              </p>

              {decisionFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${decisionFeedback.startsWith('Erreur') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {decisionFeedback}
                </div>
              )}

              <form onSubmit={handleDecisionSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    {decisionAction === "approve" ? "Note d'accueil pastorale :" : "Motif canonique du refus :"}
                  </label>
                  <textarea
                    rows={2}
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Visa canonique accordé..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Contenu de la lettre de recommandation :</label>
                  <textarea
                    rows={3}
                    value={decisionLetter}
                    onChange={(e) => setDecisionLetter(e.target.value)}
                    placeholder="Témoignage spirituel et recommandation officielle..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDecisionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDecision}
                    className={`px-4 py-2 rounded-xl text-white font-bold transition-all disabled:opacity-50 ${
                      decisionAction === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {submittingDecision ? "Traitement..." : decisionAction === "approve" ? "Valider le visa officiel" : "Confirmer le refus"}
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
