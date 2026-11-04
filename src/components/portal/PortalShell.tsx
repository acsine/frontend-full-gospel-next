"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useIntl } from "@/intl";
import { getAccessToken, getStoredUser, clearTokens, api } from "@/lib/api";
import { can } from "@/lib/permissions";

interface PortalShellProps {
  children: React.ReactNode;
  activePath?: string;
  title?: string;
  memberCount?: number | string;
  hideSidebar?: boolean;
}

function PortalIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  switch (name) {
    case "dashboard":
    case "grid_view":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "public":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "groups":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "person_add":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      );
    case "swap_horiz":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
      );
    case "diversity_3":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="7" r="3" />
          <circle cx="5" cy="11" r="2.5" />
          <circle cx="19" cy="11" r="2.5" />
          <path d="M8.5 19a4.5 4.5 0 0 1 7 0" />
        </svg>
      );
    case "account_tree":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="15" y="15" width="6" height="6" rx="1" />
          <rect x="3" y="15" width="6" height="6" rx="1" />
          <path d="M6 9v3a3 3 0 0 0 3 3h6" />
        </svg>
      );
    case "assignment":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      );
    case "menu_book":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    case "calendar_month":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "hub":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="17.2" y1="6.8" x2="13.8" y2="10.2" />
          <line x1="6.8" y1="6.8" x2="10.2" y2="10.2" />
          <line x1="6.8" y1="17.2" x2="10.2" y2="13.8" />
          <line x1="17.2" y1="17.2" x2="13.8" y2="13.8" />
        </svg>
      );
    case "chat_bubble":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "video_library":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "payments":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case "receipt_long":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 2v20l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V2l-3 1.5-3-1.5-3 1.5-3-1.5-3 1.5L4 2z" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "shopping_cart_checkout":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case "verified":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "volunteer_activism":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    case "admin_panel_settings":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "history_toggle_off":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      );
    case "close":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "church":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M10 4h4" />
          <path d="m18 8-6-4-6 4v14h12V8Z" />
          <path d="M10 22v-6h4v6" />
        </svg>
      );
    case "notifications":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "logout":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

export function PortalShell({ children, hideSidebar = false }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useIntl();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Authentication check & live backend token validation
  useEffect(() => {
    const token = getAccessToken();
    const localUser = getStoredUser();

    if (!token) {
      clearTokens();
      setIsAuthenticated(false);
      router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Immediately authenticate with stored user to prevent UI flash
    if (localUser) {
      setCurrentUser(localUser);
      setIsAuthenticated(true);
    }

    // Verify token validity with backend API
    api.auth
      .getProfile()
      .then((res) => {
        if (res.status === 401) {
          clearTokens();
          setIsAuthenticated(false);
          router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
        } else if (res.data && !res.error) {
          setIsAuthenticated(true);
          setCurrentUser(res.data);
          localStorage.setItem("fullgope_user", JSON.stringify(res.data));
        } else if (!localUser) {
          clearTokens();
          setIsAuthenticated(false);
          router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (!localUser) {
          clearTokens();
          setIsAuthenticated(false);
          router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
        }
      });
  }, [pathname, router]);

  // Synchronize active perspective with user's real roles (no fake defaults)
  useEffect(() => {
    const userToSync = currentUser || getStoredUser();
    if (userToSync?.roles && userToSync.roles.length > 0) {
      const savedRoleId = typeof window !== "undefined" ? localStorage.getItem("fullgope_active_role_id") : null;
      const roleExists = userToSync.roles.some((r: any) => r.id === savedRoleId);
      if (savedRoleId && roleExists) {
        setActiveRoleId(savedRoleId);
      } else {
        const defaultRole = userToSync.roles[0];
        setActiveRoleId(defaultRole?.id || null);
        if (typeof window !== "undefined" && defaultRole?.id) {
          localStorage.setItem("fullgope_active_role_id", defaultRole.id);
        }
      }
    }
  }, [currentUser]);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdKOpen(false);
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = [
    {
      title: t("portalNav.main"),
      items: [
        { name: t("portalNav.overview"), path: "/dashboard", icon: "grid_view", minRole: 1 },
        { name: t("portalNav.publicSite"), path: "/", icon: "public", minRole: 0 },
      ],
    },
    {
      title: t("portalNav.community"),
      items: [
        {
          name: t("portalNav.members"),
          path: "/membres",
          icon: "groups",
          permission: "view:members:list",
          minRole: 2,
        },
        { name: t("portalNav.enrollment"), path: "/membres/enrolement", icon: "person_add", permission: "view:members:create", minRole: 3 },
        { name: t("portalNav.transfers"), path: "/membres/transferts", icon: "swap_horiz", permission: "view:members:transfer", minRole: 4 },
        { name: t("portalNav.departments"), path: "/departements", icon: "diversity_3", permission: "view:departments:list", minRole: 1 },
        { name: t("portalNav.territorial"), path: "/organisation", icon: "account_tree", permission: "view:organizations:tree", minRole: 4 },
      ],
    },
    {
      title: t("portalNav.ministry"),
      items: [
        { name: t("portalNav.monthlyReports"), path: "/rapports", icon: "assignment", permission: "view:reports:list", minRole: 2 },
        { name: t("portalNav.publications"), path: "/publications", icon: "menu_book", permission: "view:publications:list", minRole: 1 },
        { name: t("portalNav.liturgyPlanning"), path: "/liturgie/planning", icon: "calendar_month", permission: "view:liturgy:planning", minRole: 1 },
        { name: t("portalNav.social"), path: "/actualites", icon: "hub", permission: "view:social:feed", minRole: 1 },
        { name: t("portalNav.messaging"), path: "/messagerie", icon: "chat_bubble", permission: "view:messaging:chat", minRole: 1 },
        { name: t("portalNav.media"), path: "/mediatheque", icon: "video_library", minRole: 1 },
      ],
    },
    {
      title: t("portalNav.governance"),
      items: [
        { name: t("portalNav.finance"), path: "/finance", icon: "payments", permission: "view:finance:summary", minRole: 4 },
        { name: t("portalNav.tithes"), path: "/finance/entrees", icon: "receipt_long", permission: "view:finance:incomes", minRole: 2 },
        { name: t("portalNav.expenses"), path: "/finance/depenses", icon: "shopping_cart_checkout", permission: "view:finance:expenses", minRole: 4 },
        { name: t("portalNav.serviceCount"), path: "/liturgie/comptage", icon: "verified", permission: "view:liturgy:count", minRole: 2 },
        { name: t("portalNav.donations"), path: "/dons", icon: "volunteer_activism", minRole: 1 },
        { name: t("portalNav.adminRoles"), path: "/administration/roles", icon: "admin_panel_settings", permission: "view:admin:roles", minRole: 7 },
        { name: t("portalNav.auditLog"), path: "/administration/audit", icon: "history_toggle_off", permission: "view:admin:audit", minRole: 7 },
      ],
    },
  ];

  // Effective user & active perspective resolution
  const effectiveStored = currentUser || getStoredUser();
  const primaryRole = effectiveStored?.roles?.[0];
  const activeRole = effectiveStored?.roles?.find((r: any) => r.id === activeRoleId) || primaryRole;

  // Filter navigation items by active perspective if multiple roles exist, or overall permissions
  const effectiveUser = useMemo(() => {
    if (!effectiveStored) return null;
    if (activeRole && effectiveStored.roles && effectiveStored.roles.length > 1) {
      return {
        ...effectiveStored,
        role_level: activeRole.level_num ?? effectiveStored.role_level,
        permissions: Array.isArray(activeRole.permissions) ? activeRole.permissions : effectiveStored.permissions,
      };
    }
    return effectiveStored;
  }, [effectiveStored, activeRole]);

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item: any) =>
        can({ permission: item.permission, minRole: item.minRole }, effectiveUser)
      ),
    }))
    .filter((section) => section.items.length > 0);

  // Determine which single menu item is currently active (never more than one)
  const allNavItems = navSections.flatMap((s) => s.items);
  const activeNavItem =
    allNavItems.find((item) => item.path === pathname) ||
    allNavItems
      .filter((item) => item.path !== "/" && (pathname === item.path || pathname.startsWith(`${item.path}/`)))
      .sort((a, b) => b.path.length - a.path.length)[0];
  const activeNavPath = activeNavItem?.path;

  const userDisplayName = effectiveStored
    ? `${effectiveStored.first_name || ""} ${effectiveStored.last_name || ""}`.trim() || effectiveStored.email
    : "Membre de l'Église";

  const userInitials = effectiveStored
    ? `${(effectiveStored.first_name?.[0] || "").toUpperCase()}${(effectiveStored.last_name?.[0] || "").toUpperCase()}` || "FG"
    : "FG";

  const userEmail = effectiveStored?.email || "connexion@fullgope.cm";
  const userRole = activeRole?.name || activeRole?.role_name || (effectiveStored?.role_level === 1 ? "Fidèle / Membre d'Assemblée" : "Fidèle");
  const userAssembly = activeRole?.scope_name || effectiveStored?.assembly_name || "District Tsinga";

  const handleLogout = async () => {
    setProfileOpen(false);
    await api.auth.logout();
    router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <span className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="font-bold text-sm text-on-surface">Vérification de session sécurisée</h3>
        <p className="text-xs text-on-surface-variant mt-1">Connexion au portail pastoral...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen">
      {/* ============================================================== */}
      {/* SIDEBAR DESKTOP */}
      {/* ============================================================== */}
      {!hideSidebar && (
        <aside className="fixed left-0 top-0 h-full w-72 bg-inverse-surface text-inverse-on-surface z-50 flex-col justify-between hidden md:flex border-r border-inverse-on-surface/10">
        <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
          {/* Logo & Assembly Header */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-inverse-on-surface/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.jpg"
                  alt="Logo FULLGOPE"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-surface-container-lowest block leading-tight">
                  FULL GOSPEL MISSION
                </span>
                <span className="text-xs text-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse" />
                  Connecté • Tsinga
                </span>
              </div>
            </Link>
          </div>

          {/* Canonical Motto Banner */}
          <div className="px-4 py-2.5">
            <div className="bg-inverse-on-surface/5 rounded-lg px-3 py-2 border border-inverse-on-surface/5">
              <p className="text-xs text-secondary-fixed italic leading-tight font-medium">
                « No Other Christ, No Other Gospel »
              </p>
              <p className="text-[10px] text-surface-dim uppercase tracking-wider mt-0.5">
                Mission du Plein Évangile (1961)
              </p>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="flex-1 px-3 py-2 space-y-4">
            {visibleNavSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-surface-dim block mb-1">
                  {section.title}
                </span>
                {section.items.map((item) => {
                  const isActive = item.path === activeNavPath;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "text-surface-variant hover:bg-inverse-on-surface/10 hover:text-surface-container-lowest"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PortalIcon name={item.icon} className="w-5 h-5 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Server & Version Footer */}
        <div className="p-4 bg-inverse-on-surface/5 border-t border-inverse-on-surface/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
            <span className="text-xs text-surface-variant font-medium">
              Serveur Yaoundé • v2.4
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-inverse-on-surface/10 text-surface-dim">
            CMR
          </span>
        </div>
      </aside>
      )}

      {/* ============================================================== */}
      {/* MOBILE DRAWER */}
      {/* ============================================================== */}
      {!hideSidebar && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85%] bg-inverse-surface text-inverse-on-surface h-full flex flex-col justify-between z-10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-inverse-on-surface/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                  <Image
                    src="/logo.jpg"
                    alt="Logo FULLGOPE"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-bold text-sm text-surface-container-lowest">FULL GOSPEL MISSION</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-variant hover:text-surface-container-lowest"
              >
                <PortalIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-4">
              {visibleNavSections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-dim block mb-1">
                    {section.title}
                  </span>
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${item.path === activeNavPath
                          ? "bg-primary-container text-on-primary"
                          : "text-surface-variant hover:bg-inverse-on-surface/10"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PortalIcon name={item.icon} className="w-5 h-5 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN CONTAINER WITH HEADER */}
      {/* ============================================================== */}
      <div className={`${hideSidebar ? "w-full" : "md:pl-72"} flex flex-col min-h-screen`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-4 md:px-8 lg:px-10 2xl:px-12 flex items-center justify-between border-b border-surface-container-high">
          {/* Left section: Hamburger / Brand Logo & Quick Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {hideSidebar ? (
              <Link href="/dashboard" className="flex items-center gap-2.5 mr-3 hover:opacity-85 transition-opacity shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0 border border-slate-200">
                  <Image
                    src="/logo.jpg"
                    alt="Logo FULLGOPE"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs sm:text-sm text-on-surface tracking-tight leading-tight">
                    FULL GOSPEL MISSION
                  </span>
                  <span className="text-[10px] text-primary font-bold leading-tight">
                    Koinōnia • Fil Fraternel
                  </span>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-on-surface hover:bg-surface-container"
              >
                <PortalIcon name="menu" className="w-5 h-5" />
              </button>
            )}

            {/* Global Search bar (Cmd+K trigger) */}
            <div
              onClick={() => setCmdKOpen(true)}
              className="relative flex-1 hidden sm:flex items-center cursor-pointer group"
            >
              <span className="absolute left-3 text-on-surface-variant group-hover:text-primary transition-colors">
                <PortalIcon name="search" className="w-4 h-4" />
              </span>
              <input
                readOnly
                type="text"
                placeholder="Rechercher fidèles, assemblées, reçus MoMo/Orange..."
                className="w-full h-10 pl-10 pr-20 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/70 cursor-pointer focus:outline-none group-hover:bg-surface-container transition-colors"
              />
              <kbd className="absolute right-2.5 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-semibold border border-surface-container-highest">
                ⌘K
              </kbd>
            </div>

            {/* Current Assembly Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-xs text-on-surface">
              <PortalIcon name="church" className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold">Pasteur Titulaire</span>
              <span className="text-on-surface-variant">•</span>
              <span className="text-on-surface-variant">District Centre (Tsinga)</span>
            </div>
          </div>

          {/* Right section: Quick actions & profile */}
          <div className="flex items-center gap-2">
            {hideSidebar && (
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors mr-1"
                title="Revenir à l'Espace Pastoral"
              >
                <PortalIcon name="dashboard" className="w-4 h-4 text-primary" />
                <span>Espace Pastoral</span>
              </Link>
            )}
            {/* Language Switch */}
            <div className="flex items-center bg-surface-container rounded-full p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`min-w-[26px] h-6 px-1.5 rounded-full transition-all ${
                  locale === "fr"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`min-w-[26px] h-6 px-1.5 rounded-full transition-all ${
                  locale === "en"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                EN
              </button>
            </div>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
              title="Notifications"
            >
              <PortalIcon name="notifications" className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary-container ring-2 ring-surface-container-lowest" />
            </button>

            {/* Profile Dropdown trigger */}
            <div
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-2 border-l border-surface-container-high cursor-pointer hover:opacity-85 select-none"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
                  {userInitials}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary-container ring-2 ring-surface-container-lowest" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-on-surface block leading-tight">
                  {userDisplayName}
                </span>
                <span className="text-[11px] text-on-surface-variant block leading-tight">
                  {userAssembly}
                </span>
              </div>
              <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="w-full flex-1 bg-surface px-4 md:px-8 lg:px-10 2xl:px-12 py-6 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* ============================================================== */}
      {/* INTERACTIVE MODAL: COMMAND+K SEARCH */}
      {/* ============================================================== */}
      {cmdKOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl p-4 flex flex-col gap-3 border border-surface-container-high">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-container-low rounded-xl">
              <svg className="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Rechercher fidèle, assemblée de prière, reçu MoMo, verset..."
                className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
              />
              <button
                onClick={() => setCmdKOpen(false)}
                className="px-2 py-0.5 rounded bg-surface-container-high text-xs text-on-surface-variant hover:bg-surface-container-highest"
              >
                ESC
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-on-surface-variant px-1 pt-1">
              <span className="font-semibold uppercase tracking-wider">
                Suggestions Rapides & Raccourcis
              </span>
              <span>Recherche instantanée</span>
            </div>

            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
              <Link
                href="/membres"
                onClick={() => setCmdKOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      Mvondo Marc • ID #8492
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Groupe d'intercession Tsinga • Baptisé 2018
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link
                href="/finance/entrees"
                onClick={() => setCmdKOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      Transaction MTN MoMo #TX-90412
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Dîme pastorale • 45 000 FCFA • Reçue ce jour
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link
                href="/rapports"
                onClick={() => setCmdKOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10M6 10h10" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      Rapport trimestriel Région Centre
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Mission du Plein Évangile • Validé par le Surintendant
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link
                href="/liturgie/comptage"
                onClick={() => setCmdKOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-sm font-bold text-on-surface block">
                      Procès-Verbal de comptage de culte
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Séance de comptage contradictoire avec collège des anciens
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-container-high">
              <button
                onClick={() => setCmdKOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PROFILE FLYOUT */}
      {/* ============================================================== */}
      {profileOpen && (
        <div className="fixed right-6 top-16 z-50 w-80 bg-surface-container-lowest rounded-2xl shadow-2xl p-4 border border-surface-container-high flex flex-col gap-3">
          <div className="flex items-center gap-3 pb-3 border-b border-surface-container-high">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-lg">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-on-surface truncate">
                {userDisplayName}
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                {userEmail}
              </span>
              <span className="text-[11px] text-tertiary font-semibold mt-0.5">
                ● {userRole} • {userAssembly}
              </span>
            </div>
          </div>

          {/* Section Unifiée : Rôles & Mandats Dévolus (Pas de duplication, chaque carte est le bouton de sélection) */}
          {currentUser?.roles && currentUser.roles.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar py-1 border-t border-surface-container-high/60">
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentUser.roles.length > 1
                    ? `Changer de rôle (${currentUser.roles.length})`
                    : "Rôle canonique actif"}
                </span>
                {currentUser.roles.length > 1 && (
                  <span className="text-[10px] text-tertiary font-medium">
                    Cliquez pour basculer
                  </span>
                )}
              </div>

              {currentUser.roles.map((r: any, idx: number) => {
                const isSelected = (activeRole?.id || currentUser.roles[0]?.id) === r.id;
                const canSwitch = currentUser.roles.length > 1;

                return (
                  <button
                    key={r.id || idx}
                    type="button"
                    disabled={!canSwitch || isSelected}
                    onClick={() => {
                      if (canSwitch && !isSelected && r.id) {
                        if (typeof window !== "undefined") {
                          localStorage.setItem("fullgope_active_role_id", r.id);
                        }
                        setActiveRoleId(r.id);
                        setProfileOpen(false);
                        window.location.reload();
                      }
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all border flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow-sm ring-2 ring-primary/20"
                        : canSwitch
                        ? "bg-surface-container/50 hover:bg-surface-container border-surface-container-high/80 text-on-surface cursor-pointer"
                        : "bg-surface-container/40 border-surface-container-high/60 text-on-surface cursor-default"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        <span className="font-bold text-xs truncate">
                          {r.name || r.role_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {r.level || `N${r.level_num || 1}`}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-on-primary shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {r.scope_name && (
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? "text-on-primary/80" : "text-on-surface-variant"
                        }`}
                      >
                        Périmètre : {r.scope_name}
                      </div>
                    )}

                    <div className={`flex items-center justify-between text-[10px] pt-1.5 border-t ${
                      isSelected ? "border-white/15" : "border-surface-container-high/60"
                    }`}>
                      <span
                        className={
                          isSelected ? "text-on-primary/90 font-medium" : "text-tertiary font-medium"
                        }
                      >
                        {Array.isArray(r.permissions) ? `${r.permissions.length} permissions dévolues` : "Permissions canoniques"}
                      </span>
                      {isSelected ? (
                        <span className="font-bold tracking-wider uppercase text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                          <span>Actif</span>
                        </span>
                      ) : canSwitch ? (
                        <span className="text-[10px] text-primary font-bold">
                          Activer →
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-surface-container-high flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setProfileOpen(false)}
              className="px-3 py-2 rounded-xl text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>Aller sur le portail public</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl text-xs text-error hover:bg-error-container/30 flex items-center gap-2 transition-colors"
            >
              <PortalIcon name="logout" className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NOTIFICATIONS FLYOUT */}
      {/* ============================================================== */}
      {notifOpen && (
        <div className="fixed right-16 top-16 z-50 w-96 bg-surface-container-lowest rounded-2xl shadow-2xl p-4 border border-surface-container-high flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
            <h4 className="font-bold text-sm text-on-surface">Notifications Écclésiales</h4>
            <span className="text-xs bg-primary-container text-on-primary px-2 py-0.5 rounded-full font-bold">
              3 nouvelles
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            <div className="p-2.5 rounded-xl bg-surface-container-low text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">Séance de comptage #PV-842</span>
                <span className="text-on-surface-variant">Il y a 10 min</span>
              </div>
              <p className="text-on-surface">PV de culte de dimanche validé avec 3 signatures d'anciens.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-tertiary">Don MTN MoMo 25 000 FCFA</span>
                <span className="text-on-surface-variant">Il y a 35 min</span>
              </div>
              <p className="text-on-surface">Reçu certifié généré pour Jean Marc (Tsinga).</p>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-container-low text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-secondary">Convention Nationale 2025</span>
                <span className="text-on-surface-variant">Hier</span>
              </div>
              <p className="text-on-surface">Nouvelle mise à jour du planning des orateurs de Pentecôte.</p>
            </div>
          </div>
          <button
            onClick={() => setNotifOpen(false)}
            className="w-full py-1.5 rounded-xl bg-surface-container text-xs text-on-surface font-semibold hover:bg-surface-container-high"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}

export default PortalShell;
