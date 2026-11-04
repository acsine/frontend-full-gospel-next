"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { MemberRecordSheet } from "@/components/members/MemberRecordSheet";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AlertBanner } from "@/components/ui/AlertBanner";

interface MemberData {
  id: string;
  user_id?: string;
  assembly_id?: string;
  assembly_name?: string;
  membership_number?: string;
  matricule?: string;
  photo_url?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  profession?: string | null;
  nationality?: string | null;
  membership_date?: string | null;
  baptism_date?: string | null;
  status?: string;
  data_consent?: boolean;
  family_links?: Array<{ relation?: string; name?: string; phone?: string }>;
  departments?: Array<{ id: string; name: string; role?: string }>;
  user?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    avatar_url?: string | null;
    photo_url?: string | null;
  };
  created_at?: string;
}

// Clean inline SVGs
const SvgIcons = {
  Home: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  ArrowBack: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Copy: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Church: () => (
    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M10 4h4"/>
      <path d="m18 8-6-4-6 4v14h12V8Z"/>
      <path d="M10 22v-6h4v6"/>
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Print: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect width="12" height="8" x="6" y="14"/>
    </svg>
  ),
  Transfer: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 3 21 3 21 8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  ),
  EditStatus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Water: () => (
    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  Flame: () => (
    <svg className="w-5 h-5 text-[#c8102e]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-.5 2.5-2.5 4.5-4 7-1.5 2.5-2 5-1 7.5 1.2 3 4.2 4.5 7 4.5s5.8-1.5 7-4.5c1-2.5.5-5-1-7.5-1.5-2.5-3.5-4.5-4-7-.5 2-1.5 3-2.5 3.5-1-.5-2-1.5-2.5-3.5z" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Ministry: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

export default function FicheMembrePage() {
  const { confirm, alert } = useConfirm();
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo management state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"civil" | "spirituel" | "finances" | "ministeres">("civil");
  const [copied, setCopied] = useState(false);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [assemblies, setAssemblies] = useState<Array<{ id: string; name: string; city?: string }>>([]);
  const [transferTargetAssembly, setTransferTargetAssembly] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("active");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusOfficiant, setStatusOfficiant] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Ministry / Department assignment state
  const [memberDepartments, setMemberDepartments] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [showAssignDeptModal, setShowAssignDeptModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Membre actif");
  const [customRole, setCustomRole] = useState("");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assigningDept, setAssigningDept] = useState(false);
  const [deptMessage, setDeptMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);

  const resolvePhoto = (item: MemberData) => {
    let p =
      item.photo_url ||
      item.avatar_url ||
      item.user?.avatar_url ||
      item.user?.photo_url ||
      null;

    if (!p && typeof window !== "undefined") {
      p =
        localStorage.getItem(`fullgope_member_photo_${item.id}`) ||
        (item.user_id ? localStorage.getItem(`fullgope_member_photo_${item.user_id}`) : null) ||
        (item.user?.id ? localStorage.getItem(`fullgope_member_photo_${item.user.id}`) : null) ||
        (item.membership_number ? localStorage.getItem(`fullgope_member_photo_${item.membership_number}`) : null) ||
        (item.id === "8e40b83c-4be6-4d37-b668-92f129bd5fa1" ? localStorage.getItem("fullgope_last_member_photo") : null) ||
        null;
    }
    if (!p && item.id === "8e40b83c-4be6-4d37-b668-92f129bd5fa1") {
      p = "/images/members/8e40b83c-4be6-4d37-b668-92f129bd5fa1.png";
    }
    return p;
  };

  const fetchMember = async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.members.getMember(memberId);
      if (res.error) {
        setError(res.message || "Impossible de charger la fiche membre.");
      } else {
        const item = (res.data as any)?.member || res.data;
        setMember(item);
        if (item?.status) {
          setNewStatus(item.status);
        }
        if (item) {
          const photo = resolvePhoto(item);
          if (photo) setPhotoUrl(photo);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (!file.type.startsWith("image/")) {
      alert({
        title: "Format non valide",
        message: "Le fichier doit être une image au format JPG, PNG ou WebP.",
        variant: "warning",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert({
        title: "Fichier trop volumineux",
        message: "La taille de l'image ne doit pas dépasser 5 Mo.",
        variant: "warning",
      });
      return;
    }

    setUploadingPhoto(true);
    setPhotoFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoUrl(base64);

      if (typeof window !== "undefined") {
        localStorage.setItem(`fullgope_member_photo_${member.id}`, base64);
        if (member.user_id) {
          localStorage.setItem(`fullgope_member_photo_${member.user_id}`, base64);
        }
        if (member.user?.id) {
          localStorage.setItem(`fullgope_member_photo_${member.user.id}`, base64);
        }
        localStorage.setItem("fullgope_last_member_photo", base64);
      }

      setPhotoFeedback("Photo de profil mise à jour avec succès !");
      setTimeout(() => setPhotoFeedback(null), 3500);

      try {
        const mediaRes = await api.media.upload(file, {
          category: "avatar",
          alt_text: `Photo ${fullName}`,
          assembly_id: member.assembly_id,
        });
        if (!mediaRes.error && mediaRes.data) {
          const remoteUrl = mediaRes.data.url || mediaRes.data.file_path;
          if (remoteUrl) {
            localStorage.setItem(`fullgope_member_photo_${member.id}`, remoteUrl);
            setPhotoUrl(remoteUrl);
          }
        }
      } catch (uploadErr) {
        console.warn("Téléversement média distant non disponible, conservé localement :", uploadErr);
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    const ok = await confirm({
      title: "Supprimer la photo",
      message: "Voulez-vous vraiment retirer la photo de profil de ce fidèle ?",
      confirmText: "Retirer la photo",
      cancelText: "Annuler",
      variant: "danger",
    });
    if (!ok) return;

    setPhotoUrl(null);
    if (typeof window !== "undefined" && member) {
      localStorage.removeItem(`fullgope_member_photo_${member.id}`);
      if (member.user_id) localStorage.removeItem(`fullgope_member_photo_${member.user_id}`);
      if (member.user?.id) localStorage.removeItem(`fullgope_member_photo_${member.user.id}`);
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPhotoFeedback("Photo retirée.");
    setTimeout(() => setPhotoFeedback(null), 2500);
  };

  useEffect(() => {
    fetchMember();
    loadMemberDepartments();
    loadAvailableDepartments();
    // Load assemblies for transfer picker
    api.organizations.listAssemblies().then((res) => {
      const items = (res.data as any)?.assemblies || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
      setAssemblies(items);
      if (items.length > 0) {
        setTransferTargetAssembly(items[0].id);
      }
    }).catch(() => {});
  }, [memberId]);

  const loadMemberDepartments = async () => {
    if (!memberId) return;
    try {
      const res = await api.members.listDepartments(memberId);
      const list = (res.data as any)?.departments || (Array.isArray(res.data) ? res.data : []);
      setMemberDepartments(list);
    } catch (err) {
      console.warn("Erreur chargement ministères du membre:", err);
    }
  };

  const loadAvailableDepartments = async () => {
    try {
      const res = await api.departments.list();
      const list = (res.data as any)?.departments || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
      setAvailableDepartments(list);
      if (list.length > 0) {
        setSelectedDeptId((prev) => prev || list[0].id);
      }
    } catch (err) {
      console.warn("Erreur chargement ministères disponibles:", err);
    }
  };

  const handleAssignDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !memberId) return;
    setAssigningDept(true);
    setDeptMessage(null);

    const roleToAssign = selectedRole === "Autre" ? customRole.trim() || "Membre" : selectedRole;

    try {
      const res = await api.members.assignDepartment(memberId, {
        department_id: selectedDeptId,
        role: roleToAssign,
        joined_date: joinedDate || new Date().toISOString().slice(0, 10),
      });

      if (res.error) {
        setDeptMessage({ type: "error", text: res.message || "Erreur lors de l'affectation du membre." });
      } else {
        setDeptMessage({ type: "success", text: "Fidèle affecté(e) avec succès au ministère !" });
        await loadMemberDepartments();
        setTimeout(() => {
          setShowAssignDeptModal(false);
          setDeptMessage(null);
        }, 1200);
      }
    } catch (err: any) {
      setDeptMessage({ type: "error", text: err?.message || "Erreur de connexion au serveur." });
    } finally {
      setAssigningDept(false);
    }
  };

  const handleRemoveDepartment = async (deptId: string, deptName: string) => {
    const ok = await confirm({
      title: "Retrait du ministère",
      message: `Confirmez-vous le retrait de ${fullName} du ministère « ${deptName} » ?`,
      confirmText: "Retirer du ministère",
      cancelText: "Annuler",
      variant: "warning",
    });
    if (!ok) return;

    setDeletingDeptId(deptId);
    try {
      const res = await api.members.removeDepartment(memberId, deptId);
      if (!res.error) {
        await loadMemberDepartments();
      } else {
        await alert({
          title: "Erreur de retrait",
          message: res.message || "Erreur lors du retrait du membre.",
          variant: "danger",
        });
      }
    } catch (err: any) {
      console.warn("Erreur retrait département:", err);
    } finally {
      setDeletingDeptId(null);
    }
  };

  const copyMatricule = () => {
    const num = member?.membership_number || member?.matricule || "";
    if (num) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !transferTargetAssembly) return;
    setTransferSubmitting(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const res = await api.members.requestTransfer(memberId, {
        to_assembly_id: transferTargetAssembly,
        reason: transferReason || "Mutation ou convenance personnelle",
        transfer_date: new Date().toISOString().split("T")[0],
      });

      if (res.error) {
        setTransferError(res.message || "Échec de l'enregistrement du transfert.");
      } else {
        setTransferSuccess("Demande de mutation enregistrée avec succès. Elle a été transmise aux assemblées concernées.");
        setTimeout(() => {
          setShowTransferModal(false);
          setTransferSuccess(null);
          fetchMember();
        }, 1800);
      }
    } catch (err: any) {
      setTransferError(err?.message || "Erreur réseau.");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    setStatusSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await api.members.updateStatus(memberId, {
        status: newStatus,
        notes: statusNotes || undefined,
        officiant: statusOfficiant || undefined,
        effective_date: new Date().toISOString().split("T")[0],
      });

      if (res.error) {
        setStatusMessage(`Erreur: ${res.message || "Échec de mise à jour"}`);
      } else {
        setStatusMessage("Statut pastoral mis à jour avec succès !");
        setTimeout(() => {
          setShowStatusModal(false);
          setStatusMessage(null);
          fetchMember();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMessage(`Erreur: ${err?.message || "Erreur réseau"}`);
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberId) return;
    const ok = await confirm({
      title: "Suppression définitive",
      message: `Êtes-vous sûr de vouloir supprimer définitivement la fiche de « ${fullName} » de l'annuaire ? Cette action est irréversible.`,
      confirmText: "Supprimer définitivement",
      cancelText: "Annuler",
      variant: "danger",
    });
    if (!ok) return;

    setDeleteSubmitting(true);
    try {
      const res = await api.members.delete(memberId);
      if (res.error) {
        await alert({
          title: "Erreur de suppression",
          message: res.message || "Impossible de supprimer le membre.",
          variant: "danger",
        });
      } else {
        router.push("/membres");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "actif":
        return { label: "Actif", bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-500" };
      case "new":
      case "nouveau":
        return { label: "Nouveau fidèle", bg: "bg-blue-500/10 text-blue-700 border-blue-500/30", dot: "bg-blue-500" };
      case "catechumen":
        return { label: "Catéchumène", bg: "bg-amber-500/10 text-amber-700 border-amber-500/30", dot: "bg-amber-500" };
      case "disciplined":
      case "suspended":
        return { label: "Sous discipline", bg: "bg-rose-500/10 text-rose-700 border-rose-500/30", dot: "bg-rose-500" };
      case "transferred":
        return { label: "Transféré", bg: "bg-purple-500/10 text-purple-700 border-purple-500/30", dot: "bg-purple-500" };
      case "deceased":
        return { label: "Rappelé à Dieu", bg: "bg-slate-500/10 text-slate-700 border-slate-500/30", dot: "bg-slate-500" };
      default:
        return { label: status || "Enregistré", bg: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-400" };
    }
  };

  const fullName = member
    ? `${member.user?.first_name || ""} ${member.user?.last_name || ""}`.trim() || "Fidèle sans nom"
    : "";
  const initials = member
    ? `${(member.user?.first_name?.[0] || "").toUpperCase()}${(member.user?.last_name?.[0] || "").toUpperCase()}` || "MB"
    : "";
  const matricule = member?.membership_number || member?.matricule || "N/A";
  const statusBadge = getStatusBadge(member?.status);

  return (
    <PortalShell>
      <div className="portal-screen-content space-y-6 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium flex-wrap">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <SvgIcons.Home />
              <span>Accueil</span>
            </Link>
            <span>/</span>
            <Link href="/membres" className="hover:text-primary">
              Membres
            </Link>
            <span>/</span>
            <span className="text-primary font-bold truncate max-w-[180px] sm:max-w-xs">{fullName || "Fiche Membre"}</span>
            {matricule !== "N/A" && (
              <span className="font-mono bg-surface-container px-2 py-0.5 rounded text-[11px] font-bold text-on-surface">
                {matricule}
              </span>
            )}
          </nav>

          <Link
            href="/membres"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-semibold self-start sm:self-auto transition-colors"
          >
            <SvgIcons.ArrowBack />
            <span>Retour à l'annuaire</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl bg-surface-container-lowest p-12 border border-surface-container-high/60 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-semibold text-on-surface-variant">Chargement de la fiche membre depuis la base de données...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 border-l-[6px] border-l-rose-700 p-8 text-center space-y-3 shadow-sm">
            <h3 className="text-base font-extrabold text-rose-950">Fiche membre introuvable</h3>
            <p className="text-xs text-rose-900 font-semibold max-w-md mx-auto">{error}</p>
            <div className="pt-2">
              <Link
                href="/membres"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors"
              >
                <SvgIcons.ArrowBack />
                <span>Revenir à la liste des membres</span>
              </Link>
            </div>
          </div>
        )}

        {/* Member Profile Content */}
        {!loading && member && (
          <>
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 sm:p-8 shadow-sm border border-surface-container-high/60 space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start gap-6 min-w-0">
                  {/* Photo / Initials with Hover Camera Action */}
                  <div className="flex flex-col items-center sm:items-start gap-2 shrink-0">
                    <div className="relative group">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md bg-surface-container border-2 border-primary/20 flex items-center justify-center relative bg-surface-container-lowest">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={fullName}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-all"
                            onClick={() => setShowPhotoModal(true)}
                            onError={() => setPhotoUrl(null)}
                          />
                        ) : (
                          <div className="text-primary font-black text-3xl select-none">
                            {initials}
                          </div>
                        )}

                        {/* Hover Overlay Button to Change / Add Photo */}
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          title={photoUrl ? "Changer la photo du membre" : "Ajouter une photo"}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer backdrop-blur-2xs"
                        >
                          <SvgIcons.Camera />
                          <span>{photoUrl ? "Modifier" : "Ajouter photo"}</span>
                        </button>

                        {uploadingPhoto && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white z-10">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Status badge pill */}
                      <div className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 shadow-sm bg-white ${statusBadge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${statusBadge.dot} animate-pulse`} />
                        <span>{statusBadge.label}</span>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Quick photo action buttons */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-bold text-on-surface flex items-center gap-1 border border-surface-container-high transition-colors"
                      >
                        <SvgIcons.Camera />
                        <span>{photoUrl ? "Modifier photo" : "Ajouter photo"}</span>
                      </button>
                      {photoUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowPhotoModal(true)}
                            className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-bold transition-colors border border-surface-container-high"
                            title="Agrandir la photo"
                          >
                            <SvgIcons.Eye />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 text-[11px] font-bold transition-colors border border-transparent hover:border-rose-200"
                            title="Supprimer la photo"
                          >
                            <SvgIcons.Trash />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Identity & Badges */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                        {member.gender === "F" ? "Sœur" : "Frère"} • {member.marital_status === "married" ? "Marié(e)" : "Célibataire"}
                      </span>
                      {member.departments && member.departments.length > 0 ? (
                        member.departments.map((dep) => (
                          <span key={dep.id} className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed-variant text-xs font-semibold">
                            {dep.name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold">
                          Sans département affecté
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                      {fullName}
                    </h1>

                    {/* Matricule with copy button */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant font-medium">Matricule officiel :</span>
                      <div className="inline-flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-lg">
                        <span className="text-xs font-bold text-on-surface font-mono">
                          {matricule}
                        </span>
                        <button
                          type="button"
                          onClick={copyMatricule}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                          title="Copier le matricule"
                        >
                          {copied ? <SvgIcons.Check /> : <SvgIcons.Copy />}
                        </button>
                      </div>
                      {copied && <span className="text-[11px] text-emerald-600 font-bold">Copié !</span>}
                    </div>

                    {/* Meta info pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full border border-surface-container-high/60">
                        <SvgIcons.Church />
                        <span className="font-semibold">{member.assembly_name || "Assemblée locale Tsinga"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full border border-surface-container-high/60">
                        <SvgIcons.Calendar />
                        <span>Enrôlé le {member.membership_date ? new Date(member.membership_date).toLocaleDateString("fr-FR") : "Récent"}</span>
                      </div>
                      {member.baptism_date && (
                        <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full border border-surface-container-high/60">
                          <SvgIcons.ShieldCheck />
                          <span className="text-emerald-700 font-semibold">Baptisé le {new Date(member.baptism_date).toLocaleDateString("fr-FR")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pastoral Action Buttons */}
                <div className="flex flex-wrap xl:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-2 border border-surface-container-high transition-colors"
                    title="Imprimer directement la Fiche Membre A4"
                  >
                    <SvgIcons.Print />
                    <span>Imprimer Fiche</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(true)}
                    className="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 border border-surface-container-high transition-colors"
                    title="Aperçu avant impression de la Fiche A4"
                  >
                    <SvgIcons.Eye />
                    <span>Aperçu A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignDeptModal(true);
                      setDeptMessage(null);
                      if (!selectedDeptId && availableDepartments.length > 0) {
                        setSelectedDeptId(availableDepartments[0].id);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                    title="Affecter ce membre à un ministère ou département"
                  >
                    <SvgIcons.Ministry />
                    <span>Affecter Ministère</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(true)}
                    className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <SvgIcons.EditStatus />
                    <span>Changer Statut</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="h-10 px-4 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-white text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <SvgIcons.Transfer />
                    <span>Demande de Mutation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-colors"
                  >
                    <SvgIcons.Trash />
                    <span>Archiver</span>
                  </button>
                </div>
              </div>

              {/* Profile Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-surface-container-high pt-2 text-xs font-bold overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("civil")}
                  className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "civil"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  État Civil &amp; Famille
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("spirituel")}
                  className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "spirituel"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Parcours Spirituel &amp; Baptême
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("finances")}
                  className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "finances"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Historique Dîmes &amp; Dons
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ministeres")}
                  className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === "ministeres"
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Ministères &amp; Assiduité
                </button>
              </div>

              {/* TAB 1: ÉTAT CIVIL & CONTACT */}
              {activeTab === "civil" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-on-surface">Identité Civile</h4>
                    <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-surface-container-high">
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Nom et Prénom :</span>
                        <span className="font-bold text-on-surface">{fullName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Date de naissance :</span>
                        <span className="font-bold text-on-surface">
                          {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString("fr-FR") : "Non renseignée"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Genre :</span>
                        <span className="font-bold text-on-surface">{member.gender === "F" ? "Féminin (F)" : "Masculin (M)"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Nationalité :</span>
                        <span className="font-bold text-on-surface">{member.nationality || "Camerounaise"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-on-surface-variant">Profession :</span>
                        <span className="font-bold text-on-surface">{member.profession || "Non spécifiée"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-on-surface">Coordonnées &amp; Foyer</h4>
                    <div className="space-y-2 bg-surface-container-low p-4 rounded-xl border border-surface-container-high">
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Téléphone principal :</span>
                        <a href={`tel:${member.user?.phone}`} className="font-bold text-primary hover:underline">
                          {member.user?.phone || "Non renseigné"}
                        </a>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Adresse E-mail :</span>
                        <a href={`mailto:${member.user?.email}`} className="font-bold text-primary hover:underline">
                          {member.user?.email || "Non renseigné"}
                        </a>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Situation matrimoniale :</span>
                        <span className="font-bold text-on-surface">
                          {member.marital_status === "married" ? "Marié(e)" : member.marital_status === "single" ? "Célibataire" : "Non spécifié"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-container">
                        <span className="text-on-surface-variant">Consentement RGPD / Données :</span>
                        <span className="font-bold text-emerald-600">
                          {member.data_consent ? "Accordé et signé" : "En attente"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-on-surface-variant">Liens de parenté :</span>
                        <span className="font-bold text-on-surface">
                          {member.family_links && member.family_links.length > 0 ? `${member.family_links.length} enregistré(s)` : "Aucun"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PARCOURS SPIRITUEL */}
              {activeTab === "spirituel" && (
                <div className="space-y-4 text-xs pt-2">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SvgIcons.Water />
                        <h4 className="font-bold text-sm text-on-surface">Certificat de Baptême d'Eau</h4>
                      </div>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {member.baptism_date ? "Baptême d'eau validé" : "En cours de catéchisme"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-on-surface-variant block">Date de Baptême :</span>
                        <span className="font-bold text-on-surface">
                          {member.baptism_date ? new Date(member.baptism_date).toLocaleDateString("fr-FR") : "Non encore baptisé"}
                        </span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block">Assemblée de rattachement :</span>
                        <span className="font-bold text-on-surface">{member.assembly_name || "Tsinga (Yaoundé)"}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block">Statut ecclésial :</span>
                        <span className="font-bold text-primary capitalize">{member.status || "Actif"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary-fixed/20 border border-primary-fixed space-y-2">
                    <div className="flex items-center gap-2">
                      <SvgIcons.Flame />
                      <h4 className="font-bold text-sm text-primary">Doctrine &amp; Témoignage de Foi</h4>
                    </div>
                    <p className="text-on-surface leading-relaxed">
                      Membre enregistré au sein de la Mission du Plein Évangile Cameroun. Reconnaît la confession de foi biblique, le baptême du Saint-Esprit et participe aux activités d'édification spirituelle.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCES */}
              {activeTab === "finances" && (
                <div className="space-y-4 text-xs pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">Historique des Contributions &amp; Dîmes</h4>
                      <p className="text-on-surface-variant">Données extraites du module Trésorerie &amp; Collectes</p>
                    </div>
                    <Link
                      href={`/dons?member_id=${member.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs self-start sm:self-auto"
                    >
                      Enregistrer une contribution
                    </Link>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-surface-container-high">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Nature</th>
                          <th className="py-2.5 px-3">Moyen de règlement</th>
                          <th className="py-2.5 px-3 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high">
                        <tr className="hover:bg-surface-container-low">
                          <td className="py-2.5 px-3 font-medium text-on-surface">Enregistrement</td>
                          <td className="py-2.5 px-3 text-on-surface">Cotisation / Fiche d'enrôlement</td>
                          <td className="py-2.5 px-3 text-on-surface-variant">Caisse locale</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">En règle</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: MINISTÈRES & DÉPARTEMENTS */}
              {activeTab === "ministeres" && (
                <div className="space-y-6 text-xs pt-2">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
                      <span className="text-on-surface-variant font-medium">Statut Paroissial</span>
                      <p className="text-xl font-bold text-primary mt-1 capitalize">{member.status || "Actif"}</p>
                      <span className="text-[11px] text-on-surface-variant">Enrôlement canonique</span>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
                      <span className="text-on-surface-variant font-medium">Ministères Actifs</span>
                      <p className="text-xl font-bold text-purple-700 mt-1">
                        {memberDepartments.length} {memberDepartments.length > 1 ? "Départements" : "Département"}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">Service &amp; engagement actif</span>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
                      <span className="text-on-surface-variant font-medium">Assemblée Locale</span>
                      <p className="text-base font-bold text-secondary mt-1 truncate">
                        {member.assembly_name || "Temple Central"}
                      </p>
                      <span className="text-[11px] text-on-surface-variant">Rattachement territorial</span>
                    </div>
                  </div>

                  {/* Main Departments Section */}
                  <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-on-surface flex items-center gap-2">
                          <SvgIcons.Ministry />
                          <span>Ministères &amp; Départements d'Affectation</span>
                        </h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Gérez les responsabilités et commissions ecclésiales confiées à ce fidèle.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignDeptModal(true);
                          setDeptMessage(null);
                          if (!selectedDeptId && availableDepartments.length > 0) {
                            setSelectedDeptId(availableDepartments[0].id);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                      >
                        <SvgIcons.Plus />
                        <span>Affecter à un Ministère</span>
                      </button>
                    </div>

                    {memberDepartments.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-surface-container-high">
                        <table className="w-full text-left">
                          <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
                            <tr>
                              <th className="py-3 px-4">Ministère / Département</th>
                              <th className="py-3 px-4">Rôle Confié</th>
                              <th className="py-3 px-4">Date d'Intégration</th>
                              <th className="py-3 px-4">Statut</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-high">
                            {memberDepartments.map((dept: any) => {
                              const deptId = dept.department_id || dept.id;
                              const deptName = dept.department_name || dept.name || "Ministère";
                              const role = dept.role || dept.role_name || "Membre";
                              const joinDate = dept.joined_date || dept.created_at;

                              return (
                                <tr key={dept.id || deptId} className="hover:bg-surface-container-low/60 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        ✦
                                      </div>
                                      <div>
                                        <span className="font-bold text-on-surface text-xs block">{deptName}</span>
                                        <span className="text-[11px] text-on-surface-variant">Commission ecclésiale locale</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                      {role}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-on-surface-variant text-[11px]">
                                    {joinDate ? new Date(joinDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Récemment"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      Actif
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      disabled={deletingDeptId === deptId}
                                      onClick={() => handleRemoveDepartment(deptId, deptName)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                      title="Retirer le membre de ce ministère"
                                    >
                                      {deletingDeptId === deptId ? (
                                        <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <SvgIcons.Trash />
                                          <span>Retirer</span>
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-purple-50/50 border border-purple-200/60 p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto text-xl">
                          <SvgIcons.Ministry />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">Aucun ministère assigné pour le moment</h5>
                          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                            Ce fidèle n'est encore rattaché à aucun département ou groupe officiel (Chorale, Dames, Hommes, Jeunesse, Diaconat...).
                            Affectez-le pour dynamiser son service au sein de la communauté.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssignDeptModal(true);
                            setDeptMessage(null);
                            if (!selectedDeptId && availableDepartments.length > 0) {
                              setSelectedDeptId(availableDepartments[0].id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          <SvgIcons.Plus />
                          <span>Affecter à un ministère maintenant</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL 1: CHANGER LE STATUT PASTORAL */}
            {showStatusModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <SvgIcons.EditStatus />
                      <span>Modifier le Statut Pastoral</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowStatusModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <SvgIcons.Close />
                    </button>
                  </div>

                  {statusMessage && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${statusMessage.startsWith('Erreur') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {statusMessage}
                    </div>
                  )}

                  <form onSubmit={handleStatusSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Nouveau statut du membre :</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="active">Actif (En pleine communion)</option>
                        <option value="new">Nouveau fidèle (En observation)</option>
                        <option value="catechumen">Catéchumène (En préparation de baptême)</option>
                        <option value="disciplined">Sous discipline pastorale</option>
                        <option value="transferred">Transféré vers une autre assemblée</option>
                        <option value="deceased">Rappelé auprès du Seigneur</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Officiant ou Pasteur responsable :</label>
                      <input
                        type="text"
                        value={statusOfficiant}
                        onChange={(e) => setStatusOfficiant(e.target.value)}
                        placeholder="Ex: Rév. Samuel Ndifon"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Justification / Remarques :</label>
                      <textarea
                        rows={3}
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        placeholder="Précisez le motif du changement de statut..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowStatusModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={statusSubmitting}
                        className="px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold hover:bg-[#a60d26] transition-colors disabled:opacity-50"
                      >
                        {statusSubmitting ? "Enregistrement..." : "Confirmer la décision"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: DEMANDE DE MUTATION / TRANSFERT */}
            {showTransferModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <SvgIcons.Transfer />
                      <span>Mutation &amp; Transfert d'Assemblée</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <SvgIcons.Close />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Transmission du dossier spirituel pour le fidèle <strong className="text-slate-900">{fullName}</strong> ({matricule}).
                  </p>

                  {transferError && (
                    <AlertBanner
                      type="error"
                      title="Erreur de transfert"
                      message={transferError}
                      onDismiss={() => setTransferError(null)}
                    />
                  )}

                  {transferSuccess && (
                    <AlertBanner
                      type="success"
                      title="Transfert initié"
                      message={transferSuccess}
                      onDismiss={() => setTransferSuccess(null)}
                    />
                  )}

                  <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Assemblée de départ :</label>
                      <input
                        type="text"
                        value={member.assembly_name || "Assemblée actuelle"}
                        className="w-full h-10 px-3 bg-slate-100 rounded-xl text-slate-800 font-semibold"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Nouvelle Assemblée d'accueil souhaitée :</label>
                      <select
                        value={transferTargetAssembly}
                        onChange={(e) => setTransferTargetAssembly(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      >
                        {assemblies.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} {a.city ? `(${a.city})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Motif pastoral de la mutation :</label>
                      <textarea
                        rows={3}
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="Ex: Mutation professionnelle ou déménagement familial..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 resize-none"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowTransferModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={transferSubmitting}
                        className="px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold hover:bg-[#a60d26] transition-colors disabled:opacity-50"
                      >
                        {transferSubmitting ? "Envoi en cours..." : "Transmettre la demande"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 3: SUPPRIMER / ARCHIVER LE MEMBRE */}
            {showDeleteModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-3 text-rose-700">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <SvgIcons.Trash />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Archiver ce membre ?</h3>
                      <p className="text-xs text-slate-500">Cette action retirera le membre de l'annuaire actif.</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700">
                    Êtes-vous sûr de vouloir archiver le dossier de <strong className="font-bold text-slate-900">{fullName}</strong> ({matricule}) ?
                  </p>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={handleDeleteMember}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                    >
                      {deleteSubmitting ? "Archivage..." : "Confirmer l'archivage"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* MODAL 4: APERÇU AGRANDI DE LA PHOTO */}
            {showPhotoModal && photoUrl && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Photo d'identité du membre</h3>
                      <p className="text-[11px] text-slate-500">{fullName} • {matricule}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <SvgIcons.Close />
                    </button>
                  </div>

                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <img
                      src={photoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 cursor-pointer"
                    >
                      Supprimer la photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhotoModal(false);
                        photoInputRef.current?.click();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-primary text-white hover:brightness-110 font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Remplacer la photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 5: APERÇU FICHE A4 AVANT IMPRESSION */}
            {showPrintPreview && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
                <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-150">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
                        <SvgIcons.Print />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white leading-tight">Aperçu officiel de la Fiche Membre (A4)</h3>
                        <p className="text-[11px] text-slate-300">Conforme à la charte de la Mission du Plein Évangile</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#d4161a] hover:bg-[#b51014] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <SvgIcons.Print />
                        <span>Imprimer maintenant</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPrintPreview(false)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                        title="Fermer l'aperçu"
                      >
                        <SvgIcons.Close />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
                    <div className="bg-white shadow-xl rounded-xl overflow-hidden max-w-[210mm] w-full">
                      <MemberRecordSheet
                        member={{
                          ...member,
                          departments:
                            memberDepartments.length > 0
                              ? memberDepartments.map((d: any, idx: number) => ({
                                  id: d.department_id || d.id || `dept-${idx}`,
                                  name: d.department_name || d.name || "Ministère",
                                  role: d.role || d.role_name,
                                }))
                              : member.departments,
                        }}
                        photoUrl={photoUrl}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 6: AFFECTER À UN MINISTÈRE / DÉPARTEMENT */}
            {showAssignDeptModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <SvgIcons.Ministry />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                          Affecter à un Ministère
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {fullName} • {matricule}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssignDeptModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    >
                      <SvgIcons.Close />
                    </button>
                  </div>

                  {deptMessage && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        deptMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      <span className="text-sm">{deptMessage.type === "success" ? "✓" : "⚠"}</span>
                      <span>{deptMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleAssignDepartment} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1.5">
                        Sélectionner le Ministère / Département cible <span className="text-rose-600">*</span>
                      </label>
                      <select
                        required
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                      >
                        {availableDepartments.length > 0 ? (
                          availableDepartments.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.assembly_name ? `(${d.assembly_name})` : ""}
                            </option>
                          ))
                        ) : (
                          <option value="">Chargement des ministères...</option>
                        )}
                      </select>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Ministères officiels reconnus au sein de la Mission du Plein Évangile.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-800 block mb-1.5">
                          Rôle confié au membre
                        </label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        >
                          <option value="Membre actif">Membre actif</option>
                          <option value="Responsable / Président(e)">Responsable / Président(e)</option>
                          <option value="Vice-Président(e)">Vice-Président(e)</option>
                          <option value="Secrétaire">Secrétaire</option>
                          <option value="Trésorier(e)">Trésorier(e)</option>
                          <option value="Animateur / Moniteur">Animateur / Moniteur</option>
                          <option value="Chantre / Musicien">Chantre / Musicien</option>
                          <option value="Diacre / Diaconesse">Diacre / Diaconesse</option>
                          <option value="Conseiller spirituel">Conseiller spirituel</option>
                          <option value="Autre">Autre (préciser)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-800 block mb-1.5">
                          Date d'intégration
                        </label>
                        <input
                          type="date"
                          value={joinedDate}
                          onChange={(e) => setJoinedDate(e.target.value)}
                          className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                      </div>
                    </div>

                    {selectedRole === "Autre" && (
                      <div>
                        <label className="font-bold text-slate-800 block mb-1">
                          Préciser le rôle personnalisé :
                        </label>
                        <input
                          type="text"
                          required
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          placeholder="Ex: Chargé du protocole, Sentinelle de prière..."
                          className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowAssignDeptModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={assigningDept || !selectedDeptId}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {assigningDept ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <span>Confirmer l'affectation</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FEUILLE OFFICIELLE A4 DÉDIÉE À L'IMPRESSION (ISOLÉE DU FLUX INTERACTIF ÉCRAN) */}
      {!loading && member && (
        <div className="hidden print:block print-only-container">
          <MemberRecordSheet
            member={{
              ...member,
              departments:
                memberDepartments.length > 0
                  ? memberDepartments.map((d: any, idx: number) => ({
                      id: d.department_id || d.id || `dept-${idx}`,
                      name: d.department_name || d.name || "Ministère",
                      role: d.role || d.role_name,
                    }))
                  : member.departments,
            }}
            photoUrl={photoUrl}
          />
        </div>
      )}
    </PortalShell>
  );
}
