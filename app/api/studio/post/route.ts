import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autopostReady, publish, removePost, type PostResult } from '@/lib/ayrshare';

function outcome(r: PostResult, scheduled: boolean) {
  const urls = (r.postIds ?? []).map((p) => ({ platform: p.platform, postUrl: p.postUrl ?? null, status: p.status ?? null }));
  const errs = (r.errors ?? []).map((e) => `${e.platform ?? ''} ${e.message ?? ''}`.trim()).filter(Boolean);
  if (scheduled) return { status: 'scheduled', urls, error: errs.join('; ') || null };
  const ok = urls.filter((u) => u.status !== 'error').length;
  return { status: errs.length && ok ? 'partial' : errs.length ? 'failed' : 'posted', urls, error: errs.join('; ') || null };
}

/** Schedule, post or cancel a Studio video on social media. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in first' }, { status: 401 });
  const pub = (p: string) => supabase.storage.from('auction-studio').getPublicUrl(p).data.publicUrl;

  // cancel
  if (body.cancel) {
    const { data: providerId, error } = await supabase.rpc('auction_studio_post_cancel', { p_post: body.cancel });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (providerId && autopostReady()) {
      const { data: post } = await supabase.from('auction_studio_posts').select('mode, owner_id').eq('id', body.cancel).single();
      let key: string | null = null;
      if (post?.mode === 'auto') key = (await supabase.from('auction_studio_social').select('profile_key').eq('owner_id', post.owner_id).single()).data?.profile_key ?? null;
      try { await removePost(providerId as string, key); } catch { /* already gone */ }
    }
    return NextResponse.json({ ok: true });
  }

  const at = body.at ? new Date(body.at) : new Date();
  if (Number.isNaN(at.getTime())) return NextResponse.json({ error: 'Pick a valid time' }, { status: 400 });

  // Mnada's own pages (staff, from the feature queue)
  if (body.feature_id) {
    if (!autopostReady()) return NextResponse.json({ error: 'Automatic posting isn’t switched on — post manually and paste the links.' }, { status: 501 });
    const { data: postId, error } = await supabase.rpc('auction_studio_schedule_mnada', { p_feature: body.feature_id, p_platforms: body.platforms ?? [], p_at: at.toISOString(), p_caption: body.caption ?? '' });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data: post } = await supabase.from('auction_studio_posts').select('*, auction_studio_videos(title, file_path)').eq('id', postId).single();
    try {
      const r = await publish({ text: post.caption ?? '', platforms: post.platforms, videoUrl: pub(post.auction_studio_videos.file_path), at, title: post.auction_studio_videos.title });
      const o = outcome(r, at.getTime() > Date.now() + 2 * 60 * 1000);
      await supabase.rpc('auction_studio_post_done', { p_post: postId, p_status: o.status, p_provider_id: r.id ?? null, p_urls: o.urls, p_error: o.error });
      return NextResponse.json({ ok: true, status: o.status });
    } catch (e) {
      await supabase.rpc('auction_studio_post_done', { p_post: postId, p_status: 'failed', p_provider_id: null, p_urls: null, p_error: (e as Error).message });
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }

  // the customer's own accounts
  const mode = body.mode === 'auto' ? 'auto' : 'reminder';
  if (mode === 'auto' && !autopostReady()) return NextResponse.json({ error: 'Automatic posting isn’t switched on yet — use a reminder.' }, { status: 501 });
  const { data: postId, error } = await supabase.rpc('auction_studio_schedule', { p_video: body.video_id, p_mode: mode, p_platforms: body.platforms ?? [], p_at: at.toISOString(), p_caption: body.caption ?? '' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (mode === 'reminder') return NextResponse.json({ ok: true, status: 'scheduled' });

  const [{ data: post }, { data: social }] = await Promise.all([
    supabase.from('auction_studio_posts').select('*, auction_studio_videos(title, file_path)').eq('id', postId).single(),
    supabase.from('auction_studio_social').select('profile_key').eq('owner_id', user.id).single(),
  ]);
  try {
    const r = await publish({ profileKey: social?.profile_key, text: post.caption ?? '', platforms: post.platforms, videoUrl: pub(post.auction_studio_videos.file_path), at, title: post.auction_studio_videos.title });
    const o = outcome(r, at.getTime() > Date.now() + 2 * 60 * 1000);
    await supabase.rpc('auction_studio_post_done', { p_post: postId, p_status: o.status, p_provider_id: r.id ?? null, p_urls: o.urls, p_error: o.error });
    return NextResponse.json({ ok: true, status: o.status, error: o.error });
  } catch (e) {
    await supabase.rpc('auction_studio_post_done', { p_post: postId, p_status: 'failed', p_provider_id: null, p_urls: null, p_error: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
