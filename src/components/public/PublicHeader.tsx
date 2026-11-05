"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useIntl } from "@/intl";
import { getAccessToken, getStoredUser } from "@/lib/api";

export function PublicHeader() {
  const { locale, setLocale, t } = useIntl();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();
    if (token) {
      setIsLoggedIn(true);
      if (user?.first_name) {
        setUserFirstName(user.first_name);
      }
    }
  }, []);

  // Fermer le menu mobile lors d'un changement de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    {
      href: "/",
      label: t("nav.home") || "Accueil",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      href: "/assemblees",
      label: t("nav.assemblies") || "Assemblées",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
          <path d="M2 20h20" />
          <path d="M14 12v.01" />
          <path d="M12 2v2" />
          <path d="M10 3h4" />
        </svg>
      ),
    },
    {
      href: "/evenements",
      label: t("nav.events") || "Événements",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      href: "/publications",
      label: t("nav.teachings") || "Enseignements",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
    {
      href: "/departements",
      label: "Départements",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="7" r="4" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        </svg>
      ),
    },
    {
      href: "/mediatheque",
      label: "Médiathèque Audio",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ),
    },
    {
      href: "/actualites",
      label: "Actualités",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
          <path d="M18 14h-8" />
          <path d="M15 18h-5" />
          <path d="M10 6h8v4h-8V6Z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40">
        <div className="h-16 px-3 sm:px-6 lg:px-12 max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container-high/80 group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
              <Image
                src="/logo.jpg"
                alt={t("common.churchFullName")}
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-base md:text-lg text-primary tracking-tight leading-none uppercase whitespace-nowrap">
                Plein Évangile
              </span>
              <span className="text-[10px] text-on-surface-variant font-bold leading-none hidden xs:inline mt-0.5 truncate">
                Cameroun
              </span>
            </div>
          </Link>

          {/* Desktop Public Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-on-surface-variant">
            {navLinks.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  pathname === item.href
                    ? "bg-surface-container text-primary font-bold"
                    : "hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions (Desktop & Mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Lang Selector (Visible sur mobile & desktop) */}
            <div className="flex items-center bg-surface-container rounded-full p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`min-w-[26px] sm:min-w-[28px] h-6 sm:h-7 px-1.5 sm:px-2 rounded-full transition-all text-[11px] sm:text-xs ${
                  locale === "fr"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Passer en Français"
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`min-w-[26px] sm:min-w-[28px] h-6 sm:h-7 px-1.5 sm:px-2 rounded-full transition-all text-[11px] sm:text-xs ${
                  locale === "en"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Bouton Don (Desktop & tablette - sur mobile disponible dans la barre du bas et le tiroir) */}
            <Link
              href="/dons"
              className="hidden sm:flex h-8 sm:h-9 px-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary rounded-full text-xs font-bold items-center justify-center gap-1.5 shadow-xs transition-all whitespace-nowrap"
              title="Faire un don ou verser sa dîme"
            >
              <svg className="w-3.5 h-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span>{t("nav.give")}</span>
            </Link>

            {/* Bouton Dashboard / Connexion (Desktop & tablette - sur mobile disponible dans la barre du bas) */}
            <Link
              href={isLoggedIn ? "/dashboard" : "/connexion?redirect=/dashboard"}
              className="hidden sm:flex h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-sm font-bold items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all whitespace-nowrap"
              title="Espace Intendant & Dashboard"
            >
              {isLoggedIn ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>Dashboard</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Dashboard</span>
                </>
              )}
            </Link>

            {/* Bouton Hamburger Mobile (Aéré, bien cadré avec marge saine) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors shrink-0"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* TIROIR DE NAVIGATION MOBILE (MOBILE DRAWER) */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop sombre avec flou */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Volet latéral coulissant */}
          <div className="relative w-80 max-w-[85%] bg-surface-container-lowest text-on-surface h-full flex flex-col justify-between z-10 p-5 shadow-2xl overflow-y-auto border-l border-surface-container">
            {/* Header du tiroir */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container overflow-hidden shrink-0">
                    <Image
                      src="/logo.jpg"
                      alt={t("common.churchFullName")}
                      width={36}
                      height={36}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-primary leading-tight">
                      FULL GOSPEL MISSION
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-bold">
                      Cameroun • 10 Régions
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors"
                  aria-label="Fermer le menu"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Devise Officielle dans le Drawer */}
              <div className="mt-3 p-2.5 rounded-xl bg-secondary-fixed/30 border border-secondary-fixed-dim/60">
                <p className="text-[10px] uppercase font-bold text-secondary tracking-wider">
                  Devise Canonique
                </p>
                <p className="text-[11px] font-bold text-on-surface mt-0.5 leading-snug">
                  « No Other Christ – No Other Gospel – No Other Spirit »
                </p>
              </div>

              {/* Liens de navigation */}
              <nav className="py-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 block mb-2 px-3">
                  Navigation Publique
                </span>
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-primary-container text-on-primary font-bold shadow-sm"
                          : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className={isActive ? "text-on-primary" : "text-primary"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Pied du tiroir : Actions & Accès Intendant */}
            <div className="pt-4 border-t border-surface-container space-y-3">
              {/* Bouton Don en grand */}
              <Link
                href="/dons"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 rounded-xl bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-primary active:scale-[0.99] transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span>Faire un Don / Verser sa Dîme</span>
              </Link>

              {/* Bouton Connexion / Dashboard */}
              <Link
                href={isLoggedIn ? "/dashboard" : "/connexion?redirect=/dashboard"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isLoggedIn ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Tableau de Bord (Dashboard)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Dashboard / Connexion Sécurisée</span>
                  </>
                )}
              </Link>

              {/* Mention légale compacte */}
              <div className="text-center pt-2">
                <span className="text-[10px] text-on-surface-variant block">
                  Fondée en 1961 • Décret N°69/DF/144
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* BARRE DE NAVIGATION INFÉRIEURE MOBILE (BOTTOM NAV UNIFIÉE)     */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-1.5 px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid grid-cols-4 items-center">
        {/* 1. Accueil */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
            pathname === "/"
              ? "text-primary font-bold"
              : "text-on-surface-variant hover:text-on-surface font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === "/" ? "bg-primary/10" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/" ? "2.4" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Accueil</span>
        </Link>

        {/* 2. Assemblées */}
        <Link
          href="/assemblees"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
            pathname.startsWith("/assemblees")
              ? "text-primary font-bold"
              : "text-on-surface-variant hover:text-on-surface font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname.startsWith("/assemblees") ? "bg-primary/10" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname.startsWith("/assemblees") ? "2.4" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
              <path d="M2 20h20" />
              <path d="M14 12v.01" />
              <path d="M12 2v2" />
              <path d="M10 3h4" />
            </svg>
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Assemblées</span>
        </Link>

        {/* 3. Dons */}
        <Link
          href="/dons"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
            pathname.startsWith("/dons")
              ? "text-primary font-bold"
              : "text-on-surface-variant hover:text-on-surface font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname.startsWith("/dons") ? "bg-primary/10" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname.startsWith("/dons") ? "2.4" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Dons &amp; Dîmes</span>
        </Link>

        {/* 4. Dashboard / Connexion */}
        <Link
          href={isLoggedIn ? "/dashboard" : "/connexion?redirect=/dashboard"}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
            pathname.startsWith("/dashboard") || pathname.startsWith("/connexion")
              ? "text-primary font-bold"
              : "text-on-surface-variant hover:text-on-surface font-medium"
          }`}
        >
          <div className={`relative p-1 rounded-lg ${pathname.startsWith("/dashboard") || pathname.startsWith("/connexion") ? "bg-primary/10" : ""}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname.startsWith("/dashboard") ? "2.4" : "2"} strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {isLoggedIn && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-surface-container-lowest" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">
            {isLoggedIn ? "Dashboard" : "Connexion"}
          </span>
        </Link>
      </nav>
    </>
  );
}

export default PublicHeader;
