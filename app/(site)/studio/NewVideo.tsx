'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import { TEMPLATE_INFO, type Lang, type StudioSettings, type Template } from '@/lib/studio';

export type Source = { kind: 'lot' | 'auction' | 'listing'; id: string; label: string; sub: string; auctionId?: string; photos?: number };
type Camp = { id: string; auction_id: string; videos_allowed: number; used: number };

export default function NewVideo({ sources, settings, campaigns, staff }: { sources: Source[]; settings: StudioSettings; campaigns: Camp[]; staff: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [kind, setKind] = useState<Source['kind']>(sources.some((s) => s.kind === 'auction') ? 'auction' : sources[0]?.kind ?? 'lot');
  const list = sources.filter((s) => s.kind === kind);
  const [pick, setPick] = useState<string>('');
  const chosen = list.find((s) => s.id === pick) ?? list[0];
  const [template, setTemplate] = useState<Template>('highlights');
  const [lang, setLang] = useState<Lang>('en');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const auctionId = chosen?.kind === 'auction' ? chosen.id : chosen?.auctionId;
  const camp = campaigns.find((c) => c.auction_id === auctionId && c.used < c.videos_allowed);

  if (!sources.length) {
    return <div className="alert alert-info">Nothing to market yet. Studio works with your open auction lots and your direct-sale listings — once you have one, it appears here.</div>;
  }

  async function create() {
    if (!chosen) return;
    setBusy(true); setMsg(null);
    const t: Template = chosen.kind === 'auction' ? template : template === 'highlights' ? 'spotlight' : template;
    const { data, error } = await supabase.rpc('auction_studio_create', { p_kind: chosen.kind, p_source: chosen.id, p_template: t, p_lang: lang });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    router.push(`/studio/${data}`);
  }
  async function buyCampaign() {
    if (!auctionId) return;
    if (!confirm(`Buy a campaign pack for this auction: ${settings.campaign_videos} videos for KES ${kes(settings.price_campaign_kes)}?`)) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('auction_studio_buy_campaign', { p_auction: auctionId });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `Campaign pack added — your next ${settings.campaign_videos} videos of this auction are included.` });
    if (!error) router.refresh();
  }
  const templates: Template[] = chosen?.kind === 'auction' ? ['highlights', 'closing', 'spotlight'] : ['spotlight', 'closing'];

  return (
    <section className="panel card stack" style={{ gap: 14 }}>
      <h2>Make a video</h2>
      <div className="row" style={{ gap: 6 }} role="group" aria-label="What to market">
        {(['auction', 'lot', 'listing'] as const).filter((k) => sources.some((s) => s.kind === k)).map((k) => (
          <button key={k} type="button" className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setKind(k); setPick(''); setTemplate(k === 'auction' ? 'highlights' : 'spotlight'); }}>
            {k === 'auction' ? 'An auction' : k === 'lot' ? 'One lot' : 'A direct-sale listing'}
          </button>
        ))}
      </div>
      <label className="field">{kind === 'auction' ? 'Auction' : kind === 'lot' ? 'Lot' : 'Listing'}
        <select className="input" value={chosen?.id ?? ''} onChange={(e) => setPick(e.target.value)}>
          {list.map((s) => <option key={s.id} value={s.id}>{s.label}{s.kind !== 'auction' ? ` — ${s.sub}` : ''}</option>)}
        </select>
      </label>
      {chosen && chosen.kind !== 'auction' && chosen.photos === 0 && <div className="alert alert-err">This item has no photos — add some first so the video has something to show.</div>}
      <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>Style</legend>
        {templates.map((t) => (
          <label key={t} className="check"><input type="radio" name="tpl" checked={template === t || (!templates.includes(template) && t === templates[0])} onChange={() => setTemplate(t)} />
            <span><b>{TEMPLATE_INFO[t][0]}</b> — <span className="small">{TEMPLATE_INFO[t][1]}</span></span></label>
        ))}
      </fieldset>
      <div className="row" style={{ gap: 6 }} role="group" aria-label="Language">
        <button type="button" className={`btn btn-sm ${lang === 'en' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLang('en')}>English</button>
        <button type="button" className={`btn btn-sm ${lang === 'sw' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLang('sw')}>Kiswahili</button>
      </div>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <button type="button" className="btn btn-primary" disabled={busy || !chosen} onClick={create}>{busy ? 'Working…' : 'Open in Studio'}</button>
        <span className="small muted">Free to preview. {staff ? 'Free for staff.' : camp ? `Included in your campaign pack (${camp.videos_allowed - camp.used} left).` : `KES ${kes(settings.price_video_kes)} when you make the final video.`}</span>
        {!staff && auctionId && !camp && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={buyCampaign}>Campaign pack: {settings.campaign_videos} videos for KES {kes(settings.price_campaign_kes)}</button>}
      </div>
    </section>
  );
}
