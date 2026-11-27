import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Schedule (automatic or reminder), post on Mnada's pages, or cancel. Sending is done by /api/studio/dispatch. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in first' }, { status: 401 });

  if (body.cancel) {
    const { error } = await supabase.rpc('auction_studio_post_cancel', { p_post: body.cancel });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  const at = body.at ? new Date(body.at) : new Date();
  if (Number.isNaN(at.getTime())) return NextResponse.json({ error: 'Pick a valid time' }, { status: 400 });
  const options = { tiktok: body.tiktok ?? undefined, youtube: body.youtube ?? undefined };
  const { error } = body.feature_id
    ? await supabase.rpc('auction_studio_schedule_mnada2', { p_feature: body.feature_id, p_platforms: body.platforms ?? [], p_at: at.toISOString(), p_caption: body.caption ?? '', p_options: options })
    : await supabase.rpc('auction_studio_schedule2', { p_video: body.video_id, p_mode: body.mode === 'auto' ? 'auto' : 'reminder', p_platforms: body.platforms ?? [], p_at: at.toISOString(), p_caption: body.caption ?? '', p_options: options });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if ((body.feature_id || body.mode === 'auto') && at.getTime() <= Date.now() + 60_000) await supabase.rpc('auction_social_kick_now');
  return NextResponse.json({ ok: true, status: 'scheduled' });
}
