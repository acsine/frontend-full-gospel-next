"use client";

import React, { useState, useEffect } from "react";
import PortalShell from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface Role {
  id: string;
  code: string;
  name: string;
  level: string;
  description?: string;
  permissions?: string[];
  user_count?: number;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
}

interface GovernanceMember {
  id?: string;
  user_id: string;
  user_name?: string;
  email?: string;
  phone?: string;
  role_code: string;
  role_name?: string;
  function_title?: string;
  scope_type: string;
  scope_id?: string | null;
  start_date?: string;
}

const MODULE_TRANSLATIONS: Record<string, { label: string; icon: string; color: string }> = {
  organizations: { label: "Organisation & Territoire", icon: "account_tree", color: "from-blue-600 to-indigo-700" },
  departments: { label: "Départements & Ministères", icon: "diversity_3", color: "from-teal-600 to-emerald-700" },
  members: { label: "Membres & Fidèles", icon: "groups", color: "from-purple-600 to-pink-700" },
  reports: { label: "Rapports Pastoraux", icon: "assignment", color: "from-amber-600 to-orange-700" },
  events: { label: "Événements & Cultes", icon: "calendar_month", color: "from-rose-600 to-red-700" },
  finance: { label: "Finances & Dîmes", icon: "payments", color: "from-emerald-600 to-green-700" },
  publications: { label: "Publications & Médias", icon: "menu_book", color: "from-cyan-600 to-blue-700" },
  donations: { label: "Dons & Solidarité", icon: "volunteer_activism", color: "from-violet-600 to-purple-700" },
  admin: { label: "Administration Système", icon: "admin_panel_settings", color: "from-slate-700 to-slate-900" },
};

export default function RolesAndPermissionsPage() {
  const { confirm, alert } = useConfirm();
  const [activeTab, setActiveTab] = useState<"roles" | "governance">("roles");

  // Roles & Permissions state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermMap, setRolePermMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingPerms, setSavingPerms] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal Create Role
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLevel, setNewRoleLevel] = useState("N2");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  // Governance Boards state
  const [scopeType, setScopeType] = useState<"national" | "region" | "district" | "assembly">("national");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<GovernanceMember[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // Modal Assign Board Member
  const [showAssignBoardModal, setShowAssignBoardModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleCode, setAssignRoleCode] = useState("");
  const [assignFunctionTitle, setAssignFunctionTitle] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assigningBoard, setAssigningBoard] = useState(false);

  // Initial data loading
  useEffect(() => {
    loadRolesAndPermissions();
    loadTerritories();
  }, []);

  const loadRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.admin.listRoles(),
        api.admin.listPermissions(),
      ]);

      const rList = Array.isArray(rolesRes.data)
        ? rolesRes.data
        : (rolesRes.data as any)?.items || [];
      const pList = Array.isArray(permsRes.data)
        ? permsRes.data
        : (permsRes.data as any)?.items || [];

      setRoles(rList);
      setPermissions(pList);

      if (rList.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rList[0].id);
      }

      // Initialize permissions mapping for all roles
      const mapping: Record<string, string[]> = {};
      rList.forEach((r: any) => {
        mapping[r.id] = (r.permissions || []).map((p: any) =>
          typeof p === "string" ? p : p.code
        );
      });
      setRolePermMap(mapping);
    } catch (err) {
      console.error("Erreur chargement RBAC:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTerritories = async () => {
    try {
      const [regRes, distRes, assRes, usersRes] = await Promise.all([
        api.organizations.listRegions(),
        api.organizations.listDistricts(),
        api.organizations.listAssemblies(),
        api.admin.listUsers({ is_active: true }),
      ]);

      const regs = Array.isArray(regRes.data) ? regRes.data : (regRes.data as any)?.items || [];
      const dists = Array.isArray(distRes.data) ? distRes.data : (distRes.data as any)?.items || [];
      const asses = Array.isArray(assRes.data) ? assRes.data : (assRes.data as any)?.items || [];
      const usrs = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data as any)?.items || [];

      setRegions(regs);
      setDistricts(dists);
      setAssemblies(asses);
      setUsersList(usrs);
    } catch (err) {
      console.warn("Erreur chargement territoires:", err);
    }
  };

  // Load governance board when scope or entity changes
  useEffect(() => {
    if (activeTab === "governance") {
      fetchGovernanceBoard();
    }
  }, [activeTab, scopeType, selectedEntityId]);

  const fetchGovernanceBoard = async () => {
    setLoadingBoard(true);
    try {
      const entityId = scopeType === "national" ? undefined : selectedEntityId || undefined;
      const res = await api.admin.getGovernanceBoard(scopeType, entityId);
      const members = (res.data as any)?.members || (Array.isArray(res.data) ? res.data : []);
      setBoardMembers(members);
    } catch (err) {
      console.error("Erreur chargement bureau gouvernance:", err);
      setBoardMembers([]);
    } finally {
      setLoadingBoard(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.code?.toLowerCase() === "super_admin" || selectedRole?.level === "N8";

  const handleTogglePermission = (permCode: string) => {
    if (!selectedRoleId || isSuperAdmin) return;
    setRolePermMap((prev) => {
      const currentList = prev[selectedRoleId] || [];
      const hasPerm = currentList.includes(permCode);
      const nextList = hasPerm
        ? currentList.filter((c) => c !== permCode)
        : [...currentList, permCode];
      return { ...prev, [selectedRoleId]: nextList };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId || isSuperAdmin) return;
    setSavingPerms(true);
    setFeedback(null);
    try {
      const permsToSave = rolePermMap[selectedRoleId] || [];
      const res = await api.admin.setRolePermissions(selectedRoleId, permsToSave);
      if (res.error) {
        setFeedback({ type: "error", message: res.message || "Erreur de mise à jour des permissions." });
      } else {
        setFeedback({ type: "success", message: `Permissions du rôle « ${selectedRole?.name} » synchronisées avec succès !` });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erreur réseau." });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode.trim() || !newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await api.admin.createRole({
        code: newRoleCode.trim().toUpperCase(),
        name: newRoleName.trim(),
        level: newRoleLevel,
        description: newRoleDesc.trim() || undefined,
        permission_codes: [],
      });
      if (res.error) {
        await alert({
          title: "Échec de création",
          message: res.message || "Impossible de créer le rôle système.",
          variant: "danger",
        });
      } else {
        setShowCreateRoleModal(false);
        setNewRoleCode("");
        setNewRoleName("");
        setNewRoleDesc("");
        await loadRolesAndPermissions();
        if (res.data?.id) setSelectedRoleId(res.data.id);
      }
    } catch (err: any) {
      await alert({
        title: "Erreur serveur",
        message: err?.message || "Une erreur est survenue lors de la communication avec le serveur.",
        variant: "danger",
      });
    } finally {
      setCreatingRole(false);
    }
  };

  const handleAssignBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignRoleCode) return;
    setAssigningBoard(true);
    try {
      const entityId = scopeType === "national" ? undefined : selectedEntityId || undefined;
      const res = await api.admin.assignGovernanceBoardMember({
        user_id: assignUserId,
        role_code: assignRoleCode,
        function_title: assignFunctionTitle.trim() || undefined,
        scope_type: scopeType,
        scope_id: entityId,
        start_date: assignStartDate || undefined,
      });
      if (res.error) {
        await alert({
          title: "Erreur de nomination",
          message: res.message || "Impossible de désigner ce responsable au bureau de gouvernance.",
          variant: "danger",
        });
      } else {
        setShowAssignBoardModal(false);
        setAssignUserId("");
        setAssignFunctionTitle("");
        await fetchGovernanceBoard();
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    } finally {
      setAssigningBoard(false);
    }
  };

  const handleRevokeBoardMember = async (m: GovernanceMember) => {
    const ok = await confirm({
      title: "Révocation de mandat",
      message: `Confirmez-vous la révocation du mandat de ${m.user_name || m.email || "ce responsable"} au sein du bureau de gouvernance ?`,
      confirmText: "Révoquer le mandat",
      cancelText: "Annuler",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await api.admin.revokeGovernanceBoardMember({
        user_id: m.user_id,
        role_code: m.role_code,
        scope_type: m.scope_type,
        scope_id: m.scope_id || undefined,
        reason: "Fin de mandat ou réorganisation ecclésiale",
      });
      if (res.error) {
        await alert({
          title: "Échec de révocation",
          message: res.message || "Impossible de révoquer ce mandat.",
          variant: "danger",
        });
      } else {
        await fetchGovernanceBoard();
      }
    } catch (err: any) {
      await alert({
        title: "Erreur réseau",
        message: err?.message || "Erreur de connexion au serveur.",
        variant: "danger",
      });
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, p) => {
    const mod = p.module || "autres";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getLevelBadge = (level: string) => {
    const l = level?.toUpperCase() || "N1";
    if (l === "N8") return "bg-red-500/10 text-red-700 border-red-500/30";
    if (l === "N7") return "bg-purple-500/10 text-purple-700 border-purple-500/30";
    if (l === "N6") return "bg-indigo-500/10 text-indigo-700 border-indigo-500/30";
    if (l === "N5") return "bg-blue-500/10 text-blue-700 border-blue-500/30";
    if (l === "N4") return "bg-teal-500/10 text-teal-700 border-teal-500/30";
    return "bg-slate-500/10 text-slate-700 border-slate-500/30";
  };

  return (
    <PortalShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-surface-container-high/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span>Gouvernance, Rôles & Permissions Dynamiques</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Moteur RBAC unitaire, catalogues de permissions et gestion des bureaux aux 4 échelons de la Mission
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-surface-container-high/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "roles"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Matrice RBAC (Rôles & Droits)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("governance")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "governance"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Bureaux de Gouvernance (4 Échelons)
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: RÔLES & PERMISSIONS DYNAMIQUES (RBAC) */}
        {/* ============================================================== */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            {/* Super Admin Rule Banner */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-primary uppercase tracking-wide">
                  Règle d'Or Super Administrateur (SUPER_ADMIN / Niveau N8)
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Le <strong>Super Administrateur</strong> possède automatiquement et inconditionnellement l'intégralité des permissions du système. Toutes les vérifications de droits et de périmètres territoriaux sont contournées avec succès pour le niveau N8.
                </p>
              </div>
            </div>

            {/* Main Roles Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Roles list */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Rôles Système Définis ({roles.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoleModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>+</span>
                    <span>Nouveau Rôle</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-2 custom-scrollbar">
                  {loading && (
                    <div className="p-8 text-center text-xs text-on-surface-variant">
                      Chargement des rôles...
                    </div>
                  )}

                  {!loading &&
                    roles.map((r) => {
                      const isSelected = r.id === selectedRoleId;
                      const isSuper = r.code?.toLowerCase() === "super_admin" || r.level === "N8";
                      const permsCount = isSuper
                        ? permissions.length
                        : (rolePermMap[r.id] || []).length;

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoleId(r.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-surface-container-lowest border-primary shadow-md ring-2 ring-primary/20"
                              : "bg-surface-container-lowest/80 border-surface-container-high/60 hover:border-surface-container-highest hover:bg-surface-container-lowest"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-sm text-on-surface leading-tight">
                              {r.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[11px] font-extrabold font-mono ${getLevelBadge(
                                r.level
                              )}`}
                            >
                              {r.level || "N1"}
                            </span>
                          </div>

                          <p className="text-[11px] font-mono text-on-surface-variant mt-1">
                            CODE: <span className="font-bold text-primary">{r.code}</span>
                          </p>

                          {r.description && (
                            <p className="text-xs text-on-surface-variant/90 mt-2 line-clamp-2">
                              {r.description}
                            </p>
                          )}

                          <div className="mt-3 pt-2.5 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                            <span>
                              {isSuper ? (
                                <span className="text-red-600 font-bold">Permissions illimitées</span>
                              ) : (
                                <span><strong>{permsCount}</strong> permission(s) active(s)</span>
                              )}
                            </span>
                            <span className="font-semibold text-primary">Configurer &rarr;</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Permission Matrix for selected role */}
              <div className="lg:col-span-8 space-y-4">
                {selectedRole ? (
                  <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-container-high/60 flex flex-col max-h-[720px]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-container-high/60 shrink-0 mb-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl font-black text-on-surface">
                            {selectedRole.name}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold font-mono ${getLevelBadge(
                              selectedRole.level
                            )}`}
                          >
                            Niveau {selectedRole.level}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Code rôle: <code className="font-bold text-primary font-mono">{selectedRole.code}</code> — {selectedRole.description || "Aucune description renseignée."}
                        </p>
                      </div>

                      {!isSuperAdmin && (
                        <button
                          type="button"
                          onClick={handleSavePermissions}
                          disabled={savingPerms}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {savingPerms ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <span>Enregistrer les Permissions</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Feedback Alert */}
                    {feedback && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 mb-4 ${
                          feedback.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <span>{feedback.message}</span>
                      </div>
                    )}

                    {/* Elements Scrollable Container with custom visible scrollbar */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                      {isSuperAdmin ? (
                        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                          <h4 className="font-extrabold text-amber-900 text-sm">
                            Permissions Absolues Accordées Automatiquement
                          </h4>
                          <p className="text-xs text-amber-800 max-w-lg mx-auto">
                            En tant que Super Administrateur (N8), ce rôle bénéficie de toutes les permissions actuelles et futures créées dans l'application. Aucune modification manuelle n'est requise.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {Object.entries(permissionsByModule).map(([moduleKey, perms]) => {
                            const conf = MODULE_TRANSLATIONS[moduleKey] || {
                              label: moduleKey.toUpperCase(),
                              icon: "folder",
                              color: "from-slate-700 to-slate-900",
                            };
                            const selectedPerms = rolePermMap[selectedRoleId || ""] || [];

                            return (
                              <div
                                key={moduleKey}
                                className="rounded-2xl border border-surface-container-high/60 overflow-hidden bg-surface-container-lowest"
                              >
                                <div className="px-4 py-3 bg-surface-container/60 border-b border-surface-container-high/60 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-on-surface uppercase tracking-wide">
                                      {conf.label}
                                    </span>
                                    <span className="text-[11px] text-on-surface-variant font-mono">
                                      ({perms.filter((p) => selectedPerms.includes(p.code)).length} / {perms.length})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allModuleCodes = perms.map((p) => p.code);
                                        setRolePermMap((prev) => ({
                                          ...prev,
                                          [selectedRoleId!]: Array.from(new Set([...(prev[selectedRoleId!] || []), ...allModuleCodes])),
                                        }));
                                      }}
                                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                    >
                                      Tout cocher
                                    </button>
                                    <span className="text-on-surface-variant/40">•</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allModuleCodes = new Set(perms.map((p) => p.code));
                                        setRolePermMap((prev) => ({
                                          ...prev,
                                          [selectedRoleId!]: (prev[selectedRoleId!] || []).filter((c) => !allModuleCodes.has(c)),
                                        }));
                                      }}
                                      className="text-[11px] font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                                    >
                                      Décocher
                                    </button>
                                  </div>
                                </div>

                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {perms.map((p) => {
                                    const checked = selectedPerms.includes(p.code);
                                    return (
                                      <label
                                        key={p.code}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                          checked
                                            ? "bg-primary/5 border-primary/40 text-on-surface"
                                            : "bg-surface-container-low/50 border-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-low"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => handleTogglePermission(p.code)}
                                          className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer shrink-0"
                                        />
                                        <div className="space-y-0.5 min-w-0">
                                          <div className="font-bold text-xs text-on-surface flex items-center gap-1.5 flex-wrap">
                                            <span>{p.name}</span>
                                          </div>
                                          <div className="text-[10px] font-mono text-primary truncate">
                                            {p.code}
                                          </div>
                                          {p.description && (
                                            <p className="text-[11px] text-on-surface-variant/90 line-clamp-2">
                                              {p.description}
                                            </p>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-on-surface-variant rounded-2xl bg-surface-container-lowest border border-dashed border-surface-container-highest">
                    Sélectionnez un rôle à gauche pour afficher et éditer ses permissions.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BUREAUX DE GOUVERNANCE (4 ÉCHELONS) */}
        {/* ============================================================== */}
        {activeTab === "governance" && (
          <div className="space-y-6">
            {/* 4 Echelons Navigation Header */}
            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-container-high/60 space-y-4">
              <h2 className="text-base font-extrabold text-on-surface">
                Sélection de l'Échelon Territorial de Gouvernance
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: "national", label: "Bureau Exécutif National", sub: "Échelon National", icon: "church" },
                  { key: "region", label: "Bureau Régional", sub: "Région Ecclésiastique", icon: "domain" },
                  { key: "district", label: "Bureau du District", sub: "District Pastoral", icon: "folder_shared" },
                  { key: "assembly", label: "Bureau de l'Assemblée", sub: "Paroisse Locale", icon: "home_work" },
                ].map((ech) => {
                  const isCur = scopeType === ech.key;
                  return (
                    <button
                      key={ech.key}
                      type="button"
                      onClick={() => {
                        setScopeType(ech.key as any);
                        setSelectedEntityId("");
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isCur
                          ? "bg-primary text-on-primary border-primary shadow-md"
                          : "bg-surface-container-lowest border-surface-container-high/80 hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">
                        {ech.sub}
                      </div>
                      <div className="font-extrabold text-sm sm:text-base mt-1">
                        {ech.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Entity Picker if not national */}
              {scopeType !== "national" && (
                <div className="pt-3 border-t border-surface-container-high/60 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs font-bold text-on-surface-variant shrink-0">
                    {scopeType === "region" && "Choisir la Région :"}
                    {scopeType === "district" && "Choisir le District :"}
                    {scopeType === "assembly" && "Choisir l'Assemblée locale :"}
                  </span>

                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="flex-1 max-w-md h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  >
                    <option value="">-- Sélectionner une entité --</option>
                    {scopeType === "region" &&
                      regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code || "REG"})
                        </option>
                      ))}
                    {scopeType === "district" &&
                      districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.region_name ? `• ${d.region_name}` : ""}
                        </option>
                      ))}
                    {scopeType === "assembly" &&
                      assemblies.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.city || "Cameroun"})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Board Members Table Card */}
            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-container-high/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-on-surface">
                    Composition Officielle du Bureau (
                    {scopeType === "national"
                      ? "Direction Nationale"
                      : scopeType === "region"
                      ? "Supervision Régionale"
                      : scopeType === "district"
                      ? "District Pastoral"
                      : "Paroisse Locale"}
                    )
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {boardMembers.length} responsable(s) nommé(s) avec mandats actifs
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAssignBoardModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
                >
                  <span>+</span>
                  <span>Nommer un Responsable au Bureau</span>
                </button>
              </div>

              {loadingBoard ? (
                <div className="p-12 text-center text-xs text-on-surface-variant">
                  Chargement de la composition du bureau...
                </div>
              ) : boardMembers.length === 0 ? (
                <div className="p-12 text-center text-xs text-on-surface-variant bg-surface-container/30 rounded-2xl border border-dashed border-surface-container-highest">
                  Aucun membre n'a encore été nommé dans ce bureau. Cliquez sur « Nommer un Responsable au Bureau » pour désigner les titulaires des charges (Pasteur, Superviseur, Trésorier, Secrétaire, etc.).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-surface-container-high text-on-surface-variant font-bold uppercase text-[11px]">
                        <th className="py-3 px-3">Responsable</th>
                        <th className="py-3 px-3">Charge Officielle</th>
                        <th className="py-3 px-3">Rôle RBAC</th>
                        <th className="py-3 px-3">Prise de fonction</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/50">
                      {boardMembers.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="font-extrabold text-on-surface">
                              {m.user_name || "Nom non renseigné"}
                            </div>
                            <div className="text-[11px] text-on-surface-variant font-mono">
                              {m.email || m.phone || `ID: ${m.user_id?.slice(0, 8)}`}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-lg bg-surface-container font-bold text-on-surface text-[11px]">
                              {m.function_title || "Membre du bureau"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-primary font-bold">
                              {m.role_code}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-on-surface-variant">
                            {m.start_date ? new Date(m.start_date).toLocaleDateString("fr-FR") : "Actif"}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRevokeBoardMember(m)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold border border-rose-200 transition-colors"
                            >
                              Révoquer mandat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: CRÉER UN NOUVEAU RÔLE DYNAMIQUE */}
        {/* ============================================================== */}
        {showCreateRoleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 className="font-black text-base text-on-surface">
                  Créer un Rôle Dynamique
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Code Unique du Rôle * (ex: DEPT_TREASURER, DISTRICT_ELDER)
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                    placeholder="PASTOR_ASSOCIATE"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-mono font-bold text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Nom Officiel * (ex: Pasteur Associé, Trésorier de District)
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Pasteur Associé"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Niveau Hiérarchique (N0 à N7)
                  </label>
                  <select
                    value={newRoleLevel}
                    onChange={(e) => setNewRoleLevel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                  >
                    <option value="N1">N1 - Fidèle / Membre d'assemblée</option>
                    <option value="N2">N2 - Responsable de département / Bureau interne</option>
                    <option value="N3">N3 - Chargé de communication & liturgie</option>
                    <option value="N4">N4 - Responsable / Pasteur d'assemblée</option>
                    <option value="N5">N5 - Responsable / Superviseur de district</option>
                    <option value="N6">N6 - Responsable régional</option>
                    <option value="N7">N7 - Bureau national</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Description de la charge
                  </label>
                  <textarea
                    rows={3}
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Missions et responsabilités associées à ce rôle..."
                    className="w-full p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateRoleModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRole}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creatingRole ? "Création..." : "Créer le rôle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL: NOMMER UN RESPONSABLE AU BUREAU DE GOUVERNANCE */}
        {/* ============================================================== */}
        {showAssignBoardModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 className="font-black text-base text-on-surface">
                  Nommer un Responsable au Bureau
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAssignBoardModal(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignBoardMember} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Utilisateur à désigner *
                  </label>
                  <select
                    required
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  >
                    <option value="">-- Choisir un utilisateur --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email || u.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Rôle RBAC associé *
                  </label>
                  <select
                    required
                    value={assignRoleCode}
                    onChange={(e) => setAssignRoleCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                  >
                    <option value="">-- Sélectionner un rôle --</option>
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code}) - {r.level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Titre officiel de la fonction (ex: Pasteur titulaire, Trésorier général, Secrétaire)
                  </label>
                  <input
                    type="text"
                    value={assignFunctionTitle}
                    onChange={(e) => setAssignFunctionTitle(e.target.value)}
                    placeholder="Pasteur Titulaire"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Date de prise de fonction
                  </label>
                  <input
                    type="date"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
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
                    disabled={assigningBoard}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {assigningBoard ? "Enregistrement..." : "Confirmer la nomination"}
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

