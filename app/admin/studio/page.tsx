import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { canArea } from '@/lib/staff';
import { TEMPLATE_INFO, type StudioSettings, type StudioVideo } from '@/lib/studio';
import StudioAdmin, { type FeatureRow } from './StudioAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminStudio() {
  const role = await requireArea('operations');
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const [{ data: st }, { data: feats }, { data: vids }, { data: ledger }] = await Promise.all([
    supabase.from('auction_studio_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_studio_features').select('*, auction_studio_videos(title, file_path, caption, link_code, clicks, target_path)').order('created_at', { ascending: false }).limit(200),
    supabase.from('auction_studio_videos').select('*').order('created_at', { ascending: false }).limit(200),
    canArea(role, 'finance') ? supabase.from('auction_ai_ledger').select('amount_kes, action, kind, internal').like('action', 'studio:%').gte('created_at', since) : Promise.resolve({ data: [] }),
  ]);
  const videos = (vids ?? []) as StudioVideo[];
  const owners = Array.from(new Set([...videos.map((v) => v.owner_id), ...(feats ?? []).map((f) => f.owner_id)]));
  const { data: ppl } = owners.length ? await supabase.from('auction_profiles').select('id, full_name, business_name, phone').in('id', owners) : { data: [] };
  const names: Record<string, string> = {};
  (ppl ?? []).forEach((p) => { names[p.id] = `${p.business_name || p.full_name} · ${p.phone}`; });
  const pub = (p: string | null) => (p ? supabase.storage.from('auction-studio').getPublicUrl(p).data.publicUrl : null);
  const features = ((feats ?? []) as (FeatureRow & { auction_studio_videos: { file_path: string | null } | null })[]).map((f) => ({ ...f, file_url: pub(f.auction_studio_videos?.file_path ?? null) }));
  const income = ((ledger ?? []) as { amount_kes: number; kind: string; internal: boolean }[]).filter((l) => !l.internal).reduce((a, l) => a - Number(l.amount_kes), 0);
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Marketing Studio</h1>
        <span className="small muted">Sellers and auction firms make TikTok, Reels and WhatsApp videos of their lots. Videos are made in the customer’s browser; charges come from their Mnada wallet.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Videos made</span><b>{videos.filter((v) => v.status === 'ready').length}</b><span className="small muted">{videos.length} drafts and videos</span></div>
        <div className="kpi"><span className="eyebrow">Feature requests open</span><b style={{ color: 'var(--accent)' }}>{features.filter((f) => f.status === 'requested' || f.status === 'scheduled').length}</b></div>
        <div className="kpi"><span className="eyebrow">Clicks from videos</span><b>{videos.reduce((a, v) => a + v.clicks, 0)}</b></div>
        {canArea(role, 'finance') && <div className="kpi"><span className="eyebrow">Studio income, 30 days</span><b>KES {kes(income)}</b></div>}
      </div>
      <StudioAdmin settings={st as StudioSettings} features={features} names={names} canFinance={canArea(role, 'finance')} />
      <section className="panel" style={{ overflowX: 'auto' }}>
        <h3 style={{ marginBottom: 10 }}>Recent videos</h3>
        {videos.length === 0 ? <p className="muted small">None yet.</p> : (
          <table className="data" style={{ minWidth: 760 }}>
            <thead><tr><th>Made</th><th>Video</th><th>By</th><th>Style</th><th>Status</th><th style={{ textAlign: 'right' }}>Clicks</th><th style={{ textAlign: 'right' }}>Paid</th></tr></thead>
            <tbody>{videos.map((v) => (
              <tr key={v.id}><td className="small">{new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td>{pub(v.file_path) ? <a href={pub(v.file_path)!} target="_blank" rel="noreferrer">{v.title}</a> : v.title}<div className="small muted">{v.lang === 'sw' ? 'Kiswahili' : 'English'} · /l/{v.link_code}</div></td>
                <td className="small">{names[v.owner_id] ?? '—'}</td><td className="small">{TEMPLATE_INFO[v.template][0]}</td>
                <td><span className={`pill ${v.status === 'ready' ? 'pill-green' : v.status === 'paid' ? 'pill-warn' : 'pill-grey'}`}>{v.status}</span></td>
                <td style={{ textAlign: 'right' }}>{v.clicks}</td><td style={{ textAlign: 'right' }}>{v.campaign_id ? 'campaign' : `KES ${kes(v.paid_kes)}`}</td></tr>))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
