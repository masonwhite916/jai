/**
 * Persistent site settings store — banners & theme overrides.
 * Written to a JSON file so changes survive server restarts.
 */
import fs from "fs";
import path from "path";

export interface BannerLang {
  hero_badge?: string;
  hero_h1a?: string;
  hero_h1b?: string;
  hero_sub?: string;
  hero_cta1?: string;
  hero_cta2?: string;
}

export interface BannerSettings {
  en?: BannerLang;
  ar?: BannerLang;
}

export interface ThemeSettings {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface SiteSettings {
  banners: BannerSettings;
  theme: ThemeSettings;
  /** ISO timestamp of the last hero image upload, used as a cache-buster */
  heroImageUpdatedAt?: string;
}

const SETTINGS_FILE = path.resolve(
  process.cwd(),
  "data",
  "siteSettings.json",
);

/** Absolute path where the uploaded hero image is stored */
export const HERO_IMAGE_PATH = path.resolve(
  process.cwd(),
  "data",
  "hero.jpg",
);

const DEFAULT_SETTINGS: SiteSettings = { banners: {}, theme: {} };

function readSettings(): SiteSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS;
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: SiteSettings): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export function getSiteSettings(): SiteSettings {
  return readSettings();
}

export function updateBanners(banners: BannerSettings): SiteSettings {
  const current = readSettings();
  const updated: SiteSettings = { ...current, banners };
  writeSettings(updated);
  return updated;
}

export function updateTheme(theme: ThemeSettings): SiteSettings {
  const current = readSettings();
  const updated: SiteSettings = { ...current, theme };
  writeSettings(updated);
  return updated;
}

export function setHeroImageUpdatedAt(ts: string): SiteSettings {
  const current = readSettings();
  const updated: SiteSettings = { ...current, heroImageUpdatedAt: ts };
  writeSettings(updated);
  return updated;
}
