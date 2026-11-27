'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import type { StudioSettings } from '@/lib/studio';

export type FeatureRow = {
  id: string; video_id: string; owner_id: string; paid_kes: number; note: string | null; status: 'requested' | 'scheduled' | 'posted' | 'refused';
  posted_links: string[]; admin_note: string | null; scheduled_for: string | null; created_at: string; posted_at: string | null;
  auction_studio_videos: { title: string; caption: string | null; link_code: string; clicks: number; target_path: string } | null; file_url: string | null;
};

export default function StudioAdmin({ settings: s, features, names, canFinance, autopostOn }: { settings: StudioSettings; features: FeatureRow[]; names: Record<string, string>; canFinance: boolean; autopostOn: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok });
    if (!error) router.refresh();
  }
  const n = (v: FormDataEntryValue | null, d: number) => { const x = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return String(v ?? '').trim() === '' || !Number.isFinite(x) ? d : x; };
  async function api(path: string, body: unknown, ok: string) {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: out.status ? `${ok} (${out.status})` : ok } : { ok: false, text: out.error ?? 'Failed' });
    if (res.ok) router.refresh();
  }
  const open = features.filter((f) => f.status === 'requested' || f.status === 'scheduled');
  const done = features.filter((f) => !(f.status === 'requested' || f.status === 'scheduled')).slice(0, 30);
  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <section className="panel stack" style={{ gap: 10 }}>
        <h3>Feature on Mnada’s pages — queue</h3>
        {open.length === 0 ? <p className="muted small">No requests waiting.</p> : open.map((f) => (
          <div key={f.id} className="card stack" style={{ padding: 14, gap: 8 }}>
            <div className="row between"><b>{f.auction_studio_videos?.title}</b><span className={`pill ${f.status === 'scheduled' ? 'pill-green' : 'pill-warn'}`}>{f.status}</span></div>
            <span className="small muted">{names[f.owner_id] ?? '—'} · requested {new Date(f.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · paid KES {kes(f.paid_kes)}{f.note ? ` · “${f.note}”` : ''}</span>
            <div className="row" style={{ gap: 8 }}>
              {f.file_url && <a className="btn btn-outline btn-sm" href={f.file_url} download>Download video</a>}
              {f.auction_studio_videos?.caption && <button type="button" className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(f.auction_studio_videos!.caption!).then(() => setMsg({ ok: true, text: 'Caption copied.' }))}>Copy caption</button>}
              {f.status === 'requested' && <button type="button" className="btn btn-outline btn-sm" onClick={() => { const when = prompt('Post date and time (e.g. 2026-12-02 18:00)'); if (when) run(supabase.from('auction_studio_features').update({ status: 'scheduled', scheduled_for: new Date(when.replace(' ', 'T') + ':00+03:00').toISOString() }).eq('id', f.id), 'Scheduled.'); }}>Schedule</button>}
            </div>
            {autopostOn && f.status === 'requested' && (
              <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => {
                e.preventDefault(); const fd = new FormData(e.currentTarget);
                const platforms = ['tiktok', 'instagram', 'facebook', 'youtube'].filter((p) => fd.get(p));
                if (!platforms.length) { setMsg({ ok: false, text: 'Pick at least one of Mnada’s pages.' }); return; }
                const when = String(fd.get('when') ?? '');
                api('/api/studio/post', { feature_id: f.id, platforms, at: when ? new Date(when + ':00+03:00').toISOString() : new Date().toISOString(), caption: f.auction_studio_videos?.caption ?? '' }, 'Sent to Mnada’s pages');
              }}>
                {['tiktok', 'instagram', 'facebook', 'youtube'].map((p) => <label key={p} className="check small"><input type="checkbox" name={p} defaultChecked={p !== 'youtube'} />{p}</label>)}
                <label className="field" style={{ width: 210 }}><span className="small muted">When (empty = now)</span><input className="input" type="datetime-local" name="when" /></label>
                <button type="submit" className="btn btn-primary btn-sm">Post on Mnada pages automatically</button>
              </form>
            )}
            {f.scheduled_for && <span className="small">Scheduled for {new Date(f.scheduled_for).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })}</span>}
            <form className="row" style={{ gap: 8 }} onSubmit={(e) => {
              e.preventDefault(); const fd = new FormData(e.currentTarget);
              const links = String(fd.get('links') ?? '').split(/\s+/).filter((x) => /^https?:\/\//.test(x));
              if (!links.length) { setMsg({ ok: false, text: 'Paste at least one link to the post.' }); return; }
              run(supabase.from('auction_studio_features').update({ status: 'posted', posted_links: links, posted_at: new Date().toISOString() }).eq('id', f.id), 'Marked posted — the customer sees the links.');
            }}>
              <input className="input" name="links" placeholder="Links to the posts (TikTok, Instagram, Facebook) separated by spaces" style={{ flex: '1 1 320px' }} />
              <button type="submit" className="btn btn-primary btn-sm">Mark posted</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { const r = prompt('Reason (shown to the customer). They are refunded.'); if (r !== null) run(supabase.rpc('auction_studio_feature_refuse', { p_feature: f.id, p_note: r }), 'Refused and refunded.'); }}>Refuse &amp; refund</button>
            </form>
          </div>
        ))}
        {done.length > 0 && (
          <details><summary className="small" style={{ cursor: 'pointer' }}>Done ({done.length})</summary>
            <ul className="small">{done.map((f) => <li key={f.id}>{f.auction_studio_videos?.title} — {f.status}{f.posted_links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>link</a>)}</li>)}</ul>
          </details>
        )}
      </section>

      <form className="panel stack" style={{ gap: 10 }} onSubmit={(e) => {
        e.preventDefault(); const f = new FormData(e.currentTarget);
        run(supabase.from('auction_studio_settings').update({
          enabled: f.get('enabled') === 'on', price_video_kes: n(f.get('video'), s.price_video_kes), price_campaign_kes: n(f.get('campaign'), s.price_campaign_kes),
          campaign_videos: n(f.get('cvideos'), s.campaign_videos), price_feature_kes: n(f.get('feature'), s.price_feature_kes), price_voice_kes: n(f.get('voice'), s.price_voice_kes),
          free_rerenders: n(f.get('rerenders'), s.free_rerenders), price_autopost_month_kes: n(f.get('autopost'), s.price_autopost_month_kes), autopost_open: f.get('autopost_open') === 'on', mnada_handles: String(f.get('handles') ?? '').trim(), updated_at: new Date().toISOString(),
        }).eq('id', 1), 'Studio prices saved.');
      }}>
        <h3>Prices &amp; settings</h3>
        <fieldset disabled={!canFinance} className="row" style={{ gap: 10, alignItems: 'flex-end', border: 0, padding: 0, margin: 0 }}>
          <label className="field" style={{ width: 150 }}>Per video (KES)<input className="input" name="video" defaultValue={s.price_video_kes} /></label>
          <label className="field" style={{ width: 160 }}>Campaign pack (KES)<input className="input" name="campaign" defaultValue={s.price_campaign_kes} /></label>
          <label className="field" style={{ width: 150 }}>Videos in a pack<input className="input" name="cvideos" defaultValue={s.campaign_videos} /></label>
          <label className="field" style={{ width: 170 }}>Feature on Mnada pages<input className="input" name="feature" defaultValue={s.price_feature_kes} /></label>
          <label className="field" style={{ width: 140 }}>AI voiceover<input className="input" name="voice" defaultValue={s.price_voice_kes} /></label>
          <label className="field" style={{ width: 190 }}>Auto-posting per month<input className="input" name="autopost" defaultValue={s.price_autopost_month_kes} /></label>
          <label className="check"><input type="checkbox" name="autopost_open" defaultChecked={s.autopost_open} />Auto-posting open</label>
          <label className="field" style={{ width: 150 }}>Free re-renders<input className="input" name="rerenders" defaultValue={s.free_rerenders} /></label>
          <label className="field" style={{ flex: '1 1 260px' }}>Mnada’s handles (shown to customers)<input className="input" name="handles" defaultValue={s.mnada_handles} placeholder="@mnada.ke on TikTok, Instagram and Facebook" /></label>
          <label className="check"><input type="checkbox" name="enabled" defaultChecked={s.enabled} />Studio open</label>
          <button className="btn btn-primary" type="submit">Save</button>
        </fieldset>
        {!canFinance && <p className="small muted">Prices are set by Finance or an owner.</p>}
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="small">{autopostOn ? 'Automatic posting is connected (AYRSHARE_API_KEY set).' : 'Automatic posting is off: add AYRSHARE_API_KEY in Vercel (Ayrshare Business plan). Reminders work without it.'}</span>
          {autopostOn && <button type="button" className="btn btn-outline btn-sm" onClick={() => api('/api/studio/social', { action: 'register_webhook' }, 'Webhook registered — post results will update here.')}>Register results webhook</button>}
        </div>
        <p className="small muted">AI writing uses the AI wallet’s metered rates (needs ANTHROPIC_API_KEY and a model price). AI voiceover needs ELEVENLABS_API_KEY and a voice id (ELEVENLABS_VOICE_ID, or _EN / _SW).</p>
      </form>
    </>
  );
}
