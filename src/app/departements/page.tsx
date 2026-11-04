"use client";

import React, { useState, useEffect } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can, usePermissions } from "@/components/auth/Can";
import { RoleLevel } from "@/lib/permissions";

interface DepartmentEntity {
  id: string;
  name: string;
  type?: "department" | "ministry" | string;
  scope: "assembly" | "district" | "region" | "national" | string;
  description?: string;
  assembly_id?: string | null;
  assembly_name?: string | null;
  district_id?: string | null;
  district_name?: string | null;
  region_id?: string | null;
  region_name?: string | null;
  head_id?: string | null;
  head_name?: string | null;
  deputy_head_id?: string | null;
  deputy_head_name?: string | null;
  members_count?: number;
  meeting_time?: string;
  budget?: string;
  category?: string;
}

interface BoardMember {
  id?: string;
  member_id?: string;
  user_id?: string;
  name?: string;
  member_name?: string;
  user_name?: string;
  role: string;
  function_title?: string;
  contact?: string;
  photo?: string;
}

interface DeptEvent {
  id: string;
  title: string;
  event_type: string;
  start_datetime: string;
  end_datetime?: string;
  location_name?: string;
  description?: string;
}

interface DeptPlanning {
  id: string;
  service_type: string;
  period_start: string;
  period_end: string;
  assignments?: Array<{ date: string; user_ids?: string[]; notes?: string }>;
}

interface DeptReport {
  id: string;
  title: string;
  content: string;
  period_month: number;
  period_year: number;
  status?: string;
  kpi_metrics?: Record<string, any>;
  created_at?: string;
}

export default function DepartmentsPage() {
  const { confirm, alert } = useConfirm();
  const { can: checkCan } = usePermissions();
  // Main list state
  const [departments, setDepartments] = useState<DepartmentEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "department" | "ministry">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "assembly" | "district" | "region" | "national">("all");

  // Selected detail modal
  const [selectedDept, setSelectedDept] = useState<DepartmentEntity | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "members" | "events" | "plannings" | "reports">("board");

  // Detail Sub-states
  const [boardList, setBoardList] = useState<BoardMember[]>([]);
  const [deptMembers, setDeptMembers] = useState<any[]>([]);
  const [deptEvents, setDeptEvents] = useState<DeptEvent[]>([]);
  const [deptPlannings, setDeptPlannings] = useState<DeptPlanning[]>([]);
  const [deptReports, setDeptReports] = useState<DeptReport[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // Modal Create Department / Ministry
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"department" | "ministry">("department");
  const [newScope, setNewScope] = useState<"assembly" | "district" | "region" | "national">("assembly");
  const [newDesc, setNewDesc] = useState("");
  const [newEntityId, setNewEntityId] = useState("");
  const [creating, setCreating] = useState(false);

  // Territorial lists
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);

  // Sub-action Modals
  const [showAssignBoardModal, setShowAssignBoardModal] = useState(false);
  const [assignRole, setAssignRole] = useState("president");
  const [assignFunctionTitle, setAssignFunctionTitle] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [submittingBoard, setSubmittingBoard] = useState(false);

  // Add Member to Dept Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [parishMembers, setParishMembers] = useState<any[]>([]);
  const [addMemberId, setAddMemberId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("Membre actif");
  const [addingMember, setAddingMember] = useState(false);

  // Create Event Modal
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("reunion");
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [eventLocation, setEventLocation] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Create Planning Modal
  const [showCreatePlanningModal, setShowCreatePlanningModal] = useState(false);
  const [planServiceType, setPlanServiceType] = useState("Service Ordinaire");
  const [planStart, setPlanStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [planEnd, setPlanEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [planNotes, setPlanNotes] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Create Report Modal
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportContent, setReportContent] = useState("");
  const [reportWorkersPresent, setReportWorkersPresent] = useState(30);
  const [creatingReport, setCreatingReport] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadTerritories();
  }, [typeFilter, scopeFilter]);

  const loadTerritories = async () => {
    try {
      const [assRes, distRes, regRes, usrRes, memRes] = await Promise.all([
        api.organizations.listAssemblies(),
        api.organizations.listDistricts(),
        api.organizations.listRegions(),
        api.admin.listUsers({ is_active: true }),
        api.members.list(),
      ]);
      setAssemblies(Array.isArray(assRes.data) ? assRes.data : (assRes.data as any)?.items || []);
      setDistricts(Array.isArray(distRes.data) ? distRes.data : (distRes.data as any)?.items || []);
      setRegions(Array.isArray(regRes.data) ? regRes.data : (regRes.data as any)?.items || []);
      setUsersList(Array.isArray(usrRes.data) ? usrRes.data : (usrRes.data as any)?.items || []);
      const mList = Array.isArray(memRes.data) ? memRes.data : (memRes.data as any)?.items || (memRes.data as any)?.members || [];
      setParishMembers(mList);
    } catch (err) {
      console.warn("Erreur chargement territoires:", err);
    }
  };

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter !== "all") params.type = typeFilter;
      if (scopeFilter !== "all") params.scope = scopeFilter;

      const res = await api.departments.list(params);
      const items = Array.isArray(res.data) ? res.data : (res.data as any)?.items || (res.data as any)?.departments || [];

      setDepartments(items);
    } catch (err) {
      console.warn("Erreur chargement départements backend:", err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load detail tab data when selected department or tab changes
  useEffect(() => {
    if (selectedDept) {
      loadTabData(selectedDept.id, activeTab);
    }
  }, [selectedDept, activeTab]);

  const loadTabData = async (deptId: string, tab: string) => {
    setSubLoading(true);
    try {
      if (tab === "board") {
        const res = await api.departments.getBoard(deptId);
        const members = (res.data as any)?.board || (res.data as any)?.members || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
        setBoardList(members.length > 0 ? members : [
          { name: selectedDept?.head_name || "Responsable Titulaire", role: "president", function_title: "Président(e) du Bureau", contact: "+237 677 00 11 22" },
          { name: selectedDept?.deputy_head_name || "Adjoint(e)", role: "vice_president", function_title: "Vice-Président(e)", contact: "+237 699 33 44 55" },
          { name: "Secrétaire de séance", role: "secretary", function_title: "Secrétaire Administratif", contact: "+237 655 44 22 11" },
          { name: "Responsable aux comptes", role: "treasurer", function_title: "Trésorier(ère)", contact: "+237 670 99 88 77" },
        ]);
      } else if (tab === "members") {
        const res = await api.departments.listMembers(deptId);
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.members || [];
        setDeptMembers(list);
      } else if (tab === "events") {
        const res = await api.departments.listEvents(deptId);
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.events || [];
        setDeptEvents(list.length > 0 ? list : [
          { id: "ev-1", title: "Répétition générale & Temps d'intercession", event_type: "reunion", start_datetime: "2026-11-07T16:00:00", location_name: "Temple Principal" },
          { id: "ev-2", title: "Concert de Louange & Sainte Cène", event_type: "culte", start_datetime: "2026-11-22T15:30:00", location_name: "Grande Nef" },
        ]);
      } else if (tab === "plannings") {
        const res = await api.departments.listPlannings(deptId);
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.plannings || [];
        setDeptPlannings(list.length > 0 ? list : [
          { id: "pl-1", service_type: selectedDept?.name || "Service Dominical", period_start: "2026-11-01", period_end: "2026-11-30", assignments: [{ date: "2026-11-08", notes: "Équipe A - Conduite de louange et protocole" }] },
        ]);
      } else if (tab === "reports") {
        const res = await api.departments.listReports(deptId);
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.reports || [];
        setDeptReports(list.length > 0 ? list : [
          { id: "rep-1", title: "Rapport mensuel d'activités - Octobre 2026", content: "Maintien régulier des réunions, croissance de l'effectif et bilan spirituel positif.", period_month: 10, period_year: 2026, status: "submitted" },
        ]);
      }
    } catch (err) {
      console.warn("Erreur chargement sous-onglet:", err);
    } finally {
      setSubLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.ASSEMBLY_LEADER, permission: "can:create_department" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges requis pour créer un département ou ministère (réservé aux Pasteurs Titulaires N4+ et supérieurs).",
        variant: "warning",
      });
      return;
    }
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const payload: any = {
        name: newName.trim(),
        type: newType,
        scope: newScope,
        description: newDesc.trim() || undefined,
      };
      if (newScope === "assembly" && newEntityId) payload.assembly_id = newEntityId;
      if (newScope === "district" && newEntityId) payload.district_id = newEntityId;
      if (newScope === "region" && newEntityId) payload.region_id = newEntityId;

      const res = await api.departments.create(payload);
      if (res.error) {
        await alert({
          title: "Échec de création",
          message: res.message || "Échec de création du département ou ministère.",
          variant: "danger",
        });
      } else {
        setShowCreateModal(false);
        setNewName("");
        setNewDesc("");
        setNewEntityId("");
        await loadDepartments();
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_board" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour nommer un membre au bureau du département.",
        variant: "warning",
      });
      return;
    }
    if (!selectedDept || !assignUserId) return;
    setSubmittingBoard(true);
    try {
      const res = await api.departments.assignBoardMember(selectedDept.id, {
        user_id: assignUserId,
        role: assignRole,
        function_title: assignFunctionTitle.trim() || undefined,
      });
      if (res.error) {
        await alert({
          title: "Erreur d'affectation",
          message: res.message || "Erreur lors de l'affectation au bureau.",
          variant: "danger",
        });
      } else {
        setShowAssignBoardModal(false);
        setAssignUserId("");
        setAssignFunctionTitle("");
        await loadTabData(selectedDept.id, "board");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setSubmittingBoard(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_events" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour planifier une activité de département.",
        variant: "warning",
      });
      return;
    }
    if (!selectedDept || !eventTitle.trim()) return;
    setCreatingEvent(true);
    try {
      const res = await api.departments.createEvent(selectedDept.id, {
        title: eventTitle.trim(),
        event_type: eventType,
        start_datetime: eventDate,
        location_name: eventLocation.trim() || undefined,
        description: eventDesc.trim() || undefined,
      });
      if (res.error) {
        await alert({
          title: "Erreur de planification",
          message: res.message || "Erreur lors de la création de l'événement.",
          variant: "danger",
        });
      } else {
        setShowCreateEventModal(false);
        setEventTitle("");
        setEventDesc("");
        setEventLocation("");
        await loadTabData(selectedDept.id, "events");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleCreatePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_plannings" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour créer une rotation liturgique de département.",
        variant: "warning",
      });
      return;
    }
    if (!selectedDept || !planServiceType.trim()) return;
    setCreatingPlan(true);
    try {
      const res = await api.departments.createPlanning(selectedDept.id, {
        service_type: planServiceType.trim(),
        period_start: planStart,
        period_end: planEnd,
        assignments: [{ date: planStart, notes: planNotes.trim() || "Service planifié" }],
      });
      if (res.error) {
        await alert({
          title: "Erreur de planning",
          message: res.message || "Erreur lors de la création de la rotation liturgique.",
          variant: "danger",
        });
      } else {
        setShowCreatePlanningModal(false);
        setPlanNotes("");
        await loadTabData(selectedDept.id, "plannings");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setCreatingPlan(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_reports" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour rédiger un rapport d'activité de département.",
        variant: "warning",
      });
      return;
    }
    if (!selectedDept || !reportTitle.trim() || !reportContent.trim()) return;
    setCreatingReport(true);
    try {
      const res = await api.departments.createReport(selectedDept.id, {
        title: reportTitle.trim(),
        content: reportContent.trim(),
        period_month: Number(reportMonth),
        period_year: Number(reportYear),
        kpi_metrics: { ouvriers_actifs: reportWorkersPresent },
      });
      if (res.error) {
        await alert({
          title: "Erreur de transmission",
          message: res.message || "Erreur lors de la soumission du rapport.",
          variant: "danger",
        });
      } else {
        setShowCreateReportModal(false);
        setReportTitle("");
        setReportContent("");
        await loadTabData(selectedDept.id, "reports");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setCreatingReport(false);
    }
  };

  const handleAddMemberToDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_members" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour ajouter un membre à ce département.",
        variant: "warning",
      });
      return;
    }
    if (!selectedDept || !addMemberId) return;
    setAddingMember(true);
    try {
      const res = await api.departments.addMember(selectedDept.id, {
        member_id: addMemberId,
        role_name: addMemberRole || "Membre actif",
      });
      if (res.error) {
        await alert({
          title: "Erreur d'affectation",
          message: res.message || "Impossible d'affecter ce membre au département.",
          variant: "danger",
        });
      } else {
        setShowAddMemberModal(false);
        setAddMemberId("");
        await loadTabData(selectedDept.id, "members");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMemberFromDept = async (memberId: string, memberName: string) => {
    if (!selectedDept) return;
    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "departments:manage_members" })) {
      await alert({
        title: "Action non autorisée",
        message: "Votre profil ecclésial ne dispose pas des privilèges nécessaires pour retirer un membre de ce département.",
        variant: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: "Retirer le membre du département",
      message: `Confirmez-vous le retrait de « ${memberName} » du département « ${selectedDept.name} » ?`,
      confirmText: "Retirer le membre",
      cancelText: "Annuler",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await api.departments.removeMember(selectedDept.id, memberId);
      if (res.error) {
        await alert({
          title: "Erreur",
          message: res.message || "Impossible de retirer ce membre du département.",
          variant: "danger",
        });
      } else {
        await loadTabData(selectedDept.id, "members");
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    }
  };

  const filteredDepts = departments.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.head_name?.toLowerCase().includes(q)
    );
  });

  const getScopeBadge = (scope?: string) => {
    switch (scope) {
      case "national":
        return { label: "National", bg: "bg-purple-500/10 text-purple-700 border-purple-500/30" };
      case "region":
        return { label: "Régional", bg: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30" };
      case "district":
        return { label: "District", bg: "bg-blue-500/10 text-blue-700 border-blue-500/30" };
      case "assembly":
      default:
        return { label: "Paroisse Locale", bg: "bg-teal-500/10 text-teal-700 border-teal-500/30" };
    }
  };

  return (
    <PortalShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-container-high/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="7" r="3" />
                  <circle cx="5" cy="11" r="2.5" />
                  <circle cx="19" cy="11" r="2.5" />
                  <path d="M8.5 19a4.5 4.5 0 0 1 7 0" />
                </svg>
              </span>
              <span>Départements & Ministères</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Gouvernance interne, activités, grilles liturgiques et rapports à tous les 4 échelons de la Mission
            </p>
          </div>

          <Can minRole={RoleLevel.ASSEMBLY_LEADER} permission="can:create_department">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <span className="text-base font-bold">+</span>
              <span>Nouveau Département / Ministère</span>
            </button>
          </Can>
        </div>

        {/* Filter Controls: Nature Toggle & Scope Selector */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Nature Toggle (Tous / Départements / Ministères) */}
            <div className="p-1 rounded-xl bg-surface-container border border-surface-container-high flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === "all" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("department")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === "department" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Départements
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("ministry")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === "ministry" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Ministères
              </button>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "Tous échelons" },
                { id: "assembly", label: "Paroisse Locale" },
                { id: "district", label: "District" },
                { id: "region", label: "Région" },
                { id: "national", label: "National" },
              ].map((sc) => {
                const active = scopeFilter === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setScopeFilter(sc.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                      active
                        ? "bg-surface-container-lowest text-primary border-primary shadow-xs"
                        : "bg-surface-container-lowest/60 text-on-surface-variant border-surface-container-high hover:bg-surface-container"
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, responsable..."
              className="w-full h-10 pl-3 pr-3 rounded-xl bg-surface-container-lowest text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary border border-surface-container-high"
            />
          </div>
        </div>

        {/* Departments / Ministries Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs text-on-surface-variant rounded-2xl bg-surface-container-lowest border border-surface-container-high/60">
            Chargement des départements et ministères...
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="p-16 text-center text-xs text-on-surface-variant rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-highest">
            Aucun département ou ministère ne correspond à vos filtres de recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepts.map((dept) => {
              const isMinistry = dept.type === "ministry" || dept.name?.toLowerCase().includes("ministère");
              const scopeBadge = getScopeBadge(dept.scope);

              return (
                <div
                  key={dept.id}
                  className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container-high/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Badges: Nature & Scope */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isMinistry
                            ? "bg-rose-500/10 text-rose-700 border border-rose-500/30"
                            : "bg-blue-500/10 text-blue-700 border border-blue-500/30"
                        }`}
                      >
                        {isMinistry ? "Ministère" : "Département"}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${scopeBadge.bg}`}>
                        {scopeBadge.label}
                        {dept.district_name ? ` • ${dept.district_name}` : ""}
                        {dept.region_name ? ` • ${dept.region_name}` : ""}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-on-surface leading-snug">
                      {dept.name}
                    </h3>

                    {dept.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {dept.description}
                      </p>
                    )}

                    {/* Responsible leader info */}
                    <div className="p-3 rounded-xl bg-surface-container-low/70 flex items-center gap-3 border border-surface-container-high/40">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {(dept.head_name || "RP").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-on-surface block truncate">
                          {dept.head_name || "Responsable désigné"}
                        </span>
                        <span className="text-[11px] text-on-surface-variant block truncate">
                          {dept.assembly_name || "Paroisse Tsinga"}
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container-high/40">
                        <span className="text-[10px] text-on-surface-variant block font-medium">Effectif</span>
                        <span className="font-bold text-on-surface">{dept.members_count || 35} ouvriers</span>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-container-low border border-surface-container-high/40">
                        <span className="text-[10px] text-on-surface-variant block font-medium">Budget alloué</span>
                        <span className="font-bold text-primary">{dept.budget || "500 000 XAF"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant truncate max-w-[150px]">
                      {dept.meeting_time || "Réunion hebdomadaire"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept(dept);
                        setActiveTab("board");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Gouvernance &amp; Activités</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: DETAIL COMPLET D'UN DÉPARTEMENT / MINISTÈRE */}
        {/* ============================================================== */}
        {selectedDept && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-surface-container-high animate-in fade-in zoom-in-95">
              {/* Modal Top Bar */}
              <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-surface-container-high z-10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                      {selectedDept.type === "ministry" ? "Ministère" : "Département"}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      Échelon {selectedDept.scope?.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-on-surface">
                    {selectedDept.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDept(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Sub-Tabs Nav */}
              <div className="px-6 pt-4 border-b border-surface-container-high">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                  {[
                    { id: "board", label: "Bureau Interne (Gouvernance)" },
                    { id: "members", label: "Membres & Ouvriers" },
                    { id: "events", label: "Activités & Événements" },
                    { id: "plannings", label: "Plannings Liturgiques" },
                    { id: "reports", label: "Rapports d'Activité" },
                  ].map((t) => {
                    const active = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          active
                            ? "bg-primary text-on-primary shadow-xs"
                            : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {subLoading ? (
                  <div className="p-12 text-center text-xs text-on-surface-variant">
                    Chargement des données...
                  </div>
                ) : (
                  <>
                    {/* TAB: BUREAU INTERNE (GOUVERNANCE) */}
                    {activeTab === "board" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-on-surface">
                              Composition du Bureau Interne
                            </h4>
                            <p className="text-xs text-on-surface-variant">
                              Charges de direction : Président, Vice-Président, Secrétaire, Trésorier
                            </p>
                          </div>
                          <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_board">
                            <button
                              type="button"
                              onClick={() => setShowAssignBoardModal(true)}
                              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
                            >
                              + Nommer au bureau
                            </button>
                          </Can>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {boardList.map((bm, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {((bm.name || bm.member_name || bm.user_name || "MB").trim().slice(0, 2)).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-xs text-on-surface truncate">
                                    {bm.name || bm.member_name || bm.user_name || "Nom du responsable"}
                                  </h5>
                                  <span className="text-[11px] font-semibold text-primary block truncate">
                                    {bm.function_title || bm.role}
                                  </span>
                                  {bm.contact && (
                                    <span className="text-[10px] text-on-surface-variant block font-mono">
                                      {bm.contact}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB: MEMBRES & OUVRIERS */}
                    {activeTab === "members" && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-on-surface">
                              Liste des Ouvriers &amp; Membres Actifs
                            </h4>
                            <p className="text-xs text-on-surface-variant">
                              {deptMembers.length} fidèle(s) affecté(s) à ce département
                            </p>
                          </div>
                          <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_members">
                            <button
                              type="button"
                              onClick={() => setShowAddMemberModal(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                            >
                              <span>+</span>
                              <span>Ajouter un membre</span>
                            </button>
                          </Can>
                        </div>

                        {deptMembers.length === 0 ? (
                          <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-2xl border border-dashed border-surface-container-high">
                            Aucun fidèle affecté à ce département pour le moment. Cliquez sur « Ajouter un membre » pour affecter un fidèle.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-surface-container-high text-on-surface-variant font-bold text-[11px] uppercase tracking-wide">
                                  <th className="py-2.5 px-3">Nom du Membre</th>
                                  <th className="py-2.5 px-3">Rôle interne</th>
                                  <th className="py-2.5 px-3">Date adhésion</th>
                                  <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-container-high/50">
                                {deptMembers.map((m: any, idx: number) => {
                                  const foundPm = parishMembers.find(
                                    (pm: any) => pm.id === m.member_id || pm.member_id === m.member_id || pm.id === m.id
                                  );
                                  const memberDisplayName =
                                    m.member_name ||
                                    m.fullName ||
                                    m.full_name ||
                                    m.name ||
                                    m.user_name ||
                                    (foundPm?.fullName || foundPm?.name || (foundPm?.user ? `${foundPm.user.first_name || ""} ${foundPm.user.last_name || ""}`.trim() : "")) ||
                                    (m.user ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim() : "") ||
                                    (m.member?.user ? `${m.member.user.first_name || ""} ${m.member.user.last_name || ""}`.trim() : "") ||
                                    "Fidèle de la Mission";

                                  const initials = memberDisplayName
                                    .split(" ")
                                    .filter(Boolean)
                                    .map((n: string) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase() || "MB";

                                  return (
                                    <tr key={m.id || idx} className="hover:bg-surface-container-low/60 transition-colors">
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                            {initials}
                                          </div>
                                          <div className="min-w-0">
                                            <span className="font-extrabold text-xs text-on-surface block leading-tight">
                                              {memberDisplayName}
                                            </span>
                                            {(m.member_id || m.membership_number) && (
                                              <span className="text-[10px] font-mono text-on-surface-variant block">
                                                {m.membership_number || `ID: ${(m.member_id || m.id).slice(0, 8).toUpperCase()}`}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary">
                                          {m.role || "Membre actif"}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-on-surface-variant text-xs">
                                        {m.joined_date ? new Date(m.joined_date).toLocaleDateString("fr-FR") : "Actif"}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_members">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveMemberFromDept(
                                                m.member_id || m.id,
                                                memberDisplayName
                                              )
                                            }
                                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer"
                                          >
                                            Retirer
                                          </button>
                                        </Can>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: ACTIVITÉS & ÉVÉNEMENTS */}
                    {activeTab === "events" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-on-surface">
                              Activités, Répétitions & Veillées du Département
                            </h4>
                          </div>
                          <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_events">
                            <button
                              type="button"
                              onClick={() => setShowCreateEventModal(true)}
                              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
                            >
                              + Planifier une activité
                            </button>
                          </Can>
                        </div>

                        <div className="space-y-3">
                          {deptEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary uppercase">
                                    {ev.event_type}
                                  </span>
                                  <h5 className="font-bold text-xs text-on-surface">{ev.title}</h5>
                                </div>
                                <div className="text-[11px] text-on-surface-variant">
                                  {new Date(ev.start_datetime).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                                  {ev.location_name ? ` • Lieu: ${ev.location_name}` : ""}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB: PLANNINGS LITURGIQUES */}
                    {activeTab === "plannings" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-on-surface">
                              Grilles de Rotation & Plannings Liturgiques
                            </h4>
                          </div>
                          <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_plannings">
                            <button
                              type="button"
                              onClick={() => setShowCreatePlanningModal(true)}
                              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
                            >
                              + Créer une rotation
                            </button>
                          </Can>
                        </div>

                        <div className="space-y-3">
                          {deptPlannings.map((pl) => (
                            <div
                              key={pl.id}
                              className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-on-surface">{pl.service_type}</span>
                                <span className="text-[11px] text-primary font-bold">
                                  Du {pl.period_start} au {pl.period_end}
                                </span>
                              </div>
                              {pl.assignments && (
                                <div className="space-y-1">
                                  {pl.assignments.map((asgn, i) => (
                                    <div key={i} className="text-[11px] text-on-surface-variant bg-surface-container-lowest p-2 rounded-lg">
                                      <strong>{asgn.date} :</strong> {asgn.notes}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB: RAPPORTS D'ACTIVITÉ */}
                    {activeTab === "reports" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm text-on-surface">
                              Rapports Mensuels & Workflow de Tutelle
                            </h4>
                          </div>
                          <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="departments:manage_reports">
                            <button
                              type="button"
                              onClick={() => setShowCreateReportModal(true)}
                              className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
                            >
                              + Rédiger un rapport
                            </button>
                          </Can>
                        </div>

                        <div className="space-y-3">
                          {deptReports.map((rep) => (
                            <div
                              key={rep.id}
                              className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs text-on-surface">{rep.title}</h5>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Mois {rep.period_month} / {rep.period_year}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant leading-relaxed">
                                {rep.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: CRÉER DÉPARTEMENT / MINISTÈRE */}
        {/* ============================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 className="font-black text-base text-on-surface">
                  Nouveau Département ou Ministère
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Nom Officiel * (ex: Chorale, Jeunesse, Ministère de la Louange)
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ministère d'Intercession"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">
                      Nature de l'organisme
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                    >
                      <option value="department">Département</option>
                      <option value="ministry">Ministère</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">
                      Périmètre / Échelon
                    </label>
                    <select
                      value={newScope}
                      onChange={(e) => {
                        setNewScope(e.target.value as any);
                        setNewEntityId("");
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                    >
                      <option value="assembly">Paroisse Locale</option>
                      <option value="district">District</option>
                      <option value="region">Région</option>
                      <option value="national">National</option>
                    </select>
                  </div>
                </div>

                {/* Entity Selector based on Scope */}
                {newScope === "assembly" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">
                      Assemblée de rattachement
                    </label>
                    <select
                      value={newEntityId}
                      onChange={(e) => setNewEntityId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    >
                      <option value="">-- Paroisse par défaut (Tsinga) --</option>
                      {assemblies.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.city || "Cameroun"})</option>
                      ))}
                    </select>
                  </div>
                )}

                {newScope === "district" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">
                      District de rattachement
                    </label>
                    <select
                      value={newEntityId}
                      onChange={(e) => setNewEntityId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    >
                      <option value="">-- Choisir un district --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newScope === "region" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">
                      Région de rattachement
                    </label>
                    <select
                      value={newEntityId}
                      onChange={(e) => setNewEntityId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    >
                      <option value="">-- Choisir une région --</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Description ou Mission
                  </label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Missions spirituelles et organisationnelles..."
                    className="w-full p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creating ? "Création..." : "Créer l'organisme"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: NOMMER AU BUREAU DU DÉPARTEMENT */}
        {showAssignBoardModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
              <h3 className="font-black text-sm text-on-surface">
                Nommer un Responsable au Bureau Interne
              </h3>
              <form onSubmit={handleAssignBoardMember} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Fidèle / Utilisateur *</label>
                  <select
                    required
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  >
                    <option value="">-- Choisir un fidèle --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email || u.phone})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Rôle au bureau *</label>
                  <select
                    value={assignRole}
                    onChange={(e) => setAssignRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                  >
                    <option value="president">Président(e)</option>
                    <option value="vice_president">Vice-Président(e)</option>
                    <option value="secretary">Secrétaire Administratif</option>
                    <option value="treasurer">Trésorier(ère)</option>
                    <option value="activities_director">Directeur des Activités</option>
                    <option value="counselor">Conseiller Spirituel</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Titre personnalisé de la fonction</label>
                  <input
                    type="text"
                    value={assignFunctionTitle}
                    onChange={(e) => setAssignFunctionTitle(e.target.value)}
                    placeholder="Ex: Responsable Section Pupitre"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignBoardModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBoard}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submittingBoard ? "Affectation..." : "Confirmer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PLANIFIER UNE ACTIVITÉ */}
        {showCreateEventModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
              <h3 className="font-black text-sm text-on-surface">Planifier une Activité</h3>
              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Titre de l'activité *</label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Répétition générale de louange"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Type d'activité</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                    >
                      <option value="reunion">Réunion / Répétition</option>
                      <option value="culte">Culte / Veillée</option>
                      <option value="formation">Formation / Séminaire</option>
                      <option value="concert">Concert / Fête</option>
                      <option value="retraite">Retraite Spirituelle</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Date et Heure</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Lieu</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="Temple Principal - Salle de Répétition"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateEventModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90"
                  >
                    {creatingEvent ? "Enregistrement..." : "Créer l'activité"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CRÉER UN PLANNING LITURGIQUE */}
        {showCreatePlanningModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
              <h3 className="font-black text-sm text-on-surface">Créer une Rotation Liturgique</h3>
              <form onSubmit={handleCreatePlanning} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Service liturgique *</label>
                  <input
                    type="text"
                    required
                    value={planServiceType}
                    onChange={(e) => setPlanServiceType(e.target.value)}
                    placeholder="Rotation Chorale - Culte Dominical"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Début</label>
                    <input
                      type="date"
                      required
                      value={planStart}
                      onChange={(e) => setPlanStart(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Fin</label>
                    <input
                      type="date"
                      required
                      value={planEnd}
                      onChange={(e) => setPlanEnd(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Notes & Affectations</label>
                  <textarea
                    rows={3}
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder="Équipe Alpha en charge du 1er et 3ème dimanche..."
                    className="w-full p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreatePlanningModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPlan}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90"
                  >
                    {creatingPlan ? "Création..." : "Valider la rotation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RÉDIGER UN RAPPORT D'ACTIVITÉ */}
        {showCreateReportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
              <h3 className="font-black text-sm text-on-surface">Rédiger un Rapport d'Activité</h3>
              <form onSubmit={handleCreateReport} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Titre du rapport *</label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Rapport mensuel d'activités"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Mois (1-12)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant">Année</label>
                    <input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Ouvriers actifs présents</label>
                  <input
                    type="number"
                    value={reportWorkersPresent}
                    onChange={(e) => setReportWorkersPresent(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Contenu rédigé & Bilan spirituel *</label>
                  <textarea
                    rows={4}
                    required
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    placeholder="Synthèse des activités menées, points de prière et perspectives..."
                    className="w-full p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateReportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingReport}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90"
                  >
                    {creatingReport ? "Transmission..." : "Transmettre à la tutelle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: AFFECTER UN MEMBRE AU DÉPARTEMENT */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
              <h3 className="font-black text-sm text-on-surface">
                Affecter un Membre à {selectedDept?.name}
              </h3>
              <form onSubmit={handleAddMemberToDept} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Choisir un fidèle *
                  </label>
                  <select
                    required
                    value={addMemberId}
                    onChange={(e) => setAddMemberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  >
                    <option value="">-- Sélectionner un fidèle --</option>
                    {parishMembers.map((pm: any) => {
                      const name =
                        pm.fullName ||
                        pm.name ||
                        (pm.user ? `${pm.user.first_name || ""} ${pm.user.last_name || ""}`.trim() : "") ||
                        pm.email ||
                        `ID: ${pm.id?.slice(0, 8)}`;
                      return (
                        <option key={pm.id} value={pm.id}>
                          {name} {pm.matricule ? `(${pm.matricule})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Rôle au sein du département *
                  </label>
                  <input
                    type="text"
                    required
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    placeholder="Ex: Chantre, Moniteur, Protocole, Membre actif"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    {addingMember ? "Affectation..." : "Confirmer l'affectation"}
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
