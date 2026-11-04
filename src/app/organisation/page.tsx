"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { api, getStoredUser } from "@/lib/api";
import { useIntl } from "@/intl";
import { Can } from "@/components/auth/Can";
import { RoleLevel } from "@/lib/permissions";
import type { AssemblyMapItem } from "@/components/maps/AssembliesMap";
import { Skeleton } from "@/components/ui/Skeleton";

// Dynamic import of Leaflet map (client-only to prevent SSR errors)
const AssembliesMap = dynamic(
  () => import("@/components/maps/AssembliesMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-surface-container-low text-on-surface-variant font-bold text-xs gap-3 rounded-2xl">
        <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Chargement de la Carte Territoriale...</span>
      </div>
    ),
  }
);

// Fallback GPS coordinates for Cameroon cities
const CITY_COORDS: Record<string, [number, number]> = {
  yaounde: [3.848, 11.5021],
  yaoundé: [3.848, 11.5021],
  douala: [4.051, 9.767],
  bafoussam: [5.477, 10.417],
  buea: [4.155, 9.243],
  buéa: [4.155, 9.243],
  bamenda: [5.963, 10.159],
  garoua: [9.3, 13.4],
  maroua: [10.597, 14.316],
  ngaoundere: [7.316, 13.583],
  ngaoundéré: [7.316, 13.583],
  bertoua: [4.577, 13.684],
  ebolowa: [2.9, 11.15],
  kribi: [2.937, 9.907],
};

// Clean inline icons
const Icons = {
  Tree: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="6" height="6" x="9" y="3" rx="1"/>
      <path d="M12 9v4"/>
      <path d="M5 13h14"/>
      <path d="M5 13v4"/>
      <path d="M19 13v4"/>
      <rect width="6" height="6" x="2" y="17" rx="1"/>
      <rect width="6" height="6" x="16" y="17" rx="1"/>
    </svg>
  ),
  Table: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  ),
  Map: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" x2="9" y1="3" y2="18"/>
      <line x1="15" x2="15" y1="6" y2="21"/>
    </svg>
  ),
  Church: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M10 4h4"/>
      <path d="m18 8-6-4-6 4v14h12V8Z"/>
      <path d="M10 22v-6h4v6"/>
    </svg>
  ),
  District: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3a9 9 0 0 0 0 18"/>
      <path d="M3 12h18"/>
    </svg>
  ),
  Region: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" x2="16.65" y1="21" y2="16.65"/>
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Phone: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Pin: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Edit: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Transfer: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 5h18"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 19H3"/>
    </svg>
  ),
  Upload: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Shield: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

export default function OrganisationTerritorialePage() {
  const { t, locale } = useIntl();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [hierarchyTree, setHierarchyTree] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  // Navigation view
  const [activeView, setActiveView] = useState<"tree" | "table" | "map">("tree");

  // Accordion toggle state
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  // Search & Filter state
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegionFilter, setSelectedRegionFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // --- MODALS STATE ---
  // 1. Details Modal
  const [selectedAssemblyModal, setSelectedAssemblyModal] = useState<any | null>(null);

  // 2. Region Create / Edit / Delete
  const [createRegionModalOpen, setCreateRegionModalOpen] = useState(false);
  const [regionForm, setRegionForm] = useState({ name: "", code: "", description: "", zone_description: "" });
  const [editRegionModalData, setEditRegionModalData] = useState<any | null>(null);
  const [deleteRegionTarget, setDeleteRegionTarget] = useState<any | null>(null);

  // 3. District Create / Edit / Delete
  const [createDistrictModalOpen, setCreateDistrictModalOpen] = useState(false);
  const [districtForm, setDistrictForm] = useState({ name: "", code: "", region_id: "", description: "", zone_description: "" });
  const [editDistrictModalData, setEditDistrictModalData] = useState<any | null>(null);
  const [deleteDistrictTarget, setDeleteDistrictTarget] = useState<any | null>(null);

  // 4. Assembly Create / Edit / Delete
  const [createAssemblyModalOpen, setCreateAssemblyModalOpen] = useState(false);
  const [assemblyForm, setAssemblyForm] = useState({
    name: "",
    code: "",
    region_id: "",
    district_id: "",
    city: "Yaoundé",
    address: "",
    status: "active",
    phone: "",
    email: "",
    latitude: 3.848,
    longitude: 11.5021,
    description: "",
  });
  const [editAssemblyModalData, setEditAssemblyModalData] = useState<any | null>(null);
  const [deleteAssemblyTarget, setDeleteAssemblyTarget] = useState<any | null>(null);

  // 5. Transfer Assembly (Move between Districts / Regions)
  const [transferAssemblyModalData, setTransferAssemblyModalData] = useState<any | null>(null);
  const [transferForm, setTransferForm] = useState({ target_region_id: "", to_district_id: "", reason: "" });

  // 6. Representatives Management
  const [representativesModalData, setRepresentativesModalData] = useState<any | null>(null);
  const [repsList, setRepsList] = useState<any[]>([]);
  const [loadingReps, setLoadingReps] = useState(false);
  const [repForm, setRepForm] = useState({
    user_id: "",
    representative_type: "main_leader",
    function_title: "Pasteur Titulaire",
    phone: "",
    whatsapp: "",
    email: "",
  });

  // 7. Upload Excel Modal
  const [uploadExcelModalOpen, setUploadExcelModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRegionId, setUploadRegionId] = useState("");
  const [uploadDistrictId, setUploadDistrictId] = useState("");
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Submitting flags
  const [submittingAction, setSubmittingAction] = useState(false);

  // Load all organizational data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, hierRes, assRes, regRes, distRes] = await Promise.all([
        api.organizations.getStats().catch(() => ({ data: null })),
        api.organizations.getHierarchy().catch(() => ({ data: null })),
        api.organizations.listAssemblies({ limit: 150 }).catch(() => ({ data: null })),
        api.organizations.listRegions().catch(() => ({ data: null })),
        api.organizations.listDistricts().catch(() => ({ data: null })),
      ]);

      if (statsRes?.data) setStats(statsRes.data);

      const tree = (hierRes?.data as any)?.tree || hierRes?.data || [];
      setHierarchyTree(tree);

      // Auto-expand ALL regions and ALL districts by default so the user sees everything immediately
      const initialExp = new Set<string>();
      const initialDistExp = new Set<string>();
      tree.forEach((r: any) => {
        initialExp.add(r.id);
        (r.districts || []).forEach((d: any) => initialDistExp.add(d.id));
      });
      setExpandedRegions(initialExp);
      setExpandedDistricts(initialDistExp);

      const assList =
        (assRes?.data as any)?.assemblies ||
        (assRes?.data as any)?.items ||
        (Array.isArray(assRes?.data) ? assRes.data : []);
      setAssemblies(assList);

      const regList =
        (regRes?.data as any)?.regions ||
        (Array.isArray(regRes?.data) ? regRes.data : []);
      setRegions(regList);

      const dList =
        (distRes?.data as any)?.districts ||
        (Array.isArray(distRes?.data) ? distRes.data : []);
      setDistricts(dList);
    } catch (err: any) {
      console.error("Erreur chargement structure territoriale:", err);
      setError("Impossible de charger les données territoriales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dismiss feedback automatically after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Toggle Region in Tree
  const toggleRegion = (regId: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId);
      else next.add(regId);
      return next;
    });
  };

  // Toggle District in Tree
  const toggleDistrict = (distId: string) => {
    setExpandedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(distId)) next.delete(distId);
      else next.add(distId);
      return next;
    });
  };

  // Filtered tree by treeSearchTerm
  const filteredHierarchyTree = useMemo(() => {
    if (!treeSearchTerm.trim()) return hierarchyTree;
    const term = treeSearchTerm.toLowerCase().trim();
    return hierarchyTree
      .map((region) => {
        const matchRegion =
          region.name?.toLowerCase().includes(term) ||
          region.code?.toLowerCase().includes(term);

        const matchingDistricts = (region.districts || [])
          .map((dist: any) => {
            const matchDistrict =
              dist.name?.toLowerCase().includes(term) ||
              dist.code?.toLowerCase().includes(term);

            const matchingAssemblies = (dist.assemblies || []).filter(
              (ass: any) =>
                ass.name?.toLowerCase().includes(term) ||
                ass.code?.toLowerCase().includes(term) ||
                ass.city?.toLowerCase().includes(term) ||
                ass.head_pastor_name?.toLowerCase().includes(term)
            );

            if (matchDistrict || matchingAssemblies.length > 0) {
              return {
                ...dist,
                assemblies: matchDistrict ? dist.assemblies : matchingAssemblies,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (matchRegion || matchingDistricts.length > 0) {
          return {
            ...region,
            districts: matchRegion ? region.districts : matchingDistricts,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [hierarchyTree, treeSearchTerm]);

  // Filtered assemblies for table view
  const filteredAssemblies = useMemo(() => {
    return assemblies.filter((a) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.name?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.address?.toLowerCase().includes(q) ||
        a.district_name?.toLowerCase().includes(q) ||
        a.region_name?.toLowerCase().includes(q) ||
        a.code?.toLowerCase().includes(q) ||
        a.head_pastor_name?.toLowerCase().includes(q);

      const matchRegion =
        selectedRegionFilter === "all" ||
        a.region_id === selectedRegionFilter ||
        a.region_name === selectedRegionFilter;

      const matchStatus =
        selectedStatusFilter === "all" ||
        a.status === selectedStatusFilter;

      return matchSearch && matchRegion && matchStatus;
    });
  }, [assemblies, searchTerm, selectedRegionFilter, selectedStatusFilter]);

  // Map items formatted for AssembliesMap
  const mapAssemblies = useMemo<AssemblyMapItem[]>(() => {
    return assemblies.map((a) => {
      let lat = Number(a.latitude);
      let lng = Number(a.longitude);

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const cityKey = (a.city || "").toLowerCase().trim();
        const fallback = CITY_COORDS[cityKey] || [3.848, 11.5021];
        lat = fallback[0];
        lng = fallback[1];
      }

      return {
        id: a.id,
        name: a.name,
        city: a.city || "Cameroun",
        district: a.district_name || "District",
        pastor: a.head_pastor_name || "Pasteur Titulaire",
        phone: a.phone || a.contact_phone || "+237 6 -- -- -- --",
        address: a.address || a.city || "Assemblée Locale",
        members: a.members_count || 0,
        services: Array.isArray(a.worship_schedule)
          ? a.worship_schedule.map((s: any) => `${s.day} : ${s.time} (${s.type || "Culte"})`)
          : ["Dimanche : 08h30 - 11h30"],
        type: a.status === "active" ? "active" : "pioneer",
        lat,
        lng,
      };
    });
  }, [assemblies]);

  // Export handlers
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(assemblies, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assemblees_mpec_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ["ID", "Code", "Nom", "Ville", "Région", "District", "Pasteur", "Membres", "Statut"];
    const rows = assemblies.map((a) => [
      a.id,
      a.code || "",
      `"${a.name || ""}"`,
      `"${a.city || ""}"`,
      `"${a.region_name || ""}"`,
      `"${a.district_name || ""}"`,
      `"${a.head_pastor_name || ""}"`,
      a.members_count || 0,
      a.status || "active",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assemblees_mpec_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // HANDLERS: REGIONS CRUD
  // -------------------------------------------------------------
  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionForm.name.trim() || !regionForm.code.trim()) {
      setFeedback({ type: "error", message: "Le nom et le code de la région sont obligatoires." });
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.organizations.createRegion({
        name: regionForm.name.trim(),
        code: regionForm.code.trim().toUpperCase(),
        description: regionForm.description.trim() || undefined,
        zone_description: regionForm.zone_description.trim() || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la création de la région." });
      } else {
        setFeedback({ type: "success", message: `La région « ${regionForm.name} » a été créée avec succès.` });
        setCreateRegionModalOpen(false);
        setRegionForm({ name: "", code: "", description: "", zone_description: "" });
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRegionModalData) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.updateRegion(editRegionModalData.id, {
        name: editRegionModalData.name,
        description: editRegionModalData.description || undefined,
        zone_description: editRegionModalData.zone_description || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la mise à jour de la région." });
      } else {
        setFeedback({ type: "success", message: `La région « ${editRegionModalData.name} » a été modifiée.` });
        setEditRegionModalData(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteRegion = async () => {
    if (!deleteRegionTarget) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.deleteRegion(deleteRegionTarget.id);
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Impossible de supprimer cette région." });
      } else {
        setFeedback({ type: "success", message: `La région « ${deleteRegionTarget.name} » a été supprimée.` });
        setDeleteRegionTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la suppression." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: DISTRICTS CRUD
  // -------------------------------------------------------------
  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtForm.name.trim() || !districtForm.code.trim() || !districtForm.region_id) {
      setFeedback({ type: "error", message: "Le nom, le code et la région de rattachement sont obligatoires." });
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.organizations.createDistrict({
        name: districtForm.name.trim(),
        code: districtForm.code.trim().toUpperCase(),
        region_id: districtForm.region_id,
        description: districtForm.description.trim() || undefined,
        zone_description: districtForm.zone_description.trim() || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la création du district." });
      } else {
        setFeedback({ type: "success", message: `District « ${districtForm.name} » créé avec succès.` });
        setCreateDistrictModalOpen(false);
        setDistrictForm({ name: "", code: "", region_id: "", description: "", zone_description: "" });
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDistrictModalData) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.updateDistrict(editDistrictModalData.id, {
        name: editDistrictModalData.name,
        description: editDistrictModalData.description || undefined,
        zone_description: editDistrictModalData.zone_description || undefined,
        region_id: editDistrictModalData.region_id || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur mise à jour district." });
      } else {
        setFeedback({ type: "success", message: `District « ${editDistrictModalData.name} » mis à jour.` });
        setEditDistrictModalData(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteDistrict = async () => {
    if (!deleteDistrictTarget) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.deleteDistrict(deleteDistrictTarget.id);
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Impossible de supprimer ce district." });
      } else {
        setFeedback({ type: "success", message: `District « ${deleteDistrictTarget.name} » supprimé.` });
        setDeleteDistrictTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la suppression." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: ASSEMBLIES CRUD
  // -------------------------------------------------------------
  const handleCreateAssembly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assemblyForm.name.trim() || !assemblyForm.code.trim() || !assemblyForm.district_id) {
      setFeedback({ type: "error", message: "Nom, code et district pastoral requis pour créer l'assemblée." });
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.organizations.createAssembly({
        name: assemblyForm.name.trim(),
        code: assemblyForm.code.trim().toUpperCase(),
        district_id: assemblyForm.district_id,
        city: assemblyForm.city.trim() || undefined,
        address: assemblyForm.address.trim() || undefined,
        status: assemblyForm.status || "active",
        phone: assemblyForm.phone.trim() || undefined,
        email: assemblyForm.email.trim() || undefined,
        latitude: assemblyForm.latitude ? Number(assemblyForm.latitude) : undefined,
        longitude: assemblyForm.longitude ? Number(assemblyForm.longitude) : undefined,
        description: assemblyForm.description.trim() || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la création de l'assemblée." });
      } else {
        setFeedback({ type: "success", message: `L'assemblée « ${assemblyForm.name} » a été enregistrée avec succès.` });
        setCreateAssemblyModalOpen(false);
        setAssemblyForm({
          name: "",
          code: "",
          region_id: "",
          district_id: "",
          city: "Yaoundé",
          address: "",
          status: "active",
          phone: "",
          email: "",
          latitude: 3.848,
          longitude: 11.5021,
          description: "",
        });
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateAssembly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssemblyModalData) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.updateAssembly(editAssemblyModalData.id, {
        name: editAssemblyModalData.name,
        city: editAssemblyModalData.city,
        address: editAssemblyModalData.address,
        status: editAssemblyModalData.status,
        phone: editAssemblyModalData.phone || editAssemblyModalData.contact_phone,
        email: editAssemblyModalData.email,
        latitude: editAssemblyModalData.latitude ? Number(editAssemblyModalData.latitude) : undefined,
        longitude: editAssemblyModalData.longitude ? Number(editAssemblyModalData.longitude) : undefined,
        description: editAssemblyModalData.description,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur lors de la mise à jour." });
      } else {
        setFeedback({ type: "success", message: `L'assemblée « ${editAssemblyModalData.name} » a été mise à jour.` });
        setEditAssemblyModalData(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteAssembly = async () => {
    if (!deleteAssemblyTarget) return;
    setSubmittingAction(true);
    try {
      const res = await api.organizations.deleteAssembly(deleteAssemblyTarget.id);
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Impossible de supprimer cette assemblée." });
      } else {
        setFeedback({ type: "success", message: `L'assemblée « ${deleteAssemblyTarget.name} » a été supprimée.` });
        setDeleteAssemblyTarget(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la suppression." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: TRANSFER ASSEMBLY (MOVE BETWEEN DISTRICTS / REGIONS)
  // -------------------------------------------------------------
  const handleOpenTransferModal = (ass: any) => {
    setTransferAssemblyModalData(ass);
    setTransferForm({
      target_region_id: ass.region_id || "",
      to_district_id: ass.district_id || "",
      reason: "Mutation pastorale et redécoupage territorial",
    });
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAssemblyModalData || !transferForm.to_district_id) {
      setFeedback({ type: "error", message: "Veuillez sélectionner le nouveau district d'accueil." });
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.organizations.transferAssembly(transferAssemblyModalData.id, {
        to_district_id: transferForm.to_district_id,
        reason: transferForm.reason.trim() || "Réorganisation territoriale canonique",
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Échec du transfert d'assemblée." });
      } else {
        setFeedback({
          type: "success",
          message: `L'assemblée « ${transferAssemblyModalData.name} » a été transférée vers son nouveau district.`,
        });
        setTransferAssemblyModalData(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors du transfert." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: REPRESENTATIVES
  // -------------------------------------------------------------
  const handleOpenRepresentativesModal = async (ass: any) => {
    setRepresentativesModalData(ass);
    setLoadingReps(true);
    try {
      const res = await api.organizations.listRepresentatives(ass.id);
      const reps = res.data || [];
      setRepsList(Array.isArray(reps) ? reps : []);
    } catch (err) {
      console.error("Erreur chargement représentants:", err);
      setRepsList([]);
    } finally {
      setLoadingReps(false);
    }
  };

  const handleAddRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!representativesModalData || !repForm.user_id.trim()) {
      setFeedback({ type: "error", message: "Veuillez renseigner l'identifiant de l'utilisateur." });
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.organizations.addRepresentative(representativesModalData.id, {
        user_id: repForm.user_id.trim(),
        representative_type: repForm.representative_type,
        function_title: repForm.function_title.trim() || undefined,
        phone: repForm.phone.trim() || undefined,
        whatsapp: repForm.whatsapp.trim() || undefined,
        email: repForm.email.trim() || undefined,
      });
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Échec d'ajout du représentant." });
      } else {
        setFeedback({ type: "success", message: "Représentant officiel ajouté avec succès." });
        setRepForm({
          user_id: "",
          representative_type: "main_leader",
          function_title: "Pasteur Titulaire",
          phone: "",
          whatsapp: "",
          email: "",
        });
        // Reload reps
        const updated = await api.organizations.listRepresentatives(representativesModalData.id);
        if (updated.data) setRepsList(Array.isArray(updated.data) ? updated.data : []);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur réseau." });
    } finally {
      setSubmittingAction(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: UPLOAD EXCEL / CSV ASSEMBLIES
  // -------------------------------------------------------------
  const handleUploadExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setFeedback({ type: "error", message: "Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV." });
      return;
    }
    setUploadSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadRegionId) formData.append("region_id", uploadRegionId);
      if (uploadDistrictId) formData.append("district_id", uploadDistrictId);

      const res = await api.organizations.uploadAssembliesExcel(formData);
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Échec du téléversement du fichier." });
      } else {
        const count = (res.data as any)?.created_count || (res.data as any)?.assemblies?.length || "des";
        setFeedback({
          type: "success",
          message: `Importation réussie ! ${count} assemblée(s) créée(s) ou mises à jour.`,
        });
        setUploadExcelModalOpen(false);
        setUploadFile(null);
        await fetchData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de l'importation." });
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Districts filtered by selected region (for modal selectors)
  const availableDistrictsForCreate = useMemo(() => {
    if (!assemblyForm.region_id) return districts;
    return districts.filter((d) => d.region_id === assemblyForm.region_id);
  }, [districts, assemblyForm.region_id]);

  const availableDistrictsForTransfer = useMemo(() => {
    if (!transferForm.target_region_id) return districts;
    return districts.filter((d) => d.region_id === transferForm.target_region_id);
  }, [districts, transferForm.target_region_id]);

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
            <span className="text-primary font-bold">Régions, Districts & Assemblées</span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Nouvelle Région (N7 - Bureau National+) */}
            <Can minRole={RoleLevel.NATIONAL_BUREAU} permission="organizations:create_region">
              <button
                type="button"
                onClick={() => {
                  setRegionForm({ name: "", code: "", description: "", zone_description: "" });
                  setCreateRegionModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Plus />
                <span>+ Région</span>
              </button>
            </Can>

            {/* Bouton Nouveau District (N6 - Régional+) */}
            <Can minRole={RoleLevel.REGIONAL_LEADER} permission="organizations:create_district">
              <button
                type="button"
                onClick={() => {
                  setDistrictForm({
                    name: "",
                    code: "",
                    region_id: regions[0]?.id || "",
                    description: "",
                    zone_description: "",
                  });
                  setCreateDistrictModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Plus />
                <span>+ District</span>
              </button>
            </Can>

            {/* Bouton Nouvelle Assemblée (N5 - District+) */}
            <Can minRole={RoleLevel.DISTRICT_LEADER} permission="organizations:create_assembly">
              <button
                type="button"
                onClick={() => {
                  setAssemblyForm({
                    name: "",
                    code: "",
                    region_id: regions[0]?.id || "",
                    district_id: districts[0]?.id || "",
                    city: "Yaoundé",
                    address: "",
                    status: "active",
                    phone: "",
                    email: "",
                    latitude: 3.848,
                    longitude: 11.5021,
                    description: "",
                  });
                  setCreateAssemblyModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Icons.Plus />
                <span>+ Assemblée</span>
              </button>
            </Can>

            {/* Bouton Importer Excel (N6 - Régional+) */}
            <Can minRole={RoleLevel.REGIONAL_LEADER} permission="organizations:import_excel">
              <button
                type="button"
                onClick={() => {
                  setUploadFile(null);
                  setUploadExcelModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 border border-surface-container-high transition-colors cursor-pointer"
              >
                <Icons.Upload />
                <span>Importer Excel</span>
              </button>
            </Can>

            {/* Export CSV / JSON */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 border border-surface-container-high transition-colors cursor-pointer"
            >
              <Icons.Download />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 border border-surface-container-high transition-colors cursor-pointer"
            >
              <Icons.Download />
              <span>JSON</span>
            </button>
          </div>
        </div>

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
                <span>Hiérarchie Canonique MPEC (Niveaux 6 ➔ 5 ➔ 4)</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
                Arborescence & Gestion des Districts et Assemblées
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-3xl leading-relaxed">
                Supervision décentralisée des Régions ecclésiales, de leurs Districts pastoraux et de l'ensemble des Paroisses et Implantations de la Mission du Plein Évangile Cameroun.
              </p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center bg-surface-container rounded-2xl p-1 shrink-0 self-start md:self-auto border border-surface-container-high">
              <button
                type="button"
                onClick={() => setActiveView("tree")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeView === "tree"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Tree />
                <span>Arborescence</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("table")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeView === "table"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Table />
                <span>Annuaire</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("map")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeView === "map"
                    ? "bg-primary-container text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icons.Map />
                <span>Carte</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPI Territorial Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <Icons.Region />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Régions Écclésiales</span>
              <span className="text-2xl font-black text-on-surface">
                {stats?.total_regions || regions.length || 10}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Icons.District />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Districts Pastoraux</span>
              <span className="text-2xl font-black text-purple-700">
                {stats?.total_districts || districts.length || 8}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Icons.Church />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Assemblées Locales</span>
              <span className="text-2xl font-black text-emerald-700">
                {stats?.total_assemblies || assemblies.length || 8}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Icons.Users />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block">Membres Inscrits</span>
              <span className="text-2xl font-black text-amber-800">
                {stats?.total_members || 21}
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Skeleton className="h-10 w-64 rounded-xl" />
              <div className="flex gap-2 w-full sm:w-auto">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-surface-container-lowest rounded-3xl border border-surface-container-high/60 p-6 space-y-4 shadow-xs animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-2xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-44 rounded-lg" />
                        <Skeleton className="h-3.5 w-32 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </div>
                  <div className="pl-6 space-y-3 border-l-2 border-surface-container-high/40 ml-4">
                    <div className="p-4 rounded-2xl bg-surface-container-low/60 flex items-center justify-between">
                      <Skeleton className="h-4 w-36 rounded" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low/60 flex items-center justify-between">
                      <Skeleton className="h-4 w-40 rounded" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        {/* VIEW 1: ARBORESCENCE HIÉRARCHIQUE (TREE VIEW) */}
        {/* ============================================================== */}
        {!loading && !error && activeView === "tree" && (
          <div className="space-y-4">
            {/* Guide & Filter Header */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-surface-container-high shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-2">
                    <span>Arborescence Nationale : Régions</span>
                    <span className="text-on-surface-variant">➔</span>
                    <span className="text-purple-700">Districts</span>
                    <span className="text-on-surface-variant">➔</span>
                    <span className="text-emerald-700">Paroisses & Assemblées</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Déployez ou gérez chaque niveau : créez des districts, ajoutez des paroisses, déplacez une assemblée ou modifiez les responsables.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const allR = new Set(hierarchyTree.map((r: any) => r.id));
                      const allD = new Set<string>();
                      hierarchyTree.forEach((r: any) => (r.districts || []).forEach((d: any) => allD.add(d.id)));
                      setExpandedRegions(allR);
                      setExpandedDistricts(allD);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary cursor-pointer transition-colors"
                  >
                    Tout déplier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedRegions(new Set());
                      setExpandedDistricts(new Set());
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
                  >
                    Tout replier
                  </button>
                </div>
              </div>

              {/* Quick Search inside Tree */}
              <div className="relative pt-1">
                <span className="absolute left-3.5 top-1/2 translate-y-0.5 text-on-surface-variant">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  value={treeSearchTerm}
                  onChange={(e) => setTreeSearchTerm(e.target.value)}
                  placeholder="Filtrer l'arborescence (rechercher une région, un district comme Tsinga, Bastos, Bépanda, ou une paroisse)..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none border border-surface-container-high focus:border-primary"
                />
              </div>
            </div>

            {/* Tree Accordion */}
            <div className="space-y-3">
              {filteredHierarchyTree.length > 0 ? (
                filteredHierarchyTree.map((region: any) => {
                  const isRegExp = expandedRegions.has(region.id);
                  const districtCount = region.districts?.length || 0;
                  let totalAssInRegion = 0;
                  (region.districts || []).forEach((d: any) => {
                    totalAssInRegion += (d.assemblies?.length || 0);
                  });

                  return (
                    <div
                      key={region.id}
                      className="rounded-2xl bg-surface-container-lowest border border-surface-container-high overflow-hidden shadow-xs transition-all"
                    >
                      {/* Region Header */}
                      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest hover:bg-surface-container-low/40 transition-colors">
                        <div
                          onClick={() => toggleRegion(region.id)}
                          className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer select-none flex-1"
                        >
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface shrink-0"
                          >
                            {isRegExp ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                          </button>
                          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0">
                            <Icons.Region />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-on-surface tracking-tight truncate">
                                {region.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md bg-surface-container font-mono text-[10px] font-bold text-on-surface-variant">
                                {region.code || "REG"}
                              </span>
                            </div>
                            <span className="text-xs text-on-surface-variant block mt-0.5">
                              {districtCount} {districtCount > 1 ? "Districts" : "District"} • {totalAssInRegion} {totalAssInRegion > 1 ? "Assemblées" : "Assemblée"}
                            </span>
                          </div>
                        </div>

                        {/* Region Actions */}
                        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                          {/* + Nouveau District */}
                          <button
                            type="button"
                            onClick={() => {
                              setDistrictForm({
                                name: "",
                                code: `DIST-${(region.code || "REG").replace("REG-", "")}-`,
                                region_id: region.id,
                                description: "",
                                zone_description: "",
                              });
                              setCreateDistrictModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-700 text-white hover:bg-purple-800 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Ajouter un nouveau district pastoral dans cette région"
                          >
                            <Icons.Plus />
                            <span>+ District</span>
                          </button>

                          {/* Modifier Région */}
                          <button
                            type="button"
                            onClick={() => setEditRegionModalData(region)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Icons.Edit />
                            <span>Modifier</span>
                          </button>

                          {/* Supprimer Région */}
                          <button
                            type="button"
                            onClick={() => setDeleteRegionTarget(region)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer la région"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>

                      {/* Districts List */}
                      {isRegExp && (
                        <div className="border-t border-surface-container-high bg-slate-50/70 p-4 sm:p-6 space-y-3.5">
                          {districtCount > 0 ? (
                            region.districts.map((district: any) => {
                              const isDistExp = expandedDistricts.has(district.id);
                              const assList = district.assemblies || [];

                              return (
                                <div
                                  key={district.id}
                                  className="rounded-2xl bg-white border border-purple-200/80 shadow-xs overflow-hidden"
                                >
                                  {/* District Header */}
                                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/40 hover:bg-purple-50/80 transition-colors border-b border-purple-100/70">
                                    <div
                                      onClick={() => toggleDistrict(district.id)}
                                      className="flex items-center gap-3 cursor-pointer select-none flex-1"
                                    >
                                      <button
                                        type="button"
                                        className="w-6 h-6 rounded-md bg-white border border-purple-200 flex items-center justify-center text-purple-700 shrink-0 shadow-xs"
                                      >
                                        {isDistExp ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                                      </button>
                                      <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                        <Icons.District />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-sm text-purple-950">
                                            {district.name}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">
                                            {district.code || "DIST"}
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-purple-700 font-medium">
                                          District Pastoral • {assList.length} assemblée(s) rattachée(s)
                                        </span>
                                      </div>
                                    </div>

                                    {/* District Actions */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                                      {/* + Paroisse */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAssemblyForm({
                                            name: "",
                                            code: "",
                                            region_id: region.id,
                                            district_id: district.id,
                                            city: "Yaoundé",
                                            address: "",
                                            status: "active",
                                            phone: "",
                                            email: "",
                                            latitude: 3.848,
                                            longitude: 11.5021,
                                            description: "",
                                          });
                                          setCreateAssemblyModalOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                        title="Créer une paroisse dans ce district"
                                      >
                                        <Icons.Plus />
                                        <span>+ Paroisse</span>
                                      </button>

                                      {/* Modifier District */}
                                      <button
                                        type="button"
                                        onClick={() => setEditDistrictModalData(district)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Modifier ce district pastoral"
                                      >
                                        <Icons.Edit />
                                        <span>Modifier</span>
                                      </button>

                                      {/* Supprimer District */}
                                      <button
                                        type="button"
                                        onClick={() => setDeleteDistrictTarget(district)}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Supprimer ce district"
                                      >
                                        <Icons.Trash />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Assemblies inside District */}
                                  {isDistExp && (
                                    <div className="bg-white p-3 divide-y divide-slate-100">
                                      {assList.length > 0 ? (
                                        assList.map((ass: any) => (
                                          <div
                                            key={ass.id}
                                            className="py-3 px-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-emerald-50/30 rounded-xl transition-colors"
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                                <Icons.Church />
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-bold text-xs text-slate-900">
                                                    {ass.name}
                                                  </span>
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    {ass.status || "active"}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                                                  {ass.city && (
                                                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                                                      <Icons.Pin />
                                                      <span>{ass.city} {ass.address ? `(${ass.address})` : ""}</span>
                                                    </span>
                                                  )}
                                                  {ass.head_pastor_name && (
                                                    <span>Pasteur : <strong className="text-slate-900 font-semibold">{ass.head_pastor_name}</strong></span>
                                                  )}
                                                  {ass.members_count !== undefined && (
                                                    <span>• {ass.members_count} fidèles</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Action Buttons for Assembly */}
                                            <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedAssemblyModal(ass)}
                                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                                              >
                                                Fiche
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditAssemblyModalData(ass)}
                                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                                title="Modifier l'assemblée"
                                              >
                                                <Icons.Edit />
                                                <span>Modifier</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenTransferModal(ass)}
                                                className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs flex items-center gap-1 border border-purple-200 transition-colors cursor-pointer"
                                                title="Déplacer vers un autre district ou région"
                                              >
                                                <Icons.Transfer />
                                                <span>Déplacer</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenRepresentativesModal(ass)}
                                                className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                                                title="Gérer les représentants officiels"
                                              >
                                                <Icons.Shield />
                                                <span>Représentants</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDeleteAssemblyTarget(ass)}
                                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="Supprimer l'assemblée"
                                              >
                                                <Icons.Trash />
                                              </button>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-xs text-slate-400 py-3 px-3 italic">
                                          Aucune assemblée locale rattachée à ce district pour le moment. Cliquez sur « + Paroisse » pour en créer une.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 rounded-xl bg-white text-center text-xs text-slate-500 border border-slate-200/80">
                              Cette région ne compte pas encore de district pastoral. Cliquez sur <strong>« + District »</strong> ci-dessus pour en créer un.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface-variant italic">
                  Aucun élément ne correspond à votre recherche dans l'arborescence.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ANNUAIRE DES ASSEMBLÉES (TABLE VIEW) */}
        {/* ============================================================== */}
        {!loading && !error && activeView === "table" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search */}
                <div className="md:col-span-6 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Icons.Search />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par paroisse, ville, pasteur, quartier..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none border border-surface-container-high focus:border-primary"
                  />
                </div>

                {/* Filter Region */}
                <div className="md:col-span-3">
                  <select
                    value={selectedRegionFilter}
                    onChange={(e) => setSelectedRegionFilter(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value="all">Toutes les Régions ({regions.length})</option>
                    {regions.map((r: any) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="md:col-span-3">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface border border-surface-container-high focus:outline-none focus:border-primary"
                  >
                    <option value="all">Tous les Statuts</option>
                    <option value="active">Actives</option>
                    <option value="planting">En implantation</option>
                    <option value="suspended">Suspendues</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-surface-container-high">
                    <tr>
                      <th className="py-3 px-4">Paroisse / Assemblée</th>
                      <th className="py-3 px-4">Ville & Adresse</th>
                      <th className="py-3 px-4">Région & District</th>
                      <th className="py-3 px-4">Pasteur Titulaire</th>
                      <th className="py-3 px-4">Membres</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {filteredAssemblies.length > 0 ? (
                      filteredAssemblies.map((a: any) => (
                        <tr key={a.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-on-surface">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                                <Icons.Church />
                              </div>
                              <div>
                                <span className="block text-xs">{a.name}</span>
                                <span className="text-[10px] text-on-surface-variant font-mono">{a.code || "ASS"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface">
                            <span className="font-semibold block">{a.city || "Cameroun"}</span>
                            <span className="text-[11px] text-on-surface-variant">{a.address || "Centre-ville"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface">
                            <span className="font-semibold block">{a.region_name || "Région"}</span>
                            <span className="text-[11px] text-on-surface-variant">{a.district_name || "District"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface font-medium">
                            {a.head_pastor_name || "Pasteur Titulaire"}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-on-surface font-mono">
                            {a.members_count || 0}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              a.status === "active"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {a.status || "active"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedAssemblyModal(a)}
                                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Fiche
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditAssemblyModalData(a)}
                                className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Icons.Edit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenTransferModal(a)}
                                className="p-1 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Déplacer"
                              >
                                <Icons.Transfer />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRepresentativesModal(a)}
                                className="p-1 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Représentants"
                              >
                                <Icons.Shield />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteAssemblyTarget(a)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-on-surface-variant italic">
                          Aucune assemblée ne correspond aux critères de recherche spécifiés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant">
                <span>
                  Affichage de <strong className="text-on-surface font-bold">{filteredAssemblies.length}</strong> sur <strong className="text-on-surface font-bold">{assemblies.length}</strong> assemblées
                </span>
                <span>Synchronisé avec le registre national MPEC</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: CARTE TERRITORIALE DU CAMEROUN (MAP VIEW) */}
        {/* ============================================================== */}
        {!loading && !error && activeView === "map" && (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-surface-container-high shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-surface-container">
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface">Carte Interactive des Paroisses du Cameroun</h3>
                  <p className="text-[11px] text-on-surface-variant">Localisation géospatiale des lieux de culte, temples centraux et implantations.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-xl bg-surface-container text-on-surface font-bold">
                    {mapAssemblies.length} Lieux répertoriés
                  </span>
                </div>
              </div>

              <div className="w-full h-[550px] rounded-2xl overflow-hidden border border-surface-container-high shadow-inner relative">
                <AssembliesMap
                  assemblies={mapAssemblies}
                  onSelectAssembly={(item) => {
                    const original = assemblies.find((a) => a.id === item.id) || item;
                    setSelectedAssemblyModal(original);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 1: FICHE DÉTAILLÉE D'ASSEMBLÉE */}
        {/* ============================================================== */}
        {selectedAssemblyModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4161a]/10 text-[#d4161a] flex items-center justify-center font-bold">
                    <Icons.Church />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {selectedAssemblyModal.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedAssemblyModal.code || "ASS-LOCAL"} • {selectedAssemblyModal.city || "Cameroun"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssemblyModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Région ecclésiale :</span>
                    <strong className="text-slate-900 font-bold">{selectedAssemblyModal.region_name || "Région du Centre"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">District pastoral :</span>
                    <strong className="text-slate-900 font-bold">{selectedAssemblyModal.district_name || "District Yaoundé"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Pasteur responsable :</span>
                    <strong className="text-slate-900 font-bold">{selectedAssemblyModal.head_pastor_name || "Pasteur Titulaire"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Adresse géographique :</span>
                    <span className="text-slate-800 font-semibold">{selectedAssemblyModal.address || selectedAssemblyModal.city || "Non spécifiée"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Téléphone de contact :</span>
                    <span className="text-slate-800 font-semibold">{selectedAssemblyModal.phone || selectedAssemblyModal.contact_phone || "Non renseigné"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Coordonnées GPS :</span>
                    <span className="text-slate-800 font-mono text-[11px]">
                      {selectedAssemblyModal.latitude ? `${selectedAssemblyModal.latitude}, ${selectedAssemblyModal.longitude}` : "Non géolocalisée"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Effectif des fidèles :</span>
                    <strong className="text-[#d4161a] font-bold">{selectedAssemblyModal.members_count || 0} membres actifs</strong>
                  </div>
                </div>

                {/* Worship Schedule */}
                <div>
                  <span className="font-bold text-slate-800 block mb-1.5">Horaires des Cultes & Réunions :</span>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    {Array.isArray(selectedAssemblyModal.worship_schedule) && selectedAssemblyModal.worship_schedule.length > 0 ? (
                      selectedAssemblyModal.worship_schedule.map((w: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px] py-0.5">
                          <span className="font-semibold text-slate-700">{w.day}</span>
                          <span className="text-slate-500">{w.time} ({w.type || "Culte"})</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Culte principal : Dimanche 08h30 - 11h30 • Étude biblique : Mercredi 17h30
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedAssemblyModal;
                    setSelectedAssemblyModal(null);
                    handleOpenTransferModal(target);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 border border-purple-200 cursor-pointer"
                >
                  <Icons.Transfer />
                  <span>Déplacer vers un autre district</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAssemblyModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: CRÉER UNE NOUVELLE RÉGION */}
        {/* ============================================================== */}
        {createRegionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <Icons.Region />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Créer une nouvelle Région
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rattachement ecclésiastique national (Niveau 6)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateRegionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleCreateRegion} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom de la Région *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Région de l'Est"
                    value={regionForm.name}
                    onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Code unique *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: REG-EST"
                    value={regionForm.code}
                    onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description pastorale
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bertoua, Batouri, Abong-Mbang..."
                    value={regionForm.description}
                    onChange={(e) => setRegionForm({ ...regionForm, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Périmètre géographique / Zone
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Détail des départements et communes couverts..."
                    value={regionForm.zone_description}
                    onChange={(e) => setRegionForm({ ...regionForm, zone_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateRegionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Création..." : "Enregistrer la Région"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: MODIFIER UNE RÉGION */}
        {/* ============================================================== */}
        {editRegionModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <Icons.Region />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Modifier la Région
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {editRegionModalData.code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRegionModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleUpdateRegion} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom de la Région
                  </label>
                  <input
                    type="text"
                    required
                    value={editRegionModalData.name || ""}
                    onChange={(e) => setEditRegionModalData({ ...editRegionModalData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editRegionModalData.description || ""}
                    onChange={(e) => setEditRegionModalData({ ...editRegionModalData, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Zone géographique
                  </label>
                  <textarea
                    rows={2}
                    value={editRegionModalData.zone_description || ""}
                    onChange={(e) => setEditRegionModalData({ ...editRegionModalData, zone_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRegionModalData(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Enregistrement..." : "Mettre à jour"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: CRÉER UN NOUVEAU DISTRICT */}
        {/* ============================================================== */}
        {createDistrictModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Icons.District />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Créer un District Pastoral
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Entité intermédiaire regroupant plusieurs assemblées locales
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateDistrictModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleCreateDistrict} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Région de tutelle *
                  </label>
                  <select
                    required
                    value={districtForm.region_id}
                    onChange={(e) => setDistrictForm({ ...districtForm, region_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  >
                    <option value="">Sélectionnez la région</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom du District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: District Yaoundé-Sud"
                    value={districtForm.name}
                    onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Code du District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DIST-YDE-SUD"
                    value={districtForm.code}
                    onChange={(e) => setDistrictForm({ ...districtForm, code: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description & Secteur
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Communes, arrondissements ou zones d'implantation..."
                    value={districtForm.zone_description}
                    onChange={(e) => setDistrictForm({ ...districtForm, zone_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateDistrictModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Création..." : "Enregistrer le District"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4 BIS: MODIFIER UN DISTRICT */}
        {/* ============================================================== */}
        {editDistrictModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Icons.District />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Modifier le District Pastoral
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {editDistrictModalData.code || "DIST"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDistrictModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleUpdateDistrict} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom du District *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDistrictModalData.name || ""}
                    onChange={(e) => setEditDistrictModalData({ ...editDistrictModalData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Région de tutelle
                  </label>
                  <select
                    value={editDistrictModalData.region_id || ""}
                    onChange={(e) => setEditDistrictModalData({ ...editDistrictModalData, region_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-semibold"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description pastorale
                  </label>
                  <input
                    type="text"
                    value={editDistrictModalData.description || ""}
                    onChange={(e) => setEditDistrictModalData({ ...editDistrictModalData, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Périmètre / Zone
                  </label>
                  <textarea
                    rows={2}
                    value={editDistrictModalData.zone_description || ""}
                    onChange={(e) => setEditDistrictModalData({ ...editDistrictModalData, zone_description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDistrictModalData(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Enregistrement..." : "Mettre à jour le District"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4 TER: SUPPRIMER UN DISTRICT */}
        {/* ============================================================== */}
        {deleteDistrictTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold mx-auto">
                <Icons.Alert />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-base text-slate-900">
                  Supprimer le District Pastoral ?
                </h3>
                <p className="text-xs text-slate-600">
                  Êtes-vous sûr de vouloir supprimer définitivement le district « <strong>{deleteDistrictTarget.name}</strong> » ? Ses assemblées devront être réaffectées.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteDistrictTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDistrict}
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submittingAction ? "Suppression..." : "Confirmer la suppression"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 5: CRÉER UNE NOUVELLE ASSEMBLÉE */}
        {/* ============================================================== */}
        {createAssemblyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Icons.Church />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Créer une Paroisse / Assemblée Locale
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rattachement à un district et géoréférencement GPS
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateAssemblyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleCreateAssembly} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Filtrer par Région
                    </label>
                    <select
                      value={assemblyForm.region_id}
                      onChange={(e) => {
                        const newRegId = e.target.value;
                        const matchingDist = districts.find((d) => d.region_id === newRegId);
                        setAssemblyForm({
                          ...assemblyForm,
                          region_id: newRegId,
                          district_id: matchingDist?.id || "",
                        });
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="">Toutes les régions</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      District de rattachement *
                    </label>
                    <select
                      required
                      value={assemblyForm.district_id}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, district_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-medium"
                    >
                      <option value="">Sélectionnez le district</option>
                      {availableDistrictsForCreate.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nom officiel de l'Assemblée *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Assemblée Béthel de Bepanda"
                      value={assemblyForm.name}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Code d'enregistrement *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ASS-DLA-010"
                      value={assemblyForm.code}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, code: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Douala"
                      value={assemblyForm.city}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, city: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Adresse géographique & Quartier
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carrefour Omnisports, face collège"
                      value={assemblyForm.address}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, address: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Statut
                    </label>
                    <select
                      value={assemblyForm.status}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="planting">En implantation</option>
                      <option value="suspended">Suspendue</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      placeholder="+237 6..."
                      value={assemblyForm.phone}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="contact@mpec.cm"
                      value={assemblyForm.email}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Latitude GPS (optionnelle)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="3.848"
                      value={assemblyForm.latitude}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, latitude: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Longitude GPS (optionnelle)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="11.502"
                      value={assemblyForm.longitude}
                      onChange={(e) => setAssemblyForm({ ...assemblyForm, longitude: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateAssemblyModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Enregistrement..." : "Créer l'Assemblée"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 6: MODIFIER UNE ASSEMBLÉE */}
        {/* ============================================================== */}
        {editAssemblyModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                    <Icons.Church />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Modifier l'Assemblée
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {editAssemblyModalData.code || "ASS"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditAssemblyModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleUpdateAssembly} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nom de l'Assemblée
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssemblyModalData.name || ""}
                    onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={editAssemblyModalData.city || ""}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, city: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Statut
                    </label>
                    <select
                      value={editAssemblyModalData.status || "active"}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="planting">En implantation</option>
                      <option value="suspended">Suspendue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Adresse géographique
                  </label>
                  <input
                    type="text"
                    value={editAssemblyModalData.address || ""}
                    onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, address: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={editAssemblyModalData.phone || editAssemblyModalData.contact_phone || ""}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editAssemblyModalData.email || ""}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Latitude GPS
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editAssemblyModalData.latitude || ""}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, latitude: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Longitude GPS
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editAssemblyModalData.longitude || ""}
                      onChange={(e) => setEditAssemblyModalData({ ...editAssemblyModalData, longitude: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAssemblyModalData(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Enregistrement..." : "Mettre à jour"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 7: TRANSFÉRER / DÉPLACER UNE ASSEMBLÉE */}
        {/* ============================================================== */}
        {transferAssemblyModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Icons.Transfer />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Mutation & Transfert d'Assemblée
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rattacher l'assemblée à un nouveau district ou région
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferAssemblyModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
                <span className="block font-bold">Assemblée sélectionnée :</span>
                <span className="font-black text-sm block">{transferAssemblyModalData.name}</span>
                <span className="text-[11px] text-purple-700 block">
                  Actuellement rattachée à : {transferAssemblyModalData.region_name || "Région"} ➔ {transferAssemblyModalData.district_name || "District"}
                </span>
              </div>

              <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nouvelle Région de destination
                  </label>
                  <select
                    value={transferForm.target_region_id}
                    onChange={(e) => {
                      const newReg = e.target.value;
                      const firstDist = districts.find((d) => d.region_id === newReg);
                      setTransferForm({
                        ...transferForm,
                        target_region_id: newReg,
                        to_district_id: firstDist?.id || "",
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  >
                    <option value="">Sélectionnez la région</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nouveau District pastoral d'accueil *
                  </label>
                  <select
                    required
                    value={transferForm.to_district_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_district_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-bold text-slate-900"
                  >
                    <option value="">Sélectionnez le nouveau district</option>
                    {availableDistrictsForTransfer.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Motif canonique du transfert
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={transferForm.reason}
                    onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                    placeholder="Ex: Réorganisation territoriale décidée par le Bureau National..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferAssemblyModalData(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <Icons.Transfer />
                    <span>{submittingAction ? "Transfert en cours..." : "Confirmer le transfert"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 8: REPRÉSENTANTS OFFICIELS D'ASSEMBLÉE */}
        {/* ============================================================== */}
        {representativesModalData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Icons.Shield />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Représentants de l'Assemblée
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {representativesModalData.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRepresentativesModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              {/* Existing Reps */}
              <div className="space-y-3">
                <span className="font-bold text-xs text-slate-800 block">
                  Responsables affectés :
                </span>
                {loadingReps ? (
                  <p className="text-xs text-slate-500 italic py-2">Chargement des représentants...</p>
                ) : repsList.length > 0 ? (
                  <div className="space-y-2">
                    {repsList.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {r.function_title || r.user_name || "Représentant officiel"}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Rôle : {r.representative_type === "main_leader" ? "Responsable Principal" : r.representative_type === "communicator" ? "Chargé de Communication" : "Représentant"}
                          </span>
                          {r.phone && <span className="text-[11px] text-slate-600 block">Tél : {r.phone}</span>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          Officiel
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                    Aucun représentant officiel n'est encore enregistré pour cette assemblée.
                  </p>
                )}
              </div>

              {/* Add New Rep */}
              <form onSubmit={handleAddRepresentative} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <span className="font-bold text-xs text-slate-800 block">
                  Affecter un nouveau représentant :
                </span>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ID Utilisateur (UUID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Coller l'ID du pasteur ou responsable..."
                    value={repForm.user_id}
                    onChange={(e) => setRepForm({ ...repForm, user_id: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Type de fonction
                    </label>
                    <select
                      value={repForm.representative_type}
                      onChange={(e) => setRepForm({ ...repForm, representative_type: e.target.value })}
                      className="w-full h-9 px-2 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="main_leader">Responsable Principal</option>
                      <option value="communicator">Chargé de Communication</option>
                      <option value="representative">Représentant</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Titre / Charge
                    </label>
                    <input
                      type="text"
                      placeholder="Pasteur Titulaire, Ancien..."
                      value={repForm.function_title}
                      onChange={(e) => setRepForm({ ...repForm, function_title: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      placeholder="+237 6..."
                      value={repForm.phone}
                      onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="pastor@mpec.cm"
                      value={repForm.email}
                      onChange={(e) => setRepForm({ ...repForm, email: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {submittingAction ? "Ajout..." : "Ajouter le Représentant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 9: UPLOAD EXCEL DES ASSEMBLÉES */}
        {/* ============================================================== */}
        {uploadExcelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Icons.Upload />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Importation en Masse des Assemblées
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Téléversement de fichier Excel (.xlsx, .xls) ou CSV
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadExcelModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <Icons.Close />
                </button>
              </div>

              <form onSubmit={handleUploadExcelSubmit} className="space-y-4 text-xs">
                {/* File input */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fichier Excel / CSV *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs"
                  />
                  {uploadFile && (
                    <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
                      Fichier sélectionné : {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} Ko)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Région par défaut (optionnel)
                    </label>
                    <select
                      value={uploadRegionId}
                      onChange={(e) => setUploadRegionId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="">Détecter depuis le fichier</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      District par défaut (optionnel)
                    </label>
                    <select
                      value={uploadDistrictId}
                      onChange={(e) => setUploadDistrictId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                    >
                      <option value="">Détecter depuis le fichier</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">Colonnes reconnues :</span>
                  <span>name (ou nom), code, city (ville), address (adresse), phone (téléphone), email, latitude, longitude.</span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadExcelModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploadSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <Icons.Upload />
                    <span>{uploadSubmitting ? "Importation..." : "Importer le fichier"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 10: CONFIRMATION SUPPRESSION ASSEMBLÉE */}
        {/* ============================================================== */}
        {deleteAssemblyTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold mx-auto">
                <Icons.Alert />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-base text-slate-900">
                  Supprimer l'assemblée ?
                </h3>
                <p className="text-xs text-slate-600">
                  Êtes-vous sûr de vouloir supprimer définitivement la paroisse « <strong>{deleteAssemblyTarget.name}</strong> » ? Cette action est irréversible.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteAssemblyTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAssembly}
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submittingAction ? "Suppression..." : "Confirmer la suppression"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 11: CONFIRMATION SUPPRESSION RÉGION */}
        {/* ============================================================== */}
        {deleteRegionTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold mx-auto">
                <Icons.Alert />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-base text-slate-900">
                  Supprimer la Région ?
                </h3>
                <p className="text-xs text-slate-600">
                  Êtes-vous sûr de vouloir supprimer la région « <strong>{deleteRegionTarget.name}</strong> » ? (Rôle Super Administrateur requis).
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteRegionTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRegion}
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submittingAction ? "Suppression..." : "Confirmer la suppression"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
