/**
 * Persistent site settings store — banners & theme overrides.
 *
 * Backed by the `site_settings` DB table (key → JSON value string).
 * Falls back gracefully to defaults if the table is empty.
 */

import fs from "fs";
import path from "path";
import { db, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface BannerLang {
  hero_badge?: string;
  hero_h1a?:  string;
  hero_h1b?:  string;
  hero_sub?:  string;
  hero_cta1?: string;
  hero_cta2?: string;
}

export interface BannerSettings {
  en?: BannerLang;
  ar?: BannerLang;
}

export interface ThemeSettings {
  primary?:   string;
  secondary?: string;
  accent?:    string;
}

export interface SiteSettings {
  banners:            BannerSettings;
  theme:              ThemeSettings;
  heroImageUpdatedAt?: string;
}

/** Absolute path where the uploaded hero image is stored */
export const HERO_IMAGE_PATH = path.resolve(process.cwd(), "data", "hero.jpg");

const DEFAULT_SETTINGS: SiteSettings = { banners: {}, theme: {} };

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getKey<T>(key: string, fallback: T): Promise<T> {
  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    if (!row) return fallback;
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function setKey(key: string, value: unknown): Promise<void> {
  const serialised = JSON.stringify(value);
  await db
    .insert(siteSettings)
    .values({ key, value: serialised, updated_at: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set:    { value: serialised, updated_at: new Date() },
    });
}

// ── One-time migration from JSON file ─────────────────────────────────────────
// If the old JSON file exists and the DB has no settings yet, import and delete it.

export async function migrateLegacySettingsFile(): Promise<void> {
  const legacyFile = path.resolve(process.cwd(), "data", "siteSettings.json");
  if (!fs.existsSync(legacyFile)) return;

  try {
    const raw  = fs.readFileSync(legacyFile, "utf-8");
    const data = JSON.parse(raw) as Partial<SiteSettings>;

    if (data.banners && Object.keys(data.banners).length) {
      await setKey("banners", data.banners);
    }
    if (data.theme && Object.keys(data.theme).length) {
      await setKey("theme", data.theme);
    }
    if (data.heroImageUpdatedAt) {
      await setKey("heroImageUpdatedAt", data.heroImageUpdatedAt);
    }

    // Remove the file once migrated
    fs.unlinkSync(legacyFile);
  } catch { /* non-fatal — legacy file simply stays until next restart */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SiteSettings> {
  const [banners, theme, heroImageUpdatedAt] = await Promise.all([
    getKey<BannerSettings>("banners", DEFAULT_SETTINGS.banners),
    getKey<ThemeSettings>("theme",    DEFAULT_SETTINGS.theme),
    getKey<string | undefined>("heroImageUpdatedAt", undefined),
  ]);
  return { banners, theme, ...(heroImageUpdatedAt ? { heroImageUpdatedAt } : {}) };
}

export async function updateBanners(banners: BannerSettings): Promise<SiteSettings> {
  await setKey("banners", banners);
  return getSiteSettings();
}

export async function updateTheme(theme: ThemeSettings): Promise<SiteSettings> {
  await setKey("theme", theme);
  return getSiteSettings();
}

export async function setHeroImageUpdatedAt(ts: string): Promise<SiteSettings> {
  await setKey("heroImageUpdatedAt", ts);
  return getSiteSettings();
}
