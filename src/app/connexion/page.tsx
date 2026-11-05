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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col justify-between font-sans selection:bg-primary/10 overflow-y-auto">
      {/* Sleek Minimalist Top Row (Pas de navbar encombrante) */}
      <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-1 flex items-center justify-between flex-shrink-0 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-full hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Retour à l&apos;accueil</span>
        </Link>

        <div className="flex items-center bg-surface-container rounded-full p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => setLocale("fr")}
            className={`min-w-[30px] h-6 px-2 rounded-full text-xs font-bold transition-all ${
              locale === "fr"
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`min-w-[30px] h-6 px-2 rounded-full text-xs font-bold transition-all ${
              locale === "en"
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Main Container - Aéré, élégant et centré */}
      <main className="w-full flex-1 flex items-center justify-center px-4 py-4 sm:px-6 sm:py-8">
        <div className="w-full max-w-[1020px] mx-auto">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl bg-surface-container-lowest border border-surface-container">
            {/* Left Hero Column (Desktop) */}
            <section className="hidden lg:flex lg:col-span-5 relative flex-col justify-between overflow-hidden p-8 text-white min-h-[600px]">
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
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-white p-1.5 shadow-xl border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
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
                    <h1 className="text-xl font-black tracking-tight text-white leading-tight font-display">
                      Plein Évangile Cameroun
                    </h1>
                    <span className="text-xs text-white/75 font-medium mt-0.5 block">
                      10 Régions • Districts &amp; Assemblées
                    </span>
                  </div>
                </div>

                {/* Devise Officielle */}
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
                  <p className="text-[10px] tracking-widest uppercase text-secondary-container font-bold flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">verified</span>
                    Devise Canonique
                  </p>
                  <p className="text-xs font-extrabold text-secondary-container tracking-wide leading-snug font-display">
                    « No Other Christ – No Other Gospel – No Other Spirit »
                  </p>
                </div>

                {/* 3 Sceaux Historiques Canoniques MPEC (1961) */}
                <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2.5">
                  <span className="text-[10px] tracking-widest uppercase text-white/80 font-bold block flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
                    Emblème Fondateur MPEC • 1961
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* La Croix */}
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1.5 hover:bg-white/15 transition-all shadow-xs">
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
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1.5 hover:bg-white/15 transition-all shadow-xs">
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
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-between gap-1.5 hover:bg-white/15 transition-all shadow-xs">
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
              <div className="relative z-10 flex flex-col gap-2 pt-4 border-t border-white/10">
                <blockquote className="bg-black/30 backdrop-blur-md p-3 rounded-xl border-l-4 border-secondary-container">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-secondary-container text-[18px] shrink-0 mt-0.5">
                      format_quote
                    </span>
                    <div>
                      <p className="text-[11px] italic text-white/90 leading-relaxed">
                        « Néanmoins, le solide fondement de Dieu reste debout, avec ces paroles qui lui servent de sceau : Le Seigneur connaît ceux qui lui appartiennent. »
                      </p>
                      <cite className="block text-[10px] font-bold text-secondary-container not-italic mt-1">
                        2 Timothée 2:19
                      </cite>
                    </div>
                  </div>
                </blockquote>
                <div className="flex items-center justify-between text-[10px] text-white/60 pt-1">
                  <span>Fondée en 1961 à Bamenda</span>
                  <span>Décret N°69/DF/144</span>
                </div>
              </div>
            </section>

            {/* Right Form Column */}
            <section className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-center bg-surface-container-lowest">
              {/* Header d'identité sur mobile (affiché uniquement sur mobile) */}
              <div className="lg:hidden flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg border border-surface-container mb-3 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt="Logo Full Gospel Mission"
                    width={56}
                    height={56}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-primary">
                  Mission du Plein Évangile
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight mt-0.5 font-display">
                  Portail Intendant &amp; Fidèles
                </h1>
                <p className="text-xs text-on-surface-variant mt-1.5 max-w-sm">
                  Accès sécurisé à votre assemblée locale, vos services ecclésiastiques et votre intendance.
                </p>
              </div>

              {/* Tabs Switcher - Espacé et tactile */}
              <div className="flex p-1.5 bg-surface-container rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setAlertMsg(null);
                  }}
                  className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === "login"
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>{t("auth.loginTab")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setAlertMsg(null);
                  }}
                  className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    activeTab === "register"
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
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
                  className="mb-5 py-2.5 text-xs rounded-xl"
                />
              )}

              {/* TAB 1: LOGIN */}
              {activeTab === "login" && (
                <div className="space-y-5">
                  <div className="hidden lg:block mb-4">
                    <h2 className="text-2xl font-black text-on-surface tracking-tight font-display">
                      {t("auth.loginTitle")}
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {t("auth.loginSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                    {/* Identifier */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-on-surface block">
                        Identifiant de connexion
                        <span className="text-xs font-normal text-on-surface-variant ml-2">
                          (Email, Téléphone ou Matricule)
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          badge
                        </span>
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="ex: admin@bci.cm ou 677 00 00 00"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs sm:text-sm font-bold text-on-surface">
                          {t("auth.passwordLabel")}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAlertMsg({
                              type: "success",
                              text: "Pour réinitialiser votre mot de passe, veuillez contacter le secrétariat pastoral ou l'administrateur de votre assemblée locale.",
                            });
                          }}
                          className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          lock
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1"
                          title={showPassword ? "Masquer" : "Afficher"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-12 sm:h-13 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-container text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer mt-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connexion en cours...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">login</span>
                          <span>{t("auth.submitLogin")}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: REGISTER */}
              {activeTab === "register" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-on-surface tracking-tight font-display">
                      {t("auth.registerTitle")}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {t("auth.registerSubtitle")}
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {/* Optional Profile Photo */}
                    <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/80">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-xl border border-dashed border-primary/40 bg-surface-container-lowest flex items-center justify-center overflow-hidden shrink-0">
                          {regPhotoPreview ? (
                            <img src={regPhotoPreview} alt="Aperçu" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
                              account_circle
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">Photo de profil</span>
                            <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                              Optionnel
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
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
                              {regPhotoPreview ? "Changer" : "Sélectionner une photo"}
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
                      {regPhotoError && <p className="text-xs text-rose-600 mt-2">⚠ {regPhotoError}</p>}
                    </div>

                    {/* Row 1: Prénom & Nom */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">Prénom</label>
                        <input
                          type="text"
                          required
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          placeholder="ex: Jean-Claude"
                          className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">Nom de famille</label>
                        <input
                          type="text"
                          required
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          placeholder="ex: Fossouo"
                          className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Row 2: Téléphone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">{t("auth.phoneLabel")}</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="677 00 00 00"
                          className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                          <span>Email</span>
                          <span className="text-[10px] text-on-surface-variant font-normal">Optionnel</span>
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="nom@example.cm"
                          className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Row 3: Mot de passe & Statut ecclésiastique */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">Mot de passe</label>
                        <div className="relative flex items-center">
                          <input
                            type={showRegPassword ? "text" : "password"}
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min. 8 car. (1 maj, 1 chif.)"
                            className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 text-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all border border-surface-container-high focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {showRegPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-on-surface">{t("auth.statusLabel")}</label>
                        <div className="relative flex items-center">
                          <select
                            value={regStatus}
                            onChange={(e) => setRegStatus(e.target.value)}
                            className="w-full h-11 pl-3.5 pr-9 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-xs sm:text-sm appearance-none border border-surface-container-high focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                          >
                            <option value="Baptisé d'eau par immersion">
                              Baptisé d&apos;eau par immersion
                            </option>
                            <option value="Baptisé du Saint-Esprit">
                              Baptisé du Saint-Esprit
                            </option>
                            <option value="Non baptisé">
                              Non baptisé
                            </option>
                            <option value="Nouveau converti">
                              Nouveau converti
                            </option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[20px]">
                            arrow_drop_down
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Assemblée de rattachement */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface">{t("auth.assemblyLabel")}</label>
                      <div className="relative flex items-center">
                        <select
                          value={regAssemblyId}
                          onChange={(e) => setRegAssemblyId(e.target.value)}
                          required
                          className="w-full h-11 pl-3.5 pr-9 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-xs sm:text-sm appearance-none border border-surface-container-high focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                        >
                          {assembliesList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.city || "Cameroun"})
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 pointer-events-none text-on-surface-variant text-[20px]">
                          arrow_drop_down
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      data-no-loader="true"
                      className="w-full h-12 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-container text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-primary/20 active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer mt-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t("common.loading")}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
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

      {/* Footer minimaliste élégant */}
      <footer className="w-full max-w-[1080px] mx-auto px-4 py-3 sm:py-4 text-center flex-shrink-0 z-10">
        <p className="text-[11px] text-on-surface-variant flex items-center justify-center gap-2 flex-wrap">
          <span>Mission du Plein Évangile Cameroun</span>
          <span>•</span>
          <span>Fondée en 1961</span>
          <span>•</span>
          <span>Décret N°69/DF/144</span>
        </p>
      </footer>
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
