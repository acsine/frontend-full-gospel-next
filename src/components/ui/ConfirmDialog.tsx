"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type DialogVariant = "primary" | "danger" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface AlertOptions {
  title?: string;
  message: React.ReactNode;
  buttonText?: string;
  variant?: DialogVariant;
}

interface DialogState {
  isOpen: boolean;
  type: "confirm" | "alert";
  title: string;
  message: React.ReactNode;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
  resolve: (value: boolean) => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions =
        typeof options === "string" ? { message: options } : options;

      setDialog({
        isOpen: true,
        type: "confirm",
        title: opts.title || "Confirmation requise",
        message: opts.message,
        confirmText: opts.confirmText || "Confirmer",
        cancelText: opts.cancelText || "Annuler",
        variant: opts.variant || "primary",
        resolve,
      });

      // Auto-focus confirm button
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts: AlertOptions =
        typeof options === "string" ? { message: options } : options;

      setDialog({
        isOpen: true,
        type: "alert",
        title: opts.title || "Information",
        message: opts.message,
        confirmText: opts.buttonText || "Compris",
        cancelText: "",
        variant: opts.variant || "info",
        resolve: () => resolve(),
      });

      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    });
  }, []);

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  };

  const handleCancel = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-50 text-rose-600 border-rose-200",
          buttonBg: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          ),
        };
      case "warning":
        return {
          iconBg: "bg-amber-50 text-amber-600 border-amber-200",
          buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case "info":
        return {
          iconBg: "bg-blue-50 text-blue-600 border-blue-200",
          buttonBg: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
      case "primary":
      default:
        return {
          iconBg: "bg-primary/10 text-primary border-primary/20",
          buttonBg: "bg-primary hover:bg-primary/90 text-on-primary shadow-primary/20",
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          ),
        };
    }
  };

  const currentStyles = dialog ? getVariantStyles(dialog.variant) : null;

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Tailwind Confirmation & Alert Dialog Modal */}
      {dialog?.isOpen && currentStyles && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
          }}
        >
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-2xl border border-surface-container-high space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header: Icon & Title */}
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${currentStyles.iconBg}`}
              >
                {currentStyles.icon}
              </div>
              <div className="space-y-1 min-w-0 flex-1 pt-0.5">
                <h3 className="font-black text-base sm:text-lg text-on-surface leading-snug">
                  {dialog.title}
                </h3>
                <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {dialog.message}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {dialog.type === "confirm" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${currentStyles.buttonBg}`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

