import 'server-only';
import { callbackUrl, json, videoBytes, type SavedAccount, type Step, type WorkItem } from './common';

/** YouTube Shorts through Google OAuth and the YouTube Data API resumable upload. */
export const YT_SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

export function youtubeAuthUrl(state: string) {
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callbackUrl('youtube'), response_type: 'code', scope: YT_SCOPES.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

type Tok = { access_token: string; expires_in: number; refresh_token?: string };
function token(params: Record<string, string>) {
  return fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }) });
}

export async function youtubeExchange(code: string): Promise<SavedAccount[]> {
  const t = await json<Tok>(await token({ code, redirect_uri: callbackUrl('youtube'), grant_type: 'authorization_code' }), 'Google login');
  const ch = await json<{ items?: { id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } }[] }>(
    await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${t.access_token}` } }), 'YouTube channel');
  if (!ch.items?.length) throw new Error('This Google account has no YouTube channel yet — create one on YouTube first.');
  return ch.items.map((c) => ({ external_id: c.id, name: c.snippet.title, username: c.snippet.customUrl ?? null, picture: c.snippet.thumbnails?.default?.url ?? null, access_token: t.access_token, refresh_token: t.refresh_token ?? null, expires_in: t.expires_in }));
}

export async function youtubeRefresh(refresh: string) {
  const t = await json<Tok>(await token({ refresh_token: refresh, grant_type: 'refresh_token' }), 'YouTube token refresh');
  return { access_token: t.access_token, expires_in: t.expires_in };
}

export async function youtubeStep(w: WorkItem, videoUrl: string): Promise<Step> {
  const bytes = await videoBytes(videoUrl);
  const title = `${w.title}`.slice(0, 90) + ' #Shorts';
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${w.access_token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(bytes.length) },
    body: JSON.stringify({
      snippet: { title, description: (w.caption ?? '').slice(0, 4900), categoryId: '22' },
      status: { privacyStatus: w.options.youtube?.privacy || 'public', selfDeclaredMadeForKids: false },
    }),
  });
  if (!init.ok) await json(init, 'YouTube upload');
  const location = init.headers.get('location');
  if (!location) throw new Error('YouTube upload: no upload address returned');
  const put = await json<{ id: string }>(await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) }, body: bytes }), 'YouTube upload');
  return { status: 'posted', external_id: put.id, url: `https://youtube.com/shorts/${put.id}` };
}
