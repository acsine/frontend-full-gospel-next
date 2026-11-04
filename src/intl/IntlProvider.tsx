"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { dictionaries, Locale, Dictionary } from "@/locales";

interface IntlContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  lang: "FR" | "EN"; // Alias compatibility
  setLang: (lang: "FR" | "EN") => void; // Alias compatibility
  t: (key: string, params?: Record<string, string | number> | string, fallback?: string) => string;
  tVal: (fr: string, en: string) => string;
  dict: Dictionary;
}

const IntlContext = createContext<IntlContextType | null>(null);

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferred_lang") || localStorage.getItem("locale");
      if (stored) {
        const normalized = stored.toLowerCase();
        if (normalized === "fr" || normalized === "en") {
          setLocaleState(normalized as Locale);
        }
      }
    } catch {}
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    const valid = newLocale === "en" ? "en" : "fr";
    setLocaleState(valid);
    try {
      localStorage.setItem("preferred_lang", valid.toUpperCase());
      localStorage.setItem("locale", valid);
      document.cookie = `NEXT_LOCALE=${valid}; path=/; max-age=31536000; SameSite=Lax`;
      if (typeof document !== "undefined") {
        document.documentElement.lang = valid;
      }
    } catch {}
  }, []);

  // Backward compatibility with "FR" | "EN"
  const lang = (locale.toUpperCase() as "FR" | "EN");
  const setLang = useCallback((l: "FR" | "EN") => {
    setLocale(l.toLowerCase() as Locale);
  }, [setLocale]);

  const dict = useMemo(() => dictionaries[locale] || dictionaries.fr, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number> | string, fallback?: string): string => {
      if (typeof params === "string") {
        if (key.includes(".")) {
          const raw = getNestedValue(dict, key);
          return raw !== undefined ? raw : params;
        }
        return locale === "en" ? params : key;
      }
      let raw = getNestedValue(dict, key);
      if (raw === undefined && locale !== "fr") {
        // Fallback to french dictionary if missing in english
        raw = getNestedValue(dictionaries.fr, key);
      }
      if (raw === undefined) {
        return fallback !== undefined ? fallback : key;
      }
      if (params) {
        return Object.entries(params).reduce((acc, [k, v]) => {
          return acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }, raw);
      }
      return raw;
    },
    [dict, locale]
  );

  const tVal = useCallback(
    (frVal: string, enVal: string): string => {
      return locale === "en" ? enVal : frVal;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      lang,
      setLang,
      t,
      tVal,
      dict,
    }),
    [locale, setLocale, lang, setLang, t, tVal, dict]
  );

  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useIntl(): IntlContextType {
  const context = useContext(IntlContext);
  if (!context) {
    // Fallback safe defaults if used outside provider
    const defaultDict = dictionaries.fr;
    return {
      locale: "fr",
      setLocale: () => {},
      lang: "FR",
      setLang: () => {},
      t: (key: string, _params?: any, fallback?: string) => {
        return getNestedValue(defaultDict, key) || fallback || key;
      },
      tVal: (fr: string) => fr,
      dict: defaultDict,
    };
  }
  return context;
}

export function useTranslations(section?: string) {
  const intl = useIntl();
  if (!section) return intl.t;
  return (key: string, params?: Record<string, string | number> | string, fallback?: string) => {
    return intl.t(`${section}.${key}`, params, fallback);
  };
}

