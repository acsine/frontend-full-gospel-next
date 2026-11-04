"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setTokens, getAccessToken, clearTokens, formatBackendErrorMessage } from "@/lib/api";
import { useIntl } from "@/intl";
import { AlertBanner } from "@/components/ui/AlertBanner";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/dashboard";

  const { locale, setLocale, t } = useIntl();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Register form states
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regStatus, setRegStatus] = useState("Baptisé d'eau par immersion");
  const [regAssemblyId, setRegAssemblyId] = useState("e1a2b3c4-0001-4000-8000-000000000001");
  const [assembliesList, setAssembliesList] = useState<Array<{ id: string; name: string; city?: string }>>([
    { id: "e1a2b3c4-0001-4000-8000-000000000001", name: "Temple Central de Tsinga", city: "Yaoundé" },
    { id: "e1a2b3c4-0002-4000-8000-000000000002", name: "Assemblée Béthel de Bastos", city: "Yaoundé" },
    { id: "e1a2b3c4-0003-4000-8000-000000000003", name: "Assemblée de Grâce de Bépanda", city: "Douala" },
    { id: "e1a2b3c4-0004-4000-8000-000000000004", name: "Temple Salem de Bonabéri", city: "Douala" },
    { id: "e1a2b3c4-0005-4000-8000-000000000005", name: "Assemblée Ebenezer de Bafoussam", city: "Bafoussam" },
    { id: "e1a2b3c4-0006-4000-8000-000000000006", name: "Mount Carmel Assembly", city: "Buea" },
    { id: "e1a2b3c4-0007-4000-8000-000000000007", name: "Assemblée de Bamenda Station", city: "Bamenda" },
    { id: "e1a2b3c4-0008-4000-8000-000000000008", name: "Assemblée de Garoua", city: "Garoua" },
    { id: "e1a2b3c4-0009-4000-8000-000000000009", name: "Assemblée de Maroua", city: "Maroua" },
    { id: "e1a2b3c4-0010-4000-8000-000000000010", name: "Assemblée de Ngaoundéré", city: "Ngaoundéré" },
    { id: "e1a2b3c4-0011-4000-8000-000000000011", name: "Assemblée de Bertoua", city: "Bertoua" },
    { id: "e1a2b3c4-0012-4000-8000-000000000012", name: "Assemblée d'Ebolowa", city: "Ebolowa" },
  ]);
  const [regPhotoFile, setRegPhotoFile] = useState<File | null>(null);
  const [regPhotoPreview, setRegPhotoPreview] = useState<string | null>(null);
  const [regPhotoError, setRegPhotoError] = useState<string | null>(null);
  const regPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleRegPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setRegPhotoError("Veuillez sélectionner une image (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setRegPhotoError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }
    setRegPhotoFile(file);
    setRegPhotoPreview(URL.createObjectURL(file));
  };

  const handleRegPhotoRemove = () => {
    setRegPhotoFile(null);
    if (regPhotoPreview) URL.revokeObjectURL(regPhotoPreview);
    setRegPhotoPreview(null);
    setRegPhotoError(null);
    if (regPhotoInputRef.current) regPhotoInputRef.current.value = "";
  };

  // Break redirect loops and clean up stale credentials + fetch assemblies
  useEffect(() => {
    if (searchParams.get("redirect")) {
      clearTokens();
    }

    let isMounted = true;
    async function fetchAssemblies() {
      try {
        const res = await api.organizations.listAssemblies({ limit: 100 });
        const list = (res.data as any)?.assemblies || (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
        if (list && Array.isArray(list) && list.length > 0 && isMounted) {
          const mapped = list.map((a: any) => ({
            id: String(a.id),
            name: a.name,
            city: a.city || "Cameroun",
          }));
          setAssembliesList(mapped);
          setRegAssemblyId((prev) => (prev ? prev : mapped[0]?.id || ""));
        }
      } catch {
        // Fallback list is already preset in initial state
      }
    }
    fetchAssemblies();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlertMsg(null);

    try {
      const res = await api.auth.login({ identifier, password });
      if (res.data?.access_token) {
        window.location.replace(redirectParam);
        return;
      } else {
        const errText = formatBackendErrorMessage(
          res.message || "Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.",
          res.status
        );
        setAlertMsg({
          type: "error",
          text: errText,
        });
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const errText = formatBackendErrorMessage(
        err?.message || "Impossible de joindre le serveur d'authentification. Veuillez vérifier que le serveur est démarré.",
        503
      );
      setAlertMsg({
        type: "error",
        text: errText,
      });
      setLoading(false);
      return;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    // Password validation according to backend policy
    if (regPassword.length < 8) {
      setAlertMsg({
        type: "error",
        text: "Le mot de passe doit comporter au moins 8 caractères.",
      });
      return;
    }
    if (!/[A-Z]/.test(regPassword)) {
      setAlertMsg({
        type: "error",
        text: "Le mot de passe doit contenir au moins une lettre majuscule.",
      });
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      setAlertMsg({
        type: "error",
        text: "Le mot de passe doit contenir au moins un chiffre.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload: {
        first_name: string;
        last_name: string;
        phone: string;
        password: string;
        email?: string;
        assembly_id?: string;
      } = {
        first_name: regFirstName.trim(),
        last_name: regLastName.trim() || regFirstName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      };

      if (regEmail.trim()) {
        payload.email = regEmail.trim();
      }
      if (regAssemblyId) {
        payload.assembly_id = regAssemblyId;
      }

      const res = await api.auth.register(payload);

      if (!res.error) {
        setLoading(false);
        setAlertMsg({
          type: "success",
          text: "Compte créé avec succès ! Connectez-vous dès maintenant avec votre numéro ou email.",
        });
        setIdentifier(regPhone.trim() || regEmail.trim());
        setPassword(regPassword);
        setActiveTab("login");
        return;
      } else {
        const errText = formatBackendErrorMessage(
          res.message || "Impossible de créer le compte. Veuillez vérifier les informations.",
          res.status
        );
        setAlertMsg({
          type: "error",
          text: errText,
        });
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const errText = formatBackendErrorMessage(
        err?.message || "Une erreur technique est survenue lors de l'enregistrement.",
        500
      );
      setAlertMsg({
        type: "error",
        text: errText,
      });
      setLoading(false);
      return;
    }
  };

  return (
    <div className="bg-surface text-on-surface h-dvh max-h-dvh flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-14 sm:h-16 w-full flex-shrink-0 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container z-20">
        <div className="h-full w-full max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container overflow-hidden flex-shrink-0">
              <Image
                src="/logo.jpg"
                alt="Logo Full Gospel Mission"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm md:text-base text-on-surface tracking-tight leading-none font-display">
                {t("auth.brandTitle")}
              </span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5 font-bold">
                {t("auth.brandSubtitle")}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-container-high rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`min-w-[28px] h-6 px-2 rounded-full text-xs font-bold transition-all ${
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
                className={`min-w-[28px] h-6 px-2 rounded-full text-xs font-bold transition-all ${
                  locale === "en"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                EN
              </button>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
            >
              Portail Public
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container - Centré sans scroll */}
      <main className="w-full flex-1 flex items-center justify-center p-3 sm:p-5 lg:p-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[1080px] mx-auto">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl bg-surface-container-lowest border border-surface-container my-auto">
            {/* Left Hero Column */}
            <section className="hidden lg:flex lg:col-span-5 relative flex-col justify-between overflow-hidden p-6 lg:p-7 text-white min-h-0">
              {/* Sacred Liturgical Foundation Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#140307] via-[#1d050f] to-[#0a0d18]" />
              {/* Subtle Canonical Dot Grid Pattern */}
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-[#4a0d20]/30 blur-3xl pointer-events-none" />

              {/* Upper Branding */}
              <div className="relative z-10 flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-xl border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                    <Image
                      src="/logo.jpg"
                      alt="Sceau officiel Full Gospel Mission"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-widest text-secondary-container font-extrabold block">
                      MISSION DU PLEIN ÉVANGILE
                    </span>
                    <h1 className="text-lg font-black tracking-tight text-white leading-tight font-display">
                      Plein Évangile Cameroun
                    </h1>
                    <span className="text-[11px] text-white/75 font-medium mt-0.5 block">
                      10 Régions • Districts &amp; Assemblées
                    </span>
                  </div>
                </div>

                {/* Devise Officielle */}
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                  <p className="text-[9px] tracking-widest uppercase text-secondary-container font-bold flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Devise Officielle Canonique
                  </p>
                  <p className="text-xs font-extrabold text-secondary-container tracking-wide leading-snug font-display">
                    « No Other Christ – No Other Gospel – No Other Spirit »
                  </p>
                </div>

                {/* 3 Sceaux Historiques Canoniques MPEC (1961) */}
                <div className="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
                  <span className="text-[9px] tracking-widest uppercase text-white/80 font-bold block flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
                    Emblème Fondateur MPEC • Manuel de Discipline
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* La Croix */}
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1 hover:bg-white/15 transition-all shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-white p-1.5 shadow-sm flex items-center justify-center shrink-0">
                        <Image
                          src="/images/embleme/croix-noire.png"
                          alt="La Croix Noire"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-white tracking-wide block">La Croix</span>
                        <span className="text-[9px] text-white/70 font-medium block">Golgotha</span>
                      </div>
                    </div>

                    {/* La Flamme */}
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1 hover:bg-white/15 transition-all shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-white p-1.5 shadow-sm flex items-center justify-center shrink-0">
                        <Image
                          src="/images/embleme/flamme-rouge.png"
                          alt="La Flamme Rouge"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-white tracking-wide block">La Flamme</span>
                        <span className="text-[9px] text-white/70 font-medium block">Saint-Esprit</span>
                      </div>
                    </div>

                    {/* Le Vase */}
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1 hover:bg-white/15 transition-all shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-white p-1.5 shadow-sm flex items-center justify-center shrink-0">
                        <Image
                          src="/images/embleme/vase-blanc.png"
                          alt="Le Vase Blanc"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-white tracking-wide block">Le Vase</span>
                        <span className="text-[9px] text-white/70 font-medium block">Sanctification</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Scripture Quote */}
              <div className="relative z-10 flex flex-col gap-2 pt-3 border-t border-white/10">
                <blockquote className="bg-black/30 backdrop-blur-md p-2.5 rounded-xl border-l-4 border-secondary-container">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-secondary-container shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <div>
                      <p className="text-[11px] italic text-white/90 leading-relaxed">
                        « Néanmoins, le solide fondement de Dieu reste debout, avec ces paroles qui lui servent de sceau : Le Seigneur connaît ceux qui lui appartiennent. »
                      </p>
                      <cite className="block text-[10px] font-bold text-secondary-container not-italic mt-0.5">
                        2 Timothée 2:19
                      </cite>
                    </div>
                  </div>
                </blockquote>
                <div className="flex items-center justify-between text-[10px] text-white/60 pt-0.5">
                  <span>Fondée en 1961 à Bamenda</span>
                  <span>Décret N°69/DF/144</span>
                </div>
              </div>
            </section>

            {/* Right Form Column */}
            <section className="lg:col-span-7 p-4 sm:p-6 lg:p-7 flex flex-col justify-center bg-surface-container-lowest min-h-0">
              {/* Tabs Switcher */}
              <div className="flex p-1 bg-surface-container rounded-full mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setAlertMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "login"
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{t("auth.loginTab")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setAlertMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "register"
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                  <span>{t("auth.registerTab")}</span>
                </button>
              </div>

              {/* Alert Notification */}
              {alertMsg && (
                <AlertBanner
                  type={alertMsg.type}
                  title={
                    alertMsg.type === "success"
                      ? "Compte créé avec succès"
                      : activeTab === "login"
                      ? "Échec de connexion"
                      : "Erreur d'inscription"
                  }
                  message={alertMsg.text}
                  onDismiss={() => setAlertMsg(null)}
                  className="mb-3 py-2 text-xs"
                />
              )}

              {/* TAB 1: LOGIN */}
              {activeTab === "login" && (
                <div>
                  <div className="mb-3">
                    <h2 className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight font-display">
                      {t("auth.loginTitle")}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {t("auth.loginSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-2.5 sm:gap-3">
                    {/* Identifier */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface flex items-center justify-between">
                        <span>{t("auth.identifierLabel")}</span>
                        <span className="text-[10px] text-on-surface-variant font-normal">Email ou N° Téléphone</span>
                      </label>
                      <div className="relative flex items-center">
                        <svg className="w-4 h-4 absolute left-3 text-on-surface-variant pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={t("auth.identifierPlaceholder")}
                          className="w-full h-10 sm:h-11 pl-9 pr-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-on-surface">{t("auth.passwordLabel")}</label>
                        <a href="#" className="text-[11px] text-primary hover:underline font-medium">
                          {t("auth.forgotPassword")}
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <svg className="w-4 h-4 absolute left-3 text-on-surface-variant pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full h-10 sm:h-11 pl-9 pr-10 rounded-xl bg-surface-container-low text-on-surface text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-10 sm:h-11 mt-1 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Redirection vers l'espace sécurisé...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" x2="3" y1="12" y2="12" />
                          </svg>
                          <span>{t("auth.submitLogin")}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: REGISTER */}
              {activeTab === "register" && (
                <div>
                  <div className="mb-2 sm:mb-2.5">
                    <h2 className="text-base sm:text-lg font-extrabold text-on-surface tracking-tight font-display">
                      {t("auth.registerTitle")}
                    </h2>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {t("auth.registerSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="flex flex-col gap-2 sm:gap-2.5">
                    {/* Optional Profile Photo - Compact */}
                    <div className="p-1.5 sm:p-2 rounded-xl bg-surface-container-low border border-surface-container-high/80">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-dashed border-primary/40 bg-surface-container-lowest flex items-center justify-center overflow-hidden shrink-0">
                          {regPhotoPreview ? (
                            <img src={regPhotoPreview} alt="Aperçu" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-on-surface">Photo de profil</span>
                            <span className="text-[9px] uppercase font-bold text-slate-600 bg-slate-200 px-1 py-0.2 rounded">Optionnel</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <input
                              type="file"
                              ref={regPhotoInputRef}
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleRegPhotoSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => regPhotoInputRef.current?.click()}
                              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              {regPhotoPreview ? "Changer" : "Ajouter une photo"}
                            </button>
                            {regPhotoPreview && (
                              <button
                                type="button"
                                onClick={handleRegPhotoRemove}
                                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {regPhotoError && <p className="text-[10px] text-rose-600 mt-1">⚠ {regPhotoError}</p>}
                    </div>

                    {/* Row 1: Prénom & Nom */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface">Prénom</label>
                        <input
                          type="text"
                          required
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          placeholder="ex: Jean-Claude"
                          className="w-full h-8.5 sm:h-9 px-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface">Nom de famille</label>
                        <input
                          type="text"
                          required
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          placeholder="ex: Fossouo"
                          className="w-full h-8.5 sm:h-9 px-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Row 2: Téléphone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface">{t("auth.phoneLabel")}</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="677 00 00 00"
                          className="w-full h-8.5 sm:h-9 px-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface flex items-center justify-between">
                          <span>Email</span>
                          <span className="text-[9px] text-on-surface-variant font-normal">Optionnel</span>
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="nom@example.cm"
                          className="w-full h-8.5 sm:h-9 px-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Row 3: Mot de passe & Statut ecclésiastique (Modern Custom Select) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface">Mot de passe</label>
                        <div className="relative flex items-center">
                          <input
                            type={showRegPassword ? "text" : "password"}
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min. 8 car. (1 maj, 1 chif.)"
                            className="w-full h-8.5 sm:h-9 pl-3 pr-8 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-on-surface">{t("auth.statusLabel")}</label>
                        <div className="relative flex items-center">
                          <select
                            value={regStatus}
                            onChange={(e) => setRegStatus(e.target.value)}
                            className="w-full h-8.5 sm:h-9 pl-3 pr-8 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-xs sm:text-sm appearance-none border border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer shadow-xs"
                          >
                            <option value="Baptisé d'eau par immersion" className="bg-surface-container-lowest text-on-surface py-1.5">
                              Baptisé d'eau par immersion
                            </option>
                            <option value="Baptisé du Saint-Esprit" className="bg-surface-container-lowest text-on-surface py-1.5">
                              Baptisé du Saint-Esprit
                            </option>
                            <option value="Non baptisé" className="bg-surface-container-lowest text-on-surface py-1.5">
                              Non baptisé
                            </option>
                            <option value="Nouveau converti" className="bg-surface-container-lowest text-on-surface py-1.5">
                              Nouveau converti
                            </option>
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Assemblée de rattachement (Modern Custom Select) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface">{t("auth.assemblyLabel")}</label>
                      <div className="relative flex items-center">
                        <select
                          value={regAssemblyId}
                          onChange={(e) => setRegAssemblyId(e.target.value)}
                          required
                          className="w-full h-8.5 sm:h-9 pl-3 pr-8 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-xs sm:text-sm appearance-none border border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer shadow-xs"
                        >
                          {assembliesList.map((a) => (
                            <option key={a.id} value={a.id} className="bg-surface-container-lowest text-on-surface py-1.5">
                              {a.name} ({a.city || "Cameroun"})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-9 sm:h-10 mt-1 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t("common.loading")}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <polyline points="16 11 18 13 22 9" />
                          </svg>
                          <span>{t("auth.submitRegister")}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ConnexionForm />
    </Suspense>
  );
}
