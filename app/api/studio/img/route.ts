import { NextResponse, type NextRequest } from 'next/server';

/** Same-origin copy of a lot photo so Studio can draw it on a canvas and export the video. */
const allowed = () => {
  const hosts = new Set(['commons.wikimedia.org', 'upload.wikimedia.org']);
  try { hosts.add(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host); } catch { /* not set */ }
  return hosts;
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('u');
  let url: URL;
  try { url = new URL(raw ?? ''); } catch { return new NextResponse('Bad url', { status: 400 }); }
  const hosts = allowed();
  if (url.protocol !== 'https:' || !hosts.has(url.host)) return new NextResponse('Host not allowed', { status: 403 });
  const res = await fetch(url, { headers: { 'User-Agent': 'MnadaStudio/1.0 (https://mnada-auctions.vercel.app)' }, redirect: 'follow', cache: 'force-cache' });
  if (!res.ok || !hosts.has(new URL(res.url).host)) return new NextResponse('Not found', { status: 404 });
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) return new NextResponse('Not an image', { status: 415 });
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > 15 * 1024 * 1024) return new NextResponse('Too large', { status: 413 });
  return new NextResponse(res.body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=86400, s-maxage=604800' } });
}
