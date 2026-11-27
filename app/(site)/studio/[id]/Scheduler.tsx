'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEMPLATE_INFO, type Template } from '@/lib/studio';

export type PostRow = { id: string; mode: string; platforms: string[]; scheduled_for: string; status: string; post_urls: { platform?: string | null; postUrl?: string | null }[]; error: string | null };
export type Social = { platforms: string[]; status: string; paid_until: string | null } | null;

const PLATFORMS: [string, string][] = [['tiktok', 'TikTok'], ['instagram', 'Instagram Reels'], ['facebook', 'Facebook Reels'], ['youtube', 'YouTube Shorts']];
const ST: Record<string, [string, string]> = {
  scheduled: ['Scheduled', 'pill-warn'], sending: ['Sending…', 'pill-warn'], posted: ['Posted', 'pill-green'], partial: ['Partly posted', 'pill-warn'],
  failed: ['Failed', 'pill-grey'], cancelled: ['Cancelled', 'pill-grey'], reminded: ['Reminder sent', 'pill-green'],
};
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
const localInput = (d: Date) => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 16);

export default function Scheduler({ videoId, ready, caption, plan, social, autopostOn, posts }: {
  videoId: string; ready: boolean; caption: string; plan: { at: string; what: string; template: Template }[];
  social: Social; autopostOn: boolean; posts: PostRow[];
}) {
  const router = useRouter();
  const connected = autopostOn && social?.status === 'active' && !!social.paid_until && new Date(social.paid_until) > new Date() ? social.platforms : [];
  const [mode, setMode] = useState<'auto' | 'reminder'>(connected.length ? 'auto' : 'reminder');
  const [platforms, setPlatforms] = useState<string[]>(connected.length ? connected : ['tiktok', 'instagram', 'facebook']);
  const [picked, setPicked] = useState<string[]>(plan.slice(0, 1).map((p) => p.at));
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function schedule() {
    const times = [...picked, ...(custom ? [new Date(custom + ':00+03:00').toISOString()] : [])];
    if (!times.length) { setMsg({ ok: false, text: 'Pick at least one time.' }); return; }
    if (mode === 'auto' && !platforms.some((p) => connected.includes(p))) { setMsg({ ok: false, text: 'Pick at least one connected account.' }); return; }
    setBusy(true); setMsg(null);
    const errs: string[] = [];
    for (const at of times) {
      const t = new Date(at).getTime() < Date.now() + 60_000 ? new Date(Date.now() + 60_000).toISOString() : at;
      const res = await fetch('/api/studio/post', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ video_id: videoId, mode, platforms, at: t, caption }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) errs.push(out.error ?? 'Failed'); else if (out.error) errs.push(out.error);
    }
    setBusy(false);
    setMsg(errs.length ? { ok: false, text: errs.join(' · ') } : { ok: true, text: mode === 'auto' ? 'Scheduled — it will go out automatically.' : 'Reminders set — we’ll send you a notification and SMS when it’s time.' });
    setPicked([]); setCustom('');
    router.refresh();
  }
  async function cancel(id: string) {
    setBusy(true);
    const res = await fetch('/api/studio/post', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cancel: id }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Cancelled.' } : { ok: false, text: out.error ?? 'Couldn’t cancel' });
    router.refresh();
  }

  return (
    <section className="panel stack" style={{ gap: 10 }}>
      <h3>Schedule posts</h3>
      {!ready && <p className="small muted">Make the video first, then schedule it here.</p>}
      {ready && (
        <>
          <div className="row" style={{ gap: 6 }} role="group" aria-label="How to post">
            <button type="button" className={`btn btn-sm ${mode === 'auto' ? 'btn-primary' : 'btn-outline'}`} disabled={!connected.length} onClick={() => setMode('auto')}>Post automatically</button>
            <button type="button" className={`btn btn-sm ${mode === 'reminder' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('reminder')}>Remind me to post</button>
          </div>
          {!connected.length && <span className="small muted">{autopostOn ? <>To post automatically, connect your accounts under <a href="/studio#autopost">Auto-posting</a>.</> : 'Automatic posting is coming soon — reminders (notification + SMS) work now.'}</span>}
          <div className="row" style={{ gap: 12 }}>
            {PLATFORMS.map(([k, l]) => {
              const disabled = mode === 'auto' && !connected.includes(k);
              return <label key={k} className="check small" style={{ opacity: disabled ? 0.5 : 1 }}><input type="checkbox" disabled={disabled} checked={platforms.includes(k) && !disabled} onChange={(e) => setPlatforms((x) => (e.target.checked ? [...x, k] : x.filter((y) => y !== k)))} />{l}</label>;
            })}
            {mode === 'reminder' && <label className="check small"><input type="checkbox" checked={platforms.includes('whatsapp')} onChange={(e) => setPlatforms((x) => (e.target.checked ? [...x, 'whatsapp'] : x.filter((y) => y !== 'whatsapp')))} />WhatsApp Status</label>}
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {plan.map((p) => (
              <label key={p.at} className="check small">
                <input type="checkbox" checked={picked.includes(p.at)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.at] : x.filter((y) => y !== p.at)))} />
                <span><b>{fmt(p.at)}</b> — {p.what} <span className="muted">(best with {TEMPLATE_INFO[p.template][0]})</span></span>
              </label>
            ))}
            <label className="small row" style={{ gap: 8, alignItems: 'center' }}>Another time
              <input className="input" type="datetime-local" value={custom} min={localInput(new Date())} onChange={(e) => setCustom(e.target.value)} style={{ width: 220 }} />
            </label>
          </div>
          {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
          <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={schedule}>
            {busy ? 'Scheduling…' : mode === 'auto' ? 'Schedule automatic posts' : 'Set reminders'}
          </button>
          <span className="small muted">Times are Nairobi time. Posting the same video many times can look like spam — for each slot, a fresh video in the suggested style works best.</span>
        </>
      )}
      {posts.length > 0 && (
        <table className="data">
          <thead><tr><th>When</th><th>Where</th><th>How</th><th>Status</th><th /></tr></thead>
          <tbody>{posts.map((p) => (
            <tr key={p.id}>
              <td className="small">{fmt(p.scheduled_for)}</td>
              <td className="small">{p.platforms.join(', ') || '—'}{p.post_urls.filter((u) => u.postUrl).map((u) => <a key={u.postUrl!} href={u.postUrl!} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>{u.platform ?? 'post'} ↗</a>)}</td>
              <td className="small">{p.mode === 'auto' ? 'Automatic' : p.mode === 'mnada' ? 'Mnada pages' : 'Reminder'}</td>
              <td><span className={`pill ${ST[p.status]?.[1] ?? 'pill-grey'}`}>{ST[p.status]?.[0] ?? p.status}</span>{p.error && <div className="small muted">{p.error}</div>}</td>
              <td>{['scheduled', 'failed'].includes(p.status) && p.mode !== 'mnada' && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => cancel(p.id)}>Cancel</button>}</td>
            </tr>))}
          </tbody>
        </table>
      )}
    </section>
  );
}
