"use client";

import React from "react";
import { formatBackendErrorMessage } from "@/lib/api";

export type AlertType = "error" | "success" | "warning" | "info";

export interface AlertBannerProps {
  type?: AlertType;
  title?: string;
  message?: string | any;
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  type = "error",
  title,
  message,
  onDismiss,
  className = "",
}: AlertBannerProps) {
  if (!message) return null;

  const formattedMessage =
    typeof message === "string"
      ? formatBackendErrorMessage(message)
      : formatBackendErrorMessage(message);

  const defaultTitles: Record<AlertType, string> = {
    error: "Erreur rencontrée",
    warning: "Attention requise",
    info: "Information",
    success: "Opération réussie",
  };

  const displayTitle = title || defaultTitles[type];

  // Guaranteed high-contrast color styles for maximum legibility in all contexts
  const styles: Record<
    AlertType,
    {
      wrapper: string;
      iconBg: string;
      titleColor: string;
      textColor: string;
      closeBtn: string;
    }
  > = {
    error: {
      wrapper:
        "bg-rose-50/95 border-2 border-rose-400 border-l-[6px] border-l-rose-700 shadow-sm",
      iconBg: "bg-rose-700 text-white shadow-sm",
      titleColor: "text-rose-950 font-extrabold",
      textColor: "text-rose-950 font-semibold",
      closeBtn: "text-rose-800 hover:text-rose-950 hover:bg-rose-200/80",
    },
    success: {
      wrapper:
        "bg-emerald-50/95 border-2 border-emerald-400 border-l-[6px] border-l-emerald-700 shadow-sm",
      iconBg: "bg-emerald-700 text-white shadow-sm",
      titleColor: "text-emerald-950 font-extrabold",
      textColor: "text-emerald-950 font-semibold",
      closeBtn: "text-emerald-800 hover:text-emerald-950 hover:bg-emerald-200/80",
    },
    warning: {
      wrapper:
        "bg-amber-50/95 border-2 border-amber-400 border-l-[6px] border-l-amber-600 shadow-sm",
      iconBg: "bg-amber-600 text-white shadow-sm",
      titleColor: "text-amber-950 font-extrabold",
      textColor: "text-amber-950 font-semibold",
      closeBtn: "text-amber-800 hover:text-amber-950 hover:bg-amber-200/80",
    },
    info: {
      wrapper:
        "bg-sky-50/95 border-2 border-sky-400 border-l-[6px] border-l-sky-700 shadow-sm",
      iconBg: "bg-sky-700 text-white shadow-sm",
      titleColor: "text-sky-950 font-extrabold",
      textColor: "text-sky-950 font-semibold",
      closeBtn: "text-sky-800 hover:text-sky-950 hover:bg-sky-200/80",
    },
  };

  const currentStyle = styles[type] || styles.error;

  return (
    <div
      role="alert"
      className={`rounded-xl p-3.5 sm:p-4 flex items-start gap-3 transition-all ${currentStyle.wrapper} ${className}`}
    >
      {/* Icon Badge */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${currentStyle.iconBg}`}
      >
        {type === "success" && (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {type === "error" && (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
        {type === "warning" && (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        {type === "info" && (
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {displayTitle && (
          <h4
            className={`text-xs ${currentStyle.titleColor} tracking-wide uppercase mb-0.5 leading-tight`}
          >
            {displayTitle}
          </h4>
        )}
        <div
          className={`text-xs sm:text-[13px] ${currentStyle.textColor} leading-relaxed break-words`}
        >
          {formattedMessage}
        </div>
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 -mr-1 -mt-1 rounded-lg shrink-0 transition-colors cursor-pointer ${currentStyle.closeBtn}`}
          aria-label="Fermer la notification"
          title="Fermer"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

