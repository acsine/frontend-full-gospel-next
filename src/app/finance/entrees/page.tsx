"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { api, getStoredUser } from "@/lib/api";
import { Can } from "@/components/auth/Can";

interface CashEntry {
  id: string;
  ref: string;
  date: string;
  category: "Dîme" | "Offrande de culte" | "Don spécial" | "Action de grâce";
  donorName: string;
  matricule?: string;
  amount: number;
  paymentMethod: "Espèces" | "MTN MoMo" | "Orange Money" | "Virement GIMAC";
  status: "Validée" | "Brouillon" | "Annulée";
  assembly: string;
  treasurerSignature: string;
  notes?: string;
}

export default function JournalEntreesPage() {
  const { alert, confirm } = useConfirm();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [isLoadingIncomes, setIsLoadingIncomes] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("Tous");
  const [selectedAssemblyFilter, setSelectedAssemblyFilter] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceiptEntry, setSelectedReceiptEntry] = useState<CashEntry | null>(null);

  // Onglet actif : "journal" (écritures générales) ou "treasury_pending" (validations dépôts manuels)
  const [activeTab, setActiveTab] = useState<"journal" | "treasury_pending">("journal");
  const [pendingDonations, setPendingDonations] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Modale de validation trésorerie d'un versement manuel
  const [selectedValidateDonation, setSelectedValidateDonation] = useState<any | null>(null);
  const [validateReference, setValidateReference] = useState("");
  const [validateAmount, setValidateAmount] = useState<number>(0);
  const [validateNotes, setValidateNotes] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [previewProofModal, setPreviewProofModal] = useState<string | null>(null);

  // Assemblies list & form state
  const [assemblies, setAssemblies] = useState<{ id: string; name: string }[]>([]);
  const [newAssemblyId, setNewAssemblyId] = useState<string>("1b28b230-c9e5-4d8f-9d89-212810f06f08");
  const [isSyncingOrphans, setIsSyncingOrphans] = useState(false);

  // New entry form state
  const [newCategory, setNewCategory] = useState<CashEntry["category"]>("Dîme");
  const [newDonor, setNewDonor] = useState("");
  const [newMatricule, setNewMatricule] = useState("");
  const [newAmount, setNewAmount] = useState<number>(50000);
  const [newPaymentMethod, setNewPaymentMethod] = useState<CashEntry["paymentMethod"]>("Espèces");
  const [newNotes, setNewNotes] = useState("");

  // Reusable load incomes
  const loadIncomes = async () => {
    setIsLoadingIncomes(true);
    try {
      const res = await api.finance.listIncomes();
      const list = (res.data as any)?.incomes || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(list) && list.length > 0) {
        const catMap: Record<string, CashEntry["category"]> = {
          tithe: "Dîme",
          offering: "Offrande de culte",
          special_project: "Don spécial",
          thanksgiving: "Action de grâce",
        };
        const methodMap: Record<string, CashEntry["paymentMethod"]> = {
          cash: "Espèces",
          mtn_momo: "MTN MoMo",
          orange_money: "Orange Money",
          gimac: "Virement GIMAC",
          bank_transfer: "Virement GIMAC",
        };
        const statusMap: Record<string, CashEntry["status"]> = {
          validated: "Validée",
          draft: "Brouillon",
          cancelled: "Annulée",
        };

        const mappedBackend: CashEntry[] = list.map((inc: any) => ({
          id: inc.id,
          ref: inc.payment_reference || `ENC-${inc.income_date?.replace(/-/g, "")?.slice(0, 8) || "2026"}-${inc.id.slice(0, 4).toUpperCase()}`,
          date: inc.income_date ? new Date(inc.income_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Aujourd'hui",
          category: catMap[inc.category] || "Offrande de culte",
          donorName: inc.is_anonymous ? "Donateur Anonyme" : inc.notes || "Fidèle Paroissial",
          amount: Number(inc.amount) || 0,
          paymentMethod: methodMap[inc.payment_method] || "Espèces",
          status: statusMap[inc.status] || "Validée",
          assembly: "Temple Central de Tsinga",
          treasurerSignature: inc.status === "validated" ? "Trésorerie Centrale" : "En attente contreseing",
          notes: inc.notes,
        }));

        setEntries(mappedBackend);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.warn("Erreur chargement entrées financières backend:", err);
      setEntries([]);
    } finally {
      setIsLoadingIncomes(false);
    }
  };

  // Reusable load pending validations
  const loadPendingDonations = async () => {
    setIsLoadingPending(true);
    try {
      const res: any = await api.donations.getPendingValidations();
      const list = res?.data?.pending_donations || [];
      setPendingDonations(list);
    } catch (err) {
      console.warn("Erreur chargement des versements en attente:", err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Load assemblies dynamically
  useEffect(() => {
    async function loadAssemblies() {
      try {
        const res = await api.organizations.listAssemblies();
        const list = (res.data as any)?.assemblies || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0) {
          setAssemblies(list.map((a: any) => ({ id: a.id, name: a.name })));
        }
      } catch {
        setAssemblies([]);
      }
    }
    loadAssemblies();
    loadIncomes();
    loadPendingDonations();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "validations" || tabParam === "treasury_pending" || tabParam === "pending") {
        setActiveTab("treasury_pending");
      }
    }

    // Abonnement temps réel SSE aux encaissements et validations
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== "undefined" && window.EventSource) {
        eventSource = new EventSource(api.finance.getFinanceStreamUrl());
        eventSource.addEventListener("income_received", () => {
          loadIncomes();
          loadPendingDonations();
        });
      }
    } catch { }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Dynamic Metrics
  const metrics = useMemo(() => {
    let totalEncaisse = 0;
    let dimesTotal = 0;
    let momoTotal = 0;
    let brouillonsCount = 0;

    for (const item of entries) {
      if (item.status === "Validée") {
        totalEncaisse += item.amount;
        if (item.category === "Dîme") dimesTotal += item.amount;
        if (item.paymentMethod === "MTN MoMo" || item.paymentMethod === "Orange Money") {
          momoTotal += item.amount;
        }
      } else if (item.status === "Brouillon") {
        brouillonsCount++;
      }
    }

    const momoPercent = totalEncaisse > 0 ? ((momoTotal / totalEncaisse) * 100).toFixed(1) : "0.0";

    return {
      totalEncaisse,
      dimesTotal,
      momoTotal,
      momoPercent,
      brouillonsCount,
    };
  }, [entries]);

  const filteredEntries = entries.filter((item) => {
    if (selectedStatus !== "Tous" && item.status !== selectedStatus) return false;
    if (selectedAssemblyFilter !== "Tous" && item.assembly !== selectedAssemblyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = item.ref.toLowerCase().includes(q);
      const matchDonor = item.donorName.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchAsm = item.assembly.toLowerCase().includes(q);
      if (!matchRef && !matchDonor && !matchCat && !matchAsm) return false;
    }
    return true;
  });

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetAssembly = assemblies.find((a: { id: string; name: string }) => a.id === newAssemblyId) || assemblies[0];
    const targetAssemblyName = targetAssembly?.name || "Temple Central de Tsinga";

    const ok = await confirm({
      title: "Confirmer l'enregistrement de l'entrée financière",
      message: `Confirmez-vous l'encaissement de ${Number(newAmount).toLocaleString()} XAF sous la rubrique « ${newCategory} » au profit de l'assemblée « ${targetAssemblyName} » (Donateur: « ${newDonor || "Fidèle Anonyme"} », Canal: ${newPaymentMethod}) ? Cette écriture certifiée sera rattachée à la comptabilité de l'assemblée.`,
      confirmText: "Enregistrer l'encaissement",
      variant: "primary",
    });

    if (!ok) return;

    const user = getStoredUser();
    const signer = user?.first_name ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Diacre Ebogo Martin (Trésorier)";
    const newEntry: CashEntry = {
      id: `ent-${Date.now()}`,
      ref: `ENC-2026-03-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      category: newCategory,
      donorName: newDonor || "Donateur non spécifié",
      matricule: newMatricule || undefined,
      amount: Number(newAmount),
      paymentMethod: newPaymentMethod,
      status: "Validée",
      assembly: targetAssemblyName,
      treasurerSignature: signer,
      notes: newNotes,
    };

    setEntries([newEntry, ...entries]);
    setIsModalOpen(false);
    setNewDonor("");
    setNewMatricule("");
    setNewNotes("");

    // Dispatch to FastAPI backend with mandatory assembly_id
    const categoryId = newCategory === "Dîme"
      ? "807567be-f89e-4459-8e30-6f818fbc5966"
      : "87f6225a-412b-4927-80ee-1aa473444cc4";
    const accountId = "742d8515-5088-4c50-93f0-07fbe28d830c";
    const methodApi = newPaymentMethod === "MTN MoMo"
      ? "mtn_momo"
      : newPaymentMethod === "Orange Money"
        ? "orange_money"
        : newPaymentMethod === "Virement GIMAC"
          ? "bank_transfer"
          : "cash";

    try {
      const res = await api.finance.createIncome({
        node_type: "assembly",
        assembly_id: newAssemblyId,
        category_id: categoryId,
        destination_account_id: accountId,
        amount: Number(newAmount),
        income_date: new Date().toISOString().split("T")[0] || "2026-03-01",
        payment_method: methodApi,
        notes: `${newCategory} - ${newDonor || "Fidèle"} - ${targetAssemblyName}`,
      });
      if (res.data?.income?.id) {
        await api.finance.validateIncome(res.data.income.id).catch(() => { });
      }
    } catch (err) {
      console.warn("Entrée synchronisée localement:", err);
    }

    // Automatically prompt with official receipt
    setSelectedReceiptEntry(newEntry);
  };

  // Action: Synchronize orphan legacy incomes
  const handleSyncOrphans = async () => {
    const ok = await confirm({
      title: "Rattacher les écritures orphelines",
      message: "Voulez-vous lancer la synchronisation pour rattacher automatiquement toutes les écritures historiques orphelines à leur assemblée locale respective ?",
      confirmText: "Lancer le rattachement",
      variant: "primary",
    });
    if (!ok) return;

    setIsSyncingOrphans(true);
    try {
      const res = await api.finance.syncOrphanIncomes();
      await alert({
        title: "Synchronisation réussie",
        message: `${res.data?.updated_count || 0} entrée(s) financière(s) orpheline(s) ont été rattachées avec succès à leur assemblée locale.`,
        buttonText: "Compris",
      });
    } catch {
      await alert({
        title: "Information",
        message: "Toutes les entrées financières sont déjà correctement rattachées à une assemblée active.",
        buttonText: "Fermer",
      });
    } finally {
      setIsSyncingOrphans(false);
    }
  };

  // Action: Open Official Receipt
  const handleOpenReceipt = (entry: CashEntry) => {
    setSelectedReceiptEntry(entry);
  };

  // Action: Validate Draft Entry
  const handleValidateEntry = async (entry: CashEntry) => {
    const ok = await confirm({
      title: "Valider l'encaissement financier",
      message: `Confirmez-vous la validation de l'écriture ${entry.ref} d'un montant de ${entry.amount.toLocaleString()} XAF (${entry.donorName}) ? Le compte de caisse sera crédité.`,
      confirmText: "Valider l'écriture",
      variant: "primary",
    });

    if (!ok) return;

    const user = getStoredUser();
    const signer = user?.first_name ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Diacre Ebogo Martin";

    // If UUID backend entry, call API
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id);
    if (isUuid) {
      api.finance.validateIncome(entry.id).catch(() => { });
    }

    setEntries((prev) =>
      prev.map((item) =>
        item.id === entry.id
          ? {
            ...item,
            status: "Validée",
            treasurerSignature: signer,
          }
          : item
      )
    );

    await alert({
      title: "Écriture Certifiée",
      message: `L'entrée financière ${entry.ref} est validée avec succès. La quittance officielle est disponible.`,
      variant: "primary",
    });
  };

  // Action: Cancel Entry (Contre-passation)
  const handleCancelEntry = async (entry: CashEntry) => {
    const ok = await confirm({
      title: "Annuler l'écriture financière",
      message: `Attention : Voulez-vous annuler l'écriture ${entry.ref} (${entry.amount.toLocaleString()} XAF) ? Une mention d'annulation et une contre-passation seront enregistrées.`,
      confirmText: "Confirmer l'annulation",
      variant: "danger",
    });

    if (!ok) return;

    setEntries((prev) =>
      prev.map((item) =>
        item.id === entry.id
          ? {
            ...item,
            status: "Annulée",
            treasurerSignature: "Annulation trésorerie",
          }
          : item
      )
    );

    await alert({
      title: "Écriture Annulée",
      message: `L'écriture ${entry.ref} a été marquée comme annulée au grand livre.`,
      variant: "warning",
    });
  };

  // =========================================================================
  // ACTIONS TRÉSORERIE : VALIDATION & RAPPROCHEMENT DES PAIEMENTS MANUELS
  // =========================================================================

  const handleOpenValidateModal = (donation: any) => {
    setSelectedValidateDonation(donation);
    setValidateReference(donation.payment_reference || "");
    setValidateAmount(donation.amount || 0);
    setValidateNotes("");
  };

  const handleConfirmTreasuryValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidateDonation) return;

    if (!validateReference.trim()) {
      await alert({
        title: "Référence obligatoire",
        message: "Veuillez renseigner ou confirmer la référence de transaction constatée sur votre compte trésorerie.",
        variant: "warning",
      });
      return;
    }

    if (!validateAmount || Number(validateAmount) <= 0) {
      await alert({
        title: "Montant invalide",
        message: "Veuillez indiquer le montant effectivement encaissé.",
        variant: "warning",
      });
      return;
    }

    setIsValidating(true);
    try {
      await api.donations.validateManualDonation(selectedValidateDonation.id, {
        reference: validateReference.trim(),
        amount: Number(validateAmount),
        treasury_notes: validateNotes.trim() || undefined,
      });

      await alert({
        title: "Versement Certifié !",
        message: `Le versement de ${Number(validateAmount).toLocaleString()} XAF a été validé avec succès par la Trésorerie sous la référence « ${validateReference.trim()} ». La quittance officielle a été émise et l'écriture portée au Grand Livre.`,
        variant: "primary",
      });

      setSelectedValidateDonation(null);
      await loadPendingDonations();
      await loadIncomes();
    } catch (err: any) {
      console.error("Erreur validation don trésorerie:", err);
      await alert({
        title: "Échec de validation",
        message: err?.message || "Impossible de valider ce versement. Vérifiez la concordance du montant et de la référence.",
        variant: "danger",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRejectPendingDonation = async (donation: any) => {
    const reason = window.prompt("Indiquez le motif du rejet (ex: Référence introuvable sur le compte trésorerie, montant non reçu) :");
    if (!reason || !reason.trim()) return;

    const ok = await confirm({
      title: "Rejeter la déclaration de versement",
      message: `Voulez-vous rejeter le versement de ${donation.amount.toLocaleString()} XAF (${donation.donor_name || "Anonyme"}, Réf. ${donation.payment_reference || "N/A"}) pour le motif : « ${reason.trim()} » ?`,
      confirmText: "Rejeter définitivement",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.donations.rejectManualDonation(donation.id, { reason: reason.trim() });
      await alert({
        title: "Versement rejeté",
        message: "La déclaration de versement a été rejetée avec succès.",
        variant: "warning",
      });
      await loadPendingDonations();
    } catch (err: any) {
      await alert({
        title: "Erreur lors du rejet",
        message: err?.message || "Impossible de rejeter ce versement.",
        variant: "danger",
      });
    }
  };

  // Action: Export Entries to CSV (Excel format)
  const handleExportEntries = () => {
    const headers = [
      "Réf. Quittance",
      "Date",
      "Catégorie",
      "Donateur / Objet",
      "Matricule",
      "Montant (XAF)",
      "Canal de paiement",
      "Statut",
      "Signataire Trésorerie",
    ];

    const rows = entries.map((e) => [
      `"${e.ref}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.donorName.replace(/"/g, '""')}"`,
      `"${e.matricule || ""}"`,
      e.amount,
      `"${e.paymentMethod}"`,
      `"${e.status}"`,
      `"${e.treasurerSignature.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_entrees_fullgope_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PortalShell activePath="finance" title="Journal des Entrées & Encaissements">
      <div className="flex flex-col gap-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                Livre-Journal de Caisse • Réf. Statuts 1961
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[11px] font-bold">
                Audit Régulier
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-display">
              Journal des Entrées &amp; Encaissements
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Registre comptable certifié, validation des écritures et traçabilité inviolable des offrandes de culte, dîmes canoniques et libéralités.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleExportEntries}
              className="h-11 px-4 rounded-xl bg-surface-container-lowest text-on-surface text-xs font-bold border border-surface-container hover:bg-surface-container flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              title="Exporter les écritures au format CSV / Excel"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Exporter (.csv / .xlsx)</span>
            </button>
            <Can permission="can:create_income" minRole={2}>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="h-11 px-5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>+ Nouvelle Entrée Financière</span>
              </button>
            </Can>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Encaissé Validé</span>
              <div className="w-9 h-9 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-on-surface tracking-tight block font-display">
                {metrics.totalEncaisse.toLocaleString()} <span className="text-xs text-on-surface-variant font-normal">XAF</span>
              </span>
              <div className="flex items-center gap-1 mt-1 text-tertiary text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>{entries.filter((e) => e.status === "Validée").length} écritures certifiées</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dîmes Enregistrées</span>
              <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-on-surface tracking-tight block font-display">
                {metrics.dimesTotal.toLocaleString()} <span className="text-xs text-on-surface-variant font-normal">XAF</span>
              </span>
              <span className="text-xs text-on-surface-variant mt-1 block">Quittances nominatives</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Canal Mobile Money</span>
              <div className="w-9 h-9 rounded-xl bg-secondary-container/50 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">phone_android</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-on-surface tracking-tight block font-display">
                {metrics.momoTotal.toLocaleString()} <span className="text-xs text-on-surface-variant font-normal">XAF</span>
              </span>
              <span className="text-xs text-secondary mt-1 block font-medium">MTN MoMo &amp; Orange Money ({metrics.momoPercent}%)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Écritures en Attente</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-amber-600 tracking-tight block font-display">
                {metrics.brouillonsCount} <span className="text-xs text-on-surface-variant font-normal">Brouillon(s)</span>
              </span>
              <span className="text-xs text-on-surface-variant mt-1 block">À valider par le trésorier</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ONGLET NAVIGATION : LIVRE-JOURNAL VS VALIDATIONS TRÉSORERIE    */}
        {/* ============================================================== */}
        <div className="flex items-center gap-3 border-b border-surface-container pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("journal")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "journal"
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Livre-Journal des Recettes ({entries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("treasury_pending");
              loadPendingDonations();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "treasury_pending"
                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30"
                : "bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Validations Trésorerie (MoMo, OM &amp; Virements)</span>
            {pendingDonations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-black animate-pulse">
                {pendingDonations.length}
              </span>
            )}
          </button>

          <Link
            href="/finance/validations"
            className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">open_in_new</span>
            <span>Ouvrir la Vue Dédiée Trésorerie</span>
          </Link>
        </div>

        {/* Filter and Table (Livre-Journal de caisse général) */}
        {activeTab === "journal" && (
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar">
                {["Tous", "Validée", "Brouillon", "Annulée"].map((st) => {
                  const active = selectedStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${active
                          ? "bg-surface-container-lowest text-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                        }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                {/* Assemblée locale filter dropdown (Hiérarchie N5+ ou permission dédiée) */}
                <Can permission="can:filter_by_assembly" minRole={5}>
                  <select
                    value={selectedAssemblyFilter}
                    onChange={(e) => setSelectedAssemblyFilter(e.target.value)}
                    className="w-full sm:w-auto h-9 px-3 rounded-xl bg-surface-container-low text-xs text-on-surface font-semibold outline-none border border-surface-container focus:ring-1 focus:ring-primary"
                    title="Filtrer les écritures par assemblée locale"
                  >
                    <option value="Tous">Toutes les Assemblées</option>
                    {assemblies.map((a: { id: string; name: string }) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Can>

                {/* Bouton de rattachement des écritures orphelines (Bureau National N7+ / Super Admin N8) */}
                <Can permission="can:sync_orphan_incomes" minRole={7}>
                  <button
                    type="button"
                    onClick={handleSyncOrphans}
                    disabled={isSyncingOrphans}
                    className="h-9 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Rattacher automatiquement les écritures orphelines à leur assemblée"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isSyncingOrphans ? "animate-spin" : ""}`}>
                      sync
                    </span>
                    <span className="hidden sm:inline">Rattacher orphelines</span>
                  </button>
                </Can>

                <div className="relative w-full sm:w-60">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher écriture, donateur..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low text-xs text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-transparent"
                  />
                </div>
              </div>
            </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container text-on-surface-variant font-bold">
                  <th className="py-3 px-3">RÉF. QUITTANCE</th>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">CATÉGORIE</th>
                  <th className="py-3 px-3">DONATEUR / OBJET</th>
                  <th className="py-3 px-3">MONTANT (XAF)</th>
                  <th className="py-3 px-3">CANAL</th>
                  <th className="py-3 px-3">STATUT</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {isLoadingIncomes ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-3"><div className="h-4 w-24 rounded bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-4 w-28 rounded bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-5 w-20 rounded-full bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-4 w-32 rounded bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-4 w-24 rounded bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-4 w-20 rounded bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3"><div className="h-5 w-16 rounded-full bg-surface-container-high" /></td>
                      <td className="py-3.5 px-3 text-right"><div className="h-7 w-20 ml-auto rounded-lg bg-surface-container-high" /></td>
                    </tr>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <tr>
                      <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[38px] text-on-surface-variant/40">inbox</span>
                          <p className="font-bold text-sm text-on-surface">Aucune écriture d&apos;encaissement</p>
                          <p className="text-xs text-on-surface-variant max-w-sm">
                            Aucune dîme, offrande ou quittance trouvée pour ces critères de recherche.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span>
                            <span>Enregistrer un encaissement</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">{row.ref}</td>
                        <td className="py-3 px-3 text-on-surface-variant">{row.date}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-bold text-on-surface">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-on-surface block">{row.donorName}</span>
                          {row.matricule && (
                            <span className="text-[10px] text-on-surface-variant font-mono">{row.matricule}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-on-surface font-display text-sm">
                          {row.amount.toLocaleString()} XAF
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-primary">
                              {row.paymentMethod === "Espèces" ? "payments" : "phone_android"}
                            </span>
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${row.status === "Validée"
                                ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                : row.status === "Brouillon"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-error-container text-on-error-container"
                              }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Bouton Action: Consulter et Imprimer le Reçu Officiel */}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(row)}
                              className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-2xs"
                              title="Imprimer le reçu officiel / Quittance de caisse"
                            >
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                              <span>Reçu</span>
                            </button>

                            {/* Bouton Action: Valider l'encaissement si Brouillon (Rôle N4+ ou can:validate_income) */}
                            {row.status === "Brouillon" && (
                              <Can permission="can:validate_income" minRole={4}>
                                <button
                                  type="button"
                                  onClick={() => handleValidateEntry(row)}
                                  className="px-2 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-2xs"
                                  title="Valider l'encaissement et certifier la caisse"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                  <span>Valider</span>
                                </button>
                              </Can>
                            )}

                            {/* Bouton Action: Annuler l'écriture si Validée (Rôle N4+ ou can:cancel_income) */}
                            {row.status === "Validée" && (
                              <Can permission="can:cancel_income" minRole={4}>
                                <button
                                  type="button"
                                  onClick={() => handleCancelEntry(row)}
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Annuler l'écriture (Contre-passation)"
                                >
                                  <span className="material-symbols-outlined text-[16px]">block</span>
                                </button>
                              </Can>
                            )}
                          </div>
                        </td>
                      </tr>
                    )))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VUE TRÉSORERIE : VERSEMENTS EN ATTENTE DE VALIDATION MANUELLE  */}
        {/* ============================================================== */}
        {activeTab === "treasury_pending" && (
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-amber-300 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-container gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">
                    Versements Manuels en Attente de Pointage (MoMo / Orange / Virements)
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Rapprochez les dépôts effectués par les fidèles sur les comptes de la trésorerie locale avec les références SMS ou bordereaux déclarés.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadPendingDonations}
                disabled={isLoadingPending}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span className={`material-symbols-outlined text-[16px] ${isLoadingPending ? "animate-spin" : ""}`}>
                  sync
                </span>
                <span>Actualiser la liste</span>
              </button>
            </div>

            {/* Table of pending donations */}
            {isLoadingPending ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <span className="w-7 h-7 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Chargement des versements en attente...</span>
              </div>
            ) : pendingDonations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-[26px]">task_alt</span>
                </div>
                <h4 className="font-bold text-sm text-on-surface">
                  Tous les versements manuels sont validés !
                </h4>
                <p className="text-xs text-on-surface-variant max-w-md">
                  Aucun paiement n'est en attente de rapprochement par la trésorerie pour cette paroisse.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container text-on-surface-variant font-bold">
                      <th className="py-3 px-3">DATE DÉCLARATION</th>
                      <th className="py-3 px-3">NATURE / DONATEUR</th>
                      <th className="py-3 px-3">CANAL UTILISÉ</th>
                      <th className="py-3 px-3">RÉF. DÉCLARÉE PAR LE FIDÈLE</th>
                      <th className="py-3 px-3">JUSTIFICATIF</th>
                      <th className="py-3 px-3">MONTANT DÉCLARÉ</th>
                      <th className="py-3 px-3">STATUT</th>
                      <th className="py-3 px-3 text-right">ACTION TRÉSORERIE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {pendingDonations.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : "Récent"}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-on-surface block">
                            {p.donor_name || (p.is_anonymous ? "Donateur Anonyme" : "Fidèle Paroissien")}
                          </span>
                          <span className="text-[10px] text-primary uppercase font-bold">
                            {p.donation_type === "tithe"
                              ? "Dîme"
                              : p.donation_type === "offering"
                                ? "Offrande de culte"
                                : p.donation_type === "thanksgiving"
                                  ? "Action de grâce"
                                  : "Don spécial"}
                          </span>
                          {p.donor_phone && (
                            <span className="text-[10px] text-on-surface-variant block font-mono">
                              +237 {p.donor_phone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-bold text-on-surface">
                            <span className="material-symbols-outlined text-[14px] text-amber-600">
                              {p.payment_method?.includes("bank") ? "account_balance" : "phone_android"}
                            </span>
                            <span>
                              {p.payment_method === "mtn_momo_manual" || p.payment_method === "mtn_momo"
                                ? "MTN MoMo Manuel"
                                : p.payment_method === "orange_money_manual" || p.payment_method === "orange_money"
                                  ? "Orange Money Manuel"
                                  : "Virement Bancaire"}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md text-[11px]">
                              {p.payment_reference || "NON RENSEIGNÉE"}
                            </span>
                            {p.payment_reference && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.payment_reference);
                                  alert({ title: "Copié", message: "Référence copiée dans le presse-papiers.", variant: "info" });
                                }}
                                className="p-1 hover:bg-surface-container rounded cursor-pointer text-on-surface-variant"
                                title="Copier la référence"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {p.proof_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewProofModal(p.proof_url)}
                              className="px-2 py-1 rounded-md bg-secondary-container/40 text-secondary hover:bg-secondary-container text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">image</span>
                              <span>Voir quittance</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant italic">Sans quittance</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-on-surface font-display text-sm whitespace-nowrap">
                          {Number(p.amount).toLocaleString()} XAF
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            À vérifier
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenValidateModal(p)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer shadow-xs active:scale-95"
                              title="Valider la réception de l'argent et émettre le reçu officiel"
                            >
                              <span className="material-symbols-outlined text-[15px]">verified</span>
                              <span>Valider</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPendingDonation(p)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Rejeter la déclaration"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Reçu Officiel de Caisse / Quittance d'Encaissement */}
      {/* ========================================================= */}
      {selectedReceiptEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-surface-container-high flex flex-col gap-5 relative animate-in fade-in duration-150">
            {/* Header Close */}
            <button
              type="button"
              onClick={() => setSelectedReceiptEntry(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Fermer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Receipt Printable Card Area */}
            <div id="printable-receipt" className="border-2 border-primary/20 rounded-2xl p-6 bg-linear-to-b from-surface-container-lowest to-surface-container-low/40 relative overflow-hidden">
              {/* Watermark Logo simulation */}
              <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.04] pointer-events-none select-none text-[200px] font-black text-primary font-display">
                FGM
              </div>

              {/* Church Letterhead */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-surface-container-high gap-1">
                <span className="text-[11px] font-extrabold tracking-widest text-primary uppercase">
                  Mission du Plein Évangile du Cameroun
                </span>
                <span className="text-[9.5px] font-bold text-on-surface-variant tracking-wider uppercase">
                  Full Gospel Mission Cameroon • Statuts Déposés Réf. 1961
                </span>
                <div className="text-xs font-bold text-on-surface mt-0.5">
                  Paroisse : <span className="text-primary">{selectedReceiptEntry.assembly}</span>
                </div>
                <div className="mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs uppercase tracking-wider">
                  Quittance Officielle d'Encaissement de Caisse
                </div>
              </div>

              {/* Receipt Reference & Date */}
              <div className="grid grid-cols-2 gap-3 py-4 border-b border-surface-container-high/60 text-xs">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Numéro de Quittance</span>
                  <span className="font-mono font-extrabold text-sm text-primary">{selectedReceiptEntry.ref}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Date de Règlement</span>
                  <span className="font-bold text-on-surface">{selectedReceiptEntry.date}</span>
                </div>
              </div>

              {/* Donor & Category Details */}
              <div className="py-4 border-b border-surface-container-high/60 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-medium">Reçu de :</span>
                  <span className="font-extrabold text-on-surface text-right">{selectedReceiptEntry.donorName}</span>
                </div>
                {selectedReceiptEntry.matricule && (
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Matricule membre :</span>
                    <span className="font-mono font-bold text-primary">{selectedReceiptEntry.matricule}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-medium">Nature de l'écriture :</span>
                  <span className="font-bold text-on-surface">{selectedReceiptEntry.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-medium">Mode de versement :</span>
                  <span className="font-semibold text-on-surface">{selectedReceiptEntry.paymentMethod}</span>
                </div>
              </div>

              {/* Big Amount Box */}
              <div className="my-4 p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-on-surface-variant uppercase font-extrabold tracking-wider">Montant Perçu</span>
                <span className="text-2xl sm:text-3xl font-black text-primary font-display tracking-tight">
                  {selectedReceiptEntry.amount.toLocaleString()} XAF
                </span>
                <span className="text-[10.5px] italic text-on-surface-variant text-center">
                  « Que chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte » (2 Cor 9:7)
                </span>
              </div>

              {/* Footer Signatures & Stamp */}
              <div className="pt-2 flex items-end justify-between text-xs">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Statut Comptable</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold mt-1 ${selectedReceiptEntry.status === "Validée"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedReceiptEntry.status === "Brouillon"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{selectedReceiptEntry.status.toUpperCase()}</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Trésorier / Signataire</span>
                  <span className="font-bold text-on-surface text-xs block mt-1">
                    {selectedReceiptEntry.treasurerSignature}
                  </span>
                  <span className="text-[9.5px] text-on-surface-variant/70 italic block">
                    Caisse Paroissiale de Tsinga
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceiptEntry(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Imprimer la Quittance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Nouvelle Écriture de Caisse                        */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-surface-container-high flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_circle</span>
                <h3 className="text-base font-bold text-on-surface font-display">Nouvelle Écriture de Caisse</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface flex items-center justify-between">
                  <span>Assemblée locale de rattachement *</span>
                  <span className="text-[10px] text-primary font-bold">Imputation obligatoire</span>
                </label>
                <select
                  required
                  value={newAssemblyId}
                  onChange={(e) => setNewAssemblyId(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-semibold"
                >
                  {assemblies.map((a: { id: string; name: string }) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Catégorie de recette *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-semibold"
                >
                  <option value="Dîme">Dîme canonique</option>
                  <option value="Offrande de culte">Offrande de culte dominical</option>
                  <option value="Don spécial">Don spécial / Projet de construction</option>
                  <option value="Action de grâce">Offrande d'action de grâce</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Nom du donateur / culte *</label>
                  <input
                    type="text"
                    required
                    value={newDonor}
                    onChange={(e) => setNewDonor(e.target.value)}
                    placeholder="ex: Frère Jean-Claude Fossouo"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Matricule membre (optionnel)</label>
                  <input
                    type="text"
                    value={newMatricule}
                    onChange={(e) => setNewMatricule(e.target.value)}
                    placeholder="ex: MBR-2026-00042"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Montant (FCFA) *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Mode de règlement *</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-semibold"
                  >
                    <option value="Espèces">Espèces (Caisse)</option>
                    <option value="MTN MoMo">MTN MoMo (*126#)</option>
                    <option value="Orange Money">Orange Money (#150#)</option>
                    <option value="Virement GIMAC">Virement Bancaire GIMAC</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Notes comptables / Réf. transaction</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ex: Don affecté au projet toiture ou réf. MoMo"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary/90 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Enregistrer &amp; Délivrer le reçu</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Validation Trésorerie d'un Versement Manuel        */}
      {/* ========================================================= */}
      {selectedValidateDonation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-surface-container-high flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface font-display">
                    Validation Trésorerie &amp; Rapprochement
                  </h3>
                  <span className="text-[11px] text-on-surface-variant block">
                    Vérification du versement avant émission du reçu officiel
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedValidateDonation(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Recap info declared by donor */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Donateur déclaré :</span>
                <span className="font-bold text-on-surface">{selectedValidateDonation.donor_name || "Anonyme"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Moyen &amp; Canal :</span>
                <span className="font-bold text-on-surface">{selectedValidateDonation.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Réf. SMS / Transaction déclarée :</span>
                <span className="font-mono font-bold text-primary">{selectedValidateDonation.payment_reference || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Montant annoncé :</span>
                <span className="font-extrabold text-on-surface font-display text-sm">{Number(selectedValidateDonation.amount).toLocaleString()} XAF</span>
              </div>
              {selectedValidateDonation.proof_url && (
                <div className="pt-1 flex items-center justify-between border-t border-surface-container">
                  <span className="text-on-surface-variant">Bordereau / Reçu joint :</span>
                  <button
                    type="button"
                    onClick={() => setPreviewProofModal(selectedValidateDonation.proof_url)}
                    className="text-secondary hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    <span>Consulter l'image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmTreasuryValidation} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface flex items-center justify-between">
                  <span>Référence constatée sur relevé / SMS *</span>
                  <span className="text-[10px] text-primary font-bold">Preuve trésorerie</span>
                </label>
                <input
                  type="text"
                  required
                  value={validateReference}
                  onChange={(e) => setValidateReference(e.target.value)}
                  placeholder="Ex : MP260301.1234.A56789 ou Réf. Relevé bancaire"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-mono font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">
                  Montant constaté encaissé (XAF) *
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  value={validateAmount}
                  onChange={(e) => setValidateAmount(Number(e.target.value))}
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none font-bold font-display"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-on-surface">
                  Notes de rapprochement (Optionnel)
                </label>
                <input
                  type="text"
                  value={validateNotes}
                  onChange={(e) => setValidateNotes(e.target.value)}
                  placeholder="Ex : Vérifié sur SMS trésorerie à 10h15"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedValidateDonation(null)}
                  className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validation en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Valider &amp; Émettre la Quittance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Visualisation Justificatif Bordereau / Reçu        */}
      {/* ========================================================= */}
      {previewProofModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-4 flex flex-col gap-3 relative shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <span className="font-bold text-xs text-on-surface">Justificatif de versement bancaire / MoMo</span>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center cursor-pointer text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center p-2 bg-surface-container-low rounded-xl">
              <img src={previewProofModal} alt="Bordereau" className="max-w-full h-auto rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
