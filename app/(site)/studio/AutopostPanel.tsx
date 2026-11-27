'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

type Social = { platforms: string[]; status: string; paid_until: string | null; auto_renew: boolean } | null;
const NAMES: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook Page', youtube: 'YouTube' };

export default function AutopostPanel({ social, price, autopostOn, staff, upcoming }: { social: Social; price: number; autopostOn: boolean; staff: boolean; upcoming: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const active = social?.status === 'active' && !!social.paid_until && new Date(social.paid_until) > new Date();

  async function call(action: string) {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/studio/social', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: out.error ?? 'Something went wrong' }); return; }
    if (out.url) {
      window.open(out.url, 'mnada-connect', 'width=520,height=760');
      setMsg({ ok: true, text: 'Connect your accounts in the window that opened, then press “Refresh connected accounts”.' });
    } else if (out.platforms) setMsg({ ok: true, text: out.platforms.length ? `Connected: ${out.platforms.map((p: string) => NAMES[p] ?? p).join(', ')}.` : 'No accounts connected yet.' });
    router.refresh();
  }
  async function toggleRenew(v: boolean) {
    const { error } = await createClient().from('auction_studio_social').update({ auto_renew: v }).eq('owner_id', (await createClient().auth.getUser()).data.user!.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: v ? 'Will renew monthly from your wallet.' : 'Won’t renew — posting stops when this month ends.' });
    router.refresh();
  }

  return (
    <section id="autopost" className="panel card stack" style={{ gap: 10 }}>
      <div className="row between">
        <h2>Auto-posting</h2>
        <span className={`pill ${active ? 'pill-green' : 'pill-grey'}`}>{active ? `On until ${new Date(social!.paid_until!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : social?.status === 'lapsed' ? 'Paused' : 'Off'}</span>
      </div>
      <p className="small" style={{ color: 'var(--body)' }}>
        Connect your own TikTok, Instagram, Facebook Page and YouTube once, then schedule videos to go out automatically — even at 2 hours before closing.
        {' '}{staff ? 'Free for staff.' : `KES ${kes(price)} a month from your wallet.`} {upcoming > 0 && <b>{upcoming} post{upcoming === 1 ? '' : 's'} scheduled.</b>}
      </p>
      {!autopostOn ? (
        <div className="alert alert-info">Automatic posting is being switched on. Until then, schedule <b>reminders</b> on any video — you get a notification and SMS at each posting time.</div>
      ) : (
        <>
          {social?.platforms?.length ? <span className="small">Connected: <b>{social.platforms.map((p) => NAMES[p] ?? p).join(', ')}</b></span> : <span className="small muted">No accounts connected yet. Instagram needs a Business or Creator account; Facebook needs a Page.</span>}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('connect')}>{active ? 'Connect or change accounts' : `Turn on${staff ? '' : ` — KES ${kes(price)}/month`} & connect accounts`}</button>
            {social?.paid_until && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => call('sync')}>Refresh connected accounts</button>}
            {active && <label className="check small"><input type="checkbox" checked={social!.auto_renew} onChange={(e) => toggleRenew(e.target.checked)} />Renew monthly</label>}
          </div>
        </>
      )}
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
    </section>
  );
}
