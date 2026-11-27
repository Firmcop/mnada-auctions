import 'server-only';
import { callbackUrl, json, type SavedAccount, type Step, type WorkItem } from './common';

/** Facebook Pages (Reels) and Instagram professional accounts (Reels) through Facebook Login. */
const V = () => process.env.META_GRAPH_VERSION || 'v24.0';
const G = (path: string) => `https://graph.facebook.com/${V()}${path}`;
export const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish'];

export function metaAuthUrl(state: string) {
  const q = new URLSearchParams({ client_id: process.env.META_APP_ID!, redirect_uri: callbackUrl('meta'), state, response_type: 'code', scope: META_SCOPES.join(',') });
  return `https://www.facebook.com/${V()}/dialog/oauth?${q}`;
}

export async function metaExchange(code: string): Promise<{ facebook: SavedAccount[]; instagram: SavedAccount[] }> {
  const base = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await json<{ access_token: string }>(await fetch(G(`/oauth/access_token?${new URLSearchParams({ ...base, redirect_uri: callbackUrl('meta'), code })}`)), 'Facebook login');
  const long = await json<{ access_token: string }>(await fetch(G(`/oauth/access_token?${new URLSearchParams({ ...base, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token })}`)), 'Facebook token');
  const pages = await json<{ data: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } }; instagram_business_account?: { id: string; username?: string; profile_picture_url?: string } }[] }>(
    await fetch(G(`/me/accounts?${new URLSearchParams({ fields: 'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}', limit: '50', access_token: long.access_token })}`)), 'Facebook Pages');
  // Page tokens obtained from a long-lived user token do not expire.
  const facebook = pages.data.map((p) => ({ external_id: p.id, name: p.name, picture: p.picture?.data?.url ?? null, access_token: p.access_token }));
  const instagram = pages.data.filter((p) => p.instagram_business_account).map((p) => ({
    external_id: p.instagram_business_account!.id, name: p.instagram_business_account!.username ?? p.name, username: p.instagram_business_account!.username ?? null,
    picture: p.instagram_business_account!.profile_picture_url ?? null, access_token: p.access_token,
  }));
  return { facebook, instagram };
}

async function post(path: string, params: Record<string, string>) {
  return fetch(G(path), { method: 'POST', body: new URLSearchParams(params) });
}

/** Facebook Reel: start → hosted upload from our public URL → finish, then poll until published. */
export async function facebookStep(w: WorkItem, videoUrl: string): Promise<Step> {
  const token = w.access_token!;
  if (w.phase === 'sending') {
    const start = await json<{ video_id: string }>(await post(`/${w.external_id}/video_reels`, { upload_phase: 'start', access_token: token }), 'Facebook Reel start');
    const up = await fetch(`https://rupload.facebook.com/video-upload/${V()}/${start.video_id}`, { method: 'POST', headers: { Authorization: `OAuth ${token}`, file_url: videoUrl } });
    await json(up, 'Facebook Reel upload');
    await json(await post(`/${w.external_id}/video_reels`, { upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description: (w.caption ?? '').slice(0, 2200), access_token: token }), 'Facebook Reel publish');
    return { status: 'processing', external_id: start.video_id, state: { video_id: start.video_id } };
  }
  const id = String(w.state.video_id);
  const s = await json<{ status?: { video_status?: string; publishing_phase?: { status?: string; errors?: { message?: string }[] }; processing_phase?: { status?: string } }; permalink_url?: string }>(
    await fetch(G(`/${id}?${new URLSearchParams({ fields: 'status,permalink_url', access_token: token })}`)), 'Facebook Reel status');
  const pub = s.status?.publishing_phase?.status;
  if (s.status?.video_status === 'error' || pub === 'error') return { status: 'failed', error: s.status?.publishing_phase?.errors?.[0]?.message ?? 'Facebook couldn’t process the video' };
  if (pub === 'complete' || s.status?.video_status === 'ready') {
    const url = s.permalink_url ? (s.permalink_url.startsWith('http') ? s.permalink_url : `https://www.facebook.com${s.permalink_url}`) : `https://www.facebook.com/reel/${id}`;
    return { status: 'posted', external_id: id, url };
  }
  return { status: 'processing', state: w.state };
}

/** Instagram Reel: create container from our public URL → wait until FINISHED → publish. */
export async function instagramStep(w: WorkItem, videoUrl: string): Promise<Step> {
  const token = w.access_token!;
  if (w.phase === 'sending') {
    const c = await json<{ id: string }>(await post(`/${w.external_id}/media`, { media_type: 'REELS', video_url: videoUrl, caption: (w.caption ?? '').slice(0, 2200), share_to_feed: 'true', access_token: token }), 'Instagram Reel');
    return { status: 'processing', state: { creation_id: c.id } };
  }
  const creation = String(w.state.creation_id);
  const st = await json<{ status_code?: string; status?: string }>(await fetch(G(`/${creation}?${new URLSearchParams({ fields: 'status_code,status', access_token: token })}`)), 'Instagram status');
  if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') return { status: 'failed', error: `Instagram couldn’t process the video${st.status ? ` (${st.status})` : ''}` };
  if (st.status_code !== 'FINISHED') return { status: 'processing', state: w.state };
  const pub = await json<{ id: string }>(await post(`/${w.external_id}/media_publish`, { creation_id: creation, access_token: token }), 'Instagram publish');
  const link = await json<{ permalink?: string }>(await fetch(G(`/${pub.id}?${new URLSearchParams({ fields: 'permalink', access_token: token })}`)), 'Instagram link').catch(() => ({ permalink: undefined }));
  return { status: 'posted', external_id: pub.id, url: link.permalink ?? null };
}
