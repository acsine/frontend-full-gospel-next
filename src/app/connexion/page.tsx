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
  const [identifier, setIdentifier] = useState("pasteur.tsinga@fullgope.cm");
  const [password, setPassword] = useState("Eglise2026!");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "error"; text: string } | null>(null);

  // Register form states
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAssembly, setRegAssembly] = useState("Tsinga - Yaoundé");
  const [regStatus, setRegStatus] = useState("Fidèle baptisé");
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

  // Break redirect loops and clean up stale credentials
  useEffect(() => {
    if (searchParams.get("redirect")) {
      clearTokens();
    }
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
    setLoading(true);
    setAlertMsg(null);

    const nameParts = regFullName.trim().split(" ");
    const firstName = nameParts[0] || "Fidèle";
    const lastName = nameParts.slice(1).join(" ") || "de l'église";

    try {
      const res = await api.auth.register({
        phone: regPhone,
        password: "DefaultPassword123!",
        first_name: firstName,
        last_name: lastName,
      });

      if (!res.error) {
        setLoading(false);
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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans">
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-16 w-full max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container overflow-hidden flex-shrink-0">
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

      {/* Main Container */}
      <main className="w-full flex-1 pt-16 flex flex-col justify-center py-8">
        <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden shadow-2xl bg-surface-container-lowest border border-surface-container">
            {/* Left Hero Column - Liturgical Soba Foundation (No AI stock) */}
            <section className="lg:col-span-5 relative flex flex-col justify-between overflow-hidden min-h-[420px] lg:min-h-[720px] p-8 lg:p-12 text-white">
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
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl bg-white p-1.5 shadow-xl border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <Image
                      src="/logo.jpg"
                      alt="Sceau officiel Full Gospel Mission"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-secondary-container font-bold block">
                      {t("auth.heroSubtitle")}
                    </span>
                    <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight font-display">
                      {t("auth.heroTitle")}
                    </h1>
                    <span className="text-xs text-white/70">
                      {t("auth.heroRegions")}
                    </span>
                  </div>
                </div>

                {/* Devise Officielle */}
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <p className="text-[11px] tracking-wider uppercase text-secondary-container font-bold flex items-center gap-1.5 mb-1">
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Devise Officielle Canonique
                  </p>
                  <p className="text-base font-extrabold text-secondary-container tracking-wide leading-snug font-display">
                    « No Other Christ – No Other Gospel – No Other Spirit »
                  </p>
                </div>

                {/* 3 Sceaux Historiques Canoniques MPEC (1961) */}
                <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2.5">
                  <span className="text-[10px] tracking-widest uppercase text-white/70 font-bold block">
                    Emblème Fondateur MPEC • Manuel de Discipline
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex flex-col items-center">
                      <div className="w-7 h-7 relative mb-1 flex items-center justify-center">
                        <Image src="/images/embleme/croix-noire.png" alt="La Croix Noire" width={22} height={22} className="object-contain" style={{ width: "auto", height: "auto" }} />
                      </div>
                      <span className="text-[10px] font-bold text-white">La Croix</span>
                      <span className="text-[9px] text-white/60">Golgotha</span>
                    </div>
                    <div className="p-2 rounded-lg bg-red-950/40 border border-white/10 flex flex-col items-center">
                      <div className="w-7 h-7 relative mb-1 flex items-center justify-center">
                        <Image src="/images/embleme/flamme-rouge.png" alt="La Flamme Rouge" width={22} height={22} className="object-contain" style={{ width: "auto", height: "auto" }} />
                      </div>
                      <span className="text-[10px] font-bold text-white">La Flamme</span>
                      <span className="text-[9px] text-white/60">Saint-Esprit</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/10 border border-white/10 flex flex-col items-center">
                      <div className="w-7 h-7 relative mb-1 flex items-center justify-center">
                        <Image src="/images/embleme/vase-blanc.png" alt="Le Vase Blanc" width={22} height={22} className="object-contain" style={{ width: "auto", height: "auto" }} />
                      </div>
                      <span className="text-[10px] font-bold text-white">Le Vase</span>
                      <span className="text-[9px] text-white/60">Sanctification</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Scripture Quote */}
              <div className="relative z-10 flex flex-col gap-3 pt-6 border-t border-white/10">
                <blockquote className="bg-black/30 backdrop-blur-md p-4 rounded-xl border-l-4 border-secondary-container">
                  <div className="flex items-start gap-2.5">
                    <svg className="w-5 h-5 text-secondary-container shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <div>
                      <p className="text-xs italic text-white/90 leading-relaxed">
                        « Néanmoins, le solide fondement de Dieu reste debout, avec ces paroles qui lui servent de sceau : Le Seigneur connaît ceux qui lui appartiennent. »
                      </p>
                      <cite className="block text-xs font-bold text-secondary-container not-italic mt-1">
                        2 Timothée 2:19
                      </cite>
                    </div>
                  </div>
                </blockquote>
                <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                  <span>Fondée en 1961 à Bamenda</span>
                  <span>Décret N°69/DF/144</span>
                </div>
              </div>
            </section>

            {/* Right Form Column */}
            <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-surface-container-lowest">
              {/* Top Security Status */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-on-surface-variant">Portail Ecclésial Sécurisé (JWT &amp; Refresh)</span>
                </div>
                <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                  District Tsinga • Yaoundé
                </span>
              </div>

              {/* Tabs Switcher */}
              <div className="flex p-1 bg-surface-container rounded-full mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setAlertMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "login"
                    ? "bg-surface-container-lowest text-primary shadow-md"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "register"
                    ? "bg-surface-container-lowest text-primary shadow-md"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                  <span>{t("auth.registerTab")}</span>
                </button>
              </div>

              {/* Alert Notification - UNIQUEMENT en cas d'erreur réelle */}
              {alertMsg && alertMsg.type === "error" && (
                <AlertBanner
                  type="error"
                  title="Échec de connexion"
                  message={alertMsg.text}
                  onDismiss={() => setAlertMsg(null)}
                  className="mb-6"
                />
              )}

              {/* TAB 1: LOGIN */}
              {activeTab === "login" && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-display">
                      {t("auth.loginTitle")}
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {t("auth.loginSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {/* Identifier */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                        <span>{t("auth.identifierLabel")}</span>
                        <span className="text-[11px] text-on-surface-variant font-normal">Email ou N° Téléphone</span>
                      </label>
                      <div className="relative flex items-center">
                        <svg className="w-5 h-5 absolute left-3.5 text-on-surface-variant pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={t("auth.identifierPlaceholder")}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-on-surface">{t("auth.passwordLabel")}</label>
                        <a href="#" className="text-xs text-primary hover:underline font-medium">
                          {t("auth.forgotPassword")}
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <svg className="w-5 h-5 absolute left-3.5 text-on-surface-variant pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Quick Test Accounts */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          Comptes de test (Backend Live) :
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 font-mono flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>
                            {(process.env.NEXT_PUBLIC_API_URL || "").includes("onrender.com")
                              ? "Render Live"
                              : "Local : 8000"}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier("pasteur.tsinga@fullgope.cm");
                            setPassword("Eglise2026!");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs font-semibold text-primary border border-surface-container-high hover:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          Pasteur Titulaire (N4)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier("jeanne.ngobiyong@fullgope.cm");
                            setPassword("Eglise2026!");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs font-semibold text-primary border border-surface-container-high hover:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          Resp. Département
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdentifier("marc.mvondo@fullgope.cm");
                            setPassword("Eglise2026!");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs font-semibold text-primary border border-surface-container-high hover:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          Trésorier
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-on-surface tracking-tight font-display">
                      {t("auth.registerTitle")}
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {t("auth.registerSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    {/* Optional Profile Photo */}
                    <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/80">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl border border-dashed border-primary/40 bg-surface-container-lowest flex items-center justify-center overflow-hidden shrink-0">
                          {regPhotoPreview ? (
                            <img src={regPhotoPreview} alt="Aperçu" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">Photo de profil</span>
                            <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">Optionnel</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
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
                              className="text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                              {regPhotoPreview ? "Changer la photo" : "Ajouter une photo"}
                            </button>
                            {regPhotoPreview && (
                              <button
                                type="button"
                                onClick={handleRegPhotoRemove}
                                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {regPhotoError && <p className="text-[11px] text-rose-600 mt-1">⚠ {regPhotoError}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface">{t("auth.fullNameLabel")}</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="ex: Frère Jean-Claude Fossouo"
                        className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">{t("auth.phoneLabel")}</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="677 00 00 00"
                          className="w-full h-11 px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">{t("auth.statusLabel")}</label>
                        <select
                          value={regStatus}
                          onChange={(e) => setRegStatus(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
                        >
                          <option value="Fidèle baptisé">Fidèle baptisé par immersion</option>
                          <option value="Catéchumène">Catéchumène en formation</option>
                          <option value="Ouvrier / Chantre">Ouvrier / Chantre</option>
                          <option value="Diacre / Ancien">Diacre / Ancien</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface">{t("auth.assemblyLabel")}</label>
                      <select
                        value={regAssembly}
                        onChange={(e) => setRegAssembly(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
                      >
                        <option value="Tsinga - Yaoundé">Temple Central de Tsinga (Yaoundé)</option>
                        <option value="Nkoabang - Yaoundé">Nkoabang (Yaoundé)</option>
                        <option value="Mvog-Ada - Yaoundé">Mvog-Ada (Yaoundé)</option>
                        <option value="Bonabéri - Douala">Bonabéri (Douala)</option>
                        <option value="Akwa - Douala">Akwa (Douala)</option>
                        <option value="Bamenda Station">Bamenda Station (Siège Historique)</option>
                        <option value="Bafoussam Centre">Bafoussam Centre</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-12 mt-2 rounded-xl bg-primary-container text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
