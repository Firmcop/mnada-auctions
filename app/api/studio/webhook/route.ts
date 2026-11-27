import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/** Results of scheduled posts from the posting service. The URL carries a private token. */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? body.postId ?? '');
  if (!id) return NextResponse.json({ ok: true, ignored: true });
  const postIds = (Array.isArray(body.postIds) ? body.postIds : []) as { platform?: string; postUrl?: string; status?: string }[];
  const errors = (Array.isArray(body.errors) ? body.errors : []) as { platform?: string; message?: string }[];
  const urls = postIds.map((p) => ({ platform: p.platform ?? null, postUrl: p.postUrl ?? null, status: p.status ?? null }));
  const bad = errors.length > 0 || body.status === 'error';
  const status = bad ? (urls.some((u) => u.status === 'success') ? 'partial' : 'error') : 'success';
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await anon.rpc('auction_studio_webhook', {
    p_token: token, p_provider_id: id, p_status: status, p_urls: urls,
    p_error: errors.map((e) => `${e.platform ?? ''} ${e.message ?? ''}`.trim()).join('; ') || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes('token') ? 401 : 500 });
  return NextResponse.json({ ok: true });
}
