import { useState, useEffect } from 'react';
import {
  useAdminGetSiteSettings,
  getAdminGetSiteSettingsQueryKey,
  useAdminUpdateBanners,
  useAdminUpdateTheme,
} from '@workspace/api-client-react';
import type { BannerSettings, ThemeSettings, BannerLang } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Palette, Type, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslStringToHex(hsl: string): string {
  // Accepts "H S% L%" format from the CSS vars
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#6a2597';
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// Default hex values matching index.css :root vars
const DEFAULT_THEME = {
  primary:   hslStringToHex('254 59% 26%'),
  secondary: hslStringToHex('268 53% 37%'),
  accent:    hslStringToHex('327 78% 43%'),
};

type BannerKey = 'hero_badge' | 'hero_h1a' | 'hero_h1b' | 'hero_sub' | 'hero_cta1' | 'hero_cta2';

const BANNER_FIELDS: { key: BannerKey; label: string; multiline?: boolean }[] = [
  { key: 'hero_badge', label: 'Badge text (top pill)' },
  { key: 'hero_h1a',   label: 'Headline — line 1' },
  { key: 'hero_h1b',   label: 'Headline — line 2 (highlighted)' },
  { key: 'hero_sub',   label: 'Subheading', multiline: true },
  { key: 'hero_cta1',  label: 'Primary CTA button' },
  { key: 'hero_cta2',  label: 'Secondary CTA button' },
];

// ── Tab types ──────────────────────────────────────────────────────────────────
type Tab = 'banners' | 'theme';

// ── Component ─────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const [tab, setTab] = useState<Tab>('banners');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useAdminGetSiteSettings({
    query: { queryKey: getAdminGetSiteSettingsQueryKey() },
  });

  // ── Banner state ───────────────────────────────────────────────────────────
  const [enBanners, setEnBanners] = useState<Record<string, string>>({});
  const [arBanners, setArBanners] = useState<Record<string, string>>({});

  // ── Theme state ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<{ primary: string; secondary: string; accent: string }>(DEFAULT_THEME);

  // Populate form once data loads
  useEffect(() => {
    if (!settings) return;
    setEnBanners((settings.banners?.en as Record<string, string>) ?? {});
    setArBanners((settings.banners?.ar as Record<string, string>) ?? {});
    setTheme({
      primary:   settings.theme?.primary   ?? DEFAULT_THEME.primary,
      secondary: settings.theme?.secondary ?? DEFAULT_THEME.secondary,
      accent:    settings.theme?.accent    ?? DEFAULT_THEME.accent,
    });
  }, [settings]);

  const { mutateAsync: saveBanners, isPending: savingBanners } = useAdminUpdateBanners();
  const { mutateAsync: saveTheme,   isPending: savingTheme   } = useAdminUpdateTheme();

  const handleSaveBanners = async () => {
    try {
      const payload: BannerSettings = {
        en: enBanners as BannerSettings['en'],
        ar: arBanners as BannerSettings['ar'],
      };
      await saveBanners({ data: payload });
      await qc.invalidateQueries({ queryKey: getAdminGetSiteSettingsQueryKey() });
      toast({ title: 'Banners saved', description: 'Changes are live on the website.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save banners.', variant: 'destructive' });
    }
  };

  const handleSaveTheme = async () => {
    try {
      const payload: ThemeSettings = {
        primary:   theme.primary,
        secondary: theme.secondary,
        accent:    theme.accent,
      };
      await saveTheme({ data: payload });
      await qc.invalidateQueries({ queryKey: getAdminGetSiteSettingsQueryKey() });
      toast({ title: 'Theme saved', description: 'Colour changes are live on the website.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save theme.', variant: 'destructive' });
    }
  };

  const handleResetTheme = () => setTheme(DEFAULT_THEME);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          Website Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit banner content and colour theme. Changes go live instantly.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['banners', 'theme'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'banners' ? <Type className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
            {t === 'banners' ? 'Banners' : 'Theme'}
          </button>
        ))}
      </div>

      {/* ── Banners Tab ───────────────────────────────────────────────────────── */}
      {tab === 'banners' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* English */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">English</CardTitle>
                <CardDescription>Hero section text (EN)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {BANNER_FIELDS.map(({ key, label, multiline }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {label}
                    </label>
                    {multiline ? (
                      <textarea
                        rows={3}
                        value={enBanners[key] ?? ''}
                        onChange={(e) => setEnBanners((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`English ${label.toLowerCase()}…`}
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={enBanners[key] ?? ''}
                        onChange={(e) => setEnBanners((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`English ${label.toLowerCase()}…`}
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Arabic */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Arabic — عربي</CardTitle>
                <CardDescription>Hero section text (AR)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {BANNER_FIELDS.map(({ key, label, multiline }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {label}
                    </label>
                    {multiline ? (
                      <textarea
                        rows={3}
                        dir="rtl"
                        value={arBanners[key] ?? ''}
                        onChange={(e) => setArBanners((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Arabic ${label.toLowerCase()}…`}
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none font-['Cairo',sans-serif]"
                      />
                    ) : (
                      <input
                        type="text"
                        dir="rtl"
                        value={arBanners[key] ?? ''}
                        onChange={(e) => setArBanners((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Arabic ${label.toLowerCase()}…`}
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-['Cairo',sans-serif]"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveBanners} disabled={savingBanners} className="gap-2">
              <Save className="w-4 h-4" />
              {savingBanners ? 'Saving…' : 'Save Banners'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Theme Tab ─────────────────────────────────────────────────────────── */}
      {tab === 'theme' && (
        <div className="space-y-6">
          <Card className="border-border/50 max-w-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Colour Palette</CardTitle>
              <CardDescription>
                Pick hex colours. Changes apply to the live website instantly on save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {(
                [
                  { key: 'primary',   label: 'Primary',   desc: 'Buttons, links, highlights' },
                  { key: 'secondary', label: 'Secondary', desc: 'Supporting colour' },
                  { key: 'accent',    label: 'Accent',    desc: 'CTA buttons, badges, glows' },
                ] as { key: keyof typeof theme; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4">
                  {/* Colour picker */}
                  <label className="relative cursor-pointer flex-shrink-0">
                    <input
                      type="color"
                      value={theme[key]}
                      onChange={(e) => setTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="sr-only"
                    />
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-white/20 shadow-md transition-transform hover:scale-105"
                      style={{ backgroundColor: theme[key] }}
                    />
                  </label>

                  {/* Label + hex input */}
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                    <input
                      type="text"
                      value={theme[key]}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setTheme((prev) => ({ ...prev, [key]: v }));
                      }}
                      className="w-32 bg-muted/50 border border-border rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live preview swatches */}
          <Card className="border-border/50 max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <button
                  className="flex-1 py-2 rounded-full text-sm font-bold text-white transition-all"
                  style={{ backgroundColor: theme.accent }}
                >
                  Request Rescue
                </button>
                <button
                  className="flex-1 py-2 rounded-full text-sm font-bold text-white border transition-all"
                  style={{ backgroundColor: theme.primary, borderColor: theme.secondary }}
                >
                  View Plans
                </button>
              </div>
              <div className="flex gap-2">
                {(['primary', 'secondary', 'accent'] as const).map((k) => (
                  <div key={k} className="flex-1 text-center">
                    <div
                      className="h-8 rounded-md mb-1"
                      style={{ backgroundColor: theme[k] }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">{k}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleResetTheme} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSaveTheme} disabled={savingTheme} className="gap-2">
              <Save className="w-4 h-4" />
              {savingTheme ? 'Saving…' : 'Save Theme'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
