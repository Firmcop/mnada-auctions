import 'server-only';

/** Thin client for the Ayrshare posting service. Off unless AYRSHARE_API_KEY is set. */
const BASE = 'https://api.ayrshare.com/api';
export const autopostReady = () => !!process.env.AYRSHARE_API_KEY;

async function call<T>(path: string, init: { method?: string; body?: unknown; profileKey?: string | null } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.profileKey ? { 'Profile-Key': init.profileKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === 'error') {
    const msg = json?.message || json?.errors?.[0]?.message || `Posting service error (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

export function createProfile(title: string) {
  return call<{ profileKey: string; refId: string }>('/profiles', { body: { title, hideTopHeader: false } });
}

export function linkSession(profileKey: string, redirect?: string) {
  return call<{ url: string; expiresAt?: string }>('/profiles/link-sessions', {
    profileKey, body: { allowedSocial: ['tiktok', 'instagram', 'facebook', 'youtube'], ...(redirect ? { redirect } : {}) },
  });
}

export async function linkedPlatforms(profileKey: string) {
  const u = await call<{ activeSocialAccounts?: string[] }>('/user', { method: 'GET', profileKey });
  return (u.activeSocialAccounts ?? []).filter((p) => ['tiktok', 'instagram', 'facebook', 'youtube'].includes(p));
}

export type PostResult = { id?: string; status?: string; postIds?: { platform: string; status?: string; postUrl?: string; id?: string }[]; errors?: { platform?: string; message?: string }[] };

export function publish(opts: { profileKey?: string | null; text: string; platforms: string[]; videoUrl: string; at?: Date | null; title: string }) {
  const at = opts.at && opts.at.getTime() > Date.now() + 2 * 60 * 1000 ? opts.at.toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined;
  return call<PostResult>('/post', {
    profileKey: opts.profileKey,
    body: {
      post: opts.text,
      platforms: opts.platforms,
      mediaUrls: [opts.videoUrl],
      isVideo: true,
      ...(at ? { scheduleDate: at } : {}),
      ...(opts.platforms.includes('youtube') ? { youTubeOptions: { title: opts.title.slice(0, 95), visibility: 'public', shorts: true } } : {}),
      ...(opts.platforms.includes('instagram') ? { instagramOptions: { shareReelsFeed: true } } : {}),
    },
  });
}

export function removePost(id: string, profileKey?: string | null) {
  return call<unknown>('/post', { method: 'DELETE', profileKey, body: { id } });
}

export function registerWebhook(url: string) {
  return call<unknown>('/hook/webhook', { body: { action: 'scheduled', url } });
}
