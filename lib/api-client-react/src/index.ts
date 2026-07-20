import { useMutation } from "@tanstack/react-query";

export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

// ── Manual hook: hero image upload (multipart — not codegen-able) ─────────────

export interface HeroImageUploadResult {
  heroImageUpdatedAt: string;
}

/**
 * Upload a hero background image to the admin API.
 * The caller must provide a getter for the admin Bearer token.
 */
export function useAdminUploadHeroImage(getToken: () => string | null) {
  return useMutation<HeroImageUploadResult, Error, File>({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("image", file);

      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/site-settings/hero-image", {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }

      return res.json() as Promise<HeroImageUploadResult>;
    },
  });
}
