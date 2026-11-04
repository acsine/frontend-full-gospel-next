"use client";

import Link from "next/link";
import Image from "next/image";
import { useIntl } from "@/intl";

export function PublicFooter() {
  const { t } = useIntl();

  return (
    <footer className="bg-inverse-surface text-inverse-on-surface pt-16 pb-24 md:pb-12 border-t border-surface-variant/20">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Identity */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.jpg"
                  alt={t("common.appName")}
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-lg md:text-xl text-surface-container-lowest block tracking-tight">
                  {t("footer.brandTitle")}
                </span>
                <span className="text-xs text-surface-variant">
                  {t("footer.brandSubtitle")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-inverse-on-surface/5 rounded-xl border border-inverse-on-surface/10">
              <p className="text-xs font-semibold text-secondary-fixed italic">
                {t("footer.motto")}
              </p>
              <p className="text-[11px] text-surface-dim mt-1">
                {t("footer.founded")}
              </p>
            </div>
            <p className="text-xs text-surface-variant leading-relaxed">
              {t("footer.familyDescription")}
            </p>
          </div>

          {/* Col 2: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-bright">
              {t("footer.navigation")}
            </h4>
            <ul className="space-y-2 text-sm text-surface-variant">
              <li>
                <Link href="/" className="hover:text-surface-container-lowest transition-colors">
                  {t("footer.home")}
                </Link>
              </li>
              <li>
                <Link href="/assemblees" className="hover:text-surface-container-lowest transition-colors">
                  {t("footer.findAssembly")}
                </Link>
              </li>
              <li>
                <Link href="/evenements" className="hover:text-surface-container-lowest transition-colors">
                  {t("footer.eventsCalendar")}
                </Link>
              </li>
              <li>
                <Link href="/publications" className="hover:text-surface-container-lowest transition-colors">
                  {t("footer.publications")}
                </Link>
              </li>
              <li>
                <Link href="/dons" className="hover:text-surface-container-lowest transition-colors">
                  {t("footer.tithesAndGifts")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Headquarters & Regions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-bright">
              {t("footer.headquartersTitle")}
            </h4>
            <div className="space-y-2 text-xs text-surface-variant">
              <div>
                <p className="font-semibold text-surface-bright">{t("footer.adminSeat")}</p>
                <p>{t("footer.adminSeatLoc")}</p>
              </div>
              <div>
                <p className="font-semibold text-surface-bright">{t("footer.historicalCradle")}</p>
                <p>{t("footer.historicalCradleLoc")}</p>
              </div>
              <div>
                <p className="font-semibold text-surface-bright">{t("footer.regionalDelegations")}</p>
                <p>{t("footer.regionalDelegationsLoc")}</p>
              </div>
            </div>
          </div>

          {/* Col 4: Steward Portal & Access */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-bright">
              {t("footer.portalAccess")}
            </h4>
            <p className="text-xs text-surface-variant">
              {t("footer.portalAccessDesc")}
            </p>
            <Link
              href="/connexion?redirect=/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-sm"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              <span>{t("footer.portalButton")}</span>
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-inverse-on-surface/10 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-dim gap-4">
          <p>{t("footer.copyright")}</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
              {t("footer.serverActive")}
            </span>
            <Link href="/connexion" className="hover:text-surface-bright transition-colors">
              {t("footer.ministersPortal")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
