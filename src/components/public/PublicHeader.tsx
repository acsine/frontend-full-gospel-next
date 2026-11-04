"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useIntl } from "@/intl";
import { getAccessToken, getStoredUser } from "@/lib/api";

export function PublicHeader() {
  const { locale, setLocale, t } = useIntl();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);

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

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40">
      <div className="h-16 px-4 md:px-8 lg:px-12 max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 min-w-0 flex-shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-surface-container-high/80 group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/logo.jpg"
              alt={t("common.churchFullName")}
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base md:text-lg text-primary tracking-tight leading-tight">
              {t("nav.brandTitle")}
            </span>
            <span className="text-[11px] md:text-xs text-on-surface-variant font-medium hidden sm:inline">
              {t("nav.brandSubtitle")}
            </span>
          </div>
        </Link>

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-on-surface-variant">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/assemblees"
            className="px-3 py-1.5 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("nav.assemblies")}
          </Link>
          <Link
            href="/evenements"
            className="px-3 py-1.5 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("nav.events")}
          </Link>
          <Link
            href="/publications"
            className="px-3 py-1.5 rounded-full hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            {t("nav.teachings")}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Lang Selector */}
          <div className="flex items-center bg-surface-container rounded-full p-0.5 text-xs font-semibold">
            <button
              onClick={() => setLocale("fr")}
              className={`min-w-[28px] h-7 px-2 rounded-full transition-all ${
                locale === "fr"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`min-w-[28px] h-7 px-2 rounded-full transition-all ${
                locale === "en"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              EN
            </button>
          </div>

          {/* Action buttons */}
          <Link
            href="/dons"
            className="h-9 px-4 bg-primary-container hover:bg-primary text-on-primary rounded-full text-sm font-semibold flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all"
          >
            {t("nav.give")}
          </Link>

          <Link
            href={isLoggedIn ? "/dashboard" : "/connexion?redirect=/dashboard"}
            className="h-9 px-3.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            {isLoggedIn ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">
                  {userFirstName ? `Dashboard (${userFirstName})` : (t("nav.dashboard") || "Dashboard")}
                </span>
                <span className="sm:hidden">Dashboard</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-on-surface" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="hidden sm:inline">{t("nav.portal") || "Connexion Dashboard"}</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
