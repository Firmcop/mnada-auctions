import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import type { StudioSettings, StudioVideo } from '@/lib/studio';
import Editor from './Editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mnada Studio', robots: { index: false } };

export default async function StudioVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSession();
  if (!user) redirect(`/login?next=/studio/${id}`);
  const [{ data: v }, { data: st }, { data: feats }, { data: wallet }] = await Promise.all([
    supabase.from('auction_studio_videos').select('*').eq('id', id).maybeSingle(),
    supabase.from('auction_studio_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_studio_features').select('id, status, posted_links, admin_note, created_at, posted_at').eq('video_id', id).order('created_at', { ascending: false }),
    supabase.rpc('auction_ai_status'),
  ]);
  if (!v || v.owner_id !== user.id) notFound();
  const video = v as StudioVideo;
  let auctionTitle = video.title;
  if (video.auction_id) {
    const { data: a } = await supabase.from('auction_auctions').select('title').eq('id', video.auction_id).maybeSingle();
    if (a) auctionTitle = a.title;
  }
  let campaignLeft: number | null = null;
  if (video.auction_id && video.status === 'draft') {
    const { data: camps } = await supabase.from('auction_studio_campaigns').select('id, videos_allowed').eq('owner_id', user.id).eq('auction_id', video.auction_id);
    for (const c of camps ?? []) {
      const { count } = await supabase.from('auction_studio_videos').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id);
      const left = c.videos_allowed - (count ?? 0);
      if (left > 0) { campaignLeft = left; break; }
    }
  }
  const pub = (p: string | null) => (p ? supabase.storage.from('auction-studio').getPublicUrl(p).data.publicUrl : null);
  const w = wallet as { balance_kes: number; staff_internal: boolean } | null;
  return (
    <div className="wrap section stack" style={{ gap: 18 }}>
      <div className="row between">
        <div className="stack" style={{ gap: 2 }}>
          <Link href="/studio" className="small">← Studio</Link>
          <h1 style={{ fontSize: 28 }}>{video.title}</h1>
        </div>
        <a href={video.target_path} className="btn btn-outline btn-sm" target="_blank" rel="noreferrer">Open {video.source_kind === 'listing' ? 'listing' : video.source_kind}</a>
      </div>
      <Editor video={video} settings={st as StudioSettings} auctionTitle={auctionTitle} fileUrl={pub(video.file_path)} voiceUrl={pub(video.voice_path)}
        features={feats ?? []} balance={w?.balance_kes ?? 0} staff={!!w?.staff_internal || !!profile?.is_admin} campaignLeft={campaignLeft} />
    </div>
  );
}
