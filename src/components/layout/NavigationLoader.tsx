"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

interface PageLoadingContextType {
  isLoading: boolean;
  startLoading: (targetButton?: HTMLElement | null) => void;
  stopLoading: () => void;
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function usePageLoading() {
  return useContext(PageLoadingContext);
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeSpinnerBtnRef = useRef<HTMLElement | null>(null);

  // Clear injected button spinners and restore replaced icons
  const cleanupButtonSpinner = useCallback(() => {
    if (activeSpinnerBtnRef.current) {
      const spinner = activeSpinnerBtnRef.current.querySelector(".page-btn-spinner");
      if (spinner) {
        spinner.remove();
      }
      activeSpinnerBtnRef.current.removeAttribute("data-btn-loading");
      activeSpinnerBtnRef.current.style.pointerEvents = "";
      if (activeSpinnerBtnRef.current.hasAttribute("data-original-min-width")) {
        activeSpinnerBtnRef.current.style.minWidth = activeSpinnerBtnRef.current.getAttribute("data-original-min-width") || "";
        activeSpinnerBtnRef.current.removeAttribute("data-original-min-width");
      }
      activeSpinnerBtnRef.current = null;
    }

    // Restore any icons that were replaced by the spinner
    document.querySelectorAll<HTMLElement>("[data-replaced-by-spinner='true']").forEach((icon) => {
      icon.style.display = "";
      icon.removeAttribute("data-replaced-by-spinner");
    });

    // Also scan document for any leftover spinners
    document.querySelectorAll(".page-btn-spinner").forEach((el) => el.remove());
    document.querySelectorAll<HTMLElement>("[data-btn-loading]").forEach((el) => {
      el.removeAttribute("data-btn-loading");
      el.style.pointerEvents = "";
      if (el.hasAttribute("data-original-min-width")) {
        el.style.minWidth = el.getAttribute("data-original-min-width") || "";
        el.removeAttribute("data-original-min-width");
      }
    });
  }, []);

  const stopLoading = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setIsLoading(false);
      setProgress(0);
      cleanupButtonSpinner();
    }, 280);
  }, [cleanupButtonSpinner]);

  const startLoading = useCallback((targetButton?: HTMLElement | null) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    cleanupButtonSpinner();

    setIsLoading(true);
    setVisible(true);
    setProgress(15);

    // If button passed, inject the red spinner in place of the icon without shifting
    if (targetButton && !targetButton.querySelector(".page-btn-spinner")) {
      activeSpinnerBtnRef.current = targetButton;
      targetButton.setAttribute("data-btn-loading", "true");
      targetButton.style.pointerEvents = "none";

      const spinner = document.createElement("span");
      spinner.className = "page-btn-spinner";

      // Look for an existing icon to replace seamlessly
      const existingIcon = targetButton.querySelector<HTMLElement>(
        ".material-symbols-outlined, svg, [data-icon], .lucide, i"
      );

      if (existingIcon) {
        // Measure icon dimensions so the spinner matches its exact footprint
        const iconRect = existingIcon.getBoundingClientRect();
        if (iconRect.width > 0 && iconRect.height > 0) {
          spinner.style.width = `${Math.round(iconRect.width)}px`;
          spinner.style.height = `${Math.round(iconRect.height)}px`;
        }
        // Insert spinner directly before icon and hide icon
        existingIcon.insertAdjacentElement("beforebegin", spinner);
        existingIcon.setAttribute("data-replaced-by-spinner", "true");
        existingIcon.style.display = "none";
      } else {
        // Lock button width to prevent text/layout shifting
        const originalWidth = targetButton.offsetWidth;
        if (originalWidth > 0 && !targetButton.style.minWidth) {
          targetButton.setAttribute("data-original-min-width", targetButton.style.minWidth || "");
          targetButton.style.minWidth = `${originalWidth}px`;
        }
        targetButton.prepend(spinner);
      }
    }

    // Progressive animation: 15% -> 40% -> 70% -> 88%
    let current = 15;
    timerRef.current = setInterval(() => {
      current += (90 - current) * 0.15;
      setProgress(Math.min(current, 90));
    }, 150);
  }, [cleanupButtonSpinner]);

  // Route change listener: automatically stops the loader when pathname updates
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      stopLoading();
    }
  }, [pathname, stopLoading]);

  // Global click interceptor for navigation links & buttons
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Find closest anchor or button
      const link = target.closest("a") as HTMLAnchorElement | null;
      const button = target.closest("button") as HTMLButtonElement | null;

      if (link && link.href) {
        const url = new URL(link.href, window.location.origin);
        const isInternal = url.origin === window.location.origin;
        const isSamePage = url.pathname === window.location.pathname && url.search === window.location.search;
        const isHashOnly = link.getAttribute("href")?.startsWith("#");

        if (isInternal && !isSamePage && !isHashOnly && link.target !== "_blank") {
          startLoading(button || link);
        }
      } else if (button) {
        // If button explicitly opts out of automatic spinner injection (to prevent duplicate spinners)
        if (
          button.getAttribute("data-no-loader") === "true" ||
          button.closest("[data-no-loader='true']")
        ) {
          return;
        }

        // If it's a submit button or has data-loading attribute
        if (button.type === "submit" || button.getAttribute("data-loading") === "true") {
          startLoading(button);
        }
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [startLoading]);

  // Fallback safety timeout: reset after 7 seconds if something hangs
  useEffect(() => {
    if (isLoading) {
      const safetyTimeout = setTimeout(() => {
        stopLoading();
      }, 7000);
      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoading, stopLoading]);

  return (
    <PageLoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {/* Top Page Route Loader Bar - only shown and animated during page loading */}
      {visible && (
        <div
          className="route-loader-bar"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </PageLoadingContext.Provider>
  );
}
