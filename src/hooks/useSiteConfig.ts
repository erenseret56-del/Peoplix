/**
 * useSiteConfig
 *
 * Fetches the public site config (logo, video URL) from the backend once
 * and caches it in module-level state so every component shares the same fetch.
 * Falls back to bundled defaults when the API hasn't been configured yet.
 */

import { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin;

export interface SiteConfig {
  logo_data_url: string | null;
  video_url: string | null;
}

// Module-level cache — shared across all hook instances
let cached: SiteConfig | null = null;
let fetchPromise: Promise<SiteConfig> | null = null;

async function fetchSiteConfig(): Promise<SiteConfig> {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`${API_BASE}/api/site-config/public`)
    .then(r => r.json())
    .then(json => {
      const data: SiteConfig = {
        logo_data_url: json?.data?.logo_data_url ?? null,
        video_url:     json?.data?.video_url     ?? null,
      };
      cached = data;
      fetchPromise = null;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return { logo_data_url: null, video_url: null };
    });

  return fetchPromise;
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(cached ?? { logo_data_url: null, video_url: null });
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) { setConfig(cached); setLoading(false); return; }
    fetchSiteConfig().then(cfg => { setConfig(cfg); setLoading(false); });
  }, []);

  /** Call this after an admin upload to invalidate the cache */
  const invalidate = () => {
    cached = null;
    fetchPromise = null;
    setLoading(true);
    fetchSiteConfig().then(cfg => { setConfig(cfg); setLoading(false); });
  };

  return { config, loading, invalidate };
}
