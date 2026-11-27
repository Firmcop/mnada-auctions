import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { providerReady, type Provider } from '@/lib/social/common';
import { metaAuthUrl } from '@/lib/social/meta';
import { youtubeAuthUrl } from '@/lib/social/youtube';
import { tiktokAuthUrl } from '@/lib/social/tiktok';

/** Starts "Connect your Facebook / Instagram / YouTube / TikTok". ?mnada=1 connects Mnada's own accounts (staff). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const p = platform as Provider;
  const back = (q: string) => NextResponse.redirect(new URL(`/studio?${q}#autopost`, request.url));
  if (!['meta', 'youtube', 'tiktok'].includes(p)) return back('social_error=unknown');
  if (!providerReady[p]()) return back(`social_error=${encodeURIComponent('This connection isn’t switched on yet')}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/studio`, request.url));
  const mnada = request.nextUrl.searchParams.get('mnada') === '1';
  const state = randomBytes(24).toString('hex');
  const url = p === 'meta' ? metaAuthUrl(state) : p === 'youtube' ? youtubeAuthUrl(state) : tiktokAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set('mnada_social', JSON.stringify({ state, p, mnada, uid: user.id }), { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/social' });
  return res;
}
