/**
 * FULLGOPE API Client
 * Generated and aligned with the FastAPI backend (OpenAPI 3.1.0 specification)
 * Base URL: http://localhost:8000
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Token Management ---
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("fullgope_access_token");
  if (!token || token === "undefined" || token === "null" || token.trim() === "") return null;
  return token;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("fullgope_refresh_token");
  if (!token || token === "undefined" || token === "null" || token.trim() === "") return null;
  return token;
}

export function setTokens(access: string, refresh?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("fullgope_access_token", access);

  // Set lightweight authentication marker cookie (guaranteed < 50 bytes, fits any browser)
  document.cookie = "fullgope_auth=1; path=/; max-age=604800; SameSite=Lax";

  // Browser cookie specification limits individual cookies to 4096 bytes.
  // Large enterprise JWTs (with extensive RBAC permissions) exceed 4KB.
  // We chunk the token across 3000-byte pieces and store chunk count.
  const CHUNK_SIZE = 3000;
  if (access.length > CHUNK_SIZE) {
    const chunkCount = Math.ceil(access.length / CHUNK_SIZE);
    document.cookie = `fullgope_token_chunks=${chunkCount}; path=/; max-age=604800; SameSite=Lax`;
    for (let i = 0; i < chunkCount; i++) {
      const chunk = access.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      document.cookie = `fullgope_access_token_${i}=${encodeURIComponent(chunk)}; path=/; max-age=604800; SameSite=Lax`;
    }
    // Also save first chunk under base key for compatibility
    document.cookie = `fullgope_access_token=${encodeURIComponent(access.slice(0, CHUNK_SIZE))}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = `fullgope_access_token=${encodeURIComponent(access)}; path=/; max-age=604800; SameSite=Lax`;
  }

  if (refresh) {
    localStorage.setItem("fullgope_refresh_token", refresh);
    if (refresh.length <= 3500) {
      document.cookie = `fullgope_refresh_token=${encodeURIComponent(refresh)}; path=/; max-age=2592000; SameSite=Lax`;
    }
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fullgope_access_token");
  localStorage.removeItem("fullgope_refresh_token");
  localStorage.removeItem("fullgope_user");
  document.cookie = "fullgope_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_token_chunks=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_access_token_0=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_access_token_1=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_access_token_2=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_access_token_3=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  document.cookie = "fullgope_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}

export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("fullgope_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- Refresh Token Mutex & Helper ---
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onTokenRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

/**
 * Reformule les messages d'erreur techniques ou bruts du backend en messages
 * clairs, compréhensibles, courtois et adaptés au contexte ecclésial en français.
 */
export function formatBackendErrorMessage(raw: any, statusCode?: number): string {
  // If nothing provided, return default message based on status code
  if (!raw && statusCode) {
    if (statusCode === 401) return "Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.";
    if (statusCode === 403) return "Accès refusé : vous ne disposez pas des privilèges nécessaires pour cette opération.";
    if (statusCode === 404) return "L'élément ou l'enregistrement demandé est introuvable.";
    if (statusCode === 409) return "Un enregistrement avec ces coordonnées existe déjà.";
    if (statusCode === 422) return "Veuillez vérifier les informations saisies : certains champs obligatoires sont manquants ou invalides.";
    if (statusCode >= 500) return "Une anomalie technique temporaire est survenue sur le serveur central. Veuillez réessayer dans un instant.";
    return `Une erreur inattendue est survenue (code ${statusCode}).`;
  }

  // If raw is an object with errors array or detail
  if (typeof raw === "object" && raw !== null) {
    if (Array.isArray(raw.data?.errors) && raw.data.errors.length > 0) {
      return formatBackendErrorMessage(raw.data.errors, statusCode);
    }
    if (Array.isArray(raw.errors) && raw.errors.length > 0) {
      return formatBackendErrorMessage(raw.errors, statusCode);
    }
    if (Array.isArray(raw.detail) && raw.detail.length > 0) {
      return formatBackendErrorMessage(raw.detail, statusCode);
    }
  }

  // Handle error array (e.g. FastAPI / Pydantic validation errors)
  if (Array.isArray(raw)) {
    const fieldMap: Record<string, string> = {
      identifier: "l'identifiant ou matricule",
      email: "l'adresse email",
      password: "le mot de passe",
      phone: "le numéro de téléphone",
      amount: "le montant",
      assembly_id: "l'assemblée de rattachement",
      transfer_date: "la date de transfert",
      to_assembly_id: "l'assemblée de destination",
      reason: "le motif",
      first_name: "le prénom",
      last_name: "le nom",
      category_id: "la catégorie",
      account_id: "le compte financier",
      role_level: "le niveau de rôle",
      title: "l'intitulé de la dépense",
      beneficiary_name: "le nom du bénéficiaire",
      beneficiary_phone: "le numéro de téléphone du bénéficiaire",
      requested_amount: "le montant demandé",
      description: "la description ou motif",
      node_type: "le niveau de gouvernance",
      node_id: "l'entité ecclésiale",
      department_id: "le département paroissial",
      source_account_id: "le compte financier source",
    };

    const details = raw
      .map((item: any) => {
        if (typeof item === "string") {
          return item.replace(/^Value error,\s*/i, "").trim();
        }
        if (item && typeof item === "object") {
          // Check for direct field error: { transfer_date: "Value error, ..." }
          const nonMetaKeys = Object.keys(item).filter(
            (k) => k !== "location" && k !== "loc" && k !== "type" && k !== "ctx"
          );
          for (const key of nonMetaKeys) {
            let msg = String(item[key] || "");
            msg = msg.replace(/^Value error,\s*/i, "").trim();
            return msg;
          }

          // Check for item.msg or item.message
          if (item.msg || item.message) {
            let msg = String(item.msg || item.message).replace(/^Value error,\s*/i, "").trim();
            const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : (item.location || "");
            const fieldFr = fieldMap[field] || (field ? `le champ "${field}"` : "");
            if (item?.type === "missing" || msg.toLowerCase().includes("required")) {
              return fieldFr ? `${fieldFr} est requis` : "Un champ obligatoire est manquant";
            }
            return msg;
          }
        }
        return "";
      })
      .filter(Boolean);

    if (details.length > 0) {
      return details.join(" • ");
    }
    return "Certains champs obligatoires sont manquants ou invalides.";
  }

  // If raw is an object with { detail: ... } or { message: ... }
  if (typeof raw === "object" && raw !== null) {
    if (raw.message && typeof raw.message === "string") return formatBackendErrorMessage(raw.message, statusCode);
    if (raw.detail) return formatBackendErrorMessage(raw.detail, statusCode);
    if (raw.error && typeof raw.error === "string") return formatBackendErrorMessage(raw.error, statusCode);
    try {
      raw = JSON.stringify(raw);
    } catch {
      raw = String(raw);
    }
  }

  const str = String(raw || "").trim();
  const lower = str.toLowerCase();

  // 1. Network & server connectivity errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("err_connection") ||
    lower.includes("socket hang up")
  ) {
    return "Impossible de joindre le serveur central FULLGOPE (Port 8000). Veuillez vérifier votre connexion réseau ou vous assurer que le serveur est démarré.";
  }

  // 2. Timeout errors
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("aborterror")) {
    return "Le serveur a mis trop de temps à répondre. Veuillez vérifier votre connexion et renouveler votre demande.";
  }

  // 3. Authentication & credentials (401)
  if (
    lower.includes("invalid credentials") ||
    lower.includes("incorrect username or password") ||
    lower.includes("incorrect email or password") ||
    lower.includes("invalid username or password") ||
    lower.includes("invalid password") ||
    lower.includes("could not validate credentials") ||
    lower.includes("bad credentials")
  ) {
    return "Identifiant ou mot de passe incorrect. Veuillez vérifier votre adresse email / matricule et ressaisir votre mot de passe.";
  }

  if (
    lower.includes("token expired") ||
    lower.includes("signature has expired") ||
    lower.includes("token has expired") ||
    lower.includes("not authenticated") ||
    lower.includes("invalid token")
  ) {
    return "Votre session de connexion a expiré ou est invalide. Veuillez vous reconnecter au portail.";
  }

  if (
    lower.includes("user inactive") ||
    lower.includes("user is disabled") ||
    lower.includes("account disabled") ||
    lower.includes("inactive user")
  ) {
    return "Ce compte utilisateur a été temporairement désactivé ou suspendu par l'administration pastorale.";
  }

  if (lower.includes("user not found") || lower.includes("utilisateur non trouvé")) {
    return "Aucun compte utilisateur ne correspond à cet identifiant ou matricule.";
  }

  // 4. Permissions & Authorization (403)
  if (
    lower.includes("forbidden") ||
    lower.includes("not enough permissions") ||
    lower.includes("operation not permitted") ||
    lower.includes("access denied") ||
    statusCode === 403
  ) {
    return "Accès refusé : votre profil ecclésial ne dispose pas des privilèges nécessaires pour cette opération.";
  }

  // 5. Conflicts & Duplicates (409)
  if (
    lower.includes("already exists") ||
    lower.includes("duplicate key") ||
    lower.includes("uniqueviolation") ||
    lower.includes("integrityerror") ||
    statusCode === 409
  ) {
    return "Un enregistrement avec ces coordonnées (adresse email, numéro de téléphone ou matricule) existe déjà en base de données.";
  }

  // 6. Validation / 422
  if (lower.includes("unprocessable entity") || lower.includes("validation error") || statusCode === 422) {
    return "Certaines informations saisies sont incomplètes ou invalides. Veuillez vérifier les champs obligatoires.";
  }

  // 7. Server technical errors (500, 502, 503)
  if (
    lower.includes("internal server error") ||
    lower.includes("server error") ||
    lower.includes("bad gateway") ||
    statusCode === 500 ||
    statusCode === 502
  ) {
    return "Une anomalie technique temporaire est survenue sur le serveur central. Veuillez réessayer dans quelques instants.";
  }

  if (lower.includes("service unavailable") || statusCode === 503) {
    return "Le service FULLGOPE est momentanément indisponible pour maintenance. Veuillez réessayer sous peu.";
  }

  // If already a clear human message, return it
  return str;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  // If already refreshing in background, wait for result
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.data?.access_token) {
      const newAccess = json.data.access_token;
      const newRefresh = json.data.refresh_token || refreshToken;
      setTokens(newAccess, newRefresh);
      onTokenRefreshed(newAccess);
      return newAccess;
    }
  } catch (err) {
    console.warn("FULLGOPE: Erreur lors du rafraîchissement du jeton", err);
  } finally {
    isRefreshing = false;
  }

  // If refresh failed, clear invalid tokens
  onTokenRefreshed(null);
  clearTokens();
  return null;
}

// --- Generic Request Helper ---
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: boolean; message?: string; status?: number }> {
  let token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    let res = await fetch(url, {
      ...options,
      headers,
    });

    // Auto-refresh token if 401 Unauthorized received on protected route
    if (
      res.status === 401 &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/refresh") &&
      getRefreshToken()
    ) {
      const freshToken = await refreshAccessToken();
      if (freshToken) {
        headers["Authorization"] = `Bearer ${freshToken}`;
        res = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const rawErrMsg = json.data?.errors || json.errors || json.detail || json.message || json.error || json;
      const formatted = formatBackendErrorMessage(rawErrMsg, res.status);
      return {
        error: true,
        message: formatted,
        data: json.data,
        status: res.status,
      };
    }

    // Extract payload from standard ReplyJSON { status, code, data: ... }
    const rawData = json.data !== undefined ? json.data : json;

    // Auto-normalize list wrappers: e.g. { members: [...] } or { assemblies: [...] } to items
    let normalizedData = rawData;
    if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
      const listKey = Object.keys(rawData).find(
        (k) => Array.isArray(rawData[k]) && k !== "errors" && k !== "history"
      );
      if (listKey && !rawData.items) {
        normalizedData = {
          ...rawData,
          items: rawData[listKey],
          total: rawData.total !== undefined ? rawData.total : rawData[listKey].length,
        };
      }
    }

    return {
      data: normalizedData,
      error: false,
      message: json.message,
      status: res.status,
    };
  } catch (err: any) {
    const formatted = formatBackendErrorMessage(err?.message || err, 503);
    return {
      error: true,
      message: formatted,
      status: 503,
    };
  }
}

// =============================================================================
// API CLIENT
// =============================================================================
export const api = {
  // 1. Authentification & Profil
  auth: {
    login: async (credentials: { identifier: string; password: string }) => {
      const res = await request<{
        access_token: string;
        refresh_token: string;
        token_type?: string;
        user: any;
      }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      if (res.data?.access_token) {
        setTokens(res.data.access_token, res.data.refresh_token);
        if (res.data.user) {
          localStorage.setItem("fullgope_user", JSON.stringify(res.data.user));
        }
      }
      return res;
    },

    refreshToken: refreshAccessToken,

    register: (payload: {
      email?: string;
      phone?: string;
      password: string;
      first_name: string;
      last_name: string;
      invitation_token?: string;
      assembly_id?: string;
    }) =>
      request("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getProfile: () => request("/api/v1/auth/profile"),

    updateProfile: (data: any) =>
      request("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    logout: async () => {
      await request("/api/v1/auth/logout", { method: "POST" });
      clearTokens();
    },
  },

  // 2. Territoire & Assemblées (Organizations)
  organizations: {
    getHierarchy: () => request("/api/v1/organizations/hierarchy"),
    getTree: () => request("/api/v1/organizations/tree"),
    getStats: () => request("/api/v1/organizations/stats"),

    listRegions: () => request<any[]>("/api/v1/regions"),
    getRegion: (id: string) => request(`/api/v1/regions/${id}`),

    listDistricts: (regionId?: string) =>
      request<any[]>(
        `/api/v1/districts${regionId ? `?region_id=${regionId}` : ""}`
      ),

    listAssemblies: (params?: {
      district_id?: string;
      region_id?: string;
      status?: string;
      city?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.district_id) query.append("district_id", params.district_id);
      if (params?.region_id) query.append("region_id", params.region_id);
      if (params?.status) query.append("status", params.status);
      if (params?.city) query.append("city", params.city);
      if (params?.search) query.append("search", params.search);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<{ items: any[]; total: number }>(
        `/api/v1/assemblies?${query.toString()}`
      );
    },

    getAssembly: (id: string) => request(`/api/v1/assemblies/${id}`),

    getNearbyAssemblies: (latitude: number, longitude: number, radiusKm = 25) =>
      request<any[]>(
        `/api/v1/assemblies/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`
      ),

    getAssembliesGeoJSON: (regionId?: string) =>
      request(
        `/api/v1/assemblies/geojson${regionId ? `?region_id=${regionId}` : ""}`
      ),

    listRepresentatives: (assemblyId: string) =>
      request<any[]>(`/api/v1/assemblies/${assemblyId}/representatives`),

    addRepresentative: (
      assemblyId: string,
      data: {
        user_id: string;
        representative_type: string;
        function_title?: string;
        phone?: string;
        whatsapp?: string;
        email?: string;
        availability?: string;
        contact_visibility?: string;
      }
    ) =>
      request(`/api/v1/assemblies/${assemblyId}/representatives`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createRegion: (data: {
      name: string;
      code: string;
      description?: string;
      leader_id?: string;
      zone_description?: string;
    }) =>
      request("/api/v1/regions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateRegion: (
      regionId: string,
      data: {
        name?: string;
        description?: string;
        leader_id?: string;
        zone_description?: string;
      }
    ) =>
      request(`/api/v1/regions/${regionId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteRegion: (regionId: string) =>
      request(`/api/v1/regions/${regionId}`, {
        method: "DELETE",
      }),

    createDistrict: (data: {
      name: string;
      code: string;
      region_id: string;
      description?: string;
      leader_id?: string;
      zone_description?: string;
    }) =>
      request("/api/v1/districts", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateDistrict: (
      districtId: string,
      data: {
        name?: string;
        description?: string;
        leader_id?: string;
        zone_description?: string;
        region_id?: string;
      }
    ) =>
      request(`/api/v1/districts/${districtId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteDistrict: (districtId: string) =>
      request(`/api/v1/districts/${districtId}`, {
        method: "DELETE",
      }),

    createAssembly: (data: {
      name: string;
      code: string;
      district_id: string;
      description?: string;
      address?: string;
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      status?: string;
      phone?: string;
      email?: string;
      parent_assembly_id?: string;
      worship_schedule?: Array<{ day: string; time: string; type?: string }>;
    }) =>
      request("/api/v1/assemblies", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateAssembly: (
      assemblyId: string,
      data: {
        name?: string;
        description?: string;
        address?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        status?: string;
        phone?: string;
        email?: string;
        parent_assembly_id?: string;
        worship_schedule?: Array<{ day: string; time: string; type?: string }>;
      }
    ) =>
      request(`/api/v1/assemblies/${assemblyId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteAssembly: (assemblyId: string) =>
      request(`/api/v1/assemblies/${assemblyId}`, {
        method: "DELETE",
      }),

    transferAssembly: (
      assemblyId: string,
      data: {
        to_district_id: string;
        reason?: string;
      }
    ) =>
      request(`/api/v1/assemblies/${assemblyId}/transfer`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    uploadAssembliesExcel: (formData: FormData) =>
      request("/api/v1/assemblies/upload-excel", {
        method: "POST",
        body: formData,
      }),
  },

  // 3. Membres
  members: {
    list: (params?: {
      assembly_id?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.status) query.append("status", params.status);
      if (params?.search) query.append("search", params.search);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<{ items: any[]; total: number }>(
        `/api/v1/members?${query.toString()}`
      );
    },

    getMyProfile: () => request("/api/v1/members/me"),
    getStats: (assemblyId?: string) =>
      request(
        `/api/v1/members/stats${assemblyId ? `?assembly_id=${assemblyId}` : ""}`
      ),

    getMember: (id: string) => request(`/api/v1/members/${id}`),

    create: (data: any) =>
      request("/api/v1/members", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request(`/api/v1/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request(`/api/v1/members/${id}`, {
        method: "DELETE",
      }),

    registerWithUser: (data: any) =>
      request<{ member: any }>("/api/v1/members/register-with-user", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    requestTransfer: (memberId: string, data: { to_assembly_id: string; reason: string; transfer_date?: string }) =>
      request(`/api/v1/members/${memberId}/transfer`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listTransfers: (params?: { assembly_id?: string; status?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.status) query.append("status", params.status);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<any[]>(`/api/v1/members/transfers?${query.toString()}`);
    },

    decideTransfer: (transferId: string, decision: { approved: boolean; reason?: string; recommendation_letter?: string }) =>
      request(`/api/v1/members/transfers/${transferId}/decide`, {
        method: "POST",
        body: JSON.stringify(decision),
      }),

    updateStatus: (
      memberId: string,
      statusOrData: string | { status: string; notes?: string; officiant?: string; effective_date?: string },
      notes?: string,
      officiant?: string
    ) => {
      const payload =
        typeof statusOrData === "string"
          ? { status: statusOrData, notes, officiant }
          : statusOrData;
      return request(`/api/v1/members/${memberId}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    exportJson: (params?: { assembly_id?: string; department_id?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.department_id) query.append("department_id", params.department_id);
      if (params?.status) query.append("status", params.status);
      return request(`/api/v1/members/export-json?${query.toString()}`);
    },

    export: (params?: { assembly_id?: string; department_id?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.department_id) query.append("department_id", params.department_id);
      if (params?.status) query.append("status", params.status);
      return request<{ columns: any[]; members: any[]; metadata?: any }>(
        `/api/v1/members/export?${query.toString()}`
      );
    },

    importExcel: async (data: {
      file: File;
      assembly_id: string;
      department_id?: string;
      create_user_accounts?: boolean;
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("assembly_id", data.assembly_id);
      if (data.department_id) formData.append("department_id", data.department_id);
      if (data.create_user_accounts !== undefined) {
        formData.append("create_user_accounts", String(data.create_user_accounts));
      }

      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/members/import-excel`, {
          method: "POST",
          headers,
          body: formData,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            error: true,
            message: json.message || json.detail || "Échec de l'importation Excel.",
            status: res.status,
            data: json.data || null,
          };
        }
        return {
          error: false,
          data: json.data !== undefined ? json.data : json,
          message: json.message,
          status: res.status,
        };
      } catch (err: any) {
        return {
          error: true,
          message: err?.message || "Erreur réseau lors de l'importation.",
          status: 0,
        };
      }
    },

    uploadExcel: (data: {
      file: File;
      assembly_id: string;
      department_id?: string;
      create_user_accounts?: boolean;
    }) => api.members.importExcel(data),

    listDepartments: (memberId: string) =>
      request(`/api/v1/members/${memberId}/departments`),

    assignDepartment: (memberId: string, data: { department_id: string; role?: string; joined_date?: string }) =>
      request(`/api/v1/members/${memberId}/departments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    removeDepartment: (memberId: string, departmentId: string) =>
      request(`/api/v1/members/${memberId}/departments/${departmentId}`, {
        method: "DELETE",
      }),
  },

  // 4. Départements & Ministères
  departments: {
    list: (params?: {
      assembly_id?: string;
      district_id?: string;
      region_id?: string;
      scope?: string;
      type?: string;
      search?: string;
    } | string, scopeArg?: string) => {
      const query = new URLSearchParams();
      if (typeof params === "string") {
        if (params) query.append("assembly_id", params);
        if (scopeArg) query.append("scope", scopeArg);
      } else if (params) {
        if (params.assembly_id) query.append("assembly_id", params.assembly_id);
        if (params.district_id) query.append("district_id", params.district_id);
        if (params.region_id) query.append("region_id", params.region_id);
        if (params.scope) query.append("scope", params.scope);
        if (params.type) query.append("type", params.type);
        if (params.search) query.append("search", params.search);
      }
      return request<any[]>(`/api/v1/departments?${query.toString()}`);
    },

    get: (id: string) => request<any>(`/api/v1/departments/${id}`),

    create: (data: {
      name: string;
      type?: string;
      description?: string;
      scope?: string;
      assembly_id?: string;
      district_id?: string;
      region_id?: string;
      head_id?: string;
      deputy_head_id?: string;
    }) =>
      request<any>("/api/v1/departments", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request<any>(`/api/v1/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<any>(`/api/v1/departments/${id}`, {
        method: "DELETE",
      }),

    listMembers: (id: string) =>
      request<any[]>(`/api/v1/departments/${id}/members`),

    addMember: (id: string, data: { member_id: string; role_name?: string }) =>
      request(`/api/v1/departments/${id}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    removeMember: (departmentId: string, memberId: string) =>
      request(`/api/v1/departments/${departmentId}/members/${memberId}`, {
        method: "DELETE",
      }),

    getBoard: (departmentId: string) =>
      request<{ items?: any[]; members?: any[]; board?: any[] } | any[]>(
        `/api/v1/departments/${departmentId}/board`
      ),

    assignBoardMember: (
      departmentId: string,
      data: {
        member_id?: string;
        user_id?: string;
        role: string;
        function_title?: string;
      }
    ) =>
      request(`/api/v1/departments/${departmentId}/board`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    revokeBoardMember: (departmentId: string, memberId: string) =>
      request(`/api/v1/departments/${departmentId}/board/${memberId}`, {
        method: "DELETE",
      }),

    listEvents: (
      departmentId: string,
      params?: { limit?: number; offset?: number }
    ) => {
      const query = new URLSearchParams();
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<any[]>(
        `/api/v1/departments/${departmentId}/events?${query.toString()}`
      );
    },

    createEvent: (
      departmentId: string,
      data: {
        title: string;
        start_datetime: string;
        end_datetime?: string;
        description?: string;
        event_type?: string;
        location_name?: string;
        location_address?: string;
        cover_image_url?: string;
      }
    ) =>
      request(`/api/v1/departments/${departmentId}/events`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listPlannings: (departmentId: string) =>
      request<any[]>(`/api/v1/departments/${departmentId}/plannings`),

    createPlanning: (
      departmentId: string,
      data: {
        service_type: string;
        period_start: string;
        period_end: string;
        assignments: Array<{ date: string; user_ids?: string[]; notes?: string }>;
      }
    ) =>
      request(`/api/v1/departments/${departmentId}/plannings`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listReports: (
      departmentId: string,
      params?: { period_year?: number; status?: string; limit?: number; offset?: number }
    ) => {
      const query = new URLSearchParams();
      if (params?.period_year) query.append("period_year", String(params.period_year));
      if (params?.status) query.append("status", params.status);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<any[]>(
        `/api/v1/departments/${departmentId}/reports?${query.toString()}`
      );
    },

    createReport: (
      departmentId: string,
      data: {
        title: string;
        content: string;
        period_month: number;
        period_year: number;
        kpi_metrics?: Record<string, any>;
        attachments?: any[];
      }
    ) =>
      request(`/api/v1/departments/${departmentId}/reports`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // 5. Publications & Enseignements
  publications: {
    getPublic: (params?: {
      publication_type?: string;
      tag?: string;
      search?: string;
      assembly_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.publication_type) query.append("publication_type", params.publication_type);
      if (params?.tag) query.append("tag", params.tag);
      if (params?.search) query.append("search", params.search);
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<{
        items: any[];
        total: number;
        category_counts?: any[];
        popular_tags?: any[];
      }>(`/api/v1/publications/public?${query.toString()}`);
    },

    list: (params?: any) => request("/api/v1/publications"),

    get: (identifier: string) =>
      request(`/api/v1/publications/${identifier}`),

    create: (data: any) =>
      request("/api/v1/publications", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    submitForValidation: (id: string) =>
      request(`/api/v1/publications/${id}/submit`, { method: "POST" }),

    registerView: (id: string) =>
      request(`/api/v1/publications/${id}/view`, { method: "POST" }),
  },

  // 6. Agenda & Conventions (Events)
  events: {
    list: (params?: {
      assembly_id?: string;
      scope_type?: string;
      event_type?: string;
      start_after?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.scope_type) query.append("scope_type", params.scope_type);
      if (params?.event_type) query.append("event_type", params.event_type);
      if (params?.start_after) query.append("start_after", params.start_after);
      if (params?.limit) query.append("limit", String(params.limit));
      return request<any[]>(`/api/v1/events?${query.toString()}`);
    },

    get: (id: string) => request(`/api/v1/events/${id}`),

    registerAttendance: (id: string, status = "registered") =>
      request(`/api/v1/events/${id}/attend?status=${status}`, { method: "POST" }),

    listPlannings: (assemblyId: string, departmentId?: string) => {
      const query = new URLSearchParams({ assembly_id: assemblyId });
      if (departmentId) query.append("department_id", departmentId);
      return request<any[]>(`/api/v1/events/plannings?${query.toString()}`);
    },

    createPlanning: (data: {
      assembly_id: string;
      department_id?: string;
      service_type: string;
      period_start: string;
      period_end: string;
      assignments: Array<{
        date: string;
        user_ids?: string[];
        role_title?: string;
        notes?: string;
      }>;
    }) =>
      request("/api/v1/events/plannings", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listUnavailabilities: (assemblyId: string) =>
      request(`/api/v1/events/unavailabilities?assembly_id=${assemblyId}`),

    declareUnavailability: (data: {
      assembly_id: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) =>
      request("/api/v1/events/unavailabilities", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    checkConflicts: (data: {
      user_ids: string[];
      period_start: string;
      period_end: string;
      assembly_id: string;
      exclude_planning_id?: string;
    }) =>
      request("/api/v1/events/plannings/check-conflicts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // 7. Réseau Social Communautaire (Social Network)
  social: {
    listPosts: (params?: {
      space_type?: string;
      space_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.space_type) query.append("space_type", params.space_type);
      if (params?.space_id) query.append("space_id", params.space_id);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<{ items: any[]; total: number }>(
        `/api/v1/social/posts?${query.toString()}`
      );
    },

    createPost: (data: {
      content: string;
      space_type?: string;
      space_id?: string;
      post_type?: string;
      verse_reference?: string;
      attachments?: any[];
    }) =>
      request("/api/v1/social/posts", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    addReaction: (postId: string, reactionType: "amen" | "pray" | "like" | "love" = "amen") =>
      request(`/api/v1/social/posts/${postId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ reaction_type: reactionType }),
      }),

    removeReaction: (postId: string) =>
      request(`/api/v1/social/posts/${postId}/reactions`, {
        method: "DELETE",
      }),

    listComments: (postId: string) =>
      request<any[]>(`/api/v1/social/posts/${postId}/comments`),

    addComment: (postId: string, content: string) =>
      request(`/api/v1/social/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),

    getFeedStreamUrl: (spaceType = "public", spaceId?: string) => {
      const token = getAccessToken();
      const query = new URLSearchParams({ space_type: spaceType });
      if (spaceId) query.append("space_id", spaceId);
      if (token) query.append("token", token);
      return `${API_BASE_URL}/api/v1/social/feed/stream?${query.toString()}`;
    },
  },

  // 8. Messagerie Fraternelle
  messaging: {
    listConversations: () =>
      request<{ conversations: any[] }>("/api/v1/messaging/conversations"),

    createConversation: (data: {
      conversation_type?: "direct" | "group" | "channel";
      type?: "direct" | "group" | "channel";
      participant_ids: string[];
      name?: string;
      title?: string;
      description?: string;
      assembly_id?: string;
      department_id?: string;
    }) => {
      const payload = {
        conversation_type: data.conversation_type || data.type || "direct",
        participant_ids: data.participant_ids || [],
        name: data.name || data.title,
        description: data.description,
        assembly_id: data.assembly_id,
        department_id: data.department_id,
      };
      return request<{ conversation: any }>("/api/v1/messaging/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    listMessages: (conversationId: string, limit = 50, offset = 0) =>
      request<{ messages: any[]; items?: any[]; total?: number }>(
        `/api/v1/messaging/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
      ),

    sendMessage: (
      conversationId: string,
      data: {
        content: string;
        message_type?: "text" | "audio" | "image" | "file";
        attachment_url?: string;
        media_url?: string;
      }
    ) =>
      request<{ message: any }>(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    markAsRead: (conversationId: string) =>
      request(`/api/v1/messaging/conversations/${conversationId}/read`, {
        method: "POST",
      }),

    getConversationStreamUrl: (conversationId: string) => {
      const token = getAccessToken();
      const query = new URLSearchParams();
      if (token) query.append("token", token);
      return `${API_BASE_URL}/api/v1/messaging/conversations/${conversationId}/stream?${query.toString()}`;
    },
  },

  // 9. Dons & Campagnes (Donations)
  donations: {
    makeDonation: (data: {
      amount: number;
      donation_type: "tithe" | "offering" | "special_project" | "thanksgiving";
      assembly_id?: string;
      payment_method: "mtn_momo" | "orange_money" | "gimac" | "cash";
      donor_name?: string;
      donor_phone?: string;
      prayer_request?: string;
      is_anonymous?: boolean;
    }) =>
      request<{ receipt_number: string; transaction_id: string; amount: number }>(
        "/api/v1/donations",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    getMyDonations: () => request<any[]>("/api/v1/donations/my-donations"),

    listCampaigns: (assemblyId?: string, isActive = true) => {
      const query = new URLSearchParams({ is_active: String(isActive) });
      if (assemblyId) query.append("assembly_id", assemblyId);
      return request<any[]>(`/api/v1/donations/campaigns?${query.toString()}`);
    },

    getStats: (assemblyId?: string) =>
      request(
        `/api/v1/donations/stats${assemblyId ? `?assembly_id=${assemblyId}` : ""}`
      ),

    // Cycle de paiement en 3 étapes (Initiation, Complétion, Validation)
    initiatePayment: (data: {
      amount: number;
      donation_type: string;
      currency?: string;
      recipient_type?: string;
      assembly_id?: string;
      campaign_id?: string;
      donor_name?: string;
      donor_phone?: string;
      donor_email?: string;
      is_anonymous?: boolean;
      prayer_request?: string;
    }) =>
      request<{ payment: any }>(
        "/api/v1/donations/initiate",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    completePayment: (donationId: string, data: {
      payment_method: string;
      phone_number?: string;
      payment_reference?: string;
      sender_name?: string;
      transfer_date?: string;
      proof_url?: string;
    }) =>
      request<{ completion: any }>(
        `/api/v1/donations/${donationId}/complete`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    verifyAutoPayment: (donationId: string) =>
      request<{ donation: any }>(
        `/api/v1/donations/${donationId}/verify-auto`,
        {
          method: "POST",
        }
      ),

    checkPaymentStatus: (donationId: string) =>
      request<{ payment_status: { donation_id: string; status: string; receipt_number?: string; message?: string; amount?: number } }>(
        `/api/v1/donations/${donationId}/status`,
        {
          method: "GET",
        }
      ),

    getTreasuryAccounts: (assemblyId?: string) =>
      request<{ treasury_accounts: any }>(
        `/api/v1/donations/treasury-accounts${assemblyId ? `?assembly_id=${assemblyId}` : ""}`
      ),

    getPendingValidations: (assemblyId?: string) =>
      request<{ pending_donations: any[] }>(
        `/api/v1/donations/pending-validation${assemblyId ? `?assembly_id=${assemblyId}` : ""}`
      ),

    validateManualDonation: (donationId: string, data: {
      reference: string;
      amount: number;
      treasury_notes?: string;
    }) =>
      request<{ donation: any }>(
        `/api/v1/donations/${donationId}/validate-manual`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    rejectManualDonation: (donationId: string, data: {
      reason: string;
    }) =>
      request<{ message: string; status: string }>(
        `/api/v1/donations/${donationId}/reject-manual`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    getDonationStreamUrl: (donationId: string) =>
      `${API_BASE_URL}/api/v1/donations/${donationId}/stream`,

    // Webhooks & Simulation de Déploiement
    getWebhookInfo: () =>
      request<{
        provider: string;
        official_webhook_path: string;
        alternative_paths: string[];
        method: string;
        realtime_transport: string;
      }>("/api/v1/donations/webhooks/info"),

    simulateWebhook: (data: {
      donation_id?: string;
      reference?: string;
      status?: "completed" | "failed";
      amount?: number;
    }) =>
      request<{ result: any }>("/api/v1/donations/webhooks/simulate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // 10. Finances, Caisse & Double Visa (Finance & Treasury - Module V1)
  finance: {
    getFinanceStreamUrl: (nodeId?: string) => {
      const token = getAccessToken() || "";
      const base = `${API_BASE_URL}/api/v1/finance/stream`;
      const params = new URLSearchParams();
      if (nodeId) params.append("node_id", nodeId);
      if (token) params.append("token", token);
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },

    getDashboard: (nodeType = "assembly", nodeId?: string) => {
      const query = new URLSearchParams({ node_type: nodeType });
      if (nodeId) query.append("node_id", nodeId);
      return request<{ dashboard: any }>(`/api/v1/finance/dashboard?${query.toString()}`);
    },

    getBalancesSummary: (nodeId?: string, departmentId?: string) => {
      const query = new URLSearchParams();
      if (nodeId) query.append("node_id", nodeId);
      if (departmentId) query.append("department_id", departmentId);
      return request<{ summary: any }>(`/api/v1/finance/balances-summary?${query.toString()}`);
    },

    getBalancesBreakdown: (nodeId?: string, departmentId?: string) => {
      const query = new URLSearchParams();
      if (nodeId) query.append("node_id", nodeId);
      if (departmentId) query.append("department_id", departmentId);
      return request<{ balances: any; accounts_by_type: any }>(`/api/v1/finance/balances-breakdown?${query.toString()}`);
    },

    createAccount: (data: {
      name: string;
      code: string;
      account_type: "cash" | "bank" | "mobile_money";
      node_id?: string;
      department_id?: string;
      bank_name?: string;
      account_number?: string;
      momo_number?: string;
    }) =>
      request<{ account: any }>("/api/v1/finance/accounts", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listAccounts: (nodeId?: string, departmentId?: string, accountType?: string) => {
      const query = new URLSearchParams();
      if (nodeId) query.append("node_id", nodeId);
      if (departmentId) query.append("department_id", departmentId);
      if (accountType) query.append("account_type", accountType);
      const qs = query.toString();
      return request<{ accounts: any[] }>(`/api/v1/finance/accounts${qs ? `?${qs}` : ""}`);
    },

    listCategories: (categoryType?: "income" | "expense") => {
      const query = new URLSearchParams();
      if (categoryType) query.append("category_type", categoryType);
      const qs = query.toString();
      return request<{ categories: any[] }>(`/api/v1/finance/categories${qs ? `?${qs}` : ""}`);
    },

    createCategory: (data: {
      name: string;
      code: string;
      category_type: "income" | "expense";
      description?: string;
    }) =>
      request<{ category: any }>("/api/v1/finance/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createCountSession: (data: {
      assembly_id: string;
      session_type: string;
      denominations: Record<string, number>;
      counters: { counter1_id: string; counter2_id: string };
      signatures: { counter1_sig: string; counter2_sig: string };
    }) =>
      request<{ count_session: any }>("/api/v1/finance/count-sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listIncomes: (params?: {
      assembly_id?: string;
      department_id?: string;
      status?: string;
      category_id?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.assembly_id) query.append("assembly_id", params.assembly_id);
      if (params?.department_id) query.append("department_id", params.department_id);
      if (params?.status) query.append("status", params.status);
      if (params?.category_id) query.append("category_id", params.category_id);
      const qs = query.toString();
      return request<{ incomes: any[] }>(`/api/v1/finance/incomes${qs ? `?${qs}` : ""}`);
    },

    createIncome: (data: {
      node_type: string;
      category_id: string;
      destination_account_id: string;
      amount: number;
      income_date: string;
      payment_method: string;
      assembly_id?: string;
      department_id?: string;
      payment_reference?: string;
      member_id?: string;
      is_anonymous?: boolean;
      notes?: string;
    }) =>
      request<{ income: any }>("/api/v1/finance/incomes", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    validateIncome: (incomeId: string) =>
      request<{ income: any }>(`/api/v1/finance/incomes/${incomeId}/validate`, {
        method: "POST",
      }),

    cancelIncome: (incomeId: string, reason: string) =>
      request<{ income: any }>(`/api/v1/finance/incomes/${incomeId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),

    syncOrphanIncomes: () =>
      request<{ updated_count: number }>("/api/v1/finance/incomes/sync-assemblies", {
        method: "POST",
      }),

    createFinancialEvent: (data: any) =>
      request<{ event: any }>("/api/v1/finance/events", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createLevyScheme: (data: any) =>
      request<{ scheme: any }>("/api/v1/finance/levy-schemes", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    createDepartmentExemption: (data: {
      department_id: string;
      category_id?: string;
      is_exempt: boolean;
      reason?: string;
    }) =>
      request("/api/v1/finance/department-exemptions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listLevyObligations: (params?: {
      debtor_node_id?: string;
      creditor_node_id?: string;
      status?: string;
      period_year?: number;
      period_month?: number;
    }) => {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
        });
      }
      const qs = query.toString();
      return request<{ obligations: any[] }>(`/api/v1/finance/levy-obligations${qs ? `?${qs}` : ""}`);
    },

    listExpenses: (nodeId?: string, status?: string) => {
      const query = new URLSearchParams();
      if (nodeId) query.append("node_id", nodeId);
      if (status) query.append("status", status);
      const qs = query.toString();
      return request<{ expenses: any[] }>(`/api/v1/finance/expense-requests${qs ? `?${qs}` : ""}`);
    },

    createExpenseRequest: (data: any) =>
      request<{ expense: any }>("/api/v1/finance/expense-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    decideExpense: (
      expenseId: string,
      decision: { is_approved?: boolean; rejection_reason?: string; decision?: string; comments?: string }
    ) => {
      const decisionStr = decision.decision || (decision.is_approved ? "approved" : "rejected");
      const commentsStr = decision.comments || decision.rejection_reason || undefined;
      return request<{ expense: any }>(`/api/v1/finance/expense-requests/${expenseId}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision: decisionStr, comments: commentsStr }),
      });
    },

    disburseExpense: (expenseId: string, data: any) =>
      request<{ expense: any }>(`/api/v1/finance/expense-requests/${expenseId}/disburse`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    disburseSasPay: (data: {
      amount: number;
      network: "mtn_cm" | "orange_cm";
      beneficiary_phone: string;
      beneficiary_name: string;
      reason: string;
      node_type?: string;
      node_id?: string;
      department_id?: string;
      source_account_id?: string;
      category_id?: string;
    }) =>
      request<{ disbursement: any }>("/api/v1/finance/saspay/disburse", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    disburseExpenseSasPay: (
      expenseId: string,
      data: {
        source_account_id?: string;
        network?: "mtn_cm" | "orange_cm";
        beneficiary_phone?: string;
        beneficiary_name?: string;
        signed_scan_url?: string;
      }
    ) =>
      request<{ expense: any }>(`/api/v1/finance/expense-requests/${expenseId}/disburse-saspay`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listSasPayDisbursements: (nodeId?: string) =>
      request<{ disbursements: any[] }>(`/api/v1/finance/saspay/disbursements${nodeId ? `?node_id=${nodeId}` : ""}`),

    getSasPayBalance: () =>
      request<{ balance: any }>("/api/v1/finance/saspay/balance"),

    listPaymentMethods: () =>
      request<{ payment_methods: any[] }>("/api/v1/finance/payment-methods"),

    createPaymentMethod: (data: any) =>
      request<{ payment_method: any }>("/api/v1/finance/payment-methods", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    declarePaymentTicket: (data: any) =>
      request<{ ticket: any }>("/api/v1/finance/payment-tickets", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    processPaymentTicket: (ticketId: string, data: any) =>
      request<{ ticket: any }>(`/api/v1/finance/payment-tickets/${ticketId}/process`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listPaymentTickets: (params?: {
      sender_node_id?: string;
      receiver_node_id?: string;
      status?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.sender_node_id) query.append("sender_node_id", params.sender_node_id);
      if (params?.receiver_node_id) query.append("receiver_node_id", params.receiver_node_id);
      if (params?.status) query.append("status", params.status);
      const qs = query.toString();
      return request<{ tickets: any[] }>(`/api/v1/finance/payment-tickets${qs ? `?${qs}` : ""}`);
    },

    createBankDeposit: (data: any) =>
      request<{ deposit: any }>("/api/v1/finance/bank-deposits", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    validateBankDeposit: (depositId: string, data: { is_approved: boolean; rejection_reason?: string }) =>
      request<{ deposit: any }>(`/api/v1/finance/bank-deposits/${depositId}/validate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listLedgerEntries: (params: { account_id: string; period_year?: number; period_month?: number }) => {
      const query = new URLSearchParams({ account_id: params.account_id });
      if (params.period_year) query.append("period_year", String(params.period_year));
      if (params.period_month) query.append("period_month", String(params.period_month));
      return request<{ entries: any[] }>(`/api/v1/finance/ledger-entries?${query.toString()}`);
    },

    closeFinancialPeriod: (nodeType: string, nodeId: string, year: number, month: number, data: any) =>
      request<{ period: any }>(
        `/api/v1/finance/periods/close?node_type=${nodeType}&node_id=${nodeId}&year=${year}&month=${month}`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
  },

  // 11. Rapports Mensuels & Supervision Hiérarchique
  reports: {
    list: (params?: {
      report_type?: "pastoral" | "departmental" | string;
      period_month?: number;
      period_year?: number;
      source_level?: "assembly" | "district" | "region" | string;
      target_level?: "district" | "region" | "national" | string;
      target_entity_id?: string;
      assembly_id?: string;
      district_id?: string;
      region_id?: string;
      department_id?: string;
      department_code?: string;
      status?: "draft" | "submitted" | "approved" | "revision_requested" | "noted" | string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            query.append(k, String(v));
          }
        });
      }
      return request<{ items: any[]; total: number }>(`/api/v1/reports?${query.toString()}`);
    },

    get: (id: string) => request(`/api/v1/reports/${id}`),

    create: (data: {
      report_type: "pastoral" | "departmental" | string;
      period_month: number;
      period_year: number;
      source_level: "assembly" | "district" | "region" | string;
      assembly_id?: string;
      district_id?: string;
      region_id?: string;
      department_id?: string;
      department_code?: string;
      title: string;
      content: string;
      kpi_metrics?: Record<string, any>;
      attachments?: any[];
    }) =>
      request("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: {
        title?: string;
        content?: string;
        kpi_metrics?: Record<string, any>;
        attachments?: any[];
      }
    ) =>
      request(`/api/v1/reports/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    submit: (id: string) =>
      request(`/api/v1/reports/${id}/submit`, { method: "POST" }),

    evaluate: (
      id: string,
      evaluation: {
        decision: "approved" | "revision_requested" | "noted" | string;
        appreciation_score?: number;
        feedback_text?: string;
        recommendations?: string;
      }
    ) =>
      request(`/api/v1/reports/${id}/evaluate`, {
        method: "POST",
        body: JSON.stringify(evaluation),
      }),

    getConsolidationSummary: (params: {
      supervisory_level: "district" | "region" | "national" | string;
      target_entity_id?: string;
      period_month: number;
      period_year: number;
      report_type?: "pastoral" | "departmental" | string;
      department_code?: string;
    }) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          query.append(k, String(v));
        }
      });
      return request(`/api/v1/reports/consolidation/summary?${query.toString()}`);
    },
  },

  // 12. Administration, Rôles & Santé du Système
  admin: {
    getDashboard: (refresh = false) =>
      request(`/api/v1/admin/dashboard?refresh=${refresh}`),

    listUsers: (params?: { search?: string; is_active?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append("search", params.search);
      if (params?.is_active !== undefined) query.append("is_active", String(params.is_active));
      return request<{ items: any[]; total: number }>(
        `/api/v1/admin/users?${query.toString()}`
      );
    },

    assignRole: (data: { user_id: string; role_code: string; scope_id?: string }) =>
      request("/api/v1/admin/users/assign-role", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    handoverLeadership: (data: {
      entity_type: string;
      entity_id: string;
      former_leader_id: string;
      new_leader_id: string;
      handover_date: string;
      handover_pv_notes?: string;
    }) =>
      request("/api/v1/admin/governance/handover", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    listAuditLogs: (params?: { action?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.action) query.append("action", params.action);
      if (params?.limit) query.append("limit", String(params.limit));
      if (params?.offset) query.append("offset", String(params.offset));
      return request<{ items: any[]; total: number }>(
        `/api/v1/admin/audit-logs?${query.toString()}`
      );
    },

    exportAuditLogsJson: () => request<any>("/api/v1/admin/audit-logs/export-json"),

    getSystemLogs: (params?: { log_type?: "error" | "app"; lines?: number; filter_term?: string }) => {
      const query = new URLSearchParams();
      if (params?.log_type) query.append("log_type", params.log_type);
      if (params?.lines) query.append("lines", String(params.lines));
      if (params?.filter_term) query.append("filter_term", params.filter_term);
      const qs = query.toString();
      return request<{ logs: any; total_lines?: number }>(
        `/api/v1/admin/system/logs${qs ? `?${qs}` : ""}`
      );
    },

    getSystemHealth: () => request("/api/v1/admin/system/health"),

    // Rôles dynamiques (RBAC)
    listRoles: () => request<any[]>("/api/v1/admin/roles"),

    getRole: (roleId: string) => request<any>(`/api/v1/admin/roles/${roleId}`),

    createRole: (data: {
      code: string;
      name: string;
      level?: string;
      description?: string;
      permission_codes?: string[];
    }) =>
      request<any>("/api/v1/admin/roles", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateRole: (
      roleId: string,
      data: {
        name?: string;
        level?: string;
        description?: string;
      }
    ) =>
      request<any>(`/api/v1/admin/roles/${roleId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    deleteRole: (roleId: string) =>
      request<any>(`/api/v1/admin/roles/${roleId}`, {
        method: "DELETE",
      }),

    // Permissions modulaires
    listPermissions: () => request<any[]>("/api/v1/admin/permissions"),

    assignRolePermissions: (roleId: string, permissionCodes: string[]) =>
      request<any>(`/api/v1/admin/roles/${roleId}/permissions`, {
        method: "POST",
        body: JSON.stringify({ permission_codes: permissionCodes }),
      }),

    setRolePermissions: (roleId: string, permissionCodes: string[]) =>
      request<any>(`/api/v1/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permission_codes: permissionCodes }),
      }),

    revokeRolePermissions: (roleId: string, permissionCodes: string[]) =>
      request<any>(`/api/v1/admin/roles/${roleId}/permissions/revoke`, {
        method: "POST",
        body: JSON.stringify({ permission_codes: permissionCodes }),
      }),

    // Bureaux de gouvernance multi-échelons (assembly, district, region, national)
    getGovernanceBoard: (scopeType: string = "national", scopeId?: string) => {
      const query = new URLSearchParams();
      query.append("scope_type", scopeType);
      if (scopeId) query.append("scope_id", scopeId);
      return request<{
        scope_type: string;
        scope_id?: string | null;
        total_members?: number;
        members: any[];
      }>(`/api/v1/admin/governance/board?${query.toString()}`);
    },

    assignGovernanceBoardMember: (data: {
      user_id: string;
      role_code: string;
      function_title?: string;
      scope_type?: string;
      scope_id?: string;
      start_date?: string;
    }) =>
      request<any>("/api/v1/admin/governance/board", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    revokeGovernanceBoardMember: (data: {
      user_id: string;
      role_code: string;
      scope_type: string;
      scope_id?: string;
      reason?: string;
    }) =>
      request<any>("/api/v1/admin/governance/board/revoke", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // 13. Notifications
  notifications: {
    list: (isRead?: boolean) => {
      const query = new URLSearchParams();
      if (isRead !== undefined) query.append("is_read", String(isRead));
      return request<any[]>(`/api/v1/notifications?${query.toString()}`);
    },

    getUnreadCount: () =>
      request<{ unread_count: number }>("/api/v1/notifications/unread-count"),

    markRead: (id: string) =>
      request(`/api/v1/notifications/${id}/read`, { method: "POST" }),

    markAllRead: () =>
      request("/api/v1/notifications/mark-all-read", { method: "POST" }),
  },

  // 14. Médias & Téléversements
  media: {
    upload: async (
      file: File,
      options?: { category?: string; alt_text?: string; assembly_id?: string }
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.category) formData.append("category", options.category);
      if (options?.alt_text) formData.append("alt_text", options.alt_text);
      if (options?.assembly_id) formData.append("assembly_id", options.assembly_id);

      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
          method: "POST",
          headers,
          body: formData,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            error: true,
            message: json.message || json.detail || "Échec du téléversement du média.",
            status: res.status,
          };
        }
        return {
          data: json.data !== undefined ? json.data : json,
          error: false,
          message: json.message,
          status: res.status,
        };
      } catch (err: any) {
        return {
          error: true,
          message: err?.message || "Erreur réseau lors de l'envoi du média.",
          status: 0,
        };
      }
    },

    list: (params?: { category?: string; assembly_id?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.category) q.append("category", params.category);
      if (params?.assembly_id) q.append("assembly_id", params.assembly_id);
      if (params?.limit) q.append("limit", String(params.limit));
      if (params?.offset) q.append("offset", String(params.offset));
      return request<{ media: any[] }>(`/api/v1/media${q.toString() ? `?${q.toString()}` : ""}`);
    },

    delete: (mediaId: string) =>
      request(`/api/v1/media/${mediaId}`, { method: "DELETE" }),
  },
};

export default api;
