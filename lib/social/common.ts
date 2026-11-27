import 'server-only';
import { SITE_URL } from '@/lib/seo';

export type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
export type Provider = 'meta' | 'youtube' | 'tiktok';
export type SavedAccount = { external_id: string; name?: string | null; username?: string | null; picture?: string | null; access_token: string; refresh_token?: string | null; expires_in?: number; refresh_expires_in?: number };

/** Work item handed out by the dispatcher (one post on one account). */
export type WorkItem = {
  target_id: string; platform: Platform; phase: 'sending' | 'processing'; state: Record<string, unknown>; attempts: number;
  caption: string | null; options: { tiktok?: TikTokOptions; youtube?: { privacy?: string } }; title: string; file_path: string;
  account_id: string; external_id: string; username: string | null;
  access_token: string | null; refresh_token: string | null; access_expires_at: string | null;
};
export type TikTokOptions = { privacy_level: string; disable_comment?: boolean; disable_duet?: boolean; disable_stitch?: boolean; brand_content_toggle?: boolean; brand_organic_toggle?: boolean };

/** What one step of publishing produced. */
export type Step =
  | { status: 'processing'; external_id?: string; state: Record<string, unknown> }
  | { status: 'posted'; external_id?: string; url?: string | null }
  | { status: 'failed'; error: string };

export const site = () => SITE_URL.replace(/\/$/, '');
export const callbackUrl = (p: Provider) => `${site()}/api/social/callback/${p}`;

export const providerReady: Record<Provider, () => boolean> = {
  meta: () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
  youtube: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  tiktok: () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
};
export const readyPlatforms = (): Platform[] => [
  ...(providerReady.meta() ? (['facebook', 'instagram'] as Platform[]) : []),
  ...(providerReady.youtube() ? (['youtube'] as Platform[]) : []),
  ...(providerReady.tiktok() ? (['tiktok'] as Platform[]) : []),
];

export async function json<T>(res: Response, what: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body && (body.error && (body.error.message || body.error.code && body.error.code !== 'ok')))) {
    const e = body?.error;
    const msg = typeof e === 'string' ? `${e}${body.error_description ? `: ${body.error_description}` : ''}` : e?.message || body?.message || `${what} failed (${res.status})`;
    throw new Error(`${what}: ${msg}`);
  }
  return body as T;
}

export async function videoBytes(publicUrl: string) {
  const res = await fetch(publicUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Couldn’t read the video file (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
