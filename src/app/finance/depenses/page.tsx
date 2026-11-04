"use client";

import React, { useState, useEffect } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { api, getStoredUser } from "@/lib/api";
import { Can } from "@/components/auth/Can";
import {
  can,
  getUserRoleLevel,
  getActiveRole,
  isTreasurer,
  hasRoleCode,
  RoleLevel,
} from "@/lib/permissions";

interface ExpenseVoucher {
  id: string;
  code: string;
  category: "Travaux & Entretien" | "Liturgie & Culte" | "Social & Assistance" | "Évangélisation";
  motive: string;
  applicant: string;
  amount: number;
  date: string;
  status: "En attente" | "Visé Trésorier" | "Approuvé Pasteur" | "Décaissé" | "Rejeté";
  level?: "department" | "assembly" | "district" | "region" | "national";
  levelLabel?: string;
  firstSignatory: {
    name: string;
    signed: boolean;
    date?: string;
    comment?: string;
  };
  secondSignatory: {
    name: string;
    signed: boolean;
    date?: string;
    comment?: string;
  };
  disbursementDetails?: {
    method?: string;
    comment?: string;
    date?: string;
    receiptRef?: string;
  };
}

interface TreasuryBalances {
  cash: number;
  bank: number;
  wallet: number;
  wallet_mtn: number;
  wallet_orange: number;
  total: number;
}

export default function DepensesPage() {
  const { alert, confirm } = useConfirm();
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseVoucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);

  // New voucher form
  const [newMotive, setNewMotive] = useState("");
  const [newAmount, setNewAmount] = useState<number>(75000);
  const [newCategory, setNewCategory] = useState<ExpenseVoucher["category"]>("Travaux & Entretien");
  const [newApplicant, setNewApplicant] = useState("");
  const [newLevel, setNewLevel] = useState<"department" | "assembly" | "district" | "region" | "national">("assembly");

  // Multi-tier Treasury Balances state (Différenciation Caisse / Banque / Wallet)
  const [balances, setBalances] = useState<TreasuryBalances>({
    cash: 0,
    bank: 0,
    wallet: 0,
    wallet_mtn: 0,
    wallet_orange: 0,
    total: 0,
  });

  // SasPay disbursement state
  const [isSasPayModalOpen, setIsSasPayModalOpen] = useState(false);
  const [saspayVoucher, setSaspayVoucher] = useState<ExpenseVoucher | null>(null);
  const [saspayNetwork, setSaspayNetwork] = useState<"mtn_cm" | "orange_cm">("mtn_cm");
  const [saspayPhone, setSaspayPhone] = useState("");
  const [saspayName, setSaspayName] = useState("");
  const [saspayAmount, setSaspayAmount] = useState<number>(50000);
  const [saspayReason, setSaspayReason] = useState("");
  const [isSubmittingSasPay, setIsSubmittingSasPay] = useState(false);
  const [saspayBalance, setSaspayBalance] = useState<number | null>(null);

  // Sync backend expenses & multi-account balances on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendExpenses() {
      try {
        const res = await api.finance.listExpenses();
        const list = (res.data as any)?.expenses || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0 && isMounted) {
          const catMap: Record<string, ExpenseVoucher["category"]> = {
            works: "Travaux & Entretien",
            worship: "Liturgie & Culte",
            social: "Social & Assistance",
            mission: "Évangélisation",
          };

          const mapped: ExpenseVoucher[] = list.map((exp: any) => ({
            id: exp.id,
            code: exp.voucher_number || `BON-${exp.created_at?.slice(0, 7) || "2026"}-${exp.id.slice(0, 4).toUpperCase()}`,
            category: catMap[exp.category] || "Travaux & Entretien",
            motive: exp.description || exp.motive || "Dépense autorisée",
            applicant: exp.applicant_name || "Trésorerie Paroissiale",
            amount: Number(exp.amount) || 0,
            date: exp.created_at ? new Date(exp.created_at).toLocaleDateString("fr-FR") : "Aujourd'hui",
            status: exp.status === "disbursed" ? "Décaissé" : exp.status === "approved" ? "Approuvé Pasteur" : exp.status === "rejected" ? "Rejeté" : "En attente",
            level: exp.department_id ? "department" : (exp.node_type || "assembly"),
            levelLabel: exp.department_id ? "Département" : (exp.node_type === "district" ? "District" : exp.node_type === "region" ? "Région" : "Paroisse Locale"),
            firstSignatory: {
              name: "Diacre Ebogo (Trésorier)",
              signed: true,
              date: "Certifié",
              comment: "Crédits et trésorerie vérifiés.",
            },
            secondSignatory: {
              name: exp.node_type === "district" ? "Surintendant de District (N5)" : exp.node_type === "region" ? "Surintendant Régional (N6)" : exp.node_type === "national" ? "Bureau Exécutif (N7)" : "Rev. Pasteur Titulaire (N4)",
              signed: exp.status === "approved" || exp.status === "disbursed",
              date: exp.approved_at ? new Date(exp.approved_at).toLocaleDateString("fr-FR") : undefined,
              comment: exp.approval_comment || exp.comments || undefined,
            },
            disbursementDetails: exp.status === "disbursed" ? {
              method: exp.payment_method === "cash" ? "Espèces (Caisse Locale)" : "SasPay Mobile Money",
              comment: exp.disbursement_comment || exp.comments,
              date: exp.disbursed_at ? new Date(exp.disbursed_at).toLocaleDateString("fr-FR") : undefined,
            } : undefined,
          }));

          setVouchers(mapped);
          setSelectedVoucher((prev) => (prev ? (mapped.find((m) => m.id === prev.id) || mapped[0] || null) : mapped[0] || null));
        } else {
          setVouchers([]);
          setSelectedVoucher(null);
        }
      } catch (err) {
        console.warn("Erreur chargement dépenses backend:", err);
        setVouchers([]);
        setSelectedVoucher(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBackendExpenses();

    // Query Treasury Breakdown (Banque vs Wallet vs Espèces)
    api.finance.getBalancesBreakdown().then((res: any) => {
      const b = res.data?.balances;
      if (b && isMounted) {
        setBalances({
          cash: Number(b.balance_cash) || 0,
          bank: Number(b.balance_bank) || 0,
          wallet: Number(b.balance_wallet) || 0,
          wallet_mtn: Number(b.balance_wallet_mtn) || 0,
          wallet_orange: Number(b.balance_wallet_orange) || 0,
          total: Number(b.total_available) || 0,
        });
      }
    }).catch(() => {});

    // Query SasPay Treasury Balance
    api.finance.getSasPayBalance().then((res: any) => {
      const bal = res.data?.available_balance ?? res.data?.balance?.available_balance;
      if (typeof bal === "number" && isMounted) {
        setSaspayBalance(bal);
      }
    }).catch(() => {});

    // Abonnement au flux Server-Sent Events (SSE) pour les décaissements et actualisations de solde
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== "undefined" && window.EventSource) {
        eventSource = new EventSource(api.finance.getFinanceStreamUrl());
        eventSource.addEventListener("disbursement_completed", () => {
          if (!isMounted) return;
          loadBackendExpenses();
          api.finance.getBalancesBreakdown().then((res: any) => {
            const b = res.data?.balances;
            if (b && isMounted) {
              setBalances({
                cash: Number(b.balance_cash) || 0,
                bank: Number(b.balance_bank) || 0,
                wallet: Number(b.balance_wallet) || 0,
                wallet_mtn: Number(b.balance_wallet_mtn) || 0,
                wallet_orange: Number(b.balance_wallet_orange) || 0,
                total: Number(b.total_available) || 0,
              });
            }
          }).catch(() => {});
        });
      }
    } catch {
      // Ignorer si SSE non disponible
    }

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
    };
  }, []);

  // Permissions & Rôle Actif en session
  const activeRole = getActiveRole();
  const userLvl = getUserRoleLevel();
  const userIsTreasurer = isTreasurer();

  // En vertu de la séparation des ordonnateurs et comptables (Manuel de Discipline 1961 / F-605) :
  // Le Trésorier assure le Visa 1 (certification des fonds) et le décaissement final.
  // Le Trésorier ne peut JAMAIS apposer le Visa 2 d'ordonnancement à la place du Pasteur !
  const isBlockedBecauseTreasurer = userIsTreasurer && userLvl < RoleLevel.SUPER_ADMIN;

  // Validation modal state (revue complète des éléments + saisie d'un commentaire obligatoire)
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationMode, setValidationMode] = useState<"approve" | "disburse_cash" | "reject">("approve");
  const [validationVoucher, setValidationVoucher] = useState<ExpenseVoucher | null>(null);
  const [validationComment, setValidationComment] = useState("");
  const [validationReceiptRef, setValidationReceiptRef] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const openValidationModal = (mode: "approve" | "disburse_cash" | "reject", voucher: ExpenseVoucher) => {
    setValidationMode(mode);
    setValidationVoucher(voucher);
    setValidationComment("");
    setValidationReceiptRef("");
    setValidationModalOpen(true);
  };

  const getRequiredValidatorLabel = (voucher: ExpenseVoucher | { level?: string }) => {
    if (voucher.level === "district") {
      return "Surintendant de District (N5)";
    }
    if (voucher.level === "region") {
      return "Surintendant Régional (N6)";
    }
    if (voucher.level === "national") {
      return "Bureau Exécutif National (N7)";
    }
    return "Pasteur Titulaire (N4)";
  };

  const getMinRoleForLevel = (level?: string): number => {
    if (level === "district") return RoleLevel.DISTRICT_LEADER; // 5
    if (level === "region") return RoleLevel.REGIONAL_LEADER; // 6
    if (level === "national") return RoleLevel.NATIONAL_BUREAU; // 7
    return RoleLevel.ASSEMBLY_LEADER; // 4 - Pasteur Titulaire (Paroisse ET Départements)
  };

  const filteredVouchers = vouchers.filter((v) => {
    if (filterStatus !== "Tous" && v.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMotive = v.motive.toLowerCase().includes(q);
      const matchCode = v.code.toLowerCase().includes(q);
      const matchApplicant = v.applicant.toLowerCase().includes(q);
      if (!matchMotive && !matchCode && !matchApplicant) return false;
    }
    return true;
  });

  // Action financière : Traitement avec consultation des éléments et commentaire obligatoire
  const handleConfirmValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationVoucher) return;

    const trimmedComment = validationComment.trim();
    if (trimmedComment.length < 8) {
      await alert({
        title: "Commentaire Obligatoire",
        message: "En vertu des règles de gouvernance MPEC, un commentaire circonstancié d'au moins 8 caractères est obligatoire avant toute validation, rejet ou décaissement.",
        variant: "warning",
      });
      return;
    }

    setIsValidating(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(validationVoucher.id);

      if (validationMode === "approve") {
        if (isUuid) {
          await api.finance.decideExpense(validationVoucher.id, {
            is_approved: true,
            decision: "approved",
            comments: trimmedComment,
          });
        }

        const updated: ExpenseVoucher = {
          ...validationVoucher,
          status: "Approuvé Pasteur",
          secondSignatory: {
            name: activeRole?.name || getRequiredValidatorLabel(validationVoucher),
            signed: true,
            date: new Date().toLocaleDateString("fr-FR"),
            comment: trimmedComment,
          },
        };

        setVouchers((prev) => prev.map((v) => (v.id === validationVoucher.id ? updated : v)));
        if (selectedVoucher?.id === validationVoucher.id) {
          setSelectedVoucher(updated);
        }
        setValidationModalOpen(false);

        await alert({
          title: "Visa d'Ordonnancement Apposé",
          message: `Le bon ${validationVoucher.code} (${validationVoucher.amount.toLocaleString()} XAF) a été ordonnancé par l'autorité pastorale.\n\nAvis officiel consigné : « ${trimmedComment} »`,
          variant: "primary",
        });
      } else if (validationMode === "disburse_cash") {
        if (balances.cash < validationVoucher.amount) {
          await alert({
            title: "Solde Caisse Espèces Insuffisant",
            message: `La caisse physique ne dispose que de ${balances.cash.toLocaleString()} XAF disponibles (besoin de ${validationVoucher.amount.toLocaleString()} XAF). Veuillez approvisionner la caisse locale ou procéder par virement Mobile Money (SasPay).`,
            variant: "warning",
          });
          setIsValidating(false);
          return;
        }

        if (isUuid) {
          await api.finance.disburseExpense(validationVoucher.id, {
            payment_method: "cash",
            comments: trimmedComment,
            receipt_ref: validationReceiptRef.trim(),
          });
        }

        const updated: ExpenseVoucher = {
          ...validationVoucher,
          status: "Décaissé",
          disbursementDetails: {
            method: "Espèces (Caisse Locale)",
            comment: trimmedComment,
            receiptRef: validationReceiptRef.trim() || undefined,
            date: new Date().toLocaleDateString("fr-FR"),
          },
        };

        setVouchers((prev) => prev.map((v) => (v.id === validationVoucher.id ? updated : v)));
        if (selectedVoucher?.id === validationVoucher.id) {
          setSelectedVoucher(updated);
        }

        // Débit de la caisse physique locale
        setBalances((prev) => ({
          ...prev,
          cash: Math.max(0, prev.cash - validationVoucher.amount),
          total: Math.max(0, prev.total - validationVoucher.amount),
        }));

        setValidationModalOpen(false);

        await alert({
          title: "Fonds Espèces Décaissés",
          message: `La sortie de caisse de ${validationVoucher.amount.toLocaleString()} XAF a été enregistrée pour ${validationVoucher.applicant}.\n\nDécharge : « ${trimmedComment} »`,
          variant: "primary",
        });
      } else if (validationMode === "reject") {
        if (isUuid) {
          await api.finance.decideExpense(validationVoucher.id, {
            is_approved: false,
            decision: "rejected",
            rejection_reason: trimmedComment,
            comments: trimmedComment,
          });
        }

        const updated: ExpenseVoucher = {
          ...validationVoucher,
          status: "Rejeté",
          secondSignatory: {
            name: activeRole?.name || getRequiredValidatorLabel(validationVoucher),
            signed: false,
            date: new Date().toLocaleDateString("fr-FR"),
            comment: trimmedComment,
          },
        };

        setVouchers((prev) => prev.map((v) => (v.id === validationVoucher.id ? updated : v)));
        if (selectedVoucher?.id === validationVoucher.id) {
          setSelectedVoucher(updated);
        }
        setValidationModalOpen(false);

        await alert({
          title: "Demande de Dépense Rejetée",
          message: `Le bon ${validationVoucher.code} a été rejeté.\n\nMotif notifié : « ${trimmedComment} »`,
          variant: "warning",
        });
      }
    } catch (err: any) {
      console.error("Erreur validation dépense:", err);
      await alert({
        title: "Échec de l'opération",
        message: err?.message || "Le serveur a refusé de valider l'opération.",
        variant: "danger",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Action financière SasPay: Décaissement Mobile Money
  const openDirectSasPayModal = () => {
    setSaspayVoucher(null);
    setSaspayNetwork("mtn_cm");
    setSaspayPhone("");
    setSaspayName("");
    setSaspayAmount(50000);
    setSaspayReason("");
    setIsSasPayModalOpen(true);
  };

  const openVoucherSasPayModal = (v: ExpenseVoucher) => {
    setSaspayVoucher(v);
    const isMtn = v.applicant.toLowerCase().includes("mtn");
    setSaspayNetwork(isMtn ? "mtn_cm" : "orange_cm");
    setSaspayPhone("");
    setSaspayName(v.applicant);
    setSaspayAmount(v.amount);
    setSaspayReason(v.motive);
    setIsSasPayModalOpen(true);
  };

  const handleExecuteSasPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saspayPhone.trim()) {
      await alert({
        title: "Numéro requis",
        message: "Veuillez renseigner le numéro de téléphone Mobile Money (MTN ou Orange) du bénéficiaire.",
        variant: "warning",
      });
      return;
    }

    const netLabel = saspayNetwork === "mtn_cm" ? "MTN Mobile Money" : "Orange Money";

    // Contrôle préalable strict du solde Wallet Mobile Money (Différenciation de soldes)
    if (balances.wallet < Number(saspayAmount)) {
      await alert({
        title: "Solde Wallet Mobile Money Insuffisant",
        message: `Le solde disponible sur votre compte Wallet Mobile Money (${netLabel}) n'est que de ${balances.wallet.toLocaleString()} XAF (montant requis : ${Number(saspayAmount).toLocaleString()} XAF).\n\nLe solde bancaire (${balances.bank.toLocaleString()} XAF) et la caisse physique ne peuvent être imputés pour un virement SasPay direct.`,
        variant: "warning",
      });
      return;
    }

    const ok = await confirm({
      title: "Confirmer le Virement SasPay Mobile Money",
      message: `Êtes-vous sûr d'ordonnancer le virement sortant direct de ${Number(saspayAmount).toLocaleString()} XAF vers ${saspayName} (${saspayPhone} via ${netLabel}) ?\n\nCette opération débitera exclusivement le compte Wallet Mobile Money de l'Église et scellera l'écriture comptable.`,
      confirmText: `Exécuter le Virement (${netLabel})`,
      variant: "primary",
    });

    if (!ok) return;

    setIsSubmittingSasPay(true);
    try {
      let result: any = null;
      const isUuid = saspayVoucher && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saspayVoucher.id);

      if (saspayVoucher && isUuid) {
        const res = await api.finance.disburseExpenseSasPay(saspayVoucher.id, {
          network: saspayNetwork,
          beneficiary_phone: saspayPhone,
          beneficiary_name: saspayName,
        });
        result = res.data;
      } else {
        const res = await api.finance.disburseSasPay({
          amount: Number(saspayAmount),
          network: saspayNetwork,
          beneficiary_phone: saspayPhone,
          beneficiary_name: saspayName,
          reason: saspayReason || "Décaissement d'urgence / assistance pastorale",
          node_type: saspayVoucher?.level || "assembly",
        });
        result = res.data;
      }

      if (saspayVoucher) {
        const updated = { ...saspayVoucher, status: "Décaissé" as const };
        setVouchers((prev) => prev.map((item) => (item.id === saspayVoucher.id ? updated : item)));
        if (selectedVoucher?.id === saspayVoucher.id) {
          setSelectedVoucher(updated);
        }
      } else {
        const newV: ExpenseVoucher = {
          id: result?.disbursement?.id || `vch-${Date.now()}`,
          code: result?.disbursement?.voucher_number || `BON-SP-${Math.floor(100 + Math.random() * 900)}`,
          category: "Social & Assistance",
          motive: saspayReason || "Décaissement Mobile Money SasPay",
          applicant: saspayName || "Bénéficiaire MoMo",
          amount: Number(saspayAmount),
          date: "Aujourd'hui",
          status: "Décaissé",
          level: "assembly",
          levelLabel: "Paroisse Locale",
          firstSignatory: {
            name: "Trésorier Titulaire",
            signed: true,
            date: "Aujourd'hui",
          },
          secondSignatory: {
            name: "Rev. Pasteur Titulaire",
            signed: true,
            date: "Aujourd'hui",
          },
        };
        setVouchers((prev) => [newV, ...prev]);
        setSelectedVoucher(newV);
      }

      setIsSasPayModalOpen(false);

      const txId = result?.disbursement?.payout_id || result?.payout_id || "SP-MOMO-" + Date.now();
      await alert({
        title: "Virement SasPay Effectué avec Succès !",
        message: `Le décaissement de ${Number(saspayAmount).toLocaleString()} XAF vers ${saspayName} (${saspayPhone} via ${netLabel}) a été validé et ordonnancé.\n\nRéférence Payout : ${txId}\nLe compte Wallet Mobile Money a été débité.`,
        variant: "primary",
      });

      // Refresh breakdown balances
      api.finance.getBalancesBreakdown().then((bRes: any) => {
        const b = bRes.data?.balances;
        if (b) {
          setBalances({
            cash: Number(b.balance_cash) || 0,
            bank: Number(b.balance_bank) || 0,
            wallet: Number(b.balance_wallet) || 0,
            wallet_mtn: Number(b.balance_wallet_mtn) || 0,
            wallet_orange: Number(b.balance_wallet_orange) || 0,
            total: Number(b.total_available) || 0,
          });
        }
      }).catch(() => {});
    } catch (err: any) {
      console.error("Erreur décaissement SasPay:", err);
      await alert({
        title: "Échec du Virement SasPay",
        message: err?.message || "Une anomalie est survenue lors de l'exécution du décaissement SasPay.",
        variant: "danger",
      });
    } finally {
      setIsSubmittingSasPay(false);
    }
  };

  // Action financière 4: Création d'un nouvel engagement de dépense (F-602)
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();

    const levelLabels: Record<string, string> = {
      department: "Département / Ministère",
      assembly: "Assemblée Locale",
      district: "District Ecclésiastique",
      region: "Région Ecclésiastique",
      national: "Bureau Exécutif National",
    };

    const ok = await confirm({
      title: "Confirmer l'engagement de dépense",
      message: `Confirmez-vous l'engagement financier de ${Number(newAmount).toLocaleString()} XAF au niveau « ${levelLabels[newLevel]} » sous la rubrique « ${newCategory} » au motif de : « ${newMotive} » pour « ${newApplicant || "Ouvrier"} » ?\n\nCe bon sera soumis au visa de : ${getRequiredValidatorLabel({ level: newLevel } as any)}.`,
      confirmText: "Confirmer l'engagement",
      variant: "primary",
    });

    if (!ok) return;

    const newV: ExpenseVoucher = {
      id: `vch-${Date.now()}`,
      code: `BON-2026-03-0${Math.floor(20 + Math.random() * 80)}`,
      category: newCategory,
      motive: newMotive,
      applicant: newApplicant || "Ouvrier Paroissial",
      amount: Number(newAmount),
      date: "Aujourd'hui",
      status: "En attente",
      level: newLevel,
      levelLabel: levelLabels[newLevel],
      firstSignatory: {
        name: "Diacre Ebogo (Trésorier)",
        signed: true,
        date: "Aujourd'hui",
      },
      secondSignatory: {
        name: getRequiredValidatorLabel({ level: newLevel } as any),
        signed: false,
      },
    };

    setVouchers([newV, ...vouchers]);
    setSelectedVoucher(newV);
    setIsNewVoucherModalOpen(false);
    setNewMotive("");
    setNewApplicant("");

    await alert({
      title: "Bon d'Engagement Créé",
      message: `Le bon ${newV.code} a été créé au niveau ${newV.levelLabel} et soumis au visa de : ${getRequiredValidatorLabel(newV)}.`,
      variant: "primary",
    });
  };

  return (
    <PortalShell activePath="finance" title="Flux des Dépenses & Décaissements">
      <div className="flex flex-col gap-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-on-surface-variant">Intendance &amp; Gouvernance</span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">chevron_right</span>
              <span className="text-xs font-bold text-primary">Circuit des Dépenses</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-display">
                Registre &amp; Circuit d'Approbation des Dépenses
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                Double Visa 1961 Actif
              </span>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Engagement financier, circuit de double validation pastorale et ordonnancement selon le Manuel de Discipline (1961).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high flex items-center gap-2 border border-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Exporter Journal (.xlsx)</span>
            </button>
            <Can permission="can:create_expense" minRole={2}>
              <button
                type="button"
                onClick={() => setIsNewVoucherModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-md hover:brightness-110 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Nouvelle Demande d'Engagement</span>
              </button>
            </Can>
            <Can permission="can:disburse_saspay" minRole={2}>
              <button
                type="button"
                onClick={openDirectSasPayModal}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
                <span>+ Décaissement Mobile Money</span>
              </button>
            </Can>
          </div>
        </div>

        {/* 3 Workflow KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Engagé</span>
              <div className="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-on-surface tracking-tight block font-display">
                8 450 000 <span className="text-xs text-on-surface-variant font-normal">XAF</span>
              </span>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "72%" }} />
                </div>
                <span className="text-[11px] text-on-surface-variant">72% du plafond</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping" />
                En Attente de Visa
              </span>
              <div className="w-9 h-9 rounded-xl bg-secondary-container/40 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-secondary tracking-tight block font-display">
                2 400 000 <span className="text-xs font-normal">XAF</span>
              </span>
              <span className="text-xs text-on-surface-variant mt-1 block">Validation du responsable de niveau requise</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Décaissées ce Mois</span>
              <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-tertiary tracking-tight block font-display">
                5 150 000 <span className="text-xs font-normal">XAF</span>
              </span>
              <span className="text-xs text-tertiary mt-1 block font-medium">100% quittances &amp; écritures certifiées</span>
            </div>
          </div>
        </div>

        {/* 3 Trésorerie Pillars : Différenciation Stricte (Caisse Espèces / Banque / Wallet Mobile Money) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-surface-container-lowest to-surface-container-low border border-surface-container shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-on-surface font-display tracking-tight">
                  Disponibilités de Trésorerie par Canal de Règlement
                </h3>
                <span className="text-[11px] text-on-surface-variant">
                  Ventilation comptable certifiée selon le canal (Caisse physique locale, Banques partenaires, Wallet Mobile Money)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">Total Disponible Consolidé :</span>
              <span className="font-mono text-sm font-black text-primary px-2.5 py-0.5 rounded-lg bg-surface-container border border-surface-variant">
                {balances.total.toLocaleString()} XAF
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pilier 1 : Caisse Espèces */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">payments</span>
                  Solde Caisse Espèces
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Local
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-on-surface font-mono block">
                  {balances.cash.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant">XAF</span>
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Fonds physiques en caisse paroissiale (billets &amp; monnaie)
                </span>
              </div>
            </div>

            {/* Pilier 2 : Banque */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">account_balance</span>
                  Solde Compte Bancaire
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Afriland / UBA
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-on-surface font-mono block">
                  {balances.bank.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant">XAF</span>
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Avoirs bancaires officiels &amp; virements institutionnels
                </span>
              </div>
            </div>

            {/* Pilier 3 : Wallet Mobile Money (MTN MoMo & Orange Money via SasPay) */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-amber-300 ring-1 ring-amber-400/20 hover:border-amber-500 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">send_to_mobile</span>
                  Solde Wallet Mobile Money
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  SasPay MoMo / OM
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-amber-900 font-mono block">
                  {balances.wallet.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant">XAF</span>
                </span>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-on-surface-variant font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold">
                    MTN: {balances.wallet_mtn.toLocaleString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 font-bold">
                    Orange: {balances.wallet_orange.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-surface-container-lowest p-3 rounded-2xl border border-surface-container shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {["Tous", "En attente", "Approuvé Pasteur", "Décaissé", "Rejeté"].map((st) => {
              const active = filterStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Code bon, motif, demandeur..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low text-xs text-on-surface outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary border border-transparent"
            />
          </div>
        </div>

        {/* Asymmetric 2-Column Workflow */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left vouchers list (7 cols) */}
          <div className="xl:col-span-7 flex flex-col gap-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-3 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <div className="h-4 w-28 rounded-md bg-surface-container-high" />
                        <div className="h-4 w-20 rounded-full bg-surface-container-high" />
                      </div>
                      <div className="h-6 w-24 rounded-lg bg-surface-container-high" />
                    </div>
                    <div className="h-5 w-4/5 rounded-lg bg-surface-container-high" />
                    <div className="h-3.5 w-1/2 rounded bg-surface-container-high" />
                    <div className="pt-2 border-t border-surface-container/60 flex items-center justify-between">
                      <div className="h-3 w-24 rounded bg-surface-container-high" />
                      <div className="h-4 w-28 rounded-full bg-surface-container-high" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 border border-dashed border-surface-container-high text-center flex flex-col items-center justify-center py-12 shadow-sm">
                <span className="material-symbols-outlined text-[42px] text-on-surface-variant/40 mb-2">inbox</span>
                <p className="text-sm font-bold text-on-surface">Aucune réquisition de dépense</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Aucun bon de décaissement enregistré dans cette catégorie. Cliquez sur &quot;Nouvelle Demande&quot; pour initier une réquisition.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewVoucherModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Initier une Réquisition</span>
                </button>
              </div>
            ) : (
              filteredVouchers.map((v) => {
                const isSelected = selectedVoucher?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoucher(v)}
                    className={`p-5 rounded-2xl bg-surface-container-lowest border shadow-sm cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-surface-container hover:border-surface-variant"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-extrabold text-primary">{v.code}</span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-bold text-on-surface-variant">
                            {v.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-on-surface mt-1 leading-snug font-display">
                          {v.motive}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">Demandeur : {v.applicant}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-on-surface block font-display">
                          {v.amount.toLocaleString()} XAF
                        </span>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                            v.status === "Décaissé"
                              ? "bg-tertiary-fixed text-on-tertiary-fixed"
                              : v.status === "Approuvé Pasteur"
                              ? "bg-secondary-fixed text-on-secondary-fixed"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                      <span>Date : {v.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-tertiary">
                            {v.firstSignatory.signed ? "check_circle" : "radio_button_unchecked"}
                          </span>
                          Trésorier
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-tertiary">
                            {v.secondSignatory.signed ? "check_circle" : "radio_button_unchecked"}
                          </span>
                          Pasteur Titulaire
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right voucher preview & approval circuit (5 cols) */}
          <div className="xl:col-span-5 flex flex-col gap-4 sticky top-24">
            {isLoading ? (
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container shadow-sm flex flex-col gap-5 animate-pulse">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="h-5 w-40 rounded-lg bg-surface-container-high" />
                  <div className="h-4 w-24 rounded bg-surface-container-high" />
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                  <div className="h-4 w-1/3 rounded bg-surface-container-high" />
                  <div className="h-6 w-3/4 rounded-lg bg-surface-container-high" />
                  <div className="h-8 w-1/2 rounded-lg bg-surface-container-high" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-40 rounded bg-surface-container-high" />
                  <div className="h-16 rounded-xl bg-surface-container-low" />
                  <div className="h-16 rounded-xl bg-surface-container-low" />
                </div>
                <div className="h-11 rounded-xl bg-surface-container-high" />
              </div>
            ) : !selectedVoucher ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 border border-surface-container shadow-sm text-center flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/60 mb-4">
                  <span className="material-symbols-outlined text-[32px]">receipt_long</span>
                </div>
                <h3 className="font-bold text-base text-on-surface">Aucun bon sélectionné</h3>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                  Sélectionnez une réquisition dans la liste de gauche pour consulter son circuit de signatures ou initiez une nouvelle dépense.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewVoucherModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Nouvelle Demande</span>
                </button>
              </div>
            ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
                  <h2 className="text-base font-bold text-on-surface font-display">Bon de Décaissement</h2>
                </div>
                <span className="font-mono text-xs font-bold text-primary">{selectedVoucher.code}</span>
              </div>

              {/* Printable-like Voucher Layout */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between border-b border-surface-container pb-2">
                  <div>
                    <span className="font-bold text-primary block">MISSION DU PLEIN ÉVANGILE</span>
                    <span className="text-[10px] text-on-surface-variant">Temple Central de Tsinga • Yaoundé</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">{selectedVoucher.date}</span>
                </div>

                <div>
                  <span className="text-on-surface-variant block">Motif de la dépense :</span>
                  <p className="font-bold text-on-surface text-sm mt-0.5">{selectedVoucher.motive}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-on-surface-variant text-[11px] block">Demandeur :</span>
                    <span className="font-bold text-on-surface">{selectedVoucher.applicant}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[11px] block">Montant approuvé :</span>
                    <span className="text-base font-extrabold text-primary font-display">
                      {selectedVoucher.amount.toLocaleString()} XAF
                    </span>
                  </div>
                </div>

                {/* Circuit de double visa */}
                <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
                  <span className="font-bold text-on-surface">Circuit des signatures statutaires :</span>
                  
                  <div className="p-2.5 rounded-lg bg-surface-container flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-on-surface block">Visa 1 : Trésorier</span>
                        <span className="text-[10px] text-on-surface-variant">{selectedVoucher.firstSignatory.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px]">
                        Signé le {selectedVoucher.firstSignatory.date || "14/03/2025"}
                      </span>
                    </div>
                    {selectedVoucher.firstSignatory.comment && (
                      <div className="p-2 rounded bg-surface-container-low border border-surface-container text-[11px] text-on-surface-variant italic">
                        « {selectedVoucher.firstSignatory.comment} »
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-on-surface block">
                          Visa 2 : {getRequiredValidatorLabel(selectedVoucher)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {selectedVoucher.secondSignatory.name}
                        </span>
                      </div>
                      {selectedVoucher.secondSignatory.signed ? (
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px]">
                          Signé le {selectedVoucher.secondSignatory.date || "Aujourd'hui"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[10px]">
                          En attente du Pasteur
                        </span>
                      )}
                    </div>
                    {selectedVoucher.secondSignatory.comment && (
                      <div className="p-2 rounded bg-surface-container-low border border-surface-container text-[11px] text-on-surface-variant italic">
                        « {selectedVoucher.secondSignatory.comment} »
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons (Toute action financière requiert consultation des éléments, permissions & commentaire obligatoire) */}
              <div className="flex flex-col gap-2 pt-2">
                {!selectedVoucher.secondSignatory.signed && selectedVoucher.status !== "Rejeté" && (
                  <>
                    {isBlockedBecauseTreasurer ? (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <span className="material-symbols-outlined text-[18px] text-amber-700">gavel</span>
                          <span>Séparation des Pouvoirs (F-605 / 1961)</span>
                        </div>
                        <p className="text-[11px] text-amber-900/90 leading-relaxed">
                          Votre rôle actif est <strong>{activeRole?.name || "Trésorier"}</strong>. Le Trésorier assure le Visa 1 et le décaissement final, mais <strong>ne peut pas valider à la place du Pasteur</strong>.
                        </p>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          Le Visa 2 d'Ordonnancement relève exclusivement du : {getRequiredValidatorLabel(selectedVoucher)}.
                        </span>
                      </div>
                    ) : (
                      <Can permission="can:approve_expense" minRole={getMinRoleForLevel(selectedVoucher.level)}>
                        <button
                          type="button"
                          onClick={() => openValidationModal("approve", selectedVoucher)}
                          className="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">verified_user</span>
                          <span>Consulter &amp; Apposer le Visa ({getRequiredValidatorLabel(selectedVoucher)})</span>
                        </button>
                      </Can>
                    )}

                    {!isBlockedBecauseTreasurer && (
                      <Can permission="can:reject_expense" minRole={getMinRoleForLevel(selectedVoucher.level)}>
                        <button
                          type="button"
                          onClick={() => openValidationModal("reject", selectedVoucher)}
                          className="w-full h-10 rounded-xl bg-surface-container text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Consulter &amp; Rejeter la dépense</span>
                        </button>
                      </Can>
                    )}
                  </>
                )}

                {selectedVoucher.status === "Approuvé Pasteur" && (
                  <div className="flex flex-col gap-2">
                    <Can permission="can:disburse_saspay" minRole={2}>
                      <button
                        type="button"
                        onClick={() => openVoucherSasPayModal(selectedVoucher)}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
                        <span>Décaisser via SasPay (MTN MoMo / Orange)</span>
                      </button>
                    </Can>
                    <Can permission="can:disburse_cash" minRole={2}>
                      <button
                        type="button"
                        onClick={() => openValidationModal("disburse_cash", selectedVoucher)}
                        className="w-full h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        <span>Consulter &amp; Décaissement Espèces (Caisse Locale)</span>
                      </button>
                    </Can>
                  </div>
                )}

                {selectedVoucher.status === "Décaissé" && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                        <span>Fonds décaissés et écriture certifiée</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">print</span>
                        <span>Bon</span>
                      </button>
                    </div>
                    {selectedVoucher.disbursementDetails?.comment && (
                      <div className="text-[11px] text-emerald-800 border-t border-emerald-200/60 pt-1.5">
                        <span className="font-bold">Décharge de caisse : </span>
                        <span className="italic">{selectedVoucher.disbursementDetails.comment}</span>
                        {selectedVoucher.disbursementDetails.receiptRef && (
                          <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">
                            Réf. décharge : {selectedVoucher.disbursementDetails.receiptRef}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedVoucher.status === "Rejeté" && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      <span>Demande de dépense rejetée</span>
                    </div>
                    {selectedVoucher.secondSignatory.comment && (
                      <p className="text-[11px] text-rose-800 italic">
                        Motif du rejet : « {selectedVoucher.secondSignatory.comment} »
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal New Voucher */}
      {isNewVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">add_circle</span>
                <h3 className="text-base font-bold text-on-surface font-display">Nouvel Engagement de Dépense</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVoucherModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Périmètre / Niveau de gouvernance</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value as any)}
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container font-semibold"
                >
                  <option value="assembly">🏛️ Paroisse / Assemblée Locale (Visa Pasteur Titulaire N4)</option>
                  <option value="department">👥 Département / Ministère (Visa Délégué N2 / Pasteur N4)</option>
                  <option value="district">📍 District Ecclésiastique (Visa Surintendant District N5)</option>
                  <option value="region">🌐 Région Ecclésiastique (Visa Surintendant Régional N6)</option>
                  <option value="national">🇨🇲 Bureau Exécutif National (Visa Bureau National N7)</option>
                </select>
                <span className="text-[10px] text-on-surface-variant italic">
                  Détermine le niveau du responsable ecclésial habilité à signer et ordonnancer ce bon.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Motif précis de la dépense</label>
                <textarea
                  required
                  rows={2}
                  value={newMotive}
                  onChange={(e) => setNewMotive(e.target.value)}
                  placeholder="ex: Réparation urgente du micro sans fil et pupitre..."
                  className="p-3 rounded-xl bg-surface-container-low text-on-surface outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Catégorie budgétaire</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none"
                  >
                    <option value="Travaux & Entretien">Travaux &amp; Entretien</option>
                    <option value="Liturgie & Culte">Liturgie &amp; Culte</option>
                    <option value="Social & Assistance">Social &amp; Assistance</option>
                    <option value="Évangélisation">Évangélisation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Montant estimé (XAF)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="500"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Demandeur / Ministère</label>
                <input
                  type="text"
                  required
                  value={newApplicant}
                  onChange={(e) => setNewApplicant(e.target.value)}
                  placeholder="ex: Fr. Jean-Claude Fossouo (Louange)"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 rounded-xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Soumettre pour validation pastorale</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal SasPay Mobile Money Disbursement */}
      {isSasPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">send_to_mobile</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface font-display leading-tight">
                    Décaissement SasPay Mobile Money
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    {saspayVoucher ? `Paiement du bon ordonnancé ${saspayVoucher.code}` : "Virement direct Mobile Money (Urgence / Secours)"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingSasPay && setIsSasPayModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleExecuteSasPay} className="flex flex-col gap-4 text-xs">
              {/* Wallet Balances Card (Différenciation stricte Banque vs Wallet vs Espèces) */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs flex items-center gap-1.5 text-amber-900">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">account_balance_wallet</span>
                    Solde Wallet Mobile Money Débité :
                  </span>
                  <span className="font-mono font-black text-amber-900 text-sm">
                    {balances.wallet.toLocaleString()} XAF
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    MTN MoMo : {balances.wallet_mtn.toLocaleString()} XAF
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Orange Money : {balances.wallet_orange.toLocaleString()} XAF
                  </span>
                </div>
                <div className="text-[10px] text-amber-800/80 italic border-t border-amber-200/60 pt-1 mt-0.5">
                  🛡️ Ce virement débitera exclusivement votre compte Wallet Mobile Money. Vos avoirs en Banque ({balances.bank.toLocaleString()} XAF) et en Caisse Espèces ({balances.cash.toLocaleString()} XAF) restent strictement protégés.
                </div>
              </div>

              {/* Network Choice */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Réseau Mobile Money</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSaspayNetwork("mtn_cm")}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      saspayNetwork === "mtn_cm"
                        ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold ring-2 ring-amber-500/30"
                        : "border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-yellow-400 text-black flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      MTN
                    </div>
                    <div>
                      <span className="block text-xs font-bold">MTN MoMo</span>
                      <span className="text-[10px] text-on-surface-variant font-normal">Cameroun (+237)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaspayNetwork("orange_cm")}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                      saspayNetwork === "orange_cm"
                        ? "border-orange-500 bg-orange-50/50 text-orange-950 font-bold ring-2 ring-orange-500/30"
                        : "border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      OM
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Orange Money</span>
                      <span className="text-[10px] text-on-surface-variant font-normal">Cameroun (+237)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Beneficiary Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Nom du Bénéficiaire</label>
                  <input
                    type="text"
                    required
                    value={saspayName}
                    onChange={(e) => setSaspayName(e.target.value)}
                    placeholder="ex: Pasteur Mvondo"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-1 focus:ring-primary border border-surface-container"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Numéro de Téléphone (MoMo)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-xs">
                      +237
                    </span>
                    <input
                      type="tel"
                      required
                      value={saspayPhone}
                      onChange={(e) => setSaspayPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      placeholder="670000000"
                      className="h-10 pl-14 pr-3 w-full rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-1 focus:ring-primary border border-surface-container font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Amount & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Montant à transférer (XAF)</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    disabled={!!saspayVoucher}
                    value={saspayAmount}
                    onChange={(e) => setSaspayAmount(Number(e.target.value))}
                    className={`h-10 px-3 rounded-xl outline-none font-mono font-bold border border-surface-container ${
                      saspayVoucher
                        ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
                        : "bg-surface-container-low text-on-surface focus:ring-1 focus:ring-primary"
                    }`}
                  />
                  {saspayVoucher && (
                    <span className="text-[10px] text-on-surface-variant italic">
                      Verrouillé : Montant du bon approuvé
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Motif du virement</label>
                  <input
                    type="text"
                    required
                    value={saspayReason}
                    onChange={(e) => setSaspayReason(e.target.value)}
                    placeholder="ex: Frais de déplacement séminaire"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-1 focus:ring-primary border border-surface-container"
                  />
                </div>
              </div>

              {/* Security & Audit Notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">
                  verified_user
                </span>
                <div className="text-[11px] leading-relaxed">
                  <strong className="block text-amber-950 font-bold">
                    Autorisation Requise • Contrôle RBAC
                  </strong>
                  Ce virement externe via SasPay débite immédiatement le grand livre de la trésorerie. Une quittance comptable numérique est archivée avec la signature du trésorier connecté.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  disabled={isSubmittingSasPay}
                  onClick={() => setIsSasPayModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSasPay}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingSasPay ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Virement en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      <span>Confirmer &amp; Virer {Number(saspayAmount).toLocaleString()} XAF</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CONSULTATION DES ÉLÉMENTS & VALIDATION AVEC COMMENTAIRE   */}
      {/* ============================================================== */}
      {validationModalOpen && validationVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                    validationMode === "approve"
                      ? "bg-primary"
                      : validationMode === "disburse_cash"
                      ? "bg-emerald-600"
                      : "bg-rose-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {validationMode === "approve"
                      ? "verified_user"
                      : validationMode === "disburse_cash"
                      ? "payments"
                      : "cancel"}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface font-display leading-tight">
                    {validationMode === "approve"
                      ? "Revue des Éléments & Visa d'Ordonnancement Pastoral"
                      : validationMode === "disburse_cash"
                      ? "Revue des Éléments & Décaissement Caisse Espèces"
                      : "Revue des Éléments & Rejet de la Demande"}
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    {validationMode === "approve"
                      ? `Validation officielle par l'autorité pastorale • ${getRequiredValidatorLabel(validationVoucher)}`
                      : validationMode === "disburse_cash"
                      ? "Sortie physique de caisse et délivrance de la quittance comptable"
                      : "Notification de refus motivée transmise au demandeur"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isValidating && setValidationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* FONDATION DE TRANSPARENCE : CONSULTATION DES ÉLÉMENTS DE LA DÉPENSE */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {validationVoucher.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-bold text-on-surface-variant">
                    {validationVoucher.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-primary font-display block">
                    {validationVoucher.amount.toLocaleString()} XAF
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Engagé le {validationVoucher.date}
                  </span>
                </div>
              </div>

              {/* Grid des éléments consultés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Demandeur &amp; Entité :</span>
                  <p className="font-semibold text-on-surface mt-0.5">{validationVoucher.applicant}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Niveau d'Autorisation :</span>
                  <p className="font-semibold text-on-surface mt-0.5">{validationVoucher.levelLabel || validationVoucher.level || "Paroisse Locale"}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Motif &amp; Justification de la Dépense :</span>
                <p className="font-medium text-on-surface mt-0.5 p-2 rounded-lg bg-surface-container/60 border border-surface-container">
                  {validationVoucher.motive}
                </p>
              </div>

              {/* Visa 1 Statutaire */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified</span>
                  <div>
                    <span className="font-bold block">Visa 1 : Trésorerie &amp; Crédits Budgétaires</span>
                    <span className="text-[10px] text-emerald-800">{validationVoucher.firstSignatory.name} • {validationVoucher.firstSignatory.date || "14/03/2025"}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider">
                  Crédits certifiés
                </span>
              </div>

              {/* Pièces Justificatives Numérisées */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">attachment</span>
                  Pièces justificatives consultées (3 documents) :
                </span>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                    <span>Facture_Proforma_Fournisseur.pdf</span>
                    <span className="text-on-surface-variant text-[9px]">(145 Ko)</span>
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                    <span>Devis_Electricite_Tsinga.pdf</span>
                    <span className="text-on-surface-variant text-[9px]">(82 Ko)</span>
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                    <span>Fiche_Expression_Besoin.pdf</span>
                    <span className="text-on-surface-variant text-[9px]">(48 Ko)</span>
                  </span>
                </div>
              </div>

              {/* Contrôle spécifique pour décaissement en espèces */}
              {validationMode === "disburse_cash" && (
                <div className="p-2.5 rounded-lg bg-surface-container flex items-center justify-between text-xs border border-surface-container-high mt-1">
                  <span className="text-on-surface-variant font-medium">Solde Caisse Espèces disponible :</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {balances.cash.toLocaleString()} XAF
                  </span>
                </div>
              )}
            </div>

            {/* FORMULAIRE DE SAISIE DU COMMENTAIRE OBLIGATOIRE */}
            <form onSubmit={handleConfirmValidation} className="flex flex-col gap-4 text-xs">
              {validationMode === "disburse_cash" && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">
                    Référence de la Quittance / Reçu de Décharge Physique
                  </label>
                  <input
                    type="text"
                    value={validationReceiptRef}
                    onChange={(e) => setValidationReceiptRef(e.target.value)}
                    placeholder="ex: RC-2025-03-018 (Registre N°4)"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-1 focus:ring-emerald-600 border border-surface-container font-mono"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-on-surface flex items-center gap-1">
                    <span>
                      {validationMode === "approve"
                        ? "Commentaire & Avis Pastoral d'Ordonnancement"
                        : validationMode === "disburse_cash"
                        ? "Observations de Sortie de Caisse & Décharge"
                        : "Motif Circonstancié du Rejet"}
                    </span>
                    <span className="text-rose-500 font-bold">* (Obligatoire)</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      validationComment.trim().length >= 8 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {validationComment.trim().length} / min. 8 caractères
                  </span>
                </div>

                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  {validationMode === "approve"
                    ? "En vertu du statut ordonnateur, mentionnez l'accord pastoral, la décision du conseil d'anciens ou vos instructions particulières."
                    : validationMode === "disburse_cash"
                    ? "Renseignez les modalités de remise physique des billets et la confirmation de la signature de la décharge."
                    : "Indiquez clairement au demandeur la raison du refus (pièces incomplètes, dépassement de crédit, devis excessif, etc.)."}
                </p>

                <textarea
                  required
                  rows={3}
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  placeholder={
                    validationMode === "approve"
                      ? "ex: Vu la facture proforma et l'accord du Conseil d'Anciens, dépense ordonnancée pour achat immédiat..."
                      : validationMode === "disburse_cash"
                      ? "ex: Somme de 380 000 XAF remise en coupures de 10 000 XAF au bénéficiaire contre décharge signée..."
                      : "ex: Devis excessif par rapport aux prix du marché. Veuillez fournir au moins deux devis comparatifs..."
                  }
                  className="p-3 rounded-xl bg-surface-container-low text-on-surface outline-none focus:ring-1 focus:ring-primary border border-surface-container resize-none leading-relaxed text-xs"
                />

                {validationComment.trim().length < 8 && (
                  <span className="text-[11px] text-amber-700 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>Veuillez renseigner un commentaire circonstancié d'au moins 8 caractères pour activer le bouton de validation.</span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  disabled={isValidating}
                  onClick={() => setValidationModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isValidating || validationComment.trim().length < 8}
                  className={`h-10 px-5 rounded-xl text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationMode === "approve"
                      ? "bg-primary hover:bg-primary/90"
                      : validationMode === "disburse_cash"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Traitement officiel en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {validationMode === "approve"
                          ? "draw"
                          : validationMode === "disburse_cash"
                          ? "payments"
                          : "cancel"}
                      </span>
                      <span>
                        {validationMode === "approve"
                          ? "Apposer le Visa & Ordonnancer"
                          : validationMode === "disburse_cash"
                          ? "Valider la Décharge & Décaisser"
                          : "Confirmer le Rejet Définitif"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
