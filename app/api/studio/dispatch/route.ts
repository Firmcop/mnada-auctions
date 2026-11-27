import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Step, WorkItem } from '@/lib/social/common';
import { facebookStep, instagramStep } from '@/lib/social/meta';
import { youtubeRefresh, youtubeStep } from '@/lib/social/youtube';
import { tiktokRefresh, tiktokStep } from '@/lib/social/tiktok';

export const maxDuration = 60;

/** Sends due posts. Called every 2 minutes by the database scheduler with a private token. */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-dispatch-token');
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 401 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.rpc('auction_social_claim', { p_token: token, p_limit: 4 });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes('token') ? 401 : 500 });
  const items = (data ?? []) as WorkItem[];
  const started = Date.now();
  const done: { id: string; status: string }[] = [];
  for (const w of items) {
    if (Date.now() - started > 45_000) break; // the rest is picked up on the next run
    let step: Step;
    try {
      if (!w.access_token || w.access_token === '-') throw new Error('Account disconnected — connect it again in Studio');
      // refresh short-lived tokens
      const soon = !w.access_expires_at || new Date(w.access_expires_at).getTime() < Date.now() + 5 * 60 * 1000;
      if (soon && (w.platform === 'youtube' || w.platform === 'tiktok')) {
        if (!w.refresh_token) throw new Error('Sign-in expired — connect the account again');
        try {
          const r: { access_token: string; expires_in: number; refresh_token?: string; refresh_expires_in?: number } =
            w.platform === 'youtube' ? await youtubeRefresh(w.refresh_token) : await tiktokRefresh(w.refresh_token);
          w.access_token = r.access_token;
          await db.rpc('auction_social_token_update', {
            p_token: token, p_account: w.account_id, p_access: r.access_token, p_refresh: r.refresh_token ?? null,
            p_access_exp: new Date(Date.now() + r.expires_in * 1000).toISOString(),
            p_refresh_exp: r.refresh_expires_in ? new Date(Date.now() + r.refresh_expires_in * 1000).toISOString() : null, p_error: null,
          });
        } catch (e) {
          await db.rpc('auction_social_token_update', { p_token: token, p_account: w.account_id, p_access: null, p_refresh: null, p_access_exp: null, p_refresh_exp: null, p_error: (e as Error).message });
          throw new Error('Sign-in expired — connect the account again in Studio');
        }
      }
      const videoUrl = db.storage.from('auction-studio').getPublicUrl(w.file_path).data.publicUrl;
      step = w.platform === 'facebook' ? await facebookStep(w, videoUrl)
        : w.platform === 'instagram' ? await instagramStep(w, videoUrl)
        : w.platform === 'youtube' ? await youtubeStep(w, videoUrl)
        : await tiktokStep(w, videoUrl);
    } catch (e) {
      const message = (e as Error).message;
      step = { status: 'failed', error: message };
      // access removed on the platform's side: wipe our tokens and ask the owner to reconnect
      if ((w.platform === 'facebook' || w.platform === 'instagram') && /validating access token|has not authorized|session has been invalidated|OAuthException/i.test(message)) {
        await db.rpc('auction_social_token_update', { p_token: token, p_account: w.account_id, p_access: null, p_refresh: null, p_access_exp: null, p_refresh_exp: null, p_error: 'Access was removed — connect the account again' });
      }
    }
    await db.rpc('auction_social_report', {
      p_token: token, p_target: w.target_id, p_status: step.status,
      p_external_id: 'external_id' in step ? step.external_id ?? null : null,
      p_url: step.status === 'posted' ? step.url ?? null : null,
      p_error: step.status === 'failed' ? step.error : null,
      p_state: step.status === 'processing' ? step.state : null,
    });
    done.push({ id: w.target_id, status: step.status });
  }
  return NextResponse.json({ ok: true, done });
}
