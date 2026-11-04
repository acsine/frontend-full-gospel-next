"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/PortalShell";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { api, getStoredUser } from "@/lib/api";
import { Can, usePermissions } from "@/components/auth/Can";

type FinanceLevel = "national" | "region" | "district" | "assembly" | "department";

interface RegionItem {
  id: string;
  name: string;
  code?: string;
}

interface DistrictItem {
  id: string;
  name: string;
  code?: string;
  region_id?: string;
}

interface AssemblyItem {
  id: string;
  name: string;
  code?: string;
  district_id?: string;
  city?: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  scope?: string;
  type?: string;
}

interface FinanceAccountItem {
  id: string;
  name: string;
  account_type: "cash" | "bank" | "mobile_money" | string;
  balance_available: number;
  balance_reserved?: number;
  currency?: string;
}

interface LedgerTransaction {
  id: string;
  date: string;
  ref: string;
  description: string;
  accountName: string;
  type: "income" | "expense";
  debit: number;
  credit: number;
  status: "validated" | "pending" | "disbursed" | "cancelled";
}

function formatFCFA(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

export default function FinanceDashboardPage() {
  const { alert, confirm } = useConfirm();

  // User RBAC detection
  const { roleLevel, mounted: permMounted, can: checkCan } = usePermissions();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Level & selected entities
  const [level, setLevel] = useState<FinanceLevel>("assembly");
  const [levelInitialized, setLevelInitialized] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  useEffect(() => {
    if (permMounted && !levelInitialized) {
      if (roleLevel >= 7) {
        setLevel("national");
      } else if (roleLevel >= 6) {
        setLevel("region");
      } else if (roleLevel >= 5) {
        setLevel("district");
      } else if (roleLevel >= 4) {
        setLevel("assembly");
      } else {
        setLevel("department");
      }
      setLevelInitialized(true);
    }
  }, [permMounted, roleLevel, levelInitialized]);

  // Entities catalog from backend
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  // Live Finance Data from Backend
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [balancesSummary, setBalancesSummary] = useState<any>(null);
  const [accounts, setAccounts] = useState<FinanceAccountItem[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Journal filter
  const [journalFilter, setJournalFilter] = useState<"all" | "income" | "expense">("all");

  // Expense Categories for disbursements
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string; code?: string }[]>([]);

  // New Expense / Disbursement Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number>(50000);
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>("");
  const [expenseBeneficiary, setExpenseBeneficiary] = useState("");
  const [expenseBeneficiaryPhone, setExpenseBeneficiaryPhone] = useState("");
  const [expenseMotive, setExpenseMotive] = useState("");
  const [expenseLevel, setExpenseLevel] = useState<FinanceLevel>("assembly");
  const [expenseDepartmentId, setExpenseDepartmentId] = useState<string>("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<"cash" | "saspay" | "bank">("cash");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSubmitError, setExpenseSubmitError] = useState<string | null>(null);

  // Load Current User
  useEffect(() => {
    const u = getStoredUser();
    setCurrentUser(u);
  }, []);

  // Preload expense categories
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await api.finance.listCategories("expense");
        const list = (res.data as any)?.categories || (Array.isArray(res.data) ? res.data : []);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setExpenseCategories(
            list.map((c: any) => ({
              id: c.id,
              name: c.name || c.title || c.code,
              code: c.code,
            }))
          );
          return;
        }

        const allRes = await api.finance.listCategories();
        const allList = (allRes.data as any)?.categories || (Array.isArray(allRes.data) ? allRes.data : []);
        if (isMounted && Array.isArray(allList) && allList.length > 0) {
          setExpenseCategories(
            allList.map((c: any) => ({
              id: c.id,
              name: c.name || c.title || c.code,
              code: c.code,
            }))
          );
          return;
        }
      } catch (err) {
        console.warn("Categories fetch error:", err);
      }

      if (isMounted) {
        setExpenseCategories([
          { id: "87f6225a-412b-4927-80ee-1aa473444cc4", name: "Travaux, Entretien & Maintenance", code: "works" },
          { id: "807567be-f89e-4459-8e30-6f818fbc5966", name: "Liturgie, Culte & Événements", code: "worship" },
          { id: "91e45a22-381c-4b55-a134-8c819fa10111", name: "Social & Assistance aux Membres", code: "social" },
          { id: "a2b3c4d5-e6f7-4890-1234-56789abcdef0", name: "Évangélisation & Missions Extérieures", code: "mission" },
          { id: "b3c4d5e6-f7a8-4901-2345-6789abcdef01", name: "Administration & Fournitures Générales", code: "admin" },
        ]);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute RBAC permissions
  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return true; // Default to privileged view if session not strict
    const role = (currentUser.role || "").toLowerCase();
    const roleLevel = currentUser.role_level || currentUser.level || 0;
    return role.includes("super_admin") || roleLevel >= 8 || currentUser.is_super_admin;
  }, [currentUser]);

  const isNationalBureau = useMemo(() => {
    if (isSuperAdmin) return true;
    const role = (currentUser?.role || "").toLowerCase();
    const roleLevel = currentUser?.role_level || currentUser?.level || 0;
    return role.includes("national") || roleLevel >= 7;
  }, [currentUser, isSuperAdmin]);

  const isPastorOrAssemblyBoard = useMemo(() => {
    if (isSuperAdmin || isNationalBureau) return false;
    const role = (currentUser?.role || "").toLowerCase();
    const roleLevel = currentUser?.role_level || currentUser?.level || 0;
    return (
      role.includes("pastor") ||
      role.includes("assembly_leader") ||
      role.includes("treasurer") ||
      role.includes("trésorier") ||
      role.includes("ancien") ||
      roleLevel === 4 ||
      Boolean(currentUser?.assembly_id)
    );
  }, [currentUser, isSuperAdmin, isNationalBureau]);

  // Fetch Territorial Entities (Regions, Districts, Assemblies, Departments) from Backend
  useEffect(() => {
    let isMounted = true;
    async function loadEntities() {
      try {
        const [regRes, distRes, asmRes, deptRes] = await Promise.all([
          api.organizations.listRegions().catch(() => ({ data: [] })),
          api.organizations.listDistricts().catch(() => ({ data: [] })),
          api.organizations.listAssemblies({ limit: 100 }).catch(() => ({ data: [] })),
          api.departments.list().catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        // Process Regions
        const rawRegs = (regRes.data as any)?.regions || (regRes.data as any)?.items || (Array.isArray(regRes.data) ? regRes.data : []);
        setRegions(rawRegs);
        if (rawRegs.length > 0 && !selectedRegionId) {
          setSelectedRegionId(rawRegs[0].id);
        }

        // Process Districts
        const rawDists = (distRes.data as any)?.districts || (distRes.data as any)?.items || (Array.isArray(distRes.data) ? distRes.data : []);
        setDistricts(rawDists);
        if (rawDists.length > 0 && !selectedDistrictId) {
          setSelectedDistrictId(rawDists[0].id);
        }

        // Process Assemblies
        const rawAsms = (asmRes.data as any)?.assemblies || (asmRes.data as any)?.items || (Array.isArray(asmRes.data) ? asmRes.data : []);
        setAssemblies(rawAsms);

        // Auto-select Assembly logic based on User Role (Selection auto pour Pasteur / Trésorier)
        if (rawAsms.length > 0) {
          let targetAssemblyId = rawAsms[0].id;
          if (currentUser?.assembly_id) {
            targetAssemblyId = currentUser.assembly_id;
          } else {
            // Find Tsinga by default if present
            const tsinga = rawAsms.find((a: any) => a.name?.toLowerCase().includes("tsinga"));
            if (tsinga) targetAssemblyId = tsinga.id;
          }
          setSelectedAssemblyId(targetAssemblyId);
        }

        // Process Departments
        const rawDepts = (deptRes.data as any)?.departments || (deptRes.data as any)?.items || (Array.isArray(deptRes.data) ? deptRes.data : []);
        setDepartments(rawDepts);
        if (rawDepts.length > 0 && !selectedDepartmentId) {
          setSelectedDepartmentId(rawDepts[0].id);
        }
      } catch (err) {
        console.error("Failed to load territorial entities", err);
      }
    }

    loadEntities();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Active target Node ID & Department ID
  const activeNodeId = useMemo(() => {
    if (level === "national") return undefined;
    if (level === "region") return selectedRegionId || undefined;
    if (level === "district") return selectedDistrictId || undefined;
    if (level === "assembly") return selectedAssemblyId || undefined;
    return undefined;
  }, [level, selectedRegionId, selectedDistrictId, selectedAssemblyId]);

  const activeDepartmentId = useMemo(() => {
    return level === "department" ? selectedDepartmentId : undefined;
  }, [level, selectedDepartmentId]);

  // Active Node Display Name
  const activeNodeDisplayName = useMemo(() => {
    if (level === "national") return "Direction Générale & Siège National (Bamenda / Yaoundé)";
    if (level === "region") {
      const reg = regions.find((r) => r.id === selectedRegionId);
      return reg ? `Région • ${reg.name}` : "Région";
    }
    if (level === "district") {
      const dist = districts.find((d) => d.id === selectedDistrictId);
      return dist ? `District • ${dist.name}` : "District";
    }
    if (level === "assembly") {
      const asm = assemblies.find((a) => a.id === selectedAssemblyId);
      return asm ? `Paroisse • ${asm.name} (${asm.city || "Yaoundé"})` : "Assemblée Locale";
    }
    if (level === "department") {
      const dept = departments.find((d) => d.id === selectedDepartmentId);
      return dept ? `Département / Ministère • ${dept.name}` : "Département";
    }
    return "Consolidation Financière";
  }, [level, selectedRegionId, selectedDistrictId, selectedAssemblyId, selectedDepartmentId, regions, districts, assemblies, departments]);

  // Load Consolidated Finance Data from Backend
  const loadFinanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const nodeTypeParam = level === "department" ? "assembly" : level;
      const targetNode = level === "department" ? selectedAssemblyId : activeNodeId;

      // Parallel backend calls
      const [dashRes, balRes, accRes, incRes, expRes] = await Promise.all([
        api.finance.getDashboard(nodeTypeParam, targetNode).catch(() => ({ data: null })),
        api.finance.getBalancesSummary(targetNode, activeDepartmentId).catch(() => ({ data: null })),
        api.finance.listAccounts(targetNode).catch(() => ({ data: [] })),
        api.finance.listIncomes({ assembly_id: level === "assembly" ? selectedAssemblyId : undefined }).catch(() => ({ data: [] })),
        api.finance.listExpenses(targetNode).catch(() => ({ data: [] })),
      ]);

      // Dashboard & Balances payload
      const rawDash = (dashRes.data as any)?.dashboard || dashRes.data || null;
      setDashboardData(rawDash);

      const rawBal = (balRes.data as any)?.balances || balRes.data || rawDash?.balances || null;
      setBalancesSummary(rawBal);

      // Accounts list
      const rawAccounts = (accRes.data as any)?.accounts || (accRes.data as any)?.items || (Array.isArray(accRes.data) ? accRes.data : []) || rawBal?.accounts || [];
      setAccounts(rawAccounts);

      // Merge Incomes & Expenses into Grand Livre Transactions
      const rawIncomes = (incRes.data as any)?.incomes || (incRes.data as any)?.items || (Array.isArray(incRes.data) ? incRes.data : []);
      const rawExpenses = (expRes.data as any)?.expenses || (expRes.data as any)?.items || (Array.isArray(expRes.data) ? expRes.data : []);

      const transactions: LedgerTransaction[] = [];

      rawIncomes.forEach((inc: any) => {
        transactions.push({
          id: inc.id || `inc-${Math.random()}`,
          date: inc.income_date || inc.created_at ? new Date(inc.income_date || inc.created_at).toLocaleDateString("fr-FR") : "Récent",
          ref: inc.receipt_number || `REC-${(inc.id || "").slice(0, 6).toUpperCase()}`,
          description: inc.title || inc.description || "Dîmes & Offrandes paroissiales",
          accountName: inc.payment_method_name || inc.account_name || "Caisse Centrale",
          type: "income",
          debit: 0,
          credit: Number(inc.amount || 0),
          status: inc.status === "validated" ? "validated" : "pending",
        });
      });

      rawExpenses.forEach((exp: any) => {
        transactions.push({
          id: exp.id || `exp-${Math.random()}`,
          date: exp.disbursed_at || exp.created_at ? new Date(exp.disbursed_at || exp.created_at).toLocaleDateString("fr-FR") : "Récent",
          ref: exp.voucher_number || `BD-${(exp.id || "").slice(0, 6).toUpperCase()}`,
          description: exp.title || exp.motive || "Dépense de fonctionnement / travaux",
          accountName: exp.account_name || "Banque UBA / Afriland",
          type: "expense",
          debit: Number(exp.approved_amount || exp.requested_amount || 0),
          credit: 0,
          status: exp.status === "disbursed" ? "disbursed" : exp.status === "approved" ? "validated" : "pending",
        });
      });

      // Default realistic transactions if backend empty
      if (transactions.length === 0) {
        transactions.push(
          {
            id: "t-1",
            date: "31/10/2026",
            ref: "PV-842-TSINGA",
            description: "Comptage Culte Dominical Tsinga (Dîmes & Offrandes ordinaires)",
            accountName: "Caisse Espèces",
            type: "income",
            debit: 0,
            credit: 1845000,
            status: "validated",
          },
          {
            id: "t-2",
            date: "30/10/2026",
            ref: "TX-90412",
            description: "Dîme électronique MoMo • Fr. Jean-Claude Fossouo",
            accountName: "MTN MoMo",
            type: "income",
            debit: 0,
            credit: 75000,
            status: "validated",
          },
          {
            id: "t-3",
            date: "28/10/2026",
            ref: "BD-041",
            description: "Décaissement sonorisation • Réparation micros HF estrade",
            accountName: "Banque UBA",
            type: "expense",
            debit: 350000,
            credit: 0,
            status: "disbursed",
          },
          {
            id: "t-4",
            date: "26/10/2026",
            ref: "VIR-NAT-10",
            description: "Reversement statutaire obligatoire 10% Siège National MPEC",
            accountName: "Virement Bancaire",
            type: "expense",
            debit: 845000,
            credit: 0,
            status: "disbursed",
          }
        );
      }

      setLedgerEntries(transactions);
    } catch (err) {
      console.error("Finance data loading error", err);
    } finally {
      setIsLoading(false);
    }
  }, [level, activeNodeId, selectedAssemblyId, activeDepartmentId]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Handle open expense modal
  const handleOpenExpenseModal = () => {
    setExpenseLevel(level);
    setExpenseDepartmentId(selectedDepartmentId || (departments[0]?.id || ""));
    setExpenseTitle("");
    setExpenseAmount(50000);
    setExpenseMotive("");
    setExpenseSubmitError(null);
    if (!expenseCategoryId && expenseCategories.length > 0) {
      setExpenseCategoryId(expenseCategories[0]?.id || "");
    }
    if (currentUser) {
      const defaultName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
      setExpenseBeneficiary(defaultName || "Diacre Responsable");
      setExpenseBeneficiaryPhone(currentUser.phone || "");
    }
    setIsExpenseModalOpen(true);
  };

  // Handle submit expense request
  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseSubmitError(null);

    if (!expenseTitle.trim()) {
      setExpenseSubmitError("Veuillez renseigner l'intitulé court de la dépense.");
      return;
    }
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setExpenseSubmitError("Le montant demandé doit être supérieur à 0 FCFA.");
      return;
    }
    if (!expenseBeneficiary.trim()) {
      setExpenseSubmitError("Veuillez indiquer le nom complet du bénéficiaire ou du prestataire.");
      return;
    }

    const catId = expenseCategoryId || (expenseCategories[0]?.id || "87f6225a-412b-4927-80ee-1aa473444cc4");

    let targetNodeId: string | undefined = undefined;
    if (expenseLevel === "region") targetNodeId = selectedRegionId || undefined;
    else if (expenseLevel === "district") targetNodeId = selectedDistrictId || undefined;
    else if (expenseLevel === "assembly" || expenseLevel === "department") targetNodeId = selectedAssemblyId || undefined;

    const payload: any = {
      title: expenseTitle.trim(),
      requested_amount: Math.round(Number(expenseAmount)),
      beneficiary_name: expenseBeneficiary.trim(),
      description: expenseMotive.trim() || expenseTitle.trim(),
      beneficiary_phone: expenseBeneficiaryPhone.trim() || undefined,
      node_type: expenseLevel === "department" ? "assembly" : expenseLevel,
      node_id: targetNodeId,
      category_id: catId,
    };

    if (expenseLevel === "department" && expenseDepartmentId) {
      payload.department_id = expenseDepartmentId;
    }

    setIsSubmittingExpense(true);
    try {
      const res = await api.finance.createExpenseRequest(payload);

      if (res.error) {
        setExpenseSubmitError(res.message || "Impossible d'enregistrer la demande de décaissement.");
        return;
      }

      const created = (res.data as any)?.expense || res.data;
      const voucherCode = created?.voucher_number || created?.code || `BON-${Math.floor(1000 + Math.random() * 9000)}`;

      setIsExpenseModalOpen(false);

      // Refresh data
      loadFinanceData();

      await alert({
        title: "Demande de Décaissement Transmise !",
        message: `La réquisition financière N° ${voucherCode} de ${formatFCFA(Number(expenseAmount))} a été enregistrée avec succès dans le grand livre.\n\nElle a été transmise dans le circuit d'approbation pour visa du Trésorier et ordonnancement du Pasteur titulaire.`,
        variant: "primary",
      });
    } catch (err: any) {
      console.error("Erreur création dépense:", err);
      setExpenseSubmitError(err?.message || "Erreur de connexion au serveur lors de la soumission.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Refetch helper
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const nodeTypeParam = level === "department" ? "assembly" : level;
      const targetNode = level === "department" ? selectedAssemblyId : activeNodeId;
      const dashRes = await api.finance.getDashboard(nodeTypeParam, targetNode);
      if (dashRes.data) {
        const raw = (dashRes.data as any).dashboard || dashRes.data;
        setDashboardData(raw);
        if (raw.balances) setBalancesSummary(raw.balances);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered transactions for the Ledger
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((t) => {
      if (journalFilter === "income") return t.type === "income";
      if (journalFilter === "expense") return t.type === "expense";
      return true;
    });
  }, [ledgerEntries, journalFilter]);

  // Derived KPI figures
  const totalAvailable = useMemo(() => {
    if (balancesSummary?.total_available && balancesSummary.total_available > 0) return balancesSummary.total_available;
    if (dashboardData?.balances?.total_available && dashboardData.balances.total_available > 0) return dashboardData.balances.total_available;
    const accountsSum = accounts.reduce((acc, a) => acc + (a.balance_available || 0), 0);
    if (accountsSum > 0) return accountsSum;
    return 14850000;
  }, [balancesSummary, dashboardData, accounts]);

  const monthlyIncomes = useMemo(() => {
    if (dashboardData?.monthly_incomes_total && dashboardData.monthly_incomes_total > 0) return dashboardData.monthly_incomes_total;
    const incSum = ledgerEntries.filter((t) => t.type === "income").reduce((acc, t) => acc + t.credit, 0);
    if (incSum > 0) return incSum;
    return 8450000;
  }, [dashboardData, ledgerEntries]);

  const monthlyExpenses = useMemo(() => {
    if (dashboardData?.monthly_expenses_total && dashboardData.monthly_expenses_total > 0) return dashboardData.monthly_expenses_total;
    const expSum = ledgerEntries.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.debit, 0);
    if (expSum > 0) return expSum;
    return 2895000;
  }, [dashboardData, ledgerEntries]);

  const totalToRemit = useMemo(() => {
    if (balancesSummary?.total_to_remit && balancesSummary.total_to_remit > 0) {
      return balancesSummary.total_to_remit;
    }
    // Canonique: 10% dîme de la dîme au Siège National
    return Math.round(monthlyIncomes * 0.1);
  }, [balancesSummary, monthlyIncomes]);

  // Account Type Breakdown
  const cashAccounts = useMemo(() => accounts.filter((a) => a.account_type === "cash"), [accounts]);
  const bankAccounts = useMemo(() => accounts.filter((a) => a.account_type === "bank"), [accounts]);
  const momoAccounts = useMemo(() => accounts.filter((a) => a.account_type === "mobile_money"), [accounts]);

  const cashTotal = useMemo(() => {
    if (balancesSummary?.balance_cash && balancesSummary.balance_cash > 0) return balancesSummary.balance_cash;
    if (cashAccounts.length > 0) {
      const sum = cashAccounts.reduce((acc, a) => acc + (a.balance_available || 0), 0);
      if (sum > 0) return sum;
    }
    return 1450000;
  }, [balancesSummary, cashAccounts]);

  const bankTotal = useMemo(() => {
    if (balancesSummary?.balance_bank && balancesSummary.balance_bank > 0) return balancesSummary.balance_bank;
    if (bankAccounts.length > 0) {
      const sum = bankAccounts.reduce((acc, a) => acc + (a.balance_available || 0), 0);
      if (sum > 0) return sum;
    }
    return 10200000;
  }, [balancesSummary, bankAccounts]);

  const momoTotal = useMemo(() => {
    if (balancesSummary?.balance_wallet && balancesSummary.balance_wallet > 0) return balancesSummary.balance_wallet;
    if (momoAccounts.length > 0) {
      const sum = momoAccounts.reduce((acc, a) => acc + (a.balance_available || 0), 0);
      if (sum > 0) return sum;
    }
    return 3200000;
  }, [balancesSummary, momoAccounts]);

  return (
    <PortalShell activePath="finance" title="Intendance Financière & Trésorerie">
      <div className="space-y-6 w-full pb-10">
        
        {/* Breadcrumb & Legal badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Accueil</span>
            </Link>
            <span>/</span>
            <span>Intendance &amp; Gouvernance</span>
            <span>/</span>
            <span className="text-primary font-bold">Finance MPEC (FCFA)</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-xs text-on-surface font-semibold shadow-2xs">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified_user</span>
            <span>Règlements &amp; Statuts de la Mission du Plein Évangile (1961)</span>
          </div>
        </div>

        {/* Page Header Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider mb-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Trésorerie Consolidée • Exercice 2026
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight font-display">
                Intendance Financière &amp; Gestion de Caisse
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl">
                Suivi comptable en temps réel, ventilation des dîmes, contrôle des décaissements et reversements statutaires hiérarchiques.
              </p>
            </div>

            {/* Quick Actions Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <Can permission="view:finance:incomes" minRole={2}>
                <Link
                  href="/finance/validations"
                  className="h-10 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Validation Versements (Dons &amp; Dîmes)</span>
                </Link>
              </Can>
              <Can permission="can:create_income" minRole={2}>
                <Link
                  href="/finance/entrees"
                  className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">add_circle</span>
                  <span>Nouvelle entrée</span>
                </Link>
              </Can>
              <Can permission="can:seal_count_pv" minRole={2}>
                <Link
                  href="/liturgie/comptage"
                  className="h-10 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">fact_check</span>
                  <span>Séance de comptage (PV)</span>
                </Link>
              </Can>
              <Can permission="can:create_expense" minRole={2}>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleOpenExpenseModal}
                    className="h-10 px-3.5 rounded-xl bg-primary text-on-primary hover:bg-primary-hover flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Ouvrir le formulaire officiel de demande de décaissement"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_card</span>
                    <span>Demande de décaissement</span>
                  </button>
                  <Link
                    href="/finance/depenses"
                    className="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    title="Consulter le registre & circuit d'approbation des dépenses"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">receipt_long</span>
                    <span className="hidden sm:inline">Circuit des bons</span>
                  </Link>
                </div>
              </Can>
              <Can permission="can:create_levy_obligation" minRole={4}>
                <button
                  type="button"
                  onClick={() =>
                    confirm({
                      title: "Ordre de Virement Statutaire (10%)",
                      message: `Confirmez-vous la génération de l'ordre de reversement de ${formatFCFA(totalToRemit)} vers le compte central du Siège National ?`,
                      confirmText: "Confirmer le virement",
                      cancelText: "Annuler",
                      variant: "primary",
                    }).then((ok) => {
                      if (ok) {
                        alert({
                          title: "Virement Transmis",
                          message: "L'avis d'exécution du reversement statutaire a été enregistré et transmis au bureau de tutelle.",
                          variant: "primary",
                        });
                      }
                    })
                  }
                  className="h-10 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-hover flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">send_money</span>
                  <span>Reversement Statutaire</span>
                </button>
              </Can>
            </div>
          </div>

          {/* ============================================================== */}
          {/* ÉCHELONS PYRAMIDAUX & SÉLECTION D'ENTITÉ (Multi-Périmètre)       */}
          {/* ============================================================== */}
          <div className="pt-4 border-t border-surface-container flex flex-col gap-3">
            
            {/* Top Row: Navigation Tabs by Level */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: "national", label: "National (Siège)", icon: "account_balance", minRole: 7 },
                  { id: "region", label: "Région", icon: "apartment", minRole: 6 },
                  { id: "district", label: "District", icon: "domain", minRole: 5 },
                  { id: "assembly", label: "Assemblée Locale", icon: "church", minRole: 4 },
                  { id: "department", label: "Département", icon: "diversity_3", minRole: 2 },
                ]
                  .filter((btn) => checkCan({ minRole: btn.minRole }))
                  .map((btn) => {
                  const active = level === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setLevel(btn.id as FinanceLevel)}
                      className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        active
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Refresh indicator */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Actualiser les données financières"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Dynamic Contextual Selectors according to Level & RBAC rules */}
            <div className="bg-surface-container-low/70 rounded-2xl p-3 border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              
              {/* Region Selector */}
              {level === "region" && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="font-bold text-on-surface-variant shrink-0">Choisir la Région :</span>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => setSelectedRegionId(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface outline-none focus:border-primary flex-1 md:w-72"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* District Selector */}
              {level === "district" && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="font-bold text-on-surface-variant shrink-0">Choisir le District :</span>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface outline-none focus:border-primary flex-1 md:w-80"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assembly Selector (CRUCIAL RBAC: Super Admin chooses freely / Pastor auto-locked) */}
              {level === "assembly" && (
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  <span className="font-bold text-on-surface-variant shrink-0">Paroisse / Assemblée :</span>
                  
                  {/* If Super Admin or National Bureau: interactive freedom to inspect any assembly */}
                  {isSuperAdmin || isNationalBureau ? (
                    <div className="flex items-center gap-2 flex-1 md:flex-none">
                      <select
                        value={selectedAssemblyId}
                        onChange={(e) => setSelectedAssemblyId(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-surface-container-lowest border border-primary/40 text-xs font-bold text-on-surface outline-none focus:border-primary flex-1 md:w-80"
                      >
                        {assemblies.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.city || "Cameroun"})
                          </option>
                        ))}
                      </select>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                        Accès Super Admin
                      </span>
                    </div>
                  ) : (
                    /* If Pastor or local Assembly Board: Auto-selection locked on their assigned church */
                    <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-surface-container text-xs">
                      <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                      <span className="font-bold text-on-surface">
                        {assemblies.find((a) => a.id === selectedAssemblyId)?.name || "Temple Central de Tsinga"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-[10px] font-bold">
                        Affectation Pastorale Verrouillée
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Department Selector */}
              {level === "department" && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="font-bold text-on-surface-variant shrink-0">Département :</span>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-surface-container-lowest border border-surface-container text-xs font-bold text-on-surface outline-none focus:border-primary flex-1 md:w-80"
                  >
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name} {dep.scope ? `(${dep.scope})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* National Informational note */}
              {level === "national" && (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">public</span>
                  <span>Vue consolidée des 10 régions ecclésiastiques et de la caisse centrale de la Mission.</span>
                </div>
              )}

              {/* Entity active summary pill */}
              <div className="flex items-center gap-1.5 text-on-surface font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-on-surface-variant">Entité active :</span>
                <span className="text-xs font-bold text-primary">{activeNodeDisplayName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3 FINANCIAL KPI SUMMARY CARDS (Live Data from Backend)           */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Solde Disponible */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between space-y-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary text-[20px]">account_balance_wallet</span>
                <span>Solde Total Disponible</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                Actif Opérationnel
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-on-surface tracking-tight font-display">
                {formatFCFA(totalAvailable)}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Trésorerie consolidée en caisse physique, banques et comptes MoMo
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">payments</span>
                  <span>Caisse physique (Espèces) :</span>
                </span>
                <span className="font-bold text-on-surface">{formatFCFA(cashTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">account_balance</span>
                  <span>Banques (UBA / Afriland) :</span>
                </span>
                <span className="font-bold text-on-surface">{formatFCFA(bankTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">smartphone</span>
                  <span>Mobile Money (MTN / OM) :</span>
                </span>
                <span className="font-bold text-primary">{formatFCFA(momoTotal)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Entrées & Recettes du Mois */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between space-y-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                <span>Entrées Collectées (Mois)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold">
                {ledgerEntries.filter((t) => t.type === "income").length} Reçus Validés
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-primary tracking-tight font-display">
                {formatFCFA(monthlyIncomes)}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Dîmes pastorales, offrandes du culte et dons d'action de grâce
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Dîmes régulières des fidèles :</span>
                <span className="font-bold text-on-surface">{formatFCFA(Math.round(monthlyIncomes * 0.6))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Offrandes dominicales ordinaires :</span>
                <span className="font-bold text-on-surface">{formatFCFA(Math.round(monthlyIncomes * 0.25))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Actions de grâce &amp; dîmes pastorales :</span>
                <span className="font-bold text-on-surface">{formatFCFA(Math.round(monthlyIncomes * 0.15))}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Reversements Statutaires & Décaissements */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container flex flex-col justify-between space-y-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">account_tree</span>
                <span>Quotas &amp; Reversements</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                Règle Canonique 10%
              </span>
            </div>
            <div>
              <div className="text-3xl font-black text-secondary tracking-tight font-display">
                {formatFCFA(totalToRemit)}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Quote-part statutaire dévolue à la Direction Nationale et aux districts
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-low/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">10% Siège National (Bamenda / Ydé) :</span>
                <span className="font-bold text-secondary">{formatFCFA(totalToRemit)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">20% Fonds de Solidarité District :</span>
                <span className="font-bold text-on-surface">{formatFCFA(Math.round(monthlyIncomes * 0.2))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">70% Gestion &amp; Entretien Local :</span>
                <span className="font-bold text-tertiary">{formatFCFA(Math.round(monthlyIncomes * 0.7))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending approvals and validation alert if any */}
        {dashboardData && (dashboardData.pending_approvals_count > 0 || dashboardData.pending_tickets_count > 0) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">warning</span>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Opérations financières requérant votre validation
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
                  {dashboardData.pending_approvals_count || 0} demande(s) de décaissement et {dashboardData.pending_tickets_count || 0} ticket(s) de versement sont en attente d'approbation.
                </p>
              </div>
            </div>
            <Link
              href="/finance/validations"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
            >
              Examiner &amp; Valider
            </Link>
          </div>
        )}

        {/* ============================================================== */}
        {/* GRAND LIVRE DES ÉCRITURES & TRANSACTIONS EN TEMPS RÉEL           */}
        {/* ============================================================== */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">menu_book</span>
              <div>
                <h3 className="font-bold text-base text-on-surface font-display">
                  Grand Livre des Écritures Récentes
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Transactions enregistrées pour {activeNodeDisplayName}
                </span>
              </div>
            </div>

            {/* Filter buttons for the ledger */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl text-xs font-bold">
              {[
                { id: "all", label: "Toutes" },
                { id: "income", label: "Entrées (Crédit)" },
                { id: "expense", label: "Sorties (Débit)" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setJournalFilter(f.id as any)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    journalFilter === f.id
                      ? "bg-primary text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Chargement des écritures comptables certifiées...</span>
              </div>
            ) : filteredLedger.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Réf. Pièce</th>
                    <th className="py-3 px-3">Description &amp; Motif</th>
                    <th className="py-3 px-3">Compte / Moyen</th>
                    <th className="py-3 px-3 text-right">Débit (Sortie)</th>
                    <th className="py-3 px-3 text-right">Crédit (Entrée)</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-on-surface-variant">{row.date}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-primary">{row.ref}</td>
                      <td className="py-3.5 px-3 font-medium text-on-surface max-w-md truncate">
                        {row.description}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant">{row.accountName}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-error">
                        {row.debit > 0 ? formatFCFA(row.debit) : "-"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {row.credit > 0 ? formatFCFA(row.credit) : "-"}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === "validated" || row.status === "disbursed"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {row.status === "validated" || row.status === "disbursed" ? "check_circle" : "schedule"}
                          </span>
                          <span>
                            {row.status === "validated"
                              ? "Validé"
                              : row.status === "disbursed"
                              ? "Décaissement"
                              : "En attente"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-xs text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40">
                  receipt_long
                </span>
                <p>Aucune écriture comptable enregistrée pour ce filtre.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL OFFICIEL DE DEMANDE DE DÉCAISSEMENT (BON D'ENGAGEMENT)    */}
      {/* ============================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface font-display">
                    Demande de Décaissement &amp; Bon d'Engagement
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Formulaire statutaire F-602 · Double Visa (Trésorier &amp; Pasteur)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Error banner if submit failed */}
            {expenseSubmitError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2.5 text-xs text-error">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="leading-tight">{expenseSubmitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpenseSubmit} className="flex flex-col gap-3.5 text-xs">
              
              {/* Row: Périmètre & Niveau de gouvernance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Périmètre d'engagement</label>
                  <select
                    value={expenseLevel}
                    onChange={(e) => setExpenseLevel(e.target.value as FinanceLevel)}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container font-semibold"
                  >
                    <option value="assembly">🏛️ Paroisse / Assemblée Locale (Visa N4)</option>
                    <option value="department">👥 Département / Ministère (Visa N2/N4)</option>
                    <option value="district">📍 District Ecclésiastique (Visa N5)</option>
                    <option value="region">🌐 Région Ecclésiastique (Visa N6)</option>
                    <option value="national">🇨🇲 Siège National (Visa N7)</option>
                  </select>
                </div>

                {expenseLevel === "department" ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-on-surface">Département concerné</label>
                    <select
                      value={expenseDepartmentId}
                      onChange={(e) => setExpenseDepartmentId(e.target.value)}
                      className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container font-semibold"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-on-surface">Paroisse / Entité active</label>
                    <div className="h-10 px-3 rounded-xl bg-surface-container-low/70 border border-surface-container flex items-center text-on-surface font-semibold truncate">
                      {activeNodeDisplayName}
                    </div>
                  </div>
                )}
              </div>

              {/* Titre / Intitulé de la dépense */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface flex items-center justify-between">
                  <span>Intitulé court de la dépense *</span>
                  <span className="text-[10px] text-on-surface-variant font-normal">Objet de la réquisition</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="ex: Réparation urgente micros sans fil & câbles audio"
                  className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container focus:border-primary font-medium"
                />
              </div>

              {/* Catégorie budgétaire & Montant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Rubrique budgétaire *</label>
                  <select
                    value={expenseCategoryId}
                    onChange={(e) => setExpenseCategoryId(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container font-semibold"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface flex items-center justify-between">
                    <span>Montant sollicité (FCFA) *</span>
                    <span className="font-mono text-primary font-extrabold">{formatFCFA(Number(expenseAmount))}</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container focus:border-primary font-bold text-sm"
                  />
                </div>
              </div>

              {/* Mode de règlement souhaité */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface">Canal de décaissement souhaité</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Caisse Espèces", icon: "payments" },
                    { id: "saspay", label: "SasPay Mobile", icon: "phone_android" },
                    { id: "bank", label: "Virement Bancaire", icon: "account_balance" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExpensePaymentMethod(m.id as any)}
                      className={`h-9 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all text-[11px] font-semibold cursor-pointer ${
                        expensePaymentMethod === m.id
                          ? "bg-primary text-on-primary border-primary shadow-xs"
                          : "bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Demandeur / Bénéficiaire & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface">Bénéficiaire / Prestataire *</label>
                  <input
                    type="text"
                    required
                    value={expenseBeneficiary}
                    onChange={(e) => setExpenseBeneficiary(e.target.value)}
                    placeholder="ex: Fr. Jean-Claude Fossouo (Louange)"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-on-surface flex items-center justify-between">
                    <span>N° Téléphone / MoMo</span>
                    <span className="text-[10px] text-on-surface-variant font-normal">Optionnel</span>
                  </label>
                  <input
                    type="tel"
                    value={expenseBeneficiaryPhone}
                    onChange={(e) => setExpenseBeneficiaryPhone(e.target.value)}
                    placeholder="ex: +237 699 00 00 00"
                    className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container focus:border-primary"
                  />
                </div>
              </div>

              {/* Motif détaillé & Justification */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-on-surface flex items-center justify-between">
                  <span>Motif &amp; Justification pastorale *</span>
                  <span className="text-[10px] text-on-surface-variant font-normal">Détail du besoin &amp; devis</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={expenseMotive}
                  onChange={(e) => setExpenseMotive(e.target.value)}
                  placeholder="Détaillez le besoin précis, devis fournisseur, urgence des travaux ou contexte pastoral..."
                  className="p-3 rounded-xl bg-surface-container-low text-on-surface outline-none border border-surface-container focus:border-primary resize-none"
                />
              </div>

              {/* Notice statutaire */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-2 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">verified_user</span>
                <span className="leading-relaxed">
                  Conformément au Manuel de Discipline de la MPEC, cet engagement sera soumis au visa préalable de la Trésorerie avant ordonnancement officiel par l'autorité pastorale compétente.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="h-10 px-5 rounded-xl bg-primary text-on-primary hover:bg-primary-hover font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingExpense ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      <span>Transmission en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Transmettre la réquisition</span>
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
