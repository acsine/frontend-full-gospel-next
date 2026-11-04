"use client";

import React, { useState, useEffect } from "react";
import { getStoredUser } from "@/lib/api";
import {
  can as checkCan,
  hasPermission as checkHasPermission,
  hasRoleLevel as checkHasRoleLevel,
  hasRoleCode,
  isTreasurer,
  isSeniorPastor,
  isGeneralSuperintendent,
  isChoraleLeader,
  getPrimaryRole,
  getActiveRole,
  getActiveRoleId,
  setActiveRoleId,
  getUserRoleLevel,
  RoleLevel,
  StoredUser,
  UserRoleDetail,
} from "@/lib/permissions";

interface CanProps {
  permission?: string;
  minRole?: number;
  roleCode?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Composant de garde d'affichage basé sur les permissions et le rôle de l'utilisateur.
 * Masque totalement son contenu si l'utilisateur ne dispose pas des droits requis.
 */
export function Can({ permission, minRole, roleCode, children, fallback = null }: CanProps) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAuthorized = checkCan({ permission, minRole, roleCode }, user);
  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook React retournant l'état d'autorisation réactif du compte connecté.
 * Expose le panier complet des rôles et les fonctions d'évaluation ecclésiales.
 */
export function usePermissions() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const roleLevel = getUserRoleLevel(user);
  const roles: UserRoleDetail[] = user?.roles || [];
  const primaryRole = getPrimaryRole(user);
  const activeRole = getActiveRole(user);
  const activePermissions = activeRole?.permissions || user?.permissions || [];

  return {
    user,
    mounted,
    roleLevel,
    roles,
    primaryRole,
    activeRole,
    permissions: activePermissions,
    isSuperAdmin: roleLevel >= RoleLevel.SUPER_ADMIN,
    isGeneralSuperintendent: isGeneralSuperintendent(user),
    isNational: roleLevel >= RoleLevel.NATIONAL_BUREAU,
    isRegional: roleLevel >= RoleLevel.REGIONAL_LEADER,
    isDistrict: roleLevel >= RoleLevel.DISTRICT_LEADER,
    isPastor: roleLevel >= RoleLevel.ASSEMBLY_LEADER,
    isSeniorPastor: isSeniorPastor(user),
    isTreasurer: isTreasurer(user),
    isChoraleLeader: isChoraleLeader(user),
    isCommunicator: roleLevel >= RoleLevel.COMMUNICATOR,
    isDepartmentHead: roleLevel >= RoleLevel.DEPARTMENT_HEAD,
    isMember: roleLevel >= RoleLevel.MEMBER,
    hasPermission: (perm: string) => checkHasPermission(perm, user),
    hasRole: (minRole: number) => checkHasRoleLevel(minRole, user),
    hasRoleCode: (roleCode: string) => hasRoleCode(roleCode, user),
    can: (opts: { permission?: string; minRole?: number; roleCode?: string }) => checkCan(opts, user),
  };
}

