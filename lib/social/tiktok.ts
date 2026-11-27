import 'server-only';
import { callbackUrl, json, videoBytes, type SavedAccount, type Step, type TikTokOptions, type WorkItem } from './common';

/** TikTok Content Posting API (Direct Post, file upload). */
const API = 'https://open.tiktokapis.com/v2';
export const TT_SCOPES = ['user.info.basic', 'video.publish'];

export function tiktokAuthUrl(state: string) {
  const q = new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, scope: TT_SCOPES.join(','), response_type: 'code', redirect_uri: callbackUrl('tiktok'), state });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

type Tok = { access_token: string; expires_in: number; open_id: string; refresh_token: string; refresh_expires_in: number };
function token(params: Record<string, string>) {
  return fetch(`${API}/oauth/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, ...params }) });
}

export type CreatorInfo = {
  creator_avatar_url?: string; creator_username?: string; creator_nickname?: string; privacy_level_options: string[];
  comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean; max_video_post_duration_sec: number;
};
export async function tiktokCreatorInfo(access: string) {
  const r = await json<{ data: CreatorInfo }>(await fetch(`${API}/post/publish/creator_info/query/`, { method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8' } }), 'TikTok account check');
  return r.data;
}

export async function tiktokExchange(code: string): Promise<SavedAccount[]> {
  const t = await json<Tok>(await token({ code, grant_type: 'authorization_code', redirect_uri: callbackUrl('tiktok') }), 'TikTok login');
  const u = await json<{ data: { user: { display_name?: string; avatar_url?: string } } }>(
    await fetch(`${API}/user/info/?fields=open_id,avatar_url,display_name`, { headers: { Authorization: `Bearer ${t.access_token}` } }), 'TikTok profile');
  const info = await tiktokCreatorInfo(t.access_token).catch(() => null);
  return [{
    external_id: t.open_id, name: info?.creator_nickname || u.data.user.display_name || 'TikTok', username: info?.creator_username ?? null,
    picture: info?.creator_avatar_url || u.data.user.avatar_url || null, access_token: t.access_token, refresh_token: t.refresh_token,
    expires_in: t.expires_in, refresh_expires_in: t.refresh_expires_in,
  }];
}

export async function tiktokRefresh(refresh: string) {
  const t = await json<Tok>(await token({ refresh_token: refresh, grant_type: 'refresh_token' }), 'TikTok token refresh');
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, refresh_expires_in: t.refresh_expires_in };
}

export async function tiktokStep(w: WorkItem, videoUrl: string): Promise<Step> {
  const auth = { Authorization: `Bearer ${w.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' };
  if (w.phase === 'sending') {
    const o: TikTokOptions | undefined = w.options.tiktok;
    if (!o?.privacy_level) return { status: 'failed', error: 'No TikTok privacy level chosen' };
    const info = await tiktokCreatorInfo(w.access_token!);
    if (!info.privacy_level_options.includes(o.privacy_level)) return { status: 'failed', error: `This TikTok account can’t post as ${o.privacy_level} — choose another audience` };
    const bytes = await videoBytes(videoUrl);
    const init = await json<{ data: { publish_id: string; upload_url: string } }>(await fetch(`${API}/post/publish/video/init/`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        post_info: {
          title: (w.caption ?? '').slice(0, 2200), privacy_level: o.privacy_level,
          disable_comment: !!o.disable_comment || info.comment_disabled, disable_duet: !!o.disable_duet || info.duet_disabled, disable_stitch: !!o.disable_stitch || info.stitch_disabled,
          brand_content_toggle: !!o.brand_content_toggle, brand_organic_toggle: !!o.brand_organic_toggle,
        },
        source_info: { source: 'FILE_UPLOAD', video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 },
      }),
    }), 'TikTok post');
    const put = await fetch(init.data.upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length), 'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
    if (!put.ok) throw new Error(`TikTok upload failed (${put.status})`);
    return { status: 'processing', external_id: init.data.publish_id, state: { publish_id: init.data.publish_id } };
  }
  const s = await json<{ data: { status: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] } }>(
    await fetch(`${API}/post/publish/status/fetch/`, { method: 'POST', headers: auth, body: JSON.stringify({ publish_id: w.state.publish_id }) }), 'TikTok status');
  if (s.data.status === 'FAILED') return { status: 'failed', error: `TikTok: ${s.data.fail_reason ?? 'post failed'}` };
  if (s.data.status === 'PUBLISH_COMPLETE') {
    const id = s.data.publicaly_available_post_id?.[0];
    const url = id ? `https://www.tiktok.com/@${w.username ?? ''}/video/${id}` : null;
    return { status: 'posted', external_id: id ? String(id) : undefined, url };
  }
  return { status: 'processing', state: w.state };
}
