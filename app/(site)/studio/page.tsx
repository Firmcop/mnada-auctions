import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { myFirm } from '@/lib/auctioneer';
import { TEMPLATE_INFO, type StudioSettings, type StudioVideo } from '@/lib/studio';
import NewVideo, { type Source } from './NewVideo';
import AutopostPanel from './AutopostPanel';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Mnada Studio — marketing videos for your auction',
  description: 'Turn your lots into TikTok, Reels and WhatsApp videos in a minute: photos, price, closing time, captions in English or Swahili, and a tracked link.',
};

const STATUS: Record<StudioVideo['status'], [string, string]> = { draft: ['Draft', 'pill-grey'], paid: ['Unlocked — render it', 'pill-warn'], ready: ['Ready to post', 'pill-green'] };

export default async function StudioHome({ searchParams }: { searchParams: Promise<{ connected?: string; n?: string; social_error?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const { data: st } = await supabase.from('auction_studio_settings').select('*').eq('id', 1).single();
  const s = st as StudioSettings;

  const pitch = (
    <section style={{ background: 'var(--navy)', color: '#fff' }}>
      <div className="wrap stack" style={{ padding: '44px 24px', gap: 12 }}>
        <span className="eyebrow" style={{ color: '#F5A27A' }}>Mnada Studio · for sellers and auction firms</span>
        <h1 style={{ color: '#fff', maxWidth: 820, fontSize: 'clamp(28px, 4.2vw, 46px)' }}>Your lots as TikTok, Reels and WhatsApp videos — in a minute.</h1>
        <p style={{ color: '#C9D5DF', fontSize: 18, maxWidth: 700 }}>Studio builds a 20-second vertical video from your real photos, price and closing time, with captions in English or Swahili and a tracked link that shows how many people it brought to your sale.</p>
        <span style={{ fontWeight: 700 }}>KES {kes(s.price_video_kes)} per video · KES {kes(s.price_campaign_kes)} for {s.campaign_videos} videos of one auction · KES {kes(s.price_feature_kes)} to feature on Mnada’s own pages</span>
      </div>
    </section>
  );

  if (!user || !profile) {
    return (
      <>
        {pitch}
        <div className="wrap section stack" style={{ gap: 16, maxWidth: 760 }}>
          <h2>How it works</h2>
          <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--body)', lineHeight: 1.9 }}>
            <li>Pick a lot, an auction or a direct-sale listing.</li>
            <li>Choose a style — spotlight, auction highlights or closing soon — and English or Swahili.</li>
            <li>Check the preview and edit any words. Prices and dates come straight from your listing.</li>
            <li>Download the MP4 or share it straight to TikTok, Instagram, Facebook or WhatsApp Status from your phone.</li>
          </ol>
          <div className="row"><Link href="/login?next=/studio" className="btn btn-primary">Log in to start</Link><Link href="/register" className="btn btn-outline">Create account</Link></div>
        </div>
      </>
    );
  }

  const uid = user.id;
  const firm = await myFirm(supabase, uid);
  const staff = !!profile.is_admin;
  const [{ data: vids }, { data: camps }, { data: wallet }, { data: social }, { count: upcoming }, { data: accounts }] = await Promise.all([
    supabase.from('auction_studio_videos').select('*').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100),
    supabase.from('auction_studio_campaigns').select('id, auction_id, videos_allowed, created_at').eq('owner_id', uid),
    supabase.rpc('auction_ai_status'),
    supabase.from('auction_studio_social').select('platforms, status, paid_until, auto_renew').eq('owner_id', uid).maybeSingle(),
    supabase.from('auction_studio_posts').select('id', { count: 'exact', head: true }).eq('owner_id', uid).eq('status', 'scheduled'),
    supabase.from('auction_social_accounts').select('id, platform, name, username, picture, status, last_error, is_mnada').eq('owner_id', uid).eq('is_mnada', false).neq('status', 'revoked').order('platform'),
  ]);
  const notice = sp.social_error ? { ok: false, text: `Couldn’t connect: ${sp.social_error}` } : sp.connected ? { ok: true, text: `Connected ${sp.n ?? ''} account${sp.n === '1' ? '' : 's'}.` } : null;

  // sources this person may market
  const sources: Source[] = [];
  const auctionsSeen = new Set<string>();
  const lotQ = supabase.from('auction_lots').select('id, title, lot_no, auction_id, status, closes_at, photos, auction_auctions!inner(id, title, auctioneer_id, status)').eq('status', 'open').order('closes_at').limit(200);
  const { data: lots } = staff ? await lotQ : firm ? await lotQ.eq('auction_auctions.auctioneer_id', firm.firm.id) : await lotQ.eq('seller_id', uid);
  for (const l of (lots ?? []) as unknown as { id: string; title: string; lot_no: number; auction_id: string; photos: string[]; auction_auctions: { id: string; title: string } }[]) {
    if (!auctionsSeen.has(l.auction_id)) {
      auctionsSeen.add(l.auction_id);
      sources.push({ kind: 'auction', id: l.auction_id, label: l.auction_auctions.title, sub: 'Whole auction — top lots' });
    }
    sources.push({ kind: 'lot', id: l.id, label: `Lot ${l.lot_no} · ${l.title}`, sub: l.auction_auctions.title, auctionId: l.auction_id, photos: l.photos?.length ?? 0 });
  }
  const { data: listings } = staff
    ? await supabase.from('auction_listings').select('id, title, photos').neq('status', 'draft').order('created_at', { ascending: false }).limit(100)
    : await supabase.from('auction_listings').select('id, title, photos').eq('owner_id', uid).neq('status', 'draft').limit(100);
  for (const li of listings ?? []) sources.push({ kind: 'listing', id: li.id, label: li.title, sub: 'Direct sale', photos: li.photos?.length ?? 0 });

  const videos = (vids ?? []) as StudioVideo[];
  const used = (cid: string) => videos.filter((v) => v.campaign_id === cid).length;
  const w = wallet as { balance_kes: number; staff_internal: boolean } | null;

  return (
    <>
      {pitch}
      <div className="wrap section stack" style={{ gap: 28 }}>
        <div className="row between">
          <span className="small muted">{w?.staff_internal ? 'Staff videos are free (recorded as internal use).' : <>Wallet balance: <b>KES {kes(w?.balance_kes ?? 0)}</b> · <Link href="/account/ai">Top up</Link></>}</span>
          <span className="small muted">{videos.reduce((a, v) => a + v.clicks, 0)} clicks from your videos so far</span>
        </div>
        <NewVideo sources={sources} settings={s} campaigns={(camps ?? []).map((c) => ({ ...c, used: used(c.id) }))} staff={staff} />
        <AutopostPanel sub={social ?? null} accounts={accounts ?? []} price={s.price_autopost_month_kes} staff={staff} upcoming={upcoming ?? 0} notice={notice}
          ready={{ meta: !!(process.env.META_APP_ID && process.env.META_APP_SECRET), youtube: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) }} />
        <section className="stack" style={{ gap: 12 }}>
          <h2>My videos</h2>
          {videos.length === 0 ? <p className="muted">No videos yet — pick something above to make your first one.</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {videos.map((v) => (
                <Link key={v.id} href={`/studio/${v.id}`} className="card stack" style={{ padding: 16, gap: 6, textDecoration: 'none', color: 'inherit' }}>
                  <div className="row between"><span className="eyebrow">{TEMPLATE_INFO[v.template][0]} · {v.lang === 'sw' ? 'Kiswahili' : 'English'}</span><span className={`pill ${STATUS[v.status][1]}`}>{STATUS[v.status][0]}</span></div>
                  <b>{v.title}</b>
                  <span className="small muted">{new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {v.clicks} clicks{v.campaign_id ? ' · campaign' : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
