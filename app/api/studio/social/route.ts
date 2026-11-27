import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autopostReady, createProfile, linkSession, linkedPlatforms, registerWebhook } from '@/lib/ayrshare';
import { SITE_URL } from '@/lib/seo';

/** Auto-posting: subscribe, connect social accounts, sync them; staff can register the webhook. */
export async function POST(request: NextRequest) {
  const { action } = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in first' }, { status: 401 });
  if (!autopostReady()) return NextResponse.json({ error: 'Automatic posting isn’t switched on yet. Schedule reminders instead — we’ll tell you when to post.' }, { status: 501 });
  const site = SITE_URL.replace(/\/$/, '');

  try {
    if (action === 'register_webhook') {
      const { data: token } = await supabase.rpc('auction_studio_webhook_token');
      if (!token) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
      await registerWebhook(`${site}/api/studio/webhook?t=${token}`);
      return NextResponse.json({ ok: true });
    }

    const load = async () => (await supabase.from('auction_studio_social').select('*').eq('owner_id', user.id).maybeSingle()).data;
    let social = await load();

    if (action === 'connect') {
      const active = social?.status === 'active' && social.paid_until && new Date(social.paid_until) > new Date();
      if (!social?.profile_key) {
        const { data: profile } = await supabase.from('auction_profiles').select('full_name, business_name').eq('id', user.id).single();
        const p = await createProfile(`${profile?.business_name || profile?.full_name || 'Mnada seller'} · ${user.id.slice(0, 8)}`);
        const { error } = await supabase.rpc('auction_studio_social_save', { p_profile_key: p.profileKey, p_ref_id: p.refId, p_platforms: null });
        if (error) throw new Error(error.message);
      }
      if (!active) {
        const { error } = await supabase.rpc('auction_studio_autopost_subscribe');
        if (error) return NextResponse.json({ error: error.message }, { status: 402 });
      }
      social = await load();
      const link = await linkSession(social!.profile_key!, site);
      return NextResponse.json({ url: link.url });
    }

    if (action === 'sync') {
      if (!social?.profile_key) return NextResponse.json({ platforms: [] });
      const platforms = await linkedPlatforms(social.profile_key);
      const { error } = await supabase.rpc('auction_studio_social_save', { p_profile_key: null, p_ref_id: null, p_platforms: platforms });
      if (error) throw new Error(error.message);
      return NextResponse.json({ platforms });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
