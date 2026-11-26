import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { CATEGORY_TREE } from '@/lib/categories';
import { SITE_URL } from '@/lib/seo';
import { photoUrl } from '@/lib/format';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const [{ data: listings }, { data: auctions }, { data: lots }, { data: firms }] = await Promise.all([
    supabase.from('auction_listings').select('slug, updated_at, photos').neq('status', 'draft'),
    supabase.from('auction_auctions').select('slug, created_at').neq('status', 'draft'),
    supabase.from('auction_lots').select('id, created_at, photos, status').limit(5000),
    supabase.from('auction_auctioneers').select('slug, updated_at').eq('status', 'approved'),
  ]);
  const now = new Date();
  const enc = (s: string) => encodeURIComponent(s);
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/direct-sale`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/sell`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/listing-help`, changeFrequency: 'monthly', priority: 0.6 },
    ...(firms ?? []).map((f) => ({ url: `${SITE_URL}/auctioneers/${f.slug}`, lastModified: new Date(f.updated_at), changeFrequency: 'weekly' as const, priority: 0.5 })),
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.4 },
    ...CATEGORY_TREE.flatMap((c) => [
      { url: `${SITE_URL}/search?cat=${enc(c.name)}`, changeFrequency: 'daily' as const, priority: 0.8 },
      ...c.subs.map((s) => ({ url: `${SITE_URL}/search?cat=${enc(c.name)}&sub=${enc(s)}`, changeFrequency: 'daily' as const, priority: 0.6 })),
    ]),
    ...(listings ?? []).map((l) => ({ url: `${SITE_URL}/direct-sale/${l.slug}`, lastModified: new Date(l.updated_at), changeFrequency: 'weekly' as const, priority: 0.9, images: (l.photos ?? []).slice(0, 3).map(photoUrl) })),
    ...(auctions ?? []).map((a) => ({ url: `${SITE_URL}/auctions/${a.slug}`, lastModified: new Date(a.created_at), changeFrequency: 'daily' as const, priority: 0.8 })),
    ...(lots ?? []).map((l) => ({ url: `${SITE_URL}/lots/${l.id}`, lastModified: new Date(l.created_at), changeFrequency: (l.status === 'open' ? 'hourly' : 'monthly') as 'hourly' | 'monthly', priority: l.status === 'open' ? 0.7 : 0.3, images: (l.photos ?? []).slice(0, 3).map(photoUrl) })),
  ];
}
