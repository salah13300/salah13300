"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function SiteHeader() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    // Remplace le segment de langue en tête du chemin (/fr/... -> /en/...)
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={`/${locale}`} className="wordmark">
          <span className="dot" />
          EV Price Watch
        </Link>
        <nav className="site-nav" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <select
            value={locale}
            onChange={(e) => switchLocale(e.target.value)}
            aria-label="Langue"
            style={{
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "4px 8px",
            }}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
          <Link href={`/${locale}/compte`}>{t("account")}</Link>
        </nav>
      </div>
    </header>
  );
}
