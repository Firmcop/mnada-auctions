import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Referral link: /r/KEVIN-JKUAT (optionally ?to=/auctions/some-sale). Remembers the code for 30 days. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const to = request.nextUrl.searchParams.get('to');
  const dest = to && to.startsWith('/') && !to.startsWith('//') ? to : '/';
  const res = NextResponse.redirect(new URL(dest, request.url));
  if (!code) return res;
  const supabase = await createClient();
  const { data: ok } = await supabase.rpc('auction_campus_click', { p_code: code });
  if (ok && !request.cookies.get('mnada_ref')) {
    res.cookies.set('mnada_ref', code, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', secure: true });
  }
  return res;
}
