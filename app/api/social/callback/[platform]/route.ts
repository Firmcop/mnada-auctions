import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Provider } from '@/lib/social/common';
import { metaExchange } from '@/lib/social/meta';
import { youtubeExchange } from '@/lib/social/youtube';
import { tiktokExchange } from '@/lib/social/tiktok';

/** Return from the platform's sign-in: swap the code for tokens and save the accounts. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const raw = request.cookies.get('mnada_social')?.value;
  let saved: { state: string; p: Provider; mnada: boolean; uid: string } | null = null;
  try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
  const dest = saved?.mnada ? '/admin/studio' : '/studio';
  const done = (q: string) => {
    const res = NextResponse.redirect(new URL(`${dest}?${q}#autopost`, request.url));
    res.cookies.set('mnada_social', '', { maxAge: 0, path: '/api/social' });
    return res;
  };
  const sp = request.nextUrl.searchParams;
  if (sp.get('error')) return done(`social_error=${encodeURIComponent(sp.get('error_description') || sp.get('error_reason') || 'Connection cancelled')}`);
  if (!saved || saved.p !== platform || sp.get('state') !== saved.state) return done('social_error=Expired%20or%20mismatched%20request%20%E2%80%94%20try%20again');
  const code = sp.get('code');
  if (!code) return done('social_error=No%20code%20returned');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== saved.uid) return done('social_error=Please%20log%20in%20again');
  try {
    let n = 0;
    const save = async (pl: string, accounts: unknown[]) => {
      if (!accounts.length) return;
      const { data, error } = await supabase.rpc('auction_social_save', { p_platform: pl, p_accounts: accounts, p_mnada: saved!.mnada });
      if (error) throw new Error(error.message);
      n += Number(data ?? 0);
    };
    if (platform === 'meta') {
      const r = await metaExchange(code);
      if (!r.facebook.length) throw new Error('No Facebook Page found — you need to be an admin of a Facebook Page.');
      await save('facebook', r.facebook);
      await save('instagram', r.instagram);
    } else if (platform === 'youtube') await save('youtube', await youtubeExchange(code));
    else if (platform === 'tiktok') await save('tiktok', await tiktokExchange(code));
    return done(`connected=${platform}&n=${n}`);
  } catch (e) {
    return done(`social_error=${encodeURIComponent((e as Error).message.slice(0, 200))}`);
  }
}
