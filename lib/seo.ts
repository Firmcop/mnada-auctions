export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mnada-auctions.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'Mnada';

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

export function listingSeoTitle(l: { title: string; seo_title?: string | null; location?: string | null }) {
  if (l.seo_title) return l.seo_title;
  return clip(`${l.title} for sale in Kenya`, 60);
}

export function listingSeoDescription(l: { summary?: string | null; description?: string | null; seo_description?: string | null; title: string; location?: string | null; price_type?: string; price?: number | null }) {
  if (l.seo_description) return l.seo_description;
  const base = l.summary || l.description?.split('\n')[0] || l.title;
  const price = l.price && l.price_type !== 'on_request' ? ` From KES ${Math.round(l.price).toLocaleString('en-US')}.` : '';
  return clip(`${base}${price} Delivery and installation across Kenya${l.location ? ` from ${l.location}` : ''}. Request a quote on Mnada.`, 158);
}

export function lotSeoTitle(l: { title: string; seo_title?: string | null; lot_no: number }) {
  if (l.seo_title) return l.seo_title;
  return clip(`${l.title} – online auction, Kenya`, 60);
}

export function lotSeoDescription(l: { title: string; seo_description?: string | null; description?: string | null; location?: string | null; closes_at: string }) {
  if (l.seo_description) return l.seo_description;
  const when = new Date(l.closes_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });
  const first = l.description?.split('\n')[0] ?? '';
  return clip(`Bid online on ${l.title}${l.location ? ` in ${l.location}` : ''}. Closes ${when}. ${first}`.trim(), 158);
}

export function categorySeo(cat?: string, sub?: string) {
  const name = sub ?? cat;
  if (!name) return { title: 'All machinery, vehicles & structures for sale in Kenya', description: 'Browse open online auctions and buy-now items: construction and metalworking machinery, trucks, container houses, A-frames and steel structures across Kenya.' };
  return {
    title: clip(`${name} for sale in Kenya – auctions & buy now`, 60),
    description: clip(`Find ${name.toLowerCase()} for sale in Kenya: bid in online auctions or buy now from verified sellers. Inspection days, M-Pesa payment and delivery available.`, 158),
  };
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
