'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';

export type SocialAccount = { id: string; platform: string; name: string | null; username: string | null; picture: string | null; status: string; last_error: string | null; is_mnada: boolean };
type Sub = { status: string; paid_until: string | null; auto_renew: boolean } | null;
export const PLATFORM_NAME: Record<string, string> = { facebook: 'Facebook Page', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok' };
const PROVIDERS: { key: 'meta' | 'youtube' | 'tiktok'; label: string; covers: string[]; note: string }[] = [
  { key: 'meta', label: 'Connect Facebook & Instagram', covers: ['facebook', 'instagram'], note: 'Needs a Facebook Page you manage. Instagram must be a Business or Creator account linked to that Page.' },
  { key: 'tiktok', label: 'Connect TikTok', covers: ['tiktok'], note: 'Any TikTok account.' },
  { key: 'youtube', label: 'Connect YouTube', covers: ['youtube'], note: 'A Google account with a YouTube channel.' },
];

export function AccountList({ accounts, onDisconnect }: { accounts: SocialAccount[]; onDisconnect: (id: string) => void }) {
  if (!accounts.length) return <span className="small muted">No accounts connected yet.</span>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {accounts.map((a) => (
        <div key={a.id} className="row" style={{ gap: 10, alignItems: 'center' }}>
          {a.picture ? <img src={a.picture} alt="" width={28} height={28} style={{ borderRadius: '50%' }} /> : <span style={{ width: 28 }} />}
          <span className="small"><b>{PLATFORM_NAME[a.platform] ?? a.platform}</b> · {a.name}{a.username && a.username !== a.name ? ` (@${a.username.replace(/^@/, '')})` : ''}</span>
          {a.status === 'expired' && <span className="pill pill-warn">Reconnect needed</span>}
          {a.last_error && <span className="small muted">{a.last_error}</span>}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onDisconnect(a.id)}>Disconnect</button>
        </div>
      ))}
    </div>
  );
}

export default function AutopostPanel({ sub, accounts, price, ready, staff, upcoming, notice }: {
  sub: Sub; accounts: SocialAccount[]; price: number; ready: { meta: boolean; youtube: boolean; tiktok: boolean }; staff: boolean; upcoming: number; notice: { ok: boolean; text: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(notice);
  const active = staff || (sub?.status === 'active' && !!sub.paid_until && new Date(sub.paid_until) > new Date());
  const anyReady = ready.meta || ready.youtube || ready.tiktok;
  const live = accounts.filter((a) => a.status !== 'revoked');

  async function subscribe() {
    if (!confirm(`Turn on auto-posting for KES ${kes(price)} a month from your wallet?`)) return;
    setBusy(true);
    const { error } = await createClient().rpc('auction_studio_autopost_subscribe');
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Auto-posting is on. Now connect your accounts.' });
    router.refresh();
  }
  async function disconnect(id: string) {
    if (!confirm('Disconnect this account? Scheduled automatic posts to it are cancelled.')) return;
    const { error } = await createClient().rpc('auction_social_disconnect', { p_account: id });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Disconnected.' });
    router.refresh();
  }
  async function renew(v: boolean) {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from('auction_studio_social').update({ auto_renew: v }).eq('owner_id', data.user!.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: v ? 'Renews monthly from your wallet.' : 'Won’t renew — automatic posting stops when this month ends.' });
    router.refresh();
  }

  return (
    <section id="autopost" className="panel card stack" style={{ gap: 12 }}>
      <div className="row between">
        <h2>Auto-posting</h2>
        <span className={`pill ${active ? 'pill-green' : 'pill-grey'}`}>{staff ? 'Staff' : active ? `On until ${new Date(sub!.paid_until!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : sub?.status === 'lapsed' ? 'Paused' : 'Off'}</span>
      </div>
      <p className="small" style={{ color: 'var(--body)' }}>
        Connect your own Facebook Page, Instagram, TikTok and YouTube, then schedule videos to post themselves — Mnada sends them at the times you pick.
        {' '}{staff ? 'Free for staff.' : `KES ${kes(price)} a month from your wallet.`}{upcoming > 0 && <> <b>{upcoming} post{upcoming === 1 ? '' : 's'} scheduled.</b></>}
      </p>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      {!anyReady ? (
        <div className="alert alert-info">Direct posting is waiting for approval from Meta, TikTok and Google. Until then, schedule <b>reminders</b> on any video — you get a notification and SMS at each posting time.</div>
      ) : !active ? (
        <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={subscribe}>Turn on auto-posting — KES {kes(price)}/month</button>
      ) : (
        <>
          <AccountList accounts={live} onDisconnect={disconnect} />
          <div className="row" style={{ gap: 8 }}>
            {PROVIDERS.map((p) => ready[p.key]
              ? <a key={p.key} className="btn btn-outline btn-sm" href={`/api/social/connect/${p.key}`} title={p.note}>{live.some((a) => p.covers.includes(a.platform)) ? p.label.replace('Connect', 'Reconnect') : p.label}</a>
              : <span key={p.key} className="small muted">{p.label.replace('Connect ', '')}: coming soon</span>)}
          </div>
          <span className="small muted">Facebook needs a Page you manage. Instagram must be a Business or Creator account linked to that Page. You can disconnect at any time; Mnada only posts the videos you schedule.</span>
          {!staff && sub && <label className="check small"><input type="checkbox" checked={sub.auto_renew} onChange={(e) => renew(e.target.checked)} />Renew monthly</label>}
        </>
      )}
    </section>
  );
}
