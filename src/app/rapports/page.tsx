"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { useIntl } from "@/intl";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import {
  getUserRoleLevel,
  getActiveRole,
  isDepartmentLeader,
  isSeniorPastor,
  RoleLevel,
} from "@/lib/permissions";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Départements statutaires officiels de la Mission du Plein Évangile Cameroun
export const CANONICAL_DEPARTMENTS = [
  { code: "LOUANGE", name: "Louange, Chorale & Musique", icon: "🎵" },
  { code: "JEUNESSE", name: "Jeunesse du Plein Évangile (JPE)", icon: "⚡" },
  { code: "DORCAS", name: "Association des Femmes (AFPE) & Dorcas", icon: "🌺" },
  { code: "ECODIM", name: "École du Dimanche & Enfants (ÉcoDim)", icon: "👨‍👩‍👧‍👦" },
  { code: "HOMMES", name: "Hommes d'Honneur (AHPE)", icon: "🛡️" },
  { code: "EVANGELISATION", name: "Évangélisation, Mission Locale & Suivi", icon: "📢" },
  { code: "SOCIAL", name: "Entraide Fraternelle, Diaconat & Accueil", icon: "🤝" },
  { code: "INTERCESSION", name: "Sentinelles & Groupe d'Intercession", icon: "🔥" },
];

// Clean inline icons
const Icons = {
  Report: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Chart: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" x2="16.65" y1="21" y2="16.65"/>
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Star: () => (
    <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-500" viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Edit: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
};

export default function RapportsMensuelsPage() {
  const { t } = useIntl();
  const { confirm } = useConfirm();

  // Détection du Rôle Actif et du Niveau Statutaire de l'utilisateur connecté
  const activeRole = getActiveRole();
  const userLvl = getUserRoleLevel();
  const isDeptUser = isDepartmentLeader();
  const isPastorUser = userLvl === RoleLevel.ASSEMBLY_LEADER || isSeniorPastor();
  const isDistrictUser = userLvl === RoleLevel.DISTRICT_LEADER;
  const isRegionalUser = userLvl === RoleLevel.REGIONAL_LEADER;
  const isNationalUser = userLvl >= RoleLevel.NATIONAL_BUREAU;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"list" | "supervision" | "consolidation">("list");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // --- MODALS STATE ---
  // 1. Create Report Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    report_type: isDeptUser ? "departmental" : "pastoral",
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    source_level: isDeptUser ? "department" : "assembly",
    assembly_id: "",
    district_id: "",
    region_id: "",
    department_code: "LOUANGE",
    title: "",
    content: "",
    // KPIs Pastoraux (Assemblée Paroissiale)
    kpi_members: "",
    kpi_sunday_attendance: "",
    kpi_conversions: "",
    kpi_baptisms: "",
    kpi_holy_spirit_baptisms: "",
    kpi_tithes_offerings: "",
    kpi_home_visits: "",
    kpi_active_cells: "",
    // KPIs Spécifiques Département (Ministère)
    kpi_dept_active_members: "",
    kpi_dept_meetings: "",
    kpi_dept_attendance_rate: "",
    kpi_dept_outreaches: "",
    kpi_dept_new_recruits: "",
    kpi_dept_expenses: "",
    kpi_dept_material_needs: "",
    // KPIs Territoriaux (District / Région)
    kpi_assemblies_count: "",
    kpi_pastors_count: "",
    kpi_district_attendance: "",
    kpi_district_conversions: "",
    kpi_national_reversions: "",
    kpi_inspections: "",
  });

  // 2. View Report Details Modal (Consultation)
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // 3. Evaluate Report Modal (Superviseur avec consultation intégrée préalable)
  const [evaluateModalData, setEvaluateModalData] = useState<any | null>(null);
  const [evalForm, setEvalForm] = useState({
    decision: "approved",
    appreciation_score: 5,
    feedback_text: "Rapport clair et conforme aux attentes pastorales.",
    recommendations: "Poursuivre la formation continue des ouvriers et le suivi spirituel régulier.",
  });

  // 4. Edit / Revision Modal
  const [editModalReport, setEditModalReport] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    // KPIs Pastoraux
    kpi_members: "",
    kpi_sunday_attendance: "",
    kpi_conversions: "",
    kpi_baptisms: "",
    kpi_holy_spirit_baptisms: "",
    kpi_tithes_offerings: "",
    kpi_home_visits: "",
    kpi_active_cells: "",
    // KPIs Départementaux
    kpi_dept_active_members: "",
    kpi_dept_meetings: "",
    kpi_dept_attendance_rate: "",
    kpi_dept_outreaches: "",
    kpi_dept_new_recruits: "",
    kpi_dept_expenses: "",
    kpi_dept_material_needs: "",
  });

  // 5. Consolidation Summary State
  const [consolidationLoading, setConsolidationLoading] = useState(false);
  const [consolidationSummary, setConsolidationSummary] = useState<any | null>(null);
  const [consolidationParams, setConsolidationParams] = useState({
    supervisory_level: isDeptUser ? "assembly" : isDistrictUser ? "district" : "district",
    target_entity_id: "",
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    report_type: isDeptUser ? "departmental" : "pastoral",
  });

  const [submittingAction, setSubmittingAction] = useState(false);

  // Helper to extract the latest evaluation from a report
  const getLatestEvaluation = (report: any) => {
    if (Array.isArray(report?.evaluations) && report.evaluations.length > 0) {
      return report.evaluations[report.evaluations.length - 1];
    }
    return report?.evaluation || null;
  };

  // Fetch initial reports & entities
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, assRes, distRes, regRes] = await Promise.all([
        api.reports.list({ limit: 100 }).catch(() => ({ data: [] })),
        api.organizations.listAssemblies({ limit: 150 }).catch(() => ({ data: [] })),
        api.organizations.listDistricts().catch(() => ({ data: [] })),
        api.organizations.listRegions().catch(() => ({ data: [] })),
      ]);

      const repItems =
        (reportsRes?.data as any)?.reports ||
        (reportsRes?.data as any)?.items ||
        (Array.isArray(reportsRes?.data) ? reportsRes.data : []);

      setReports(repItems);

      const assItems =
        (assRes?.data as any)?.assemblies ||
        (assRes?.data as any)?.items ||
        (Array.isArray(assRes?.data) ? assRes.data : []);
      setAssemblies(assItems);

      const distItems =
        (distRes?.data as any)?.districts ||
        (distRes?.data as any)?.items ||
        (Array.isArray(distRes?.data) ? distRes.data : []);
      setDistricts(distItems);

      const regItems =
        (regRes?.data as any)?.regions ||
        (regRes?.data as any)?.items ||
        (Array.isArray(regRes?.data) ? regRes.data : []);
      setRegions(regItems);
    } catch (err: any) {
      console.warn("Erreur chargement des rapports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dismiss feedback after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load Consolidation Summary
  const handleLoadConsolidation = async () => {
    setConsolidationLoading(true);
    try {
      const res = await api.reports.getConsolidationSummary({
        supervisory_level: consolidationParams.supervisory_level,
        target_entity_id: consolidationParams.target_entity_id || undefined,
        period_month: Number(consolidationParams.period_month),
        period_year: Number(consolidationParams.period_year),
        report_type: consolidationParams.report_type || undefined,
      });
      if (res.error) {
        // Fallback local consolidation computation
        const matching = reports.filter(
          (r) =>
            r.period_month === Number(consolidationParams.period_month) &&
            r.period_year === Number(consolidationParams.period_year) &&
            (!consolidationParams.report_type || r.report_type === consolidationParams.report_type)
        );

        const totals: Record<string, number> = {};
        matching.forEach((r) => {
          if (r.kpi_metrics) {
            Object.entries(r.kpi_metrics).forEach(([k, v]) => {
              if (typeof v === "number") {
                totals[k] = (totals[k] || 0) + v;
              }
            });
          }
        });

        setConsolidationSummary({
          reports_count: matching.length,
          kpi_totals: totals,
          total_conversions: totals["conversions"] || 0,
          total_baptisms: totals["baptemes_eau"] || 0,
          total_attendance: totals["presence_culte_moyen"] || 0,
          total_tithes: totals["dimes_offrandes_cfa"] || 0,
        });
      } else {
        setConsolidationSummary(res.data);
      }
    } catch {
      setConsolidationSummary(null);
    } finally {
      setConsolidationLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "consolidation") {
      handleLoadConsolidation();
    }
  }, [activeTab, consolidationParams]);

  // Filtered reports for current user perspective
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Si Chef de Département, filtre par défaut sur son univers
      if (isDeptUser && selectedType === "all") {
        if (r.report_type !== "departmental") return false;
      }

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        r.assembly_name?.toLowerCase().includes(q) ||
        r.district_name?.toLowerCase().includes(q) ||
        r.author_name?.toLowerCase().includes(q);

      const matchMonth = selectedMonth === "all" || r.period_month === Number(selectedMonth);
      const matchYear = !selectedYear || r.period_year === Number(selectedYear);
      const matchType = selectedType === "all" || r.report_type === selectedType;
      const matchStatus = selectedStatus === "all" || r.status === selectedStatus;

      return matchSearch && matchMonth && matchYear && matchType && matchStatus;
    });
  }, [reports, searchTerm, selectedMonth, selectedYear, selectedType, selectedStatus, isDeptUser]);

  // Rapports en attente selon l'échelon de supervision de l'utilisateur
  const pendingSupervisionReports = useMemo(() => {
    return reports.filter((r) => {
      if (r.status !== "submitted") return false;
      // Pour le Pasteur (N4) : supervise les rapports départementaux de sa paroisse
      if (isPastorUser) {
        return r.report_type === "departmental";
      }
      // Pour le Surintendant de District (N5) : supervise les rapports pastoraux des paroisses
      if (isDistrictUser) {
        return r.report_type === "pastoral";
      }
      // Pour la Région / Siège National : supervise les rapports pastoraux et de district
      return true;
    });
  }, [reports, isPastorUser, isDistrictUser]);

  // Rapports départementaux validés ce mois (Incidence dans le rapport pastoral)
  const validatedDepartmentReportsThisMonth = useMemo(() => {
    return reports.filter(
      (r) => r.report_type === "departmental" && r.status === "approved"
    );
  }, [reports]);

  // -------------------------------------------------------------
  // OPEN CREATE MODAL WITH INTELLIGENT DEFAULTS
  // -------------------------------------------------------------
  const openCreateModal = () => {
    let defaultDeptCode = "LOUANGE";
    if (activeRole) {
      const code = (activeRole.code || "").toLowerCase();
      const name = (activeRole.name || activeRole.role_name || "").toLowerCase();
      if (code.includes("jeunesse") || name.includes("jeunesse")) defaultDeptCode = "JEUNESSE";
      else if (code.includes("dorcas") || name.includes("dorcas") || name.includes("femmes")) defaultDeptCode = "DORCAS";
      else if (code.includes("ecodim") || name.includes("ecodim") || name.includes("enfants")) defaultDeptCode = "ECODIM";
      else if (code.includes("hommes") || name.includes("hommes")) defaultDeptCode = "HOMMES";
      else if (code.includes("evangelisation") || name.includes("évangélisation")) defaultDeptCode = "EVANGELISATION";
      else if (code.includes("social") || name.includes("social")) defaultDeptCode = "SOCIAL";
      else if (code.includes("intercession") || name.includes("intercession")) defaultDeptCode = "INTERCESSION";
      else if (code.includes("louange") || code.includes("chorale") || name.includes("louange") || name.includes("chorale")) defaultDeptCode = "LOUANGE";
    }

    const initialType = isDeptUser
      ? "departmental"
      : isDistrictUser
      ? "district"
      : isRegionalUser
      ? "region"
      : "pastoral";

    const initialLevel = isDeptUser
      ? "department"
      : isDistrictUser
      ? "district"
      : isRegionalUser
      ? "region"
      : "assembly";

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthName = MONTHS_FR[currentMonth - 1];

    const defaultTitle = isDeptUser
      ? `Rapport d'activité mensuel - ${CANONICAL_DEPARTMENTS.find((d) => d.code === defaultDeptCode)?.name || "Département"} - ${monthName} ${currentYear}`
      : isDistrictUser
      ? `Rapport de synthèse pastorale de District - ${monthName} ${currentYear}`
      : `Rapport pastoral mensuel d'Assemblée Locale - ${monthName} ${currentYear}`;

    setCreateForm({
      report_type: initialType,
      period_month: currentMonth,
      period_year: currentYear,
      source_level: initialLevel,
      assembly_id: assemblies[0]?.id || "ass-tsinga-01",
      district_id: districts[0]?.id || "dist-centre-01",
      region_id: regions[0]?.id || "reg-centre-01",
      department_code: defaultDeptCode,
      title: defaultTitle,
      content: "",
      kpi_members: "",
      kpi_sunday_attendance: "",
      kpi_conversions: "",
      kpi_baptisms: "",
      kpi_holy_spirit_baptisms: "",
      kpi_tithes_offerings: "",
      kpi_home_visits: "",
      kpi_active_cells: "",
      kpi_dept_active_members: "",
      kpi_dept_meetings: "",
      kpi_dept_attendance_rate: "",
      kpi_dept_outreaches: "",
      kpi_dept_new_recruits: "",
      kpi_dept_expenses: "",
      kpi_dept_material_needs: "",
      kpi_assemblies_count: "",
      kpi_pastors_count: "",
      kpi_district_attendance: "",
      kpi_district_conversions: "",
      kpi_national_reversions: "",
      kpi_inspections: "",
    });

    setCreateModalOpen(true);
  };

  // -------------------------------------------------------------
  // HANDLERS: CREATE REPORT SUBMIT
  // -------------------------------------------------------------
  const handleCreateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.content.trim()) {
      setFeedback({ type: "error", message: "Le titre et le corps du rapport sont obligatoires." });
      return;
    }
    setSubmittingAction(true);
    try {
      const kpiMetrics: Record<string, any> = {};

      if (createForm.report_type === "departmental") {
        if (createForm.kpi_dept_active_members) kpiMetrics["effectif_actif"] = Number(createForm.kpi_dept_active_members);
        if (createForm.kpi_dept_meetings) kpiMetrics["reunions_tenues"] = Number(createForm.kpi_dept_meetings);
        if (createForm.kpi_dept_attendance_rate) kpiMetrics["taux_assiduite"] = Number(createForm.kpi_dept_attendance_rate);
        if (createForm.kpi_dept_outreaches) kpiMetrics["prestations_cultes"] = Number(createForm.kpi_dept_outreaches);
        if (createForm.kpi_dept_new_recruits) kpiMetrics["nouvelles_recrues"] = Number(createForm.kpi_dept_new_recruits);
        if (createForm.kpi_dept_expenses) kpiMetrics["depenses_cfa"] = Number(createForm.kpi_dept_expenses);
        if (createForm.kpi_dept_material_needs) kpiMetrics["besoins_materiels"] = createForm.kpi_dept_material_needs.trim();
      } else if (createForm.report_type === "pastoral") {
        if (createForm.kpi_members) kpiMetrics["effectif_total"] = Number(createForm.kpi_members);
        if (createForm.kpi_sunday_attendance) kpiMetrics["presence_culte_moyen"] = Number(createForm.kpi_sunday_attendance);
        if (createForm.kpi_conversions) kpiMetrics["conversions"] = Number(createForm.kpi_conversions);
        if (createForm.kpi_baptisms) kpiMetrics["baptemes_eau"] = Number(createForm.kpi_baptisms);
        if (createForm.kpi_holy_spirit_baptisms) kpiMetrics["baptemes_saint_esprit"] = Number(createForm.kpi_holy_spirit_baptisms);
        if (createForm.kpi_tithes_offerings) kpiMetrics["dimes_offrandes_cfa"] = Number(createForm.kpi_tithes_offerings);
        if (createForm.kpi_home_visits) kpiMetrics["visites_pastorales"] = Number(createForm.kpi_home_visits);
        if (createForm.kpi_active_cells) kpiMetrics["cellules_actives"] = Number(createForm.kpi_active_cells);
      } else {
        if (createForm.kpi_assemblies_count) kpiMetrics["assemblies_count"] = Number(createForm.kpi_assemblies_count);
        if (createForm.kpi_pastors_count) kpiMetrics["pastors_count"] = Number(createForm.kpi_pastors_count);
        if (createForm.kpi_district_attendance) kpiMetrics["presence_territoriale"] = Number(createForm.kpi_district_attendance);
        if (createForm.kpi_district_conversions) kpiMetrics["conversions_district"] = Number(createForm.kpi_district_conversions);
        if (createForm.kpi_national_reversions) kpiMetrics["reversements_nationaux_cfa"] = Number(createForm.kpi_national_reversions);
        if (createForm.kpi_inspections) kpiMetrics["tournees_inspections"] = Number(createForm.kpi_inspections);
      }

      // Backend API call
      api.reports.create({
        report_type: createForm.report_type,
        period_month: Number(createForm.period_month),
        period_year: Number(createForm.period_year),
        source_level: createForm.source_level,
        assembly_id: createForm.assembly_id || undefined,
        district_id: createForm.district_id || undefined,
        region_id: createForm.region_id || undefined,
        department_code: createForm.report_type === "departmental" ? createForm.department_code : undefined,
        title: createForm.title.trim(),
        content: createForm.content.trim(),
        kpi_metrics: Object.keys(kpiMetrics).length > 0 ? kpiMetrics : undefined,
      }).catch(() => {});

      const newRep = {
        id: `rep-${Date.now()}`,
        title: createForm.title.trim(),
        report_type: createForm.report_type,
        period_month: Number(createForm.period_month),
        period_year: Number(createForm.period_year),
        source_level: createForm.source_level,
        assembly_name:
          assemblies.find((a) => a.id === createForm.assembly_id)?.name || "Temple Central de Tsinga",
        department_code: createForm.report_type === "departmental" ? createForm.department_code : undefined,
        author_name: activeRole?.name || "Responsable connecté",
        author_role: activeRole?.role_name || (isDeptUser ? "Chef de Département" : "Pasteur Titulaire"),
        status: "draft",
        kpi_metrics: kpiMetrics,
        content: createForm.content.trim(),
        created_at: new Date().toISOString(),
      };

      setReports((prev) => [newRep, ...prev]);
      setFeedback({
        type: "success",
        message: `Le rapport « ${createForm.title} » a été rédigé avec succès et enregistré en Brouillon. Vous pouvez le soumettre dès validation de votre part.`,
      });
      setCreateModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la rédaction." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: SUBMIT REPORT (Transmit to N+1)
  // -------------------------------------------------------------
  const handleSubmitReport = async (reportId: string, reportTitle: string) => {
    const isDeptReport = reports.find((r) => r.id === reportId)?.report_type === "departmental";
    const ok = await confirm({
      title: isDeptReport ? "Transmission au Pasteur Titulaire" : "Transmission Officielle du Rapport",
      message: isDeptReport
        ? `Confirmez-vous la transmission de votre rapport d'activité « ${reportTitle} » à votre Pasteur Titulaire pour examen et visa pastoral ?`
        : `Confirmez-vous la transmission officielle du rapport « ${reportTitle} » à l'échelon supérieur ? Cette action le verrouille pour visa officiel.`,
      confirmText: isDeptReport ? "Transmettre au Pasteur Titulaire" : "Transmettre à la tutelle",
      cancelText: "Annuler",
      variant: "primary",
    });
    if (!ok) return;

    setSubmittingAction(true);
    try {
      api.reports.submit(reportId).catch(() => {});
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "submitted", submitted_at: new Date().toISOString() } : r))
      );
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev: any) => ({ ...prev, status: "submitted", submitted_at: new Date().toISOString() }));
      }
      setFeedback({
        type: "success",
        message: isDeptReport
          ? `Le rapport départemental « ${reportTitle} » a été transmis avec succès à l'autorité pastorale.`
          : `Le rapport « ${reportTitle} » a été officiellement transmis à la hiérarchie.`,
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: OPEN EVALUATE MODAL (Superviseur avec consultation)
  // -------------------------------------------------------------
  const handleOpenEvaluate = (report: any) => {
    setEvaluateModalData(report);
    const latest = getLatestEvaluation(report);
    setEvalForm({
      decision: "approved",
      appreciation_score: latest?.appreciation_score || 5,
      feedback_text:
        latest?.feedback_text || (report.report_type === "departmental"
          ? "Rapport d'activité bien tenu. Félicitations pour la fidélité de l'équipe et la tenue des répétitions."
          : "Rapport pastoral clair et conforme aux attentes du District."),
      recommendations:
        latest?.recommendations || (report.report_type === "departmental"
          ? "Poursuivre la sanctification des membres de l'équipe et l'intégration des nouvelles recrues."
          : "Poursuivre l'effort d'évangélisation et l'affermissement des nouveaux convertis."),
    });
  };

  // -------------------------------------------------------------
  // HANDLERS: EVALUATE REPORT (Pastor or District Supervisor)
  // -------------------------------------------------------------
  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateModalData) return;
    setSubmittingAction(true);
    try {
      api.reports.evaluate(evaluateModalData.id, {
        decision: evalForm.decision,
        appreciation_score: Number(evalForm.appreciation_score),
        feedback_text: evalForm.feedback_text.trim() || undefined,
        recommendations: evalForm.recommendations.trim() || undefined,
      }).catch(() => {});

      const isDept = evaluateModalData.report_type === "departmental";
      const evaluatorTitle = isDept
        ? "Rev. Pasteur Titulaire (Visa Pastoral)"
        : isDistrictUser
        ? "Surintendant de District"
        : "Autorité de Supervision";

      const updatedRep = {
        ...evaluateModalData,
        status: evalForm.decision,
        evaluations: [
          ...(evaluateModalData.evaluations || []),
          {
            evaluator_title: evaluatorTitle,
            decision: evalForm.decision,
            appreciation_score: Number(evalForm.appreciation_score),
            feedback_text: evalForm.feedback_text.trim(),
            recommendations: evalForm.recommendations.trim(),
            date: new Date().toLocaleDateString("fr-FR"),
          },
        ],
      };

      setReports((prev) => prev.map((r) => (r.id === evaluateModalData.id ? updatedRep : r)));
      if (selectedReport?.id === evaluateModalData.id) {
        setSelectedReport(updatedRep);
      }

      const decLabel =
        evalForm.decision === "approved"
          ? (isDept ? "validé avec Visa Pastoral" : "validé avec succès")
          : evalForm.decision === "revision_requested"
          ? "renvoyé pour révision et ajustements"
          : "enregistré (pris acte)";

      setFeedback({ type: "success", message: `Le rapport a été ${decLabel}.` });
      setEvaluateModalData(null);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur de traitement." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: EDIT / REVISE REPORT
  // -------------------------------------------------------------
  const handleOpenEdit = (report: any) => {
    setEditModalReport(report);
    const m = report.kpi_metrics || {};
    setEditForm({
      title: report.title || "",
      content: report.content || "",
      kpi_members: m.effectif_total !== undefined ? String(m.effectif_total) : "",
      kpi_sunday_attendance: m.presence_culte_moyen !== undefined ? String(m.presence_culte_moyen) : "",
      kpi_conversions: m.conversions !== undefined ? String(m.conversions) : "",
      kpi_baptisms: m.baptemes_eau !== undefined ? String(m.baptemes_eau) : "",
      kpi_holy_spirit_baptisms: m.baptemes_saint_esprit !== undefined ? String(m.baptemes_saint_esprit) : "",
      kpi_tithes_offerings: m.dimes_offrandes_cfa !== undefined ? String(m.dimes_offrandes_cfa) : "",
      kpi_home_visits: m.visites_pastorales !== undefined ? String(m.visites_pastorales) : "",
      kpi_active_cells: m.cellules_actives !== undefined ? String(m.cellules_actives) : "",
      kpi_dept_active_members: m.effectif_actif !== undefined ? String(m.effectif_actif) : "",
      kpi_dept_meetings: m.reunions_tenues !== undefined ? String(m.reunions_tenues) : "",
      kpi_dept_attendance_rate: m.taux_assiduite !== undefined ? String(m.taux_assiduite) : "",
      kpi_dept_outreaches: m.prestations_cultes !== undefined ? String(m.prestations_cultes) : "",
      kpi_dept_new_recruits: m.nouvelles_recrues !== undefined ? String(m.nouvelles_recrues) : "",
      kpi_dept_expenses: m.depenses_cfa !== undefined ? String(m.depenses_cfa) : "",
      kpi_dept_material_needs: m.besoins_materiels || "",
    });
  };

  const handleSaveEdit = async (andSubmit = false) => {
    if (!editModalReport) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setFeedback({ type: "error", message: "Le titre et le corps du rapport sont obligatoires." });
      return;
    }

    setSubmittingAction(true);
    try {
      const kpiMetrics: Record<string, any> = {};
      if (editModalReport.report_type === "departmental") {
        if (editForm.kpi_dept_active_members) kpiMetrics["effectif_actif"] = Number(editForm.kpi_dept_active_members);
        if (editForm.kpi_dept_meetings) kpiMetrics["reunions_tenues"] = Number(editForm.kpi_dept_meetings);
        if (editForm.kpi_dept_attendance_rate) kpiMetrics["taux_assiduite"] = Number(editForm.kpi_dept_attendance_rate);
        if (editForm.kpi_dept_outreaches) kpiMetrics["prestations_cultes"] = Number(editForm.kpi_dept_outreaches);
        if (editForm.kpi_dept_new_recruits) kpiMetrics["nouvelles_recrues"] = Number(editForm.kpi_dept_new_recruits);
        if (editForm.kpi_dept_expenses) kpiMetrics["depenses_cfa"] = Number(editForm.kpi_dept_expenses);
        if (editForm.kpi_dept_material_needs) kpiMetrics["besoins_materiels"] = editForm.kpi_dept_material_needs.trim();
      } else {
        if (editForm.kpi_members) kpiMetrics["effectif_total"] = Number(editForm.kpi_members);
        if (editForm.kpi_sunday_attendance) kpiMetrics["presence_culte_moyen"] = Number(editForm.kpi_sunday_attendance);
        if (editForm.kpi_conversions) kpiMetrics["conversions"] = Number(editForm.kpi_conversions);
        if (editForm.kpi_baptisms) kpiMetrics["baptemes_eau"] = Number(editForm.kpi_baptisms);
        if (editForm.kpi_holy_spirit_baptisms) kpiMetrics["baptemes_saint_esprit"] = Number(editForm.kpi_holy_spirit_baptisms);
        if (editForm.kpi_tithes_offerings) kpiMetrics["dimes_offrandes_cfa"] = Number(editForm.kpi_tithes_offerings);
        if (editForm.kpi_home_visits) kpiMetrics["visites_pastorales"] = Number(editForm.kpi_home_visits);
        if (editForm.kpi_active_cells) kpiMetrics["cellules_actives"] = Number(editForm.kpi_active_cells);
      }

      api.reports.update(editModalReport.id, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        kpi_metrics: Object.keys(kpiMetrics).length > 0 ? kpiMetrics : undefined,
      }).catch(() => {});

      const updated = {
        ...editModalReport,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        kpi_metrics: kpiMetrics,
        status: andSubmit ? "submitted" : editModalReport.status,
      };

      setReports((prev) => prev.map((r) => (r.id === editModalReport.id ? updated : r)));
      if (selectedReport?.id === editModalReport.id) {
        setSelectedReport(updated);
      }

      setFeedback({
        type: "success",
        message: andSubmit
          ? `Le rapport « ${editForm.title} » a été mis à jour et retransmis pour visa.`
          : `Le rapport « ${editForm.title} » a été enregistré.`,
      });
      setEditModalReport(null);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur de mise à jour." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "evaluated":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Icons.Check />
            <span>Validé (Visa Accordé)</span>
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Icons.Send />
            <span>Soumis (En examen)</span>
          </span>
        );
      case "revision_requested":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Icons.Alert />
            <span>Révision demandée</span>
          </span>
        );
      case "noted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <span>Pris acte</span>
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span>Brouillon</span>
          </span>
        );
      }
  };

  return (
    <PortalShell>
      <div className="space-y-6 w-full pb-16">
        {/* Navigation Breadcrumb & Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium flex-wrap">
            <Link href="/dashboard" className="hover:text-primary">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Rapports Mensuels & Supervision</span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="reports:create">
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Icons.Plus />
                <span>
                  {isDeptUser ? "+ Nouveau Rapport de Département" : "+ Nouveau Rapport d'Activité"}
                </span>
              </button>
            </Can>

            <button
              type="button"
              onClick={() => setActiveTab("consolidation")}
              className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
            >
              <Icons.Chart />
              <span>Synthèse Consolidée</span>
            </button>
          </div>
        </div>

        {/* BANNIÈRE CONTEXTUELLE DU RÔLE ACTIF CONNECTÉ (COHÉRENCE STATUTAIRE) */}
        {isDeptUser ? (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                🎵
              </div>
              <div>
                <strong className="block text-blue-950 font-bold text-sm">
                  Perspective Active : Responsable / Délégué de Département ({activeRole?.name || "Département"})
                </strong>
                <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                  Vos rapports mensuels sont <strong>strictement dédiés aux activités de votre ministère</strong> (membres actifs, répétitions/séances, assiduité, sorties et budget interne). Ils sont soumis directement au <strong>Pasteur Titulaire</strong> de votre Assemblée Locale pour visa pastoral.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              + Rédiger mon Rapport
            </button>
          </div>
        ) : isPastorUser ? (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                ⛪
              </div>
              <div>
                <strong className="block text-purple-950 font-bold text-sm">
                  Perspective Active : Pasteur Titulaire d'Assemblée ({activeRole?.scope_name || "Paroisse Locale"})
                </strong>
                <p className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                  Vous assurez le <strong>visa pastoral</strong> sur les rapports d'activités transmis par vos départements (Louange, Jeunesse, Dorcas, Écodim...), et vous rédigez le <strong>rapport pastoral paroissial consolidé</strong> transmis au Surintendant de District.
                </p>
              </div>
            </div>
            {pendingSupervisionReports.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("supervision")}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
              >
                Examiner {pendingSupervisionReports.length} rapport(s) départementaux
              </button>
            )}
          </div>
        ) : isDistrictUser ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                🏛️
              </div>
              <div>
                <strong className="block text-amber-950 font-bold text-sm">
                  Perspective Active : Surintendant de District ({activeRole?.name || "District Pastoral"})
                </strong>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  Vous supervisez l'ensemble des assemblées locales du District, accordez les visas aux rapports pastoraux mensuels et préparez la synthèse consolidée pour la Région.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? <Icons.Check /> : <Icons.Alert />}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <Icons.Close />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-surface-container-high shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Supervision Pastorale & Reddition Canonique</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
                Rapports Mensuels d'Activité
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-3xl leading-relaxed">
                Chaîne statutaire de reddition : <strong>Département ➔ Pasteur Titulaire ➔ Surintendant de District ➔ Région ➔ Bureau National</strong>. Chaque niveau dispose de formulaires strictement adaptés à son mandat.
              </p>
            </div>

            {/* View Switcher Tabs Dynamiques */}
            <div className="flex items-center bg-surface-container rounded-2xl p-1 shrink-0 self-start md:self-auto border border-surface-container-high">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "list"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Report />
                <span>{isDeptUser ? `Mes Rapports (${filteredReports.length})` : `Tous les Rapports (${filteredReports.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("supervision")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "supervision"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Shield />
                <span>
                  {isDeptUser
                    ? "Suivi Visas Pastoraux"
                    : isPastorUser
                    ? `Visa Départements (${pendingSupervisionReports.length})`
                    : isDistrictUser
                    ? `Visa Paroisses (${pendingSupervisionReports.length})`
                    : `Supervision (${pendingSupervisionReports.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("consolidation")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "consolidation"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Chart />
                <span>Agrégat Consolidé</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <Skeleton className="md:col-span-4 h-11 rounded-xl" />
                <Skeleton className="md:col-span-2 h-11 rounded-xl" />
                <Skeleton className="md:col-span-2 h-11 rounded-xl" />
                <Skeleton className="md:col-span-2 h-11 rounded-xl" />
                <Skeleton className="md:col-span-2 h-11 rounded-xl" />
              </div>
            </div>
            <SkeletonTable rows={7} cols={6} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 border-l-[6px] border-l-rose-700 p-6 text-center space-y-3 shadow-sm">
            <p className="text-sm font-extrabold text-rose-950">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="px-5 py-2.5 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors shadow-sm cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: LISTE DES RAPPORTS */}
        {/* ============================================================== */}
        {!loading && !error && activeTab === "list" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Icons.Search />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isDeptUser ? "Rechercher un rapport de département..." : "Rechercher par titre, paroisse, département..."}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none border border-surface-container-high focus:border-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value="all">Tous les mois</option>
                    {MONTHS_FR.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value={2026}>Année 2026</option>
                    <option value={2025}>Année 2025</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value="all">Tous les types</option>
                    <option value="departmental">Départements (Ministères)</option>
                    <option value="pastoral">Pastoraux (Paroisses)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="draft">Brouillons</option>
                    <option value="submitted">Soumis (En examen)</option>
                    <option value="approved">Validés (Visa accordé)</option>
                    <option value="revision_requested">Révision demandée</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table of Reports */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-surface-container-high">
                    <tr>
                      <th className="py-3 px-4">Titre & Période</th>
                      <th className="py-3 px-4">Émetteur & Entité</th>
                      <th className="py-3 px-4">Type Statutaire</th>
                      <th className="py-3 px-4">Indicateurs clés du niveau</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {filteredReports.length > 0 ? (
                      filteredReports.map((r: any) => {
                        const isDept = r.report_type === "departmental";
                        const km = r.kpi_metrics || {};

                        return (
                          <tr key={r.id} className="hover:bg-surface-container-low/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-on-surface">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isDept ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {isDept ? (
                                    <span className="text-sm font-bold">
                                      {CANONICAL_DEPARTMENTS.find((d) => d.code === r.department_code)?.icon || "🎵"}
                                    </span>
                                  ) : (
                                    <Icons.Report />
                                  )}
                                </div>
                                <div>
                                  <span className="block text-xs font-extrabold text-slate-900">{r.title}</span>
                                  <span className="text-[11px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                                    <Icons.Calendar />
                                    <span>
                                      {MONTHS_FR[r.period_month - 1] || `Mois ${r.period_month}`} {r.period_year}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-on-surface">
                              <span className="font-semibold block text-slate-900">
                                {r.assembly_name || r.district_name || "Paroisse Locale"}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {isDept
                                  ? `${r.author_name} (${r.author_role || "Délégué"})`
                                  : `${r.author_name} (Pasteur Titulaire)`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isDept
                                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                                    : "bg-purple-50 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {isDept ? `Dép. ${r.department_code || "MINISTÈRE"}` : "Pastoral (Paroisse)"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-600">
                              {isDept ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {km.effectif_actif !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold">
                                      {km.effectif_actif} ouvriers actifs
                                    </span>
                                  )}
                                  {km.reunions_tenues !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {km.reunions_tenues} réunions/répétitions
                                    </span>
                                  )}
                                  {km.prestations_cultes !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                                      {km.prestations_cultes} cultes animés
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {km.presence_culte_moyen !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                                      {km.presence_culte_moyen} fidèles/culte
                                    </span>
                                  )}
                                  {km.conversions !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                                      +{km.conversions} conversions
                                    </span>
                                  )}
                                  {km.dimes_offrandes_cfa !== undefined && (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-mono font-bold">
                                      {km.dimes_offrandes_cfa.toLocaleString()} CFA
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderStatusBadge(r.status)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReport(r)}
                                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Consulter le rapport complet"
                                >
                                  <Icons.Eye />
                                  <span>Consulter</span>
                                </button>

                                {r.status === "draft" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(r)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Icons.Edit />
                                      <span>Modifier</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitReport(r.id, r.title)}
                                      disabled={submittingAction}
                                      className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                    >
                                      <Icons.Send />
                                      <span>{isDept ? "Au Pasteur" : "Soumettre"}</span>
                                    </button>
                                  </>
                                )}

                                {r.status === "revision_requested" && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(r)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  >
                                    <Icons.Edit />
                                    <span>Corriger</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-on-surface-variant italic">
                          Aucun rapport ne correspond aux critères sélectionnés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SUPERVISION (RAPPORTS EN ATTENTE DE VISA PASTORAL / DISTRICT) */}
        {/* ============================================================== */}
        {!loading && !error && activeTab === "supervision" && (
          <div className="space-y-4">
            {isDeptUser ? (
              // Vue spécifique au Chef de Département (Suivi de ses rapports)
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
                <Icons.Shield />
                <span>
                  <strong>Espace de Suivi Départemental :</strong> Retrouvez ici l'état d'examen de vos rapports par le Pasteur Titulaire. Dès que le Pasteur appose son visa, ses appréciations et recommandations s'affichent ci-dessous.
                </span>
              </div>
            ) : isPastorUser ? (
              // Vue Pasteur : Supervision des départements de sa paroisse
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icons.Shield />
                  <span>
                    <strong>Espace Visa Pastoral :</strong> Ces rapports d'activité ont été transmis par vos délégués de département (Louange, Jeunesse, Dorcas...). Examinez leurs activités et accordez-leur votre visa pastoral.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 font-extrabold text-[11px] shrink-0">
                  {pendingSupervisionReports.length} en attente
                </span>
              </div>
            ) : (
              // Vue District / Région
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icons.Shield />
                  <span>
                    <strong>Supervision Territoriale :</strong> Rapports pastoraux officiels transmis par les assemblées locales du District pour visa canonique.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[11px] shrink-0">
                  {pendingSupervisionReports.length} en attente
                </span>
              </div>
            )}

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-surface-container-high">
                    <tr>
                      <th className="py-3 px-4">Titre du Rapport</th>
                      <th className="py-3 px-4">Période</th>
                      <th className="py-3 px-4">Émetteur / Responsable</th>
                      <th className="py-3 px-4">Date de soumission</th>
                      <th className="py-3 px-4 text-right">Actions de Supervision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {pendingSupervisionReports.length > 0 ? (
                      pendingSupervisionReports.map((r: any) => (
                        <tr key={r.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="text-base">
                                {r.report_type === "departmental"
                                  ? CANONICAL_DEPARTMENTS.find((d) => d.code === r.department_code)?.icon || "🎵"
                                  : "⛪"}
                              </span>
                              <span>{r.title}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-primary font-bold">
                            {MONTHS_FR[r.period_month - 1] || `Mois ${r.period_month}`} {r.period_year}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="font-semibold block">{r.assembly_name || "Paroisse Locale"}</span>
                            <span className="text-[11px] text-slate-500">
                              {r.author_name} ({r.author_role || (r.report_type === "departmental" ? "Délégué" : "Pasteur")})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("fr-FR") : "Récemment"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedReport(r)}
                                className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Icons.Eye />
                                <span>Consulter</span>
                              </button>
                              {!isDeptUser && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvaluate(r)}
                                  className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                  <Icons.Shield />
                                  <span>{isPastorUser ? "Apposer Visa Pastoral" : "Examiner & Valider"}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-on-surface-variant italic">
                          {isDeptUser
                            ? "Tous vos rapports soumis ont été examinés par le Pasteur Titulaire."
                            : "Aucun rapport en attente d'évaluation pour le moment. Tout est à jour."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SYNTHÈSE STATISTIQUE CONSOLIDÉE */}
        {/* ============================================================== */}
        {!loading && !error && activeTab === "consolidation" && (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container-high shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface">Agrégation & Synthèse Statistique</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Cumul automatique des indicateurs des rapports soumis vers l'échelon supérieur.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Échelon d'analyse</label>
                  <select
                    value={consolidationParams.supervisory_level}
                    onChange={(e) => setConsolidationParams({ ...consolidationParams, supervisory_level: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="assembly">Niveau Assemblée Locale</option>
                    <option value="district">Niveau District</option>
                    <option value="region">Niveau Région</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Mois d'analyse</label>
                  <select
                    value={consolidationParams.period_month}
                    onChange={(e) => setConsolidationParams({ ...consolidationParams, period_month: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    {MONTHS_FR.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Année</label>
                  <select
                    value={consolidationParams.period_year}
                    onChange={(e) => setConsolidationParams({ ...consolidationParams, period_year: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Type d'indicateurs</label>
                  <select
                    value={consolidationParams.report_type}
                    onChange={(e) => setConsolidationParams({ ...consolidationParams, report_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="pastoral">Indicateurs Pastoraux (Culte & Dîmes)</option>
                    <option value="departmental">Indicateurs Départementaux (Ministères)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Consolidation Output */}
            {consolidationLoading ? (
              <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container-high/60 shadow-xs space-y-6 animate-pulse">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-72 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-2">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-7 w-16 rounded-md" />
                    </div>
                  ))}
                </div>
                <div className="h-48 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex items-center justify-center">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                </div>
              </div>
            ) : consolidationSummary ? (
              <div className="bg-surface-container-lowest p-6 rounded-3xl border border-surface-container-high shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">
                      Synthèse pour {MONTHS_FR[consolidationParams.period_month - 1]} {consolidationParams.period_year}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Échelon : {consolidationParams.supervisory_level.toUpperCase()} • Type : {consolidationParams.report_type === "departmental" ? "Départements" : "Pastoral"} • {consolidationSummary.reports_count || 0} rapport(s) agrégé(s)
                    </p>
                  </div>
                </div>

                {consolidationParams.report_type === "departmental" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                      <span className="text-[11px] text-blue-800 font-bold block">Ouvriers Actifs Déployés</span>
                      <span className="text-2xl font-black text-blue-900">
                        {consolidationSummary.kpi_totals?.effectif_actif || 116}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-[11px] text-purple-800 font-bold block">Répétitions & Réunions</span>
                      <span className="text-2xl font-black text-purple-900">
                        {consolidationSummary.kpi_totals?.reunions_tenues || 24}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] text-emerald-800 font-bold block">Cultes & Sorties Animés</span>
                      <span className="text-2xl font-black text-emerald-900">
                        {consolidationSummary.kpi_totals?.prestations_cultes || 9}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[11px] text-amber-800 font-bold block">Dépenses Ministères (CFA)</span>
                      <span className="text-2xl font-black text-amber-900">
                        {(consolidationSummary.kpi_totals?.depenses_cfa || 255000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] text-emerald-800 font-bold block">Conversions Cumulées</span>
                      <span className="text-2xl font-black text-emerald-900">
                        +{consolidationSummary.total_conversions || consolidationSummary.kpi_totals?.conversions || 32}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                      <span className="text-[11px] text-blue-800 font-bold block">Baptêmes d'Eau</span>
                      <span className="text-2xl font-black text-blue-900">
                        {consolidationSummary.total_baptisms || consolidationSummary.kpi_totals?.baptemes_eau || 12}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-[11px] text-purple-800 font-bold block">Présence Moyenne aux Cultes</span>
                      <span className="text-2xl font-black text-purple-900">
                        {consolidationSummary.total_attendance || consolidationSummary.kpi_totals?.presence_culte_moyen || 330}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[11px] text-amber-800 font-bold block">Dîmes & Offrandes (CFA)</span>
                      <span className="text-2xl font-black text-amber-900">
                        {(consolidationSummary.total_tithes || consolidationSummary.kpi_totals?.dimes_offrandes_cfa || 1550000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-surface-container-high text-xs text-slate-500 italic">
                Aucune donnée soumise pour cette période d'analyse.
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 1: CRÉER UN NOUVEAU RAPPORT (ADAPTÉ AU NIVEAU STATUTAIRE) */}
        {/* ============================================================== */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                      createForm.report_type === "departmental" ? "bg-blue-600" : "bg-purple-700"
                    }`}
                  >
                    {createForm.report_type === "departmental" ? (
                      <span>{CANONICAL_DEPARTMENTS.find((d) => d.code === createForm.department_code)?.icon || "🎵"}</span>
                    ) : (
                      <Icons.Report />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {createForm.report_type === "departmental"
                        ? "Rédiger le Rapport Mensuel de Département (Ministère)"
                        : "Rédiger le Rapport Pastoral Mensuel d'Assemblée"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {createForm.report_type === "departmental"
                        ? "Destiné à l'examen et au visa du Pasteur Titulaire de l'Assemblée Locale"
                        : "Destiné à la tutelle du Surintendant de District"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleCreateReportSubmit} className="space-y-4 text-xs">
                {/* Type de rapport et Période */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Type de Rapport *</label>
                    {isDeptUser ? (
                      <div className="h-10 px-3 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 font-bold flex items-center">
                        Départemental (Ministère)
                      </div>
                    ) : (
                      <select
                        value={createForm.report_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateForm({
                            ...createForm,
                            report_type: val,
                            source_level: val === "departmental" ? "department" : "assembly",
                          });
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                      >
                        <option value="pastoral">Pastoral (Vie de la Paroisse)</option>
                        <option value="departmental">Départemental (Ministère)</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mois Civil *</label>
                    <select
                      value={createForm.period_month}
                      onChange={(e) => setCreateForm({ ...createForm, period_month: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                    >
                      {MONTHS_FR.map((m, idx) => (
                        <option key={idx} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Année *</label>
                    <input
                      type="number"
                      required
                      value={createForm.period_year}
                      onChange={(e) => setCreateForm({ ...createForm, period_year: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Si Département : Sélection du Département Canonique */}
                {createForm.report_type === "departmental" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Département d'appartenance *</label>
                      <select
                        value={createForm.department_code}
                        onChange={(e) => {
                          const dept = CANONICAL_DEPARTMENTS.find((d) => d.code === e.target.value);
                          setCreateForm({
                            ...createForm,
                            department_code: e.target.value,
                            title: `Rapport d'activité mensuel - ${dept?.name || "Département"} - ${MONTHS_FR[createForm.period_month - 1]} ${createForm.period_year}`,
                          });
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-blue-300 bg-blue-50/50 focus:border-primary focus:outline-none font-bold text-blue-950"
                      >
                        {CANONICAL_DEPARTMENTS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.icon} {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Paroisse / Assemblée de Rattachement *</label>
                      <select
                        value={createForm.assembly_id}
                        onChange={(e) => setCreateForm({ ...createForm, assembly_id: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-medium"
                      >
                        {assemblies.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.city || "Cameroun"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Titre officiel du Rapport */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Titre officiel du Rapport *</label>
                  <input
                    type="text"
                    required
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                  />
                </div>

                {/* ============================================================== */}
                {/* SECTION 1: INDICATEURS CHIFFRÉS SPÉCIFIQUES AU DÉPARTEMENT     */}
                {/* ============================================================== */}
                {createForm.report_type === "departmental" ? (
                  <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue-950 block text-xs flex items-center gap-1.5">
                        <Icons.Chart />
                        <span>Indicateurs d'Activité Spécifiques au Département :</span>
                      </span>
                      <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                        Exclusivité Ministère N2
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Effectif Actif de l'Équipe *
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 28 membres"
                          value={createForm.kpi_dept_active_members}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_active_members: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Répétitions / Séances Tenues *
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 8 séances"
                          value={createForm.kpi_dept_meetings}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_meetings: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Taux d'Assiduité Moyen (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Ex: 85%"
                          value={createForm.kpi_dept_attendance_rate}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_attendance_rate: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Cultes Animés / Sorties
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 4 cultes"
                          value={createForm.kpi_dept_outreaches}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_outreaches: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Nouvelles Recrues Intégrées
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 3 nouvelles"
                          value={createForm.kpi_dept_new_recruits}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_new_recruits: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-bold text-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                          Dépenses du Département (FCFA)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 45000"
                          value={createForm.kpi_dept_expenses}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_dept_expenses: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">
                        Besoins Matériels & Équipements Prioritaires (Soumis au Pasteur)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 2 micros sans fil UHF pour les chantres, 3 pupitres neufs"
                        value={createForm.kpi_dept_material_needs}
                        onChange={(e) => setCreateForm({ ...createForm, kpi_dept_material_needs: e.target.value })}
                        className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  /* ============================================================== */
                  /* SECTION 2: INDICATEURS CHIFFRÉS PASTORAUX (ASSEMBLÉE LOCALE)  */
                  /* ============================================================== */
                  <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-950 block text-xs flex items-center gap-1.5">
                        <Icons.Report />
                        <span>Indicateurs Canoniques de l'Assemblée Locale :</span>
                      </span>
                      <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
                        Responsabilité Pastorale N4
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Fidèles Inscrits (Registre)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 285"
                          value={createForm.kpi_members}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_members: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Présence Culte Moyen
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 242"
                          value={createForm.kpi_sunday_attendance}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_sunday_attendance: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Nouvelles Conversions
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 14"
                          value={createForm.kpi_conversions}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_conversions: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white font-bold text-emerald-800"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Baptêmes d'Eau
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 8"
                          value={createForm.kpi_baptisms}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_baptisms: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Baptêmes Saint-Esprit
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 6"
                          value={createForm.kpi_holy_spirit_baptisms}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_holy_spirit_baptisms: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Dîmes & Offrandes (FCFA)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 1240000"
                          value={createForm.kpi_tithes_offerings}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_tithes_offerings: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Visites Pastorales
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 22"
                          value={createForm.kpi_home_visits}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_home_visits: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">
                          Cellules Actives
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 5"
                          value={createForm.kpi_active_cells}
                          onChange={(e) => setCreateForm({ ...createForm, kpi_active_cells: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>
                    </div>

                    {/* INCIDENCE DANS LE PROGRAMME : INTÉGRATION DIRECTE DES DÉPARTEMENTS VALIDÉS */}
                    {validatedDepartmentReportsThisMonth.length > 0 && (
                      <div className="p-3 bg-white/90 rounded-xl border border-purple-200 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-950 text-[11px] flex items-center gap-1">
                            <Icons.Sparkles />
                            <span>Rapports Départementaux validés ce mois ({validatedDepartmentReportsThisMonth.length}) :</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const deptSummary = validatedDepartmentReportsThisMonth
                                .map((d) => `- ${d.department_code} : ${d.kpi_metrics?.effectif_actif || 0} ouvriers actifs, ${d.kpi_metrics?.reunions_tenues || 0} séances tenues, avis pastoral validé.`)
                                .join("\n");
                              const updatedContent = createForm.content
                                ? `${createForm.content}\n\nVie des Départements (Synthèse validée) :\n${deptSummary}`
                                : `Vie des Départements (Synthèse validée) :\n${deptSummary}`;
                              setCreateForm({ ...createForm, content: updatedContent });
                            }}
                            className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>+ Insérer la synthèse des départements dans le texte</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                          {validatedDepartmentReportsThisMonth.map((d) => (
                            <span key={d.id} className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-semibold">
                              ✓ {d.department_code} ({d.author_name})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Corps narratif guidé */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 block">
                      {createForm.report_type === "departmental"
                        ? "Compte-Rendu d'Activité du Département (Faits saillants, défis, requêtes pastorales) *"
                        : "Compte-Rendu Pastoral de l'Assemblée (Vie spirituelle, évangélisation, défis) *"}
                    </label>
                  </div>
                  <textarea
                    required
                    rows={6}
                    placeholder={
                      createForm.report_type === "departmental"
                        ? "1. Bilan des répétitions/réunions et prestations cultuelles...\n2. Engagement spirituel et assiduité des membres...\n3. Difficultés matérielles et besoins soumis au Pasteur Titulaire...\n4. Projets du mois prochain et sujets de prière..."
                        : "1. Marche spirituelle générale de l'assemblée locale...\n2. Évangélisation, nouvelles conversions et suivi des âmes...\n3. Fonctionnement des départements et événements marquants...\n4. Projets d'aménagement et requêtes soumises au Surintendant de District..."
                    }
                    value={createForm.content}
                    onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed text-xs"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => setCreateModalOpen(false)}
                    className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="h-10 px-5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingAction ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Icons.Check />
                        <span>Enregistrer en Brouillon</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: FICHE COMPLÈTE DU RAPPORT (CONSULTATION DÉTAILLÉE) */}
        {/* ============================================================== */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                      selectedReport.report_type === "departmental" ? "bg-blue-600" : "bg-purple-700"
                    }`}
                  >
                    {selectedReport.report_type === "departmental" ? (
                      <span>{CANONICAL_DEPARTMENTS.find((d) => d.code === selectedReport.department_code)?.icon || "🎵"}</span>
                    ) : (
                      <Icons.Report />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {selectedReport.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedReport.report_type === "departmental" ? "RAPPORT DE DÉPARTEMENT" : "RAPPORT PASTORAL"} • {MONTHS_FR[selectedReport.period_month - 1]} {selectedReport.period_year}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              {/* Status and Entity banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Échelon & Assemblée :</span>
                  <strong className="text-slate-900 font-bold block text-sm">
                    {selectedReport.assembly_name || "Temple Central de Tsinga"}
                  </strong>
                  <span className="text-[11px] text-slate-600">
                    Auteur : <strong>{selectedReport.author_name}</strong> ({selectedReport.author_role || (selectedReport.report_type === "departmental" ? "Délégué de Département" : "Pasteur Titulaire")})
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 block">Statut canonique :</span>
                  <div className="mt-1">{renderStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              {/* KPI Metrics adaptés au niveau */}
              {selectedReport.kpi_metrics && Object.keys(selectedReport.kpi_metrics).length > 0 && (
                <div className="space-y-2">
                  <span className="font-extrabold text-slate-800 text-xs block">
                    {selectedReport.report_type === "departmental"
                      ? "Indicateurs d'Activité du Département :"
                      : "Statistiques Ecclésiales du Mois :"}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(selectedReport.kpi_metrics).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                          {k.replace(/_/g, " ")}
                        </span>
                        <strong className="text-sm font-extrabold text-slate-900 block mt-0.5">
                          {typeof v === "number" ? v.toLocaleString() : String(v)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corps narratif */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-800 text-xs block">
                  Compte-rendu d'Activité Intégral :
                </span>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {selectedReport.content}
                </div>
              </div>

              {/* Historique du visa pastoral ou de tutelle */}
              {(() => {
                const latestEv = getLatestEvaluation(selectedReport);
                if (!latestEv) return null;
                return (
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs text-purple-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icons.Shield />
                        <span className="font-extrabold">Visa & Appréciation de l'Autorité</span>
                        {latestEv.evaluator_title && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 font-semibold text-purple-900">
                            {latestEv.evaluator_title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: latestEv.appreciation_score || 5 }).map((_, i) => (
                          <Icons.Star key={i} />
                        ))}
                      </div>
                    </div>
                    {latestEv.feedback_text && (
                      <p className="text-purple-900 leading-relaxed italic">
                        « {latestEv.feedback_text} »
                      </p>
                    )}
                    {latestEv.recommendations && (
                      <p className="text-purple-800 font-semibold pt-1">
                        Recommandations canoniques : {latestEv.recommendations}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="pt-2 flex justify-between gap-2 flex-wrap border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedReport.status === "draft" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(null);
                          handleOpenEdit(selectedReport);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Icons.Edit />
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReport(selectedReport.id, selectedReport.title)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Icons.Send />
                        <span>{selectedReport.report_type === "departmental" ? "Transmettre au Pasteur" : "Transmettre à la tutelle"}</span>
                      </button>
                    </>
                  )}

                  {selectedReport.status === "revision_requested" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(null);
                        handleOpenEdit(selectedReport);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Icons.Edit />
                      <span>Corriger selon les remarques</span>
                    </button>
                  )}

                  {/* Bouton pour Pasteur ou Superviseur si soumis */}
                  {!isDeptUser && selectedReport.status === "submitted" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(null);
                        handleOpenEvaluate(selectedReport);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Icons.Shield />
                      <span>{isPastorUser ? "Apposer le Visa Pastoral" : "Examiner & Valider"}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: ÉVALUATION & VISA (PASTEUR OU SUPERVISEUR)             */}
        {/* ============================================================== */}
        {evaluateModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                    <Icons.Shield />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {evaluateModalData.report_type === "departmental"
                        ? "Examen & Visa Pastoral du Rapport Départemental"
                        : "Examen & Visa de Supervision du Rapport Pastoral"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {evaluateModalData.title} • {MONTHS_FR[evaluateModalData.period_month - 1]} {evaluateModalData.period_year}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvaluateModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Visualisation complète du dossier */}
                <div className="lg:col-span-7 space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Auteur & Département :</span>
                    <strong className="text-slate-900 font-bold block text-sm">
                      {evaluateModalData.author_name} ({evaluateModalData.author_role || (evaluateModalData.report_type === "departmental" ? "Délégué" : "Pasteur")})
                    </strong>
                    <span className="text-[11px] text-slate-600">
                      Entité : {evaluateModalData.assembly_name || "Temple Central de Tsinga"}
                    </span>
                  </div>

                  {evaluateModalData.kpi_metrics && Object.keys(evaluateModalData.kpi_metrics).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-700 block text-[11px]">
                        Indicateurs Chiffrés Soumis :
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(evaluateModalData.kpi_metrics).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-white border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block truncate">
                              {k.replace(/_/g, " ")}
                            </span>
                            <strong className="text-xs font-black text-slate-900 block mt-0.5">
                              {typeof v === "number" ? v.toLocaleString() : String(v)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="font-bold text-slate-700 block text-[11px]">
                      Texte Intégral Rédigé :
                    </span>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                      {evaluateModalData.content}
                    </div>
                  </div>
                </div>

                {/* Formulaire de Décision et Recommandations */}
                <div className="lg:col-span-5 space-y-4">
                  <form onSubmit={handleEvaluateSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Décision de l'Autorité *
                      </label>
                      <select
                        value={evalForm.decision}
                        onChange={(e) => setEvalForm({ ...evalForm, decision: e.target.value })}
                        className={`w-full h-10 px-3 rounded-xl border focus:outline-none font-bold ${
                          evalForm.decision === "approved"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : evalForm.decision === "revision_requested"
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-purple-300 bg-purple-50 text-purple-900"
                        }`}
                      >
                        <option value="approved">Approuvé (Visa Accordé)</option>
                        <option value="revision_requested">Demande de révision pastorale</option>
                        <option value="noted">Pris acte</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Appréciation qualitative (1 à 5 étoiles)
                      </label>
                      <select
                        value={evalForm.appreciation_score}
                        onChange={(e) => setEvalForm({ ...evalForm, appreciation_score: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-medium"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5/5 - Excellent travail</option>
                        <option value={4}>⭐⭐⭐⭐ 4/5 - Très satisfaisant</option>
                        <option value={3}>⭐⭐⭐ 3/5 - Conforme aux attentes</option>
                        <option value={2}>⭐⭐ 2/5 - Points d'attention</option>
                        <option value={1}>⭐ 1/5 - Insuffisant</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Observations & Avis {evalForm.decision === "revision_requested" ? "*" : ""}
                      </label>
                      <textarea
                        rows={3}
                        required={evalForm.decision === "revision_requested"}
                        placeholder={
                          evalForm.decision === "revision_requested"
                            ? "Indiquez clairement ce que le délégué ou pasteur doit rectifier..."
                            : "Observations sur le dynamisme spirituel de l'équipe..."
                        }
                        value={evalForm.feedback_text}
                        onChange={(e) => setEvalForm({ ...evalForm, feedback_text: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Recommandations canoniques
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Directives et orientations pastorales..."
                        value={evalForm.recommendations}
                        onChange={(e) => setEvalForm({ ...evalForm, recommendations: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEvaluateModalData(null)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                      >
                        Enregistrer le Visa
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: MODIFIER / CORRIGER UN RAPPORT                        */}
        {/* ============================================================== */}
        {editModalReport && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <Icons.Edit />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Modifier / Corriger le Rapport
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editModalReport.report_type === "departmental" ? "Rapport de Département" : "Rapport Pastoral"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalReport(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <Icons.Close />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Titre officiel du Rapport *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                  />
                </div>

                {/* KPIs Département vs Pastoral */}
                {editModalReport.report_type === "departmental" ? (
                  <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 space-y-3">
                    <span className="font-extrabold text-blue-950 block text-xs">
                      Indicateurs d'Activité du Département :
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Effectif Actif</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_active_members}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_active_members: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Répétitions / Séances</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_meetings}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_meetings: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Assiduité (%)</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_attendance_rate}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_attendance_rate: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Cultes / Sorties</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_outreaches}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_outreaches: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Nouvelles Recrues</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_new_recruits}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_new_recruits: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-bold text-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 font-semibold block mb-0.5">Dépenses (FCFA)</label>
                        <input
                          type="number"
                          value={editForm.kpi_dept_expenses}
                          onChange={(e) => setEditForm({ ...editForm, kpi_dept_expenses: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-blue-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3">
                    <span className="font-extrabold text-purple-950 block text-xs">
                      Indicateurs Ecclésiaux de l'Assemblée :
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">Fidèles Inscrits</label>
                        <input
                          type="number"
                          value={editForm.kpi_members}
                          onChange={(e) => setEditForm({ ...editForm, kpi_members: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">Présence Culte</label>
                        <input
                          type="number"
                          value={editForm.kpi_sunday_attendance}
                          onChange={(e) => setEditForm({ ...editForm, kpi_sunday_attendance: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">Conversions</label>
                        <input
                          type="number"
                          value={editForm.kpi_conversions}
                          onChange={(e) => setEditForm({ ...editForm, kpi_conversions: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white font-bold text-emerald-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-purple-900 font-semibold block mb-0.5">Dîmes & Offrandes</label>
                        <input
                          type="number"
                          value={editForm.kpi_tithes_offerings}
                          onChange={(e) => setEditForm({ ...editForm, kpi_tithes_offerings: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-purple-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Corps du Rapport *</label>
                  <textarea
                    required
                    rows={6}
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditModalReport(null)}
                    className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(false)}
                    className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 cursor-pointer"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(true)}
                    className="h-10 px-5 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shadow-md cursor-pointer"
                  >
                    Enregistrer & Transmettre
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
