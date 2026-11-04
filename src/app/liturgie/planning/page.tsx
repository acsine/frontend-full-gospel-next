"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can, usePermissions } from "@/components/auth/Can";
import { RoleLevel } from "@/lib/permissions";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAYS_OF_WEEK_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_OF_WEEK_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Clean inline icons
const Icons = {
  Calendar: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Church: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M10 4h4"/>
      <path d="m18 8-6-4-6 4v14h12V8Z"/>
      <path d="M10 22v-6h4v6"/>
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
  Clock: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  UserCheck: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>
  ),
  UserX: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="18" y1="8" x2="23" y2="13"/>
      <line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Music: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  Mic: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Print: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// Modèle de référence pour les cultes récurrents MPEC
interface WorshipService {
  id: string;
  name: string;
  dayOfWeek: string; // "Dimanche", "Mardi", "Jeudi", "Samedi"
  time: string;
  service_type: string;
  moderator: string;
  preacher: string;
  worship_leader: string;
  protocol_leader: string;
  sound_tech: string;
  sunday_school: string;
  status: "confirmed" | "pending" | "adjusted";
}

export default function LiturgyPlanningPage() {
  const { confirm, alert } = useConfirm();
  const { can: checkCan } = usePermissions();

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");

  // Plannings from API
  const [plannings, setPlannings] = useState<any[]>([]);
  const [unavailabilities, setUnavailabilities] = useState<any[]>([]);

  // Filters & Tabs
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"calendar" | "services" | "plannings" | "unavailabilities">("calendar");

  // Selected date for day schedule modal
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [createPlanningModalOpen, setCreatePlanningModalOpen] = useState(false);
  const [unavailabilityModalOpen, setUnavailabilityModalOpen] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<WorshipService | null>(null);

  // Form states
  const [newPlanningForm, setNewPlanningForm] = useState({
    service_type: "Louange & Chorale",
    department_id: "",
    period_start: "2026-11-01",
    period_end: "2026-11-30",
    role_title: "Conducteur de louange & Chorale",
    assigned_member_id: "",
    notes: "Service dominical - 1er et 2ème cultes d'adoration",
  });

  const [unavailabilityForm, setUnavailabilityForm] = useState({
    member_id: "",
    start_date: new Date().toISOString().split("T")[0] || "2026-11-01",
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] || "2026-11-08",
    reason: "Déplacement professionnel / mission pastorale",
  });

  const [submitting, setSubmitting] = useState(false);

  // Cultes dominicaux & hebdomadaires officiels de l'Assemblée
  const defaultServices: WorshipService[] = [
    {
      id: "ws-1",
      name: "1er Culte d'Adoration & Sainte-Cène",
      dayOfWeek: "Dimanche",
      time: "07h00 - 09h30",
      service_type: "Culte Dominical",
      moderator: "Ancien Pierre Mba",
      preacher: "Pasteur Titulaire Samuel Mbarga",
      worship_leader: "Chœur des Rachetés (Équipe A)",
      protocol_leader: "Diacre Jean-Paul Ebogo",
      sound_tech: "Frère David Nkomo",
      sunday_school: "Monitrice Sarah Ngo & Équipe EDD",
      status: "confirmed",
    },
    {
      id: "ws-2",
      name: "2ème Culte de Puissance & Évangélisation",
      dayOfWeek: "Dimanche",
      time: "10h00 - 12h30",
      service_type: "Culte Dominical",
      moderator: "Ancien Thomas Onana",
      preacher: "Pasteur Associé Daniel Essomba",
      worship_leader: "Groupe Musical Canaan (Équipe B)",
      protocol_leader: "Diaconesse Marthe Biya",
      sound_tech: "Frère Joseph Mballa",
      sunday_school: "Moniteur Michel Kamga",
      status: "confirmed",
    },
    {
      id: "ws-3",
      name: "Culte d'Enseignement & Étude Biblique",
      dayOfWeek: "Mardi",
      time: "18h00 - 20h00",
      service_type: "Enseignement Hebdomadaire",
      moderator: "Pasteur Associé Daniel Essomba",
      preacher: "Pasteur Titulaire Samuel Mbarga",
      worship_leader: "Équipe Acoustique & Louange",
      protocol_leader: "Équipe Diaconat Mardi",
      sound_tech: "Frère David Nkomo",
      sunday_school: "Sans objet",
      status: "confirmed",
    },
    {
      id: "ws-4",
      name: "Soirée de Prière, Délivrance & Intercession",
      dayOfWeek: "Jeudi",
      time: "18h00 - 20h00",
      service_type: "Intercession de Semaine",
      moderator: "Ancien Pierre Mba",
      preacher: "Équipe Pastorale d'Intercession",
      worship_leader: "Chantres d'Intercession",
      protocol_leader: "Protocole de permanence",
      sound_tech: "Frère Joseph Mballa",
      sunday_school: "Sans objet",
      status: "confirmed",
    },
    {
      id: "ws-5",
      name: "Culte d'Impact de la Jeunesse (JPE)",
      dayOfWeek: "Samedi",
      time: "16h00 - 18h30",
      service_type: "Département Jeunesse",
      moderator: "Président de la Jeunesse",
      preacher: "Orateur Invité JPE",
      worship_leader: "Chorale des Jeunes Full Gospel",
      protocol_leader: "Protocole Jeunesse",
      sound_tech: "Équipe Sono Jeunesse",
      sunday_school: "Sans objet",
      status: "confirmed",
    },
  ];

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [assRes, deptRes, memRes] = await Promise.all([
        api.organizations.listAssemblies({ limit: 100 }).catch(() => ({ data: [] })),
        api.departments.list().catch(() => ({ data: [] })),
        api.members.list({ limit: 150 }).catch(() => ({ data: [] })),
      ]);

      const assList =
        (assRes.data as any)?.assemblies ||
        (assRes.data as any)?.items ||
        (Array.isArray(assRes.data) ? assRes.data : []);
      setAssemblies(assList);

      const defaultAssId = assList[0]?.id || "";
      setSelectedAssemblyId(defaultAssId);

      const deptList =
        (deptRes.data as any)?.departments ||
        (deptRes.data as any)?.items ||
        (Array.isArray(deptRes.data) ? deptRes.data : []);
      setDepartments(deptList);

      const memList =
        (memRes.data as any)?.members ||
        (memRes.data as any)?.items ||
        (Array.isArray(memRes.data) ? memRes.data : []);
      setMembers(memList);

      if (defaultAssId) {
        await loadAssemblyPlannings(defaultAssId);
      }
    } catch (err: any) {
      console.error("Erreur chargement planning:", err);
      setFeedback({ type: "error", message: "Impossible de charger les données liturgiques." });
    } finally {
      setLoading(false);
    }
  };

  const loadAssemblyPlannings = async (assId: string) => {
    if (!assId) return;
    try {
      const [planRes, unavailRes] = await Promise.all([
        api.events.listPlannings(assId).catch(() => ({ data: [] })),
        api.events.listUnavailabilities(assId).catch(() => ({ data: [] })),
      ]);

      const planItems =
        (planRes.data as any)?.plannings ||
        (Array.isArray(planRes.data) ? planRes.data : []);
      setPlannings(planItems);

      const unavailItems =
        (unavailRes.data as any)?.unavailabilities ||
        (Array.isArray(unavailRes.data) ? unavailRes.data : []);
      setUnavailabilities(unavailItems);
    } catch (err) {
      console.warn("FULLGOPE: Plannings non disponibles pour cette assemblée", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssemblyChange = async (assId: string) => {
    setSelectedAssemblyId(assId);
    await loadAssemblyPlannings(assId);
  };

  // Calendar Navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  // Dismiss feedback
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Handle Create Planning Submit (RBAC Guarded)
  const handleCreatePlanningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkCan({ minRole: RoleLevel.DEPARTMENT_HEAD, permission: "can:create_planning" })) {
      await alert({
        title: "Privilèges Insuffisants",
        message: "Votre profil ecclésial ne dispose pas des droits requis pour élaborer un planning (Niveau N2 Responsable de Département ou Pasteur N4 requis).",
        variant: "danger",
      });
      return;
    }

    if (!selectedAssemblyId) {
      await alert({
        title: "Sélection Requise",
        message: "Veuillez d'abord sélectionner une assemblée locale.",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const assignedName =
        members.find((m) => m.id === newPlanningForm.assigned_member_id)?.full_name ||
        "Officiant désigné";

      const res = await api.events.createPlanning({
        assembly_id: selectedAssemblyId,
        department_id: newPlanningForm.department_id || undefined,
        service_type: newPlanningForm.service_type,
        period_start: newPlanningForm.period_start,
        period_end: newPlanningForm.period_end,
        assignments: [
          {
            date: newPlanningForm.period_start,
            user_ids: newPlanningForm.assigned_member_id ? [newPlanningForm.assigned_member_id] : [],
            role_title: newPlanningForm.role_title,
            notes: `${newPlanningForm.notes} (Affecté: ${assignedName})`,
          },
        ],
      });

      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la création du planning." });
      } else {
        setFeedback({
          type: "success",
          message: `La grille de rotation pour « ${newPlanningForm.service_type} » a été enregistrée avec succès.`,
        });
        setCreatePlanningModalOpen(false);
        await loadAssemblyPlannings(selectedAssemblyId);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Declare Unavailability Submit (RBAC Guarded)
  const handleDeclareUnavailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkCan({ minRole: RoleLevel.MEMBER, permission: "can:declare_unavailability" })) {
      await alert({
        title: "Authentification Requise",
        message: "Seuls les membres reconnus peuvent déclarer une indisponibilité liturgique.",
        variant: "warning",
      });
      return;
    }

    if (!selectedAssemblyId) return;

    setSubmitting(true);
    try {
      const res = await api.events.declareUnavailability({
        assembly_id: selectedAssemblyId,
        start_date: unavailabilityForm.start_date || "2026-11-01",
        end_date: unavailabilityForm.end_date || "2026-11-08",
        reason: unavailabilityForm.reason,
      });

      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la déclaration d'indisponibilité." });
      } else {
        setFeedback({
          type: "success",
          message: "L'indisponibilité liturgique a été consignée au registre paroissial.",
        });
        setUnavailabilityModalOpen(false);
        await loadAssemblyPlannings(selectedAssemblyId);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAssembly = useMemo(() => {
    return assemblies.find((a) => a.id === selectedAssemblyId) || assemblies[0] || null;
  }, [assemblies, selectedAssemblyId]);

  // Calendar Day Cells Computation
  const calendarCells = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth; // 1 to 12
    const firstDayOfMonth = new Date(year, month - 1, 1);
    // Convert getDay(): 0=Sun, 1=Mon ... 6=Sat to 0=Mon ... 6=Sun
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dayOfWeekName: string;
      isToday: boolean;
      services: WorshipService[];
      plannings: any[];
      unavailabilities: any[];
    }[] = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Padding from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 2, day);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const dowIdx = (prevDate.getDay() + 6) % 7;
      const dowName = DAYS_OF_WEEK_LONG[dowIdx] || "Dimanche";

      const dayServices = defaultServices.filter((s) => s.dayOfWeek.toLowerCase() === dowName.toLowerCase());

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        dayOfWeekName: dowName,
        isToday: dateStr === todayStr,
        services: dayServices,
        plannings: [],
        unavailabilities: [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = String(day).padStart(2, "0");
      const m = String(month).padStart(2, "0");
      const dateStr = `${year}-${m}-${d}`;
      const dateObj = new Date(year, month - 1, day);
      const dowIdx = (dateObj.getDay() + 6) % 7;
      const dowName = DAYS_OF_WEEK_LONG[dowIdx] || "Dimanche";

      // Regular worship services for this day of week
      const dayServices = defaultServices.filter((s) => s.dayOfWeek.toLowerCase() === dowName.toLowerCase());

      // Custom plannings matching date
      const dayPlannings = plannings.filter((p) => {
        if (p.assignments && Array.isArray(p.assignments)) {
          if (p.assignments.some((a: any) => a.date === dateStr)) return true;
        }
        if (p.period_start && p.period_end) {
          return dateStr >= p.period_start && dateStr <= p.period_end;
        }
        return false;
      });

      // Unavailabilities matching date
      const dayUnavail = unavailabilities.filter((u) => {
        if (u.start_date && u.end_date) {
          return dateStr >= u.start_date && dateStr <= u.end_date;
        }
        return false;
      });

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        dayOfWeekName: dowName,
        isToday: dateStr === todayStr,
        services: dayServices,
        plannings: dayPlannings,
        unavailabilities: dayUnavail,
      });
    }

    // Next month padding to fill grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month, day);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const dowIdx = (nextDate.getDay() + 6) % 7;
      const dowName = DAYS_OF_WEEK_LONG[dowIdx] || "Dimanche";
      const dayServices = defaultServices.filter((s) => s.dayOfWeek.toLowerCase() === dowName.toLowerCase());

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        dayOfWeekName: dowName,
        isToday: dateStr === todayStr,
        services: dayServices,
        plannings: [],
        unavailabilities: [],
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, defaultServices, plannings, unavailabilities]);

  // Selected Day Data for Modal
  const selectedDayData = useMemo(() => {
    if (!selectedCalendarDate) return null;
    return calendarCells.find((c) => c.dateStr === selectedCalendarDate) || null;
  }, [selectedCalendarDate, calendarCells]);

  return (
    <PortalShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Navigation Breadcrumb & Top Actions (RBAC Guarded) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium flex-wrap">
            <Link href="/dashboard" className="hover:text-primary">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Plannings Liturgiques & Cultes</span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Déclarer Indisponibilité (N1+ Fidèle) */}
            <Can minRole={RoleLevel.MEMBER} permission="can:declare_unavailability">
              <button
                type="button"
                onClick={() => setUnavailabilityModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container-high"
              >
                <Icons.UserX />
                <span>Déclarer Indisponibilité</span>
              </button>
            </Can>

            {/* Nouveau Planning (N2+ Responsable / Pasteur) */}
            <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="can:create_planning">
              <button
                type="button"
                onClick={() => setCreatePlanningModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Plus />
                <span>+ Élaborer une Rotation</span>
              </button>
            </Can>

            {/* Imprimer Feuille de Route */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
              title="Imprimer la feuille de route liturgique A4"
            >
              <Icons.Print />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
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
                <span>Ordre Liturgique & Gouvernance des Services</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
                Plannings &amp; Calendrier Liturgique
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-3xl leading-relaxed">
                Calendrier interactif des célébrations dominicales et réunions de semaine. Cliquez sur une date pour consulter l'ordre liturgique du jour, la liste nominative des prédicateurs, modérateurs, équipes de louange, protocole et régie média.
              </p>
            </div>

            {/* Assembly Selector */}
            <div className="shrink-0 bg-surface-container-low p-2 rounded-2xl border border-surface-container flex items-center gap-2">
              <span className="text-primary text-xs font-bold pl-2 flex items-center gap-1.5">
                <Icons.Church />
                <span className="hidden sm:inline">Paroisse :</span>
              </span>
              <select
                value={selectedAssemblyId}
                onChange={(e) => handleAssemblyChange(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                {assemblies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.city || "Cameroun"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="pt-3 border-t border-surface-container flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "calendar"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icons.Calendar />
              <span>📅 Vue Calendrier Mensuel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "services"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icons.Church />
              <span>Programme des Cultes &amp; Célébrations ({defaultServices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("plannings")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "plannings"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icons.Users />
              <span>Grilles de Rotation des Équipes ({plannings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unavailabilities")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "unavailabilities"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icons.UserX />
              <span>Indisponibilités &amp; Absences ({unavailabilities.length})</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <Icons.Church />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Cultes / Semaine</span>
              <span className="text-2xl font-black text-on-surface">5 Célébrations</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Icons.Users />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Officiants Mobilisés</span>
              <span className="text-2xl font-black text-purple-700">24 Serviteurs</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Icons.Check />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Taux de Confirmation</span>
              <span className="text-2xl font-black text-emerald-700">96 %</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Icons.UserX />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Indisponibilités</span>
              <span className="text-2xl font-black text-amber-800">{unavailabilities.length} Déclarées</span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 0: VUE CALENDRIER MENSUEL INTERACTIF */}
        {/* =================================================================== */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            {/* Calendar Month Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-surface-container-high shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-surface-container-low rounded-2xl p-1 border border-surface-container">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    title="Mois précédent"
                  >
                    <Icons.ChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    title="Mois suivant"
                  >
                    <Icons.ChevronRight />
                  </button>
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-on-surface">
                  {MONTHS_FR[selectedMonth - 1]} {selectedYear}
                </h2>

                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs transition-colors cursor-pointer"
                >
                  Aujourd'hui
                </button>
              </div>

              {/* Quick Jump Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-9 px-3 rounded-xl bg-white border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  {MONTHS_FR.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-9 px-3 rounded-xl bg-white border border-surface-container-high text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <span className="text-[11px] text-on-surface-variant font-medium pl-1 hidden md:inline">
                  (Cliquez sur une date pour voir les intervenants)
                </span>
              </div>
            </div>

            {/* Calendar Monthly Grid */}
            <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high shadow-xs overflow-hidden">
              {/* Days of Week Header (Lun -> Dim) */}
              <div className="grid grid-cols-7 bg-surface-container-low border-b border-surface-container-high text-center">
                {DAYS_OF_WEEK_SHORT.map((day, idx) => (
                  <div
                    key={day}
                    className={`py-3 text-xs font-extrabold uppercase tracking-wider ${
                      idx === 6 ? "text-primary bg-primary-fixed/20" : "text-on-surface-variant"
                    }`}
                  >
                    <span>{day}</span>
                    <span className="hidden sm:inline font-normal lowercase text-[10px] ml-1">
                      ({(DAYS_OF_WEEK_LONG[idx] || "").slice(3)})
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-surface-container-high border-b border-surface-container-high">
                {calendarCells.map((cell) => {
                  const hasServices = cell.services.length > 0;
                  const hasPlannings = cell.plannings.length > 0;
                  const hasUnavail = cell.unavailabilities.length > 0;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => setSelectedCalendarDate(cell.dateStr)}
                      className={`min-h-[105px] sm:min-h-[125px] p-2 sm:p-2.5 transition-all cursor-pointer relative group flex flex-col justify-between ${
                        cell.isCurrentMonth
                          ? "bg-white hover:bg-surface-container-lowest/90"
                          : "bg-surface-container-low/40 text-on-surface-variant/50"
                      } ${cell.isToday ? "ring-2 ring-inset ring-primary bg-primary-fixed/10" : ""}`}
                    >
                      {/* Cell Header: Day Number & Indicators */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? "bg-primary text-on-primary shadow-xs"
                              : cell.isCurrentMonth
                              ? "text-on-surface group-hover:text-primary"
                              : "text-slate-400"
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        <div className="flex items-center gap-1">
                          {hasUnavail && (
                            <span
                              className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                              title={`${cell.unavailabilities.length} indisponibilité(s)`}
                            />
                          )}
                          {hasServices && (
                            <span className="text-[10px] font-bold text-slate-400 hidden lg:inline">
                              {cell.services.length} culte{cell.services.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Service Badges / Pills */}
                      <div className="space-y-1 my-1">
                        {cell.services.slice(0, 2).map((ws) => (
                          <div
                            key={ws.id}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 border shadow-2xs ${
                              ws.dayOfWeek === "Dimanche"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : ws.dayOfWeek === "Mardi"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : ws.dayOfWeek === "Jeudi"
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-purple-50 text-purple-900 border-purple-200"
                            }`}
                          >
                            <span className="shrink-0">{ws.time.split(" - ")[0]}</span>
                            <span className="truncate">{ws.name.replace("Culte d'", "").replace("Culte de ", "")}</span>
                          </div>
                        ))}

                        {cell.services.length > 2 && (
                          <div className="text-[9px] font-bold text-slate-500 px-1">
                            +{cell.services.length - 2} autre(s)
                          </div>
                        )}

                        {hasPlannings && (
                          <div className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 truncate">
                            📋 {cell.plannings[0]?.service_type || "Rotation"}
                          </div>
                        )}

                        {hasUnavail && (
                          <div className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 truncate">
                            ⚠️ {cell.unavailabilities.length} absence(s)
                          </div>
                        )}
                      </div>

                      {/* Bottom Micro-hint */}
                      <div className="text-[9px] text-slate-400 group-hover:text-primary font-medium truncate pt-0.5">
                        {hasServices || hasPlannings ? "Voir intervenants →" : "Aucun culte"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-surface-container-lowest p-3 rounded-2xl border border-surface-container flex-wrap">
              <span className="text-slate-400 font-bold">Légende cultes :</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary/20 border border-primary/40 inline-block" />
                <span>Cultes Dominicales (07h00 &amp; 10h00)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
                <span>Mardi Étude Biblique (18h00)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                <span>Jeudi Prière &amp; Délivrance (18h00)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block" />
                <span>Samedi Jeunesse JPE (16h00)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
                <span>Indisponibilité déclarée</span>
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: PROGRAMME DES CULTES & CÉLÉBRATIONS RÉCURRENTES */}
        {/* =================================================================== */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Célébrations liturgiques régulières :</span>
                <span className="text-xs text-slate-500">
                  {selectedAssembly ? selectedAssembly.name : "Assemblée locale"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Période active : {MONTHS_FR[selectedMonth - 1]} {selectedYear}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultServices.map((ws) => (
                <div
                  key={ws.id}
                  className="bg-surface-container-lowest rounded-2xl border border-surface-container-high p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary-fixed text-primary">
                        {ws.dayOfWeek} • {ws.time}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Icons.Check />
                        <span>Confirmé</span>
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {ws.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Liturgie canonique • {selectedAssembly?.city || "Cameroun"}
                    </p>

                    {/* Roles breakdown */}
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Icons.Mic />
                          <span>Prédicateur :</span>
                        </span>
                        <strong className="text-slate-900 font-bold text-right truncate max-w-[180px]">
                          {ws.preacher}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Icons.UserCheck />
                          <span>Modérateur :</span>
                        </span>
                        <span className="text-slate-800 font-semibold text-right truncate max-w-[180px]">
                          {ws.moderator}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Icons.Music />
                          <span>Louange :</span>
                        </span>
                        <span className="text-slate-800 font-semibold text-right truncate max-w-[180px]">
                          {ws.worship_leader}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Icons.Users />
                          <span>Protocole &amp; Accueil :</span>
                        </span>
                        <span className="text-slate-800 font-medium text-right truncate max-w-[180px]">
                          {ws.protocol_leader}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Sono : <strong className="text-slate-700">{ws.sound_tech}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedServiceDetail(ws)}
                      className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors cursor-pointer"
                    >
                      Détails du culte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: GRILLES DE ROTATION DES ÉQUIPES */}
        {/* =================================================================== */}
        {activeTab === "plannings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Grilles de Planning Liturgique Enregistrées</h3>
                <p className="text-[11px] text-slate-500">
                  Affectations des serviteurs et ouvriers par département et période de service
                </p>
              </div>

              {/* Nouveau Planning (N2+ Responsable) */}
              <Can minRole={RoleLevel.DEPARTMENT_HEAD} permission="can:create_planning">
                <button
                  type="button"
                  onClick={() => setCreatePlanningModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Icons.Plus />
                  <span>+ Nouvelle Rotation</span>
                </button>
              </Can>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-surface-container-high">
                    <tr>
                      <th className="py-3 px-4">Pôle &amp; Type de Service</th>
                      <th className="py-3 px-4">Période de Validité</th>
                      <th className="py-3 px-4">Affectations &amp; Ouvriers</th>
                      <th className="py-3 px-4">Département Associé</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {plannings.length > 0 ? (
                      plannings.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <span className="block">{p.service_type}</span>
                            <span className="text-[11px] text-primary font-mono">ID: {p.id.slice(0, 8)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            Du <strong className="text-slate-900">{p.period_start}</strong> au <strong className="text-slate-900">{p.period_end}</strong>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {Array.isArray(p.assignments) && p.assignments.length > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px]">
                                {p.assignments.length} affectation(s) programmée(s)
                              </span>
                            ) : (
                              <span className="italic text-slate-400">Affectations générales</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {p.department_name || "Général Paroisse"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                alert({
                                  title: `Planning : ${p.service_type}`,
                                  message: `Période : ${p.period_start} à ${p.period_end}\nDépartement : ${p.department_name || "Paroisse"}\nAffectations : ${JSON.stringify(p.assignments, null, 2)}`,
                                  variant: "info",
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] cursor-pointer"
                            >
                              Consulter
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-on-surface-variant italic">
                          Aucune grille de rotation enregistrée pour cette paroisse. Cliquez sur « + Nouvelle Rotation » pour planifier les équipes de culte.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: INDISPONIBILITÉS & ABSENCES DÉCLARÉES */}
        {/* =================================================================== */}
        {activeTab === "unavailabilities" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Registre des Indisponibilités Liturgiques</h3>
                <p className="text-[11px] text-slate-500">
                  Périodes d'absence signalées par les officiants pour prévenir les conflits de planning
                </p>
              </div>

              {/* Déclarer une absence (N1+ Fidèle) */}
              <Can minRole={RoleLevel.MEMBER} permission="can:declare_unavailability">
                <button
                  type="button"
                  onClick={() => setUnavailabilityModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Icons.UserX />
                  <span>+ Déclarer une Absence</span>
                </button>
              </Can>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-surface-container-high">
                    <tr>
                      <th className="py-3 px-4">Officiant / Bénévole</th>
                      <th className="py-3 px-4">Période d'Indisponibilité</th>
                      <th className="py-3 px-4">Motif consigné</th>
                      <th className="py-3 px-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {unavailabilities.length > 0 ? (
                      unavailabilities.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {u.user_name || "Serviteur consigné"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            Du <strong className="text-slate-900">{u.start_date}</strong> au <strong className="text-slate-900">{u.end_date}</strong>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 italic">
                            « {u.reason || "Absence signalée"} »
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Indisponible
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-on-surface-variant italic">
                          Aucune indisponibilité en cours. Tous les ouvriers sont disponibles pour le service du Seigneur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL 0: CALENDAR DAY DETAILS MODAL (CLIQUER SUR UNE DATE) */}
        {/* =================================================================== */}
        {selectedDayData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    <Icons.Calendar />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-primary block">
                      Ordre Liturgique Paroissial
                    </span>
                    <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
                      {selectedDayData.dayOfWeekName} {selectedDayData.dayNumber} {MONTHS_FR[selectedMonth - 1]} {selectedYear}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedAssembly?.name || "Paroisse Locale"} • {selectedAssembly?.city || "Cameroun"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              {/* Indisponibilités Notice for this Day */}
              {selectedDayData.unavailabilities.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
                    <Icons.Alert />
                    <span>Attention : Ouvrier(s) Indisponible(s) à cette date :</span>
                  </div>
                  <ul className="text-xs space-y-1 pl-6 list-disc text-rose-900">
                    {selectedDayData.unavailabilities.map((u, i) => (
                      <li key={i}>
                        <strong className="font-bold">{u.user_name || "Serviteur"}</strong> — Motif : « {u.reason} » (Du {u.start_date} au {u.end_date})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Worship Services on that Day */}
              {selectedDayData.services.length > 0 ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase tracking-wide font-extrabold text-slate-900 flex items-center gap-2">
                      <Icons.Church />
                      <span>Cultes &amp; Célébrations de la Journée ({selectedDayData.services.length}) :</span>
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">Affectations officielles</span>
                  </div>

                  <div className="space-y-4">
                    {selectedDayData.services.map((ws) => (
                      <div
                        key={ws.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary-fixed text-primary">
                              {ws.time}
                            </span>
                            <h5 className="font-extrabold text-base text-slate-900 mt-1">
                              {ws.name}
                            </h5>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full w-fit">
                            <Icons.Check />
                            <span>Confirmé au Registre</span>
                          </span>
                        </div>

                        {/* Complete Intervenants Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Icons.Mic />
                              <span>Prédicateur de la Parole</span>
                            </span>
                            <strong className="font-extrabold text-primary text-sm mt-0.5 block">
                              {ws.preacher}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Icons.UserCheck />
                              <span>Modérateur du Culte</span>
                            </span>
                            <strong className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                              {ws.moderator}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Icons.Music />
                              <span>Louange &amp; Chantres</span>
                            </span>
                            <strong className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                              {ws.worship_leader}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Icons.Users />
                              <span>Protocole &amp; Accueil</span>
                            </span>
                            <strong className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {ws.protocol_leader}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              🎛️ Régie Son &amp; Média
                            </span>
                            <strong className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {ws.sound_tech}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              📖 École du Dimanche (EDD)
                            </span>
                            <strong className="font-bold text-slate-800 text-xs mt-0.5 block">
                              {ws.sunday_school}
                            </strong>
                          </div>
                        </div>

                        {/* Liturgical Sequence */}
                        <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200">
                          <strong className="text-slate-700">Déroulement liturgique canonique :</strong> Prière des ouvriers 30 min avant • Louange d'ouverture • Annonces &amp; requêtes • Prédication • Dîmes &amp; offrandes • Bénédiction finale.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Icons.Church />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Aucun culte public régulier ce jour
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Journée réservée à la méditation personnelle, aux visites pastorales, aux réunions de cellules d'édification de maison ou aux activités de départements.
                  </p>
                </div>
              )}

              {/* Custom Plannings for that Day */}
              {selectedDayData.plannings.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                  <span className="text-xs font-bold text-blue-900 block">
                    Grilles de rotation d'équipes actives à cette date :
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {selectedDayData.plannings.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-blue-950 font-medium">
                        <span>• {p.service_type} ({p.department_name || "Général"})</span>
                        <span className="font-bold">Valide du {p.period_start} au {p.period_end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Icons.Print />
                  <span>Imprimer l'Ordre Liturgique du Jour (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL 1: CRÉER UNE GRILLE DE ROTATION LITURGIQUE */}
        {/* =================================================================== */}
        {createPlanningModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <Icons.Calendar />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Élaborer une Grille de Rotation Liturgique
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Programmation d'équipe pour les cultes et célébrations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatePlanningModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleCreatePlanningSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pôle / Service Liturgique *</label>
                  <select
                    value={newPlanningForm.service_type}
                    onChange={(e) => setNewPlanningForm({ ...newPlanningForm, service_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                  >
                    <option value="Prédication & Modération">Prédication & Modération (Collège Pastoral)</option>
                    <option value="Louange & Chorale">Louange & Chorale (Chœur des Rachetés / Canaan)</option>
                    <option value="Protocole & Accueil">Protocole & Accueil des Fidèles (Diaconat)</option>
                    <option value="Sonorisation & Média">Sonorisation, Projection & Diffusion Live</option>
                    <option value="École du Dimanche">École du Dimanche / Moniteurs Enfants</option>
                    <option value="Intercession & Prière">Intercession & Prière matinale</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date de début *</label>
                    <input
                      type="date"
                      required
                      value={newPlanningForm.period_start}
                      onChange={(e) => setNewPlanningForm({ ...newPlanningForm, period_start: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date de fin *</label>
                    <input
                      type="date"
                      required
                      value={newPlanningForm.period_end}
                      onChange={(e) => setNewPlanningForm({ ...newPlanningForm, period_end: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rôle / Charge liturgique *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conducteur de Louange, Chef de Protocole..."
                    value={newPlanningForm.role_title}
                    onChange={(e) => setNewPlanningForm({ ...newPlanningForm, role_title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Officiant ou Responsable désigné</label>
                  <select
                    value={newPlanningForm.assigned_member_id}
                    onChange={(e) => setNewPlanningForm({ ...newPlanningForm, assigned_member_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-medium"
                  >
                    <option value="">Sélectionner un membre ou officiant...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.phone || "Fidèle"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Consignes & Notes de service</label>
                  <textarea
                    rows={3}
                    placeholder="Instructions particulières, thèmes des chants, heure de rassemblement pour la prière..."
                    value={newPlanningForm.notes}
                    onChange={(e) => setNewPlanningForm({ ...newPlanningForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatePlanningModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? "Enregistrement..." : "Valider le Planning"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL 2: DÉCLARER UNE INDISPONIBILITÉ */}
        {/* =================================================================== */}
        {unavailabilityModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Icons.UserX />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Déclaration d'Indisponibilité
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Signalement d'absence pour prévenir les conflits de culte
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnavailabilityModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleDeclareUnavailabilitySubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Du *</label>
                    <input
                      type="date"
                      required
                      value={unavailabilityForm.start_date}
                      onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, start_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Au *</label>
                    <input
                      type="date"
                      required
                      value={unavailabilityForm.end_date}
                      onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, end_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Motif canonique / Raison *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ex: Déplacement professionnel, convalescence, retraite spirituelle..."
                    value={unavailabilityForm.reason}
                    onChange={(e) => setUnavailabilityForm({ ...unavailabilityForm, reason: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUnavailabilityModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? "Enregistrement..." : "Consigner l'absence"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MODAL 3: FICHE DÉTAILLÉE D'UN CULTE & FEUILLE DE ROUTE */}
        {/* =================================================================== */}
        {selectedServiceDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <Icons.Church />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {selectedServiceDetail.name}
                    </h3>
                    <p className="text-[11px] text-primary font-bold">
                      {selectedServiceDetail.dayOfWeek} • {selectedServiceDetail.time}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedServiceDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              {/* Liturgical Timeline / Déroulement canonique */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                  Ordre du Culte Canonique MPEC (Feuille de Route) :
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">1. Prière des Ouvriers &amp; Accueil</span>
                      <span className="text-[11px] text-slate-500">Rassemblement 30 min avant le culte</span>
                    </div>
                    <span className="text-slate-700 font-semibold">{selectedServiceDetail.protocol_leader}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">2. Louange &amp; Adoration d'Ouverture</span>
                      <span className="text-[11px] text-slate-500">Chants de consécration et d'exaltation</span>
                    </div>
                    <span className="text-slate-700 font-semibold">{selectedServiceDetail.worship_leader}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">3. Modération &amp; Prière Sacerdotale</span>
                      <span className="text-[11px] text-slate-500">Paroles de bienvenue, requêtes et annonces</span>
                    </div>
                    <span className="text-slate-700 font-semibold">{selectedServiceDetail.moderator}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">4. Prédication de la Parole de Dieu</span>
                      <span className="text-[11px] text-slate-500">Message biblique &amp; proclamation de l'Évangile</span>
                    </div>
                    <span className="text-primary font-bold">{selectedServiceDetail.preacher}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">5. Dîmes, Offrandes &amp; Ministère de Bénédiction</span>
                      <span className="text-[11px] text-slate-500">Offrandes régulières et prière pour les nouveaux convertis</span>
                    </div>
                    <span className="text-slate-700 font-semibold">Collège des Anciens &amp; Diacres</span>
                  </div>
                </div>
              </div>

              {/* Technique & Logistique */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Régie Son &amp; Média</span>
                  <strong className="text-slate-800">{selectedServiceDetail.sound_tech}</strong>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">École du Dimanche</span>
                  <strong className="text-slate-800">{selectedServiceDetail.sunday_school}</strong>
                </div>
              </div>

              <div className="pt-2 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Icons.Print />
                  <span>Imprimer la feuille de route</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedServiceDetail(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
