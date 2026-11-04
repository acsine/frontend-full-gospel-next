/**
 * Module central des autorisations et du contrôle d'accès basé sur les rôles (RBAC).
 * Synchronisé avec le modèle officiel N0 à N8 de la Mission du Plein Évangile Cameroun.
 */
import { getStoredUser } from "./api";

export enum RoleLevel {
  VISITOR = 0,
  MEMBER = 1,
  DEPARTMENT_HEAD = 2,
  COMMUNICATOR = 3,
  ASSEMBLY_LEADER = 4, // Pasteur Titulaire / Ancien de Paroisse
  DISTRICT_LEADER = 5,
  REGIONAL_LEADER = 6,
  NATIONAL_BUREAU = 7,
  SUPER_ADMIN = 8,
}

export interface UserRoleDetail {
  id?: string;
  name?: string;
  role_name?: string;
  code?: string;
  description?: string;
  level?: string; // "N0" à "N8"
  level_num?: number;
  scope_type?: string;
  scope_id?: string;
  scope_name?: string;
  permissions?: string[];
}

export interface StoredUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  role_level?: number;
  roles?: UserRoleDetail[];
  permissions?: string[];
  assembly_id?: string;
  assembly_name?: string;
}

/**
 * Matrice canonique des permissions minimales garanties par échelon N0 à N8.
 */
const ROLE_PERMISSIONS_FALLBACK: Record<number, string[]> = {
  // N1 - Membre / Fidèle
  1: [
    "view:dashboard:member",
    "view:departments:list",
    "view:publications:list",
    "view:liturgy:planning",
    "view:social:feed",
    "view:messaging:chat",
    "can:refresh_stats",
    "can:print_receipt",
    "can:declare_unavailability",
    "liturgy:read",
    "publications:read",
  ],
  // N2 - Responsable de Département / Diacre / Trésorier
  2: [
    "view:members:list",
    "view:reports:list",
    "view:liturgy:count",
    "view:finance:incomes",
    "finance:validate",
    "finance:disburse",
    "can:validate_donation",
    "can:create_income",
    "can:create_expense",
    "can:disburse_cash",
    "can:disburse_saspay",
    "can:edit_count_sheet",
    "can:seal_count_pv",
    "can:add_department_member",
    "can:remove_department_member",
    "can:create_department_event",
    "can:create_department_planning",
    "can:create_department_report",
    "can:create_report",
    "can:create_planning",
    "can:edit_planning",
    "can:declare_unavailability",
    "departments:manage_members",
    "departments:manage_board",
    "departments:manage_events",
    "departments:manage_plannings",
    "departments:manage_reports",
    "reports:create",
    "liturgy:manage",
  ],
  // N3 - Chargé de Communication
  3: [
    "view:members:create",
    "can:create_publication",
    "publications:create",
  ],
  // N4 - Pasteur Titulaire / Conseil d'Anciens
  4: [
    "view:dashboard:pastor",
    "view:members:transfer",
    "view:organizations:tree",
    "view:finance:expenses",
    "view:finance:summary",
    "finance:validate",
    "finance:disburse",
    "can:validate_donation",
    "can:disburse_cash",
    "can:disburse_saspay",
    "can:export_national_pdf",
    "can:approve_count_pv",
    "can:validate_income",
    "can:cancel_income",
    "can:approve_expense",
    "can:reject_expense",
    "can:pastoral_visa_count",
    "can:create_publication",
    "can:validate_publication",
    "can:withdraw_publication",
    "can:export_incomes_csv",
    "can:create_department",
    "can:edit_department",
    "can:delete_department",
    "can:create_planning",
    "can:edit_planning",
    "can:validate_planning",
    "departments:create",
    "departments:update",
    "departments:delete",
    "publications:create",
    "publications:validate",
    "liturgy:validate",
  ],
  // N5 - Surintendant de District
  5: [
    "can:filter_by_assembly",
    "can:sign_transfer",
    "can:create_assembly",
    "can:edit_assembly",
    "can:delete_assembly",
    "organizations:create_assembly",
  ],
  // N6 - Surintendant Régional
  6: [
    "can:filter_by_assembly",
    "can:sign_transfer",
    "can:create_district",
    "can:edit_district",
    "organizations:create_district",
    "organizations:import_excel",
  ],
  // N7 - Bureau Exécutif National
  7: [
    "view:dashboard:national",
    "view:admin:roles",
    "view:admin:audit",
    "can:switch_dashboard_view",
    "can:publish_national",
    "can:sync_orphan_incomes",
    "can:create_region",
    "can:edit_region",
    "organizations:create_region",
  ],
  // N8 - Super Administrateur (Tous les droits)
  8: ["*"],
};

/**
 * Récupère l'ID du rôle actif sélectionné en session
 */
export function getActiveRoleId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fullgope_active_role_id");
}

/**
 * Définit le rôle actif en session
 */
export function setActiveRoleId(roleId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("fullgope_active_role_id", roleId);
}

/**
 * Retourne le rôle actif de l'utilisateur (ou le premier rôle par défaut)
 */
export function getActiveRole(user?: StoredUser | null): UserRoleDetail | null {
  const u = user !== undefined ? user : getStoredUser();
  if (!u || !Array.isArray(u.roles) || u.roles.length === 0) return null;

  const activeId = getActiveRoleId();
  if (activeId) {
    const found = u.roles.find((r: UserRoleDetail) => r.id === activeId);
    if (found) return found;
  }
  return u.roles[0];
}

/**
 * Récupère le niveau hiérarchique numérique (0 à 8) du compte connecté pour le rôle actif.
 */
export function getUserRoleLevel(user?: StoredUser | null): number {
  const u = user !== undefined ? user : getStoredUser();
  if (!u) return RoleLevel.VISITOR;

  // Priorité absolue au rôle actif sélectionné
  const activeRole = getActiveRole(u);
  if (activeRole) {
    if (typeof activeRole.level_num === "number") return activeRole.level_num;
    const num = parseInt((activeRole.level || "").replace(/\D/g, ""), 10);
    if (!isNaN(num)) return num;
  }

  if (typeof u.role_level === "number") return u.role_level;

  // Déduction via la liste des rôles
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    const levels = u.roles.map((r: any) => {
      if (typeof r.level_num === "number") return r.level_num;
      const num = parseInt((r.level || "").replace(/\D/g, ""), 10);
      return isNaN(num) ? 1 : num;
    });
    return Math.max(...levels, 1);
  }

  return RoleLevel.MEMBER;
}

/**
 * Vérifie si le rôle actif possède une permission spécifique (view:* ou can:*).
 * Le Super Admin (N8) renvoie inconditionnellement true.
 */
export function hasPermission(permission: string, user?: StoredUser | null): boolean {
  const u = user !== undefined ? user : getStoredUser();
  if (!u) return false;

  const level = getUserRoleLevel(u);
  if (level >= RoleLevel.SUPER_ADMIN) return true;

  const activeRole = getActiveRole(u);

  // 1. Contrôle direct dans les permissions du rôle actif sélectionné
  if (activeRole && Array.isArray(activeRole.permissions) && activeRole.permissions.includes(permission)) {
    return true;
  }

  // 2. Contrôle cumulatif via la matrice descendante pour le niveau du rôle actif
  for (let lvl = 1; lvl <= level; lvl++) {
    const perms = ROLE_PERMISSIONS_FALLBACK[lvl];
    if (perms && perms.includes(permission)) {
      return true;
    }
  }

  // 3. Fallback uniquement si le rôle actif n'a pas de permissions définies
  if ((!activeRole || !activeRole.permissions) && Array.isArray(u.permissions) && u.permissions.includes(permission)) {
    return true;
  }

  return false;
}

/**
 * Vérifie si le rôle actif correspond à un code de rôle
 * (par code canonique exact ou sous-chaîne, insensible à la casse).
 */
export function hasRoleCode(rolePattern: string, user?: StoredUser | null): boolean {
  const u = user !== undefined ? user : getStoredUser();
  if (!u) return false;
  const level = getUserRoleLevel(u);
  if (level >= RoleLevel.SUPER_ADMIN) return true;

  const target = rolePattern.toLowerCase();
  const activeRole = getActiveRole(u);

  if (activeRole) {
    const code = (activeRole.code || "").toLowerCase();
    const name = (activeRole.name || activeRole.role_name || "").toLowerCase();
    if (code === target || code.includes(target) || name.includes(target)) {
      return true;
    }
  }

  return false;
}

/**
 * Vérifie si l'utilisateur détient une fonction de trésorerie (national, régional, district, assemblée ou département).
 */
export function isTreasurer(user?: StoredUser | null): boolean {
  return hasRoleCode("treasurer", user) || hasRoleCode("trésorier", user);
}

/**
 * Vérifie si l'utilisateur est Pasteur Titulaire d'Assemblée.
 */
export function isSeniorPastor(user?: StoredUser | null): boolean {
  return hasRoleCode("senior_pastor", user) || hasRoleCode("pasteur titulaire", user);
}

/**
 * Vérifie si l'utilisateur est la plus haute instance religieuse : Surintendant Général.
 */
export function isGeneralSuperintendent(user?: StoredUser | null): boolean {
  return hasRoleCode("general_superintendent", user) || hasRoleCode("surintendant général", user);
}

/**
 * Vérifie si l'utilisateur est Responsable Louange / Chef de Chorale.
 */
export function isChoraleLeader(user?: StoredUser | null): boolean {
  return hasRoleCode("chorale", user) || hasRoleCode("louange", user);
}

/**
 * Vérifie si le rôle actif de l'utilisateur correspond à un Responsable / Délégué de Département (N2).
 */
export function isDepartmentLeader(user?: StoredUser | null): boolean {
  const u = user !== undefined ? user : getStoredUser();
  if (!u) return false;
  const level = getUserRoleLevel(u);
  if (level === RoleLevel.DEPARTMENT_HEAD) return true;
  const activeRole = getActiveRole(u);
  if (activeRole) {
    if (activeRole.scope_type === "department") return true;
    const code = (activeRole.code || "").toLowerCase();
    const name = (activeRole.name || activeRole.role_name || "").toLowerCase();
    if (
      code.includes("department") ||
      code.includes("departement") ||
      code.includes("leader") ||
      code.includes("louange") ||
      code.includes("chorale") ||
      code.includes("jeunesse") ||
      code.includes("dorcas") ||
      code.includes("ecodim") ||
      code.includes("femmes") ||
      code.includes("hommes") ||
      name.includes("département") ||
      name.includes("responsable") ||
      name.includes("délégué")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Retourne le rôle principal (celui au niveau le plus élevé dans le panier).
 */
export function getPrimaryRole(user?: StoredUser | null): UserRoleDetail | null {
  const u = user !== undefined ? user : getStoredUser();
  if (!u || !Array.isArray(u.roles) || u.roles.length === 0) return null;
  return u.roles[0];
}

/**
 * Retourne l'ensemble du panier de rôles attribués à l'utilisateur.
 */
export function getRolesBasket(user?: StoredUser | null): UserRoleDetail[] {
  const u = user !== undefined ? user : getStoredUser();
  if (!u || !Array.isArray(u.roles)) return [];
  return u.roles;
}

/**
 * Contrôle si l'utilisateur possède au moins le niveau hiérarchique minimal demandé.
 */
export function hasRoleLevel(minLevel: number, user?: StoredUser | null): boolean {
  const level = getUserRoleLevel(user);
  return level >= minLevel;
}

/**
 * Vérification combinée souple d'accès à un élément ou écran.
 */
export function can(
  options: { permission?: string; minRole?: number; roleCode?: string },
  user?: StoredUser | null
): boolean {
  const u = user !== undefined ? user : getStoredUser();
  if (!u) return false;

  const level = getUserRoleLevel(u);
  if (level >= RoleLevel.SUPER_ADMIN) return true;

  if (options.roleCode && !hasRoleCode(options.roleCode, u)) {
    return false;
  }

  if (options.minRole !== undefined && level < options.minRole) {
    return false;
  }

  if (options.permission) {
    return hasPermission(options.permission, u);
  }

  return true;
}
