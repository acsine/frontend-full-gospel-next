"use client";

import React from "react";
import { IntlProvider, useIntl } from "@/intl";

export type Language = "FR" | "EN";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <IntlProvider>{children}</IntlProvider>;
}

export function useLanguage() {
  const { lang, setLang, tVal } = useIntl();
  return {
    lang,
    setLang,
    t: tVal,
  };
}

export { useIntl };
