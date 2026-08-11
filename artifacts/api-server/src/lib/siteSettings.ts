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

// ── App config types ──────────────────────────────────────────────────────────

export interface AppThemeSettings {
  gradientStart?: string;
  gradientMid?:   string;
  gradientEnd?:   string;
  primary?:       string;
  secondary?:     string;
}

export interface AppOffer {
  id:         string;
  titleEn:    string;
  titleAr:    string;
  subtitleEn: string;
  subtitleAr: string;
  color:      string;
  color2:     string;
  active:     boolean;
}

export interface AppAnnouncement {
  titleEn:   string;
  titleAr:   string;
  color:     string;
  textColor: string;
  active:    boolean;
}

export interface AppServiceConfig {
  hidden: string[]; // service IDs to hide from home screen
}

export interface AppContactConfig {
  phone:    string; // digits only, e.g. 966555616449
  whatsapp: string; // digits only, e.g. 966555616449
}

const DEFAULT_ANNOUNCEMENT: AppAnnouncement = { titleEn: '', titleAr: '', color: '#2D1B69', textColor: '#FFFFFF', active: false };
const DEFAULT_CONTACT: AppContactConfig     = { phone: '966555616449', whatsapp: '966555616449' };

export interface AppConfig {
  theme:        AppThemeSettings;
  offers:       AppOffer[];
  announcement: AppAnnouncement;
  services:     AppServiceConfig;
  contact:      AppContactConfig;
  plans:        AppPlan[];
}

export async function getAppConfig(): Promise<AppConfig> {
  const [theme, offers, announcement, services, contact, plans] = await Promise.all([
    getKey<AppThemeSettings> ("app_theme",         {}),
    getKey<AppOffer[]>       ("app_offers",         []),
    getKey<AppAnnouncement>  ("app_announcement",   DEFAULT_ANNOUNCEMENT),
    getKey<AppServiceConfig> ("app_services",       { hidden: [] }),
    getKey<AppContactConfig> ("app_contact",        DEFAULT_CONTACT),
    getKey<AppPlan[]>        ("app_plans",          DEFAULT_PLANS),
  ]);
  return { theme, offers, announcement, services, contact, plans };
}

export async function updateAppTheme(theme: AppThemeSettings): Promise<AppConfig> {
  await setKey("app_theme", theme);
  return getAppConfig();
}

export async function updateAppOffers(offers: AppOffer[]): Promise<AppConfig> {
  await setKey("app_offers", offers);
  return getAppConfig();
}

export async function updateAppAnnouncement(announcement: AppAnnouncement): Promise<AppConfig> {
  await setKey("app_announcement", announcement);
  return getAppConfig();
}

export async function updateAppServiceConfig(config: AppServiceConfig): Promise<AppConfig> {
  await setKey("app_services", config);
  return getAppConfig();
}

export async function updateAppContact(contact: AppContactConfig): Promise<AppConfig> {
  await setKey("app_contact", contact);
  return getAppConfig();
}

// ── App plans ─────────────────────────────────────────────────────────────────

export interface AppPlan {
  id:         string;
  nameEn:     string;
  nameAr:     string;
  subtitleEn: string;
  subtitleAr: string;
  price:      string;
  color1:     string;
  color2:     string;
  popular:    boolean;
  active:     boolean;
  benefitsEn: string[];
  benefitsAr: string[];
}

const DEFAULT_PLANS: AppPlan[] = [
  { id: 'basic',     nameEn: 'Basic Package',     nameAr: 'الباقة الأساسية', subtitleEn: 'Daily Use',              subtitleAr: 'للاستخدام اليومي',       price: '199', color1: '#5B2C91', color2: '#7B2A9E', popular: false, active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Emergency car towing — 2 times'], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة — مرتان','سحب السيارة في حالات الطوارئ — مرتان'] },
  { id: 'accidents', nameEn: 'Accidents Package', nameAr: 'باقة الحوادث',    subtitleEn: 'Emergency Coverage',    subtitleAr: 'لحالات الطوارئ',         price: '299', color1: '#2D1B69', color2: '#5B2C91', popular: true,  active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Car towing in breakdowns — 2 times','Transfer to accident assessment center',"Workshop of client's choice"], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة','سحب السيارة في حالة العطل — مرتان','نقل سيارة الحادث إلى مركز تقدير الحوادث','ورشة من اختيار العميل'] },
  { id: 'rental',    nameEn: 'Rental Package',    nameAr: 'باقة الإجرة',     subtitleEn: 'Full Coverage & Comfort', subtitleAr: 'تغطية شاملة وراحة تامة', price: '600', color1: '#8B35BB', color2: '#C21875', popular: false, active: true, benefitsEn: ['Battery charge — 6 times','Fuel supply — 6 times','Tire change — 6 times','Light electrical & mechanical maintenance — 2 times','Car towing in breakdowns — 2 times','Computer fault diagnostics — 3 times'], benefitsAr: ['شحن البطارية — 6 مرات','تزويد الوقود — 6 مرات','تغيير الإطارات — 6 مرات','صيانة كهربائية وميكانيكية خفيفة — مرتان','سحب السيارة في حالة العطل — مرتان','كشف الأعطال بالكمبيوتر — 3 مرات'] },
];

export async function updateAppPlans(plans: AppPlan[]): Promise<AppConfig> {
  await setKey("app_plans", plans);
  return getAppConfig();
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
