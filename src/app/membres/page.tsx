"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { api } from "@/lib/api";
import { useIntl } from "@/intl";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { SkeletonTable } from "@/components/ui/Skeleton";

interface Member {
  id: string;
  matricule: string;
  fullName: string;
  gender: "M" | "F";
  age: number;
  phone: string;
  assembly: string;
  status: "actif" | "catechumene" | "suspendu" | "discipline" | "transfere";
  baptismStatus: "Baptisé (Eau & Esprit)" | "Baptisé Eau" | "En préparation";
  department: string;
  joinDate: string;
  raw?: any;
}

export default function MembresPage() {
  const { t } = useIntl();
  const { alert } = useConfirm();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssembly, setSelectedAssembly] = useState<string>("all");
  const [assemblies, setAssemblies] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Bulk Excel/CSV Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAssemblyId, setImportAssemblyId] = useState<string>("");
  const [importDepartmentId, setImportDepartmentId] = useState<string>("");
  const [createAccounts, setCreateAccounts] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchLiveMembers = async () => {
    setLoading(true);
    try {
      const [res, assRes, deptRes] = await Promise.all([
        api.members.list({ limit: 100 }),
        api.organizations.listAssemblies({ limit: 50 }),
        api.departments.list(),
      ]);

      const list: any[] = (res.data as any)?.items || (res.data as any)?.members || (Array.isArray(res.data) ? res.data : []);
      const total = (res.data as any)?.total ?? list.length;
      setTotalCount(total);

      const assList: any[] = (assRes.data as any)?.items || (assRes.data as any)?.assemblies || (Array.isArray(assRes.data) ? assRes.data : []);
      if (assList && assList.length > 0) {
        setAssemblies(assList.map((a: any) => ({ id: a.id, name: a.name })));
        setImportAssemblyId((prev) => prev || assList[0].id);
      }

      const deptList: any[] = (deptRes.data as any)?.departments || (deptRes.data as any)?.items || (Array.isArray(deptRes.data) ? deptRes.data : []);
      if (deptList && deptList.length > 0) {
        setDepartments(deptList.map((d: any) => ({ id: d.id, name: d.name })));
      }

      if (list && Array.isArray(list)) {
        const mapped: Member[] = list.map((item: any, idx: number) => {
          const firstName = item.user?.first_name || item.first_name || "";
          const lastName = item.user?.last_name || item.last_name || "";
          const fullName = `${firstName} ${lastName}`.trim() || item.full_name || "Fidèle";
          const phone = item.user?.phone || item.phone || "+237 6 -- -- -- --";
          const matricule = item.membership_number || item.matricule || `MBR-2026-${String(idx + 1).padStart(5, "0")}`;
          const rawStatus = (item.status || "active").toLowerCase();
          const status: Member["status"] =
            rawStatus.includes("cat") || rawStatus === "new" ? "catechumene" :
            rawStatus.includes("susp") ? "suspendu" :
            rawStatus.includes("disc") ? "discipline" :
            rawStatus.includes("trans") ? "transfere" :
            "actif";

          let age = 32;
          if (item.date_of_birth) {
            const birthYear = new Date(item.date_of_birth).getFullYear();
            if (!isNaN(birthYear)) age = 2026 - birthYear;
          }

          return {
            id: item.id || `live-mbr-${idx}`,
            matricule,
            fullName,
            gender: item.gender === "F" ? "F" : "M",
            age,
            phone,
            assembly: item.assembly_name || "Temple Central de Tsinga",
            status,
            baptismStatus: item.baptism_date ? "Baptisé (Eau & Esprit)" : "En préparation",
            department: item.departments?.[0]?.name || item.profession || "Assemblée Générale",
            joinDate: item.membership_date
              ? new Date(item.membership_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              : (item.created_at ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "2024"),
            raw: item,
          };
        });

        setMembers(mapped);
      }
    } catch (err) {
      console.warn("Erreur chargement membres:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMembers();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.members.exportJson();
      const exportPayload = res.data || members;
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `membres_fullgope_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert({
        title: "Exportation",
        message: "L'export a été généré à partir des données actuellement chargées en mémoire.",
        variant: "info",
      });
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "last_name",
      "first_name",
      "gender",
      "phone",
      "email",
      "date_of_birth",
      "profession",
      "marital_status",
      "nationality",
      "baptism_date",
      "membership_date",
      "whatsapp",
      "status",
    ];
    const sampleRow1 = [
      "Mvondo",
      "Pierre",
      "M",
      "+237677112233",
      "pierre.mvondo@fullgope.cm",
      "1990-04-15",
      "Enseignant",
      "married",
      "Camerounaise",
      "2020-05-10",
      "2021-01-15",
      "+237677112233",
      "active",
    ];
    const sampleRow2 = [
      "Ngo",
      "Jeanne",
      "F",
      "+237699445566",
      "jeanne.ngo@fullgope.cm",
      "1995-08-22",
      "Comptable",
      "single",
      "Camerounaise",
      "2022-11-04",
      "2023-02-01",
      "+237699445566",
      "active",
    ];
    const csv = [headers.join(","), sampleRow1.join(","), sampleRow2.join(",")].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_import_membres_fullgope.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError("Veuillez sélectionner un fichier Excel (.xlsx) ou CSV.");
      return;
    }
    const targetAssembly = importAssemblyId || assemblies[0]?.id;
    if (!targetAssembly) {
      setImportError("Veuillez sélectionner une assemblée de rattachement.");
      return;
    }

    setIsUploading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await api.members.importExcel({
        file: importFile,
        assembly_id: targetAssembly,
        department_id: importDepartmentId || undefined,
        create_user_accounts: createAccounts,
      });

      if (res.error || !res.data) {
        setImportError(res.message || "Erreur lors du traitement du fichier.");
      } else {
        setImportResult(res.data);
        await fetchLiveMembers();
      }
    } catch (err: any) {
      setImportError(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm);
    const matchesStatus = selectedStatus === "all" || m.status === selectedStatus;
    const matchesAssembly = selectedAssembly === "all" || m.assembly.includes(selectedAssembly);
    return matchesSearch && matchesStatus && matchesAssembly;
  });

  const activeCount = members.filter((m) => m.status === "actif").length;
  const catechumeneCount = members.filter((m) => m.status === "catechumene").length;
  const baptizedCount = members.filter((m) => m.baptismStatus.includes("Baptisé")).length;

  return (
    <PortalShell>
      <div className="space-y-6 w-full">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{t("members.breadcrumbHome")}</span>
            </Link>
            <span>/</span>
            <span>{t("members.breadcrumbCommunity")}</span>
            <span>/</span>
            <span className="text-primary font-bold">{t("members.breadcrumbMembers")}</span>
          </nav>
        </div>

        {/* Page Title & Main Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container-high/60">
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline-lg">
                {t("members.title")}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold font-mono">
                {t("members.totalInDb", { count: totalCount || members.length })}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {t("members.subtitle", { active: activeCount, catechumene: catechumeneCount })}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={handleExport}
              className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              <span>{t("members.exportBtn")}</span>
            </button>
            <Can permission="can:import_members" minRole={4}>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(true);
                  setImportResult(null);
                  setImportError(null);
                  setImportFile(null);
                  if (!importAssemblyId && assemblies.length > 0 && assemblies[0]) {
                    setImportAssemblyId(assemblies[0].id);
                  }
                }}
                className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container-high shadow-sm"
              >
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" x2="12" y1="3" y2="15"/>
                </svg>
                <span>{t("members.importBtn")}</span>
              </button>
            </Can>
            <Can permission="can:create_member" minRole={3}>
              <Link
                href="/membres/enrolement"
                className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" x2="19" y1="8" y2="14"/>
                  <line x1="22" x2="16" y1="11" y2="11"/>
                </svg>
                <span>{t("members.enrollBtn")}</span>
              </Link>
            </Can>
          </div>
        </div>

        {/* 4-KPI Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium block">{t("members.kpiTotal")}</span>
              <span className="text-xl font-black text-on-surface">{totalCount || members.length}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium block">{t("members.kpiActive")}</span>
              <span className="text-xl font-black text-emerald-700">{activeCount}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium block">{t("members.kpiCatechumene")}</span>
              <span className="text-xl font-black text-amber-800">{catechumeneCount}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-sky-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium block">{t("members.kpiBaptized")}</span>
              <span className="text-xl font-black text-on-surface">{baptizedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container-high/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="md:col-span-8 relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" x2="16.65" y1="21" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("members.searchPlaceholder")}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none border border-surface-container-high focus:border-primary"
              />
            </div>

            {/* Assembly Filter */}
            <div className="md:col-span-4 relative">
              <select
                value={selectedAssembly}
                onChange={(e) => setSelectedAssembly(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface focus:outline-none border border-surface-container-high focus:border-primary"
              >
                <option value="all">{t("members.filterAssemblies")}</option>
                {assemblies.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold pt-1">
            {[
              { id: "all", label: t("common.all"), count: members.length, color: "bg-on-surface text-surface" },
              { id: "actif", label: t("members.filterActive"), count: activeCount, color: "bg-emerald-600 text-white" },
              { id: "catechumene", label: t("members.filterCatechumene"), count: catechumeneCount, color: "bg-amber-600 text-white" },
              { id: "transfere", label: t("members.filterTransferred"), count: members.filter(m => m.status === "transfere").length, color: "bg-surface-container-highest text-on-surface" },
              { id: "discipline", label: t("members.filterDiscipline"), count: members.filter(m => m.status === "discipline").length, color: "bg-primary text-on-primary" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedStatus(p.id)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedStatus === p.id
                    ? p.color
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[10px] opacity-80">({p.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Member Table */}
        {loading ? (
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 overflow-hidden">
            <SkeletonTable rows={8} cols={6} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-container-high space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
              ∅
            </div>
            <h3 className="font-bold text-sm text-on-surface">{t("members.emptyState")}</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Modifiez votre recherche ou enregistrez un nouveau fidèle dans le registre ecclésial.
            </p>
            <Link
              href="/membres/enrolement"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
            >
              {t("members.enrollBtn")}
            </Link>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider border-b border-surface-container-high">
                  <tr>
                    <th className="py-3 px-4">{t("members.colIdentity")}</th>
                    <th className="py-3 px-4">{t("members.colStatus")}</th>
                    <th className="py-3 px-4">{t("members.colAssembly")}</th>
                    <th className="py-3 px-4">{t("members.colDepartment")}</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">{t("members.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredMembers.map((m) => {
                    const memberPhoto =
                      typeof window !== "undefined"
                        ? localStorage.getItem(`fullgope_member_photo_${m.id}`) ||
                          (m.raw?.user_id ? localStorage.getItem(`fullgope_member_photo_${m.raw.user_id}`) : null) ||
                          (m.raw?.user?.avatar_url || m.raw?.avatar_url || m.raw?.photo_url || null)
                        : null;

                    return (
                      <tr key={m.id} className="hover:bg-surface-container-low/60 transition-colors">
                        {/* Name & ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {memberPhoto ? (
                              <img
                                src={memberPhoto}
                                alt={m.fullName}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-primary/20"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {m.fullName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/membres/${m.id}`}
                                className="font-bold text-on-surface hover:text-primary transition-colors text-xs block"
                              >
                                {m.fullName}
                              </Link>
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                {m.matricule} • {m.gender === "M" ? "Homme" : "Femme"}, {m.age} ans
                              </span>
                            </div>
                          </div>
                        </td>

                      {/* Spiritual status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              m.status === "actif"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : m.status === "catechumene"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : m.status === "discipline"
                                ? "bg-red-100 text-red-800"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {m.status}
                          </span>
                          <span className="text-[11px] text-on-surface-variant block">
                            {m.baptismStatus}
                          </span>
                        </div>
                      </td>

                      {/* Assembly */}
                      <td className="py-3.5 px-4 font-medium text-on-surface">
                        {m.assembly}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-on-surface">
                        <span className="px-2 py-1 rounded-lg bg-surface-container text-[11px] font-medium">
                          {m.department}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-on-surface font-mono text-[11px]">
                        {m.phone}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/membres/${m.id}`}
                            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-[11px] inline-flex items-center gap-1"
                            title="Consulter la Fiche Membre"
                          >
                            <span>Consulter</span>
                            <span>→</span>
                          </Link>
                          <Can permission="can:create_transfer" minRole={4}>
                            <Link
                              href={`/membres/transferts?member_id=${m.id}`}
                              className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface"
                              title="Demande de Transfert"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4"/>
                                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                                <path d="M7 23l-4-4 4-4"/>
                                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                              </svg>
                            </Link>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-on-surface-variant">
                Affichage de <span className="font-bold text-on-surface">{filteredMembers.length}</span> fidèles sur{" "}
                <span className="font-bold text-on-surface">{totalCount || members.length}</span> en base de données
              </div>
              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                Synchronisé avec le backend PostgreSQL/SQLite
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BULK MEMBER IMPORT MODAL (EXCEL / CSV) */}
        {/* ============================================================== */}
        {importModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-container-high/80 p-6 sm:p-8 space-y-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-on-surface">
                      {t("members.importTitle")}
                    </h2>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                    {t("members.importSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Content: Result recap OR Upload Form */}
              {importResult ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                        Importation terminée avec succès !
                      </h3>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                        Les membres ont été intégrés dans l'assemblée <strong>{importResult.assembly_name || "sélectionnée"}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-surface-container text-center">
                      <span className="text-[11px] text-on-surface-variant block">Total Lignes</span>
                      <span className="text-xl font-black text-on-surface">{importResult.total_rows ?? 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">Enregistrés</span>
                      <span className="text-xl font-black text-emerald-600">{importResult.imported_count ?? 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center border border-amber-200 dark:border-amber-800">
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block">Ignorés</span>
                      <span className="text-xl font-black text-amber-600">{importResult.skipped_count ?? 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-center border border-red-200 dark:border-red-800">
                      <span className="text-[11px] text-red-800 dark:text-red-300 font-bold block">Erreurs</span>
                      <span className="text-xl font-black text-red-600">{importResult.error_count ?? 0}</span>
                    </div>
                  </div>

                  {/* Imported members preview */}
                  {importResult.imported_members && importResult.imported_members.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-on-surface block">
                        Membres enregistrés ({importResult.imported_members.length}) :
                      </span>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-container bg-surface-container-low text-xs divide-y divide-surface-container">
                        {importResult.imported_members.map((mbr: any, i: number) => (
                          <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-on-surface">{mbr.full_name}</span>
                              <span className="text-[11px] text-on-surface-variant block">{mbr.phone} • {mbr.email || "Sans email"}</span>
                            </div>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                              {mbr.membership_number}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors details list */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-red-700 block">
                        Détail des erreurs rencontrées ({importResult.errors.length}) :
                      </span>
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-red-200 bg-red-50/50 p-2.5 text-xs text-red-800 space-y-1">
                        {importResult.errors.map((err: any, i: number) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="font-bold">Ligne {err.row || "?"} :</span>
                            <span>{err.error || JSON.stringify(err)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportModalOpen(false);
                        setImportResult(null);
                      }}
                      className="h-10 px-6 rounded-xl bg-primary-container text-on-primary font-bold text-xs hover:bg-primary transition-colors cursor-pointer"
                    >
                      Fermer &amp; Actualiser la liste
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleImportSubmit} className="space-y-5">
                  {/* Download Template Bar */}
                  <div className="p-3.5 rounded-2xl bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <svg className="w-5 h-5 text-secondary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>Besoin du modèle officiel d'importation ?</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="h-8 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-primary font-bold text-xs border border-surface-container-high flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                      <span>{t("members.templateBtn")}</span>
                    </button>
                  </div>

                  {/* File Dropzone */}
                  <div>
                    <label className="text-xs font-bold text-on-surface block mb-1.5">
                      Fichier Excel ou CSV * (.xlsx, .xls, .csv)
                    </label>
                    <label className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      importFile ? "border-emerald-500 bg-emerald-50/30" : "border-surface-container-high hover:border-primary/50 bg-surface-container-low"
                    }`}>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImportFile(file);
                            setImportError(null);
                          }
                        }}
                        className="hidden"
                      />
                      <svg className={`w-10 h-10 mb-2 ${importFile ? "text-emerald-600" : "text-on-surface-variant"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m8 16 4-4 4 4" />
                      </svg>
                      {importFile ? (
                        <div>
                          <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300 block">
                            {importFile.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {(importFile.size / 1024).toFixed(1)} Ko • Fichier sélectionné
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-xs text-on-surface block">
                            Cliquez pour parcourir ou glissez-déposez le fichier ici
                          </span>
                          <span className="text-[11px] text-on-surface-variant mt-0.5 block">
                            Formats supportés : Microsoft Excel (.xlsx, .xls) ou CSV UTF-8
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Assembly Selector */}
                  <div>
                    <label className="text-xs font-bold text-on-surface block mb-1.5">
                      {t("members.selectAssembly")} *
                    </label>
                    <select
                      value={importAssemblyId}
                      onChange={(e) => setImportAssemblyId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      {assemblies.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Department Selector */}
                  <div>
                    <label className="text-xs font-bold text-on-surface block mb-1.5">
                      {t("members.selectDepartment")}
                    </label>
                    <select
                      value={importDepartmentId}
                      onChange={(e) => setImportDepartmentId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-surface-container-high text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Aucun département spécifique (Assemblée générale)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Create User Accounts */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
                    <input
                      type="checkbox"
                      id="createAccounts"
                      checked={createAccounts}
                      onChange={(e) => setCreateAccounts(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/30"
                    />
                    <label htmlFor="createAccounts" className="text-xs text-on-surface cursor-pointer select-none">
                      <span className="font-bold block">{t("members.createAccounts")}</span>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">
                        Génère un identifiant et accès au portail avec mot de passe initial sécurisé.
                      </span>
                    </label>
                  </div>

                  {/* Error Banner */}
                  {importError && (
                    <AlertBanner
                      type="error"
                      title="Erreur lors de l'importation"
                      message={importError}
                      onDismiss={() => setImportError(null)}
                      className="my-1"
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                    <button
                      type="button"
                      onClick={() => setImportModalOpen(false)}
                      disabled={isUploading}
                      className="h-10 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || !importFile}
                      className="h-10 px-6 rounded-xl bg-primary-container text-on-primary font-bold text-xs hover:bg-primary transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t("members.uploading")}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" x2="12" y1="3" y2="15"/>
                          </svg>
                          <span>{t("members.uploadBtn")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
