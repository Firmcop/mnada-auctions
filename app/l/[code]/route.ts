import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Tracked link from a Studio video: counts the click, then opens the lot, auction or listing. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const supabase = await createClient();
  const { data: target } = clean ? await supabase.rpc('auction_studio_click', { p_code: clean }) : { data: null };
  const path = typeof target === 'string' && target.startsWith('/') ? target : '/';
  const url = new URL(path, request.url);
  url.searchParams.set('utm_source', request.nextUrl.searchParams.get('src') || 'mnada-studio');
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', clean);
  return NextResponse.redirect(url);
}
