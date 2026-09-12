/**
 * Parses Supabase auth redirect URLs (foodforyou://auth/...) for tokens in
 * query string or hash fragment.
 */
export type AuthDeepLinkRoute = 'callback' | 'reset-password' | null;

export function classifyAuthDeepLink(url: string): AuthDeepLinkRoute {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('auth/reset-password')) return 'reset-password';
  if (url.includes('auth/callback')) return 'callback';
  return null;
}

export function parseAuthParamsFromUrl(url: string): {
  access_token: string | undefined;
  refresh_token: string | undefined;
  code: string | undefined;
} {
  const merged = new Map<string, string>();
  try {
    const hashStart = url.indexOf('#');
    const qStart = url.indexOf('?');
    const hashEnd = hashStart >= 0 ? hashStart : url.length;

    if (qStart >= 0) {
      const qEnd = hashStart >= 0 ? hashStart : url.length;
      const qs = url.slice(qStart + 1, qEnd);
      new URLSearchParams(qs).forEach((v, k) => merged.set(k, v));
    }
    if (hashStart >= 0) {
      const hash = url.slice(hashStart + 1);
      new URLSearchParams(hash).forEach((v, k) => merged.set(k, v));
    }
  } catch {
    /* ignore */
  }
  return {
    access_token: merged.get('access_token'),
    refresh_token: merged.get('refresh_token'),
    code: merged.get('code'),
  };
}
