'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const PLATFORMS: [string, string][] = [['tiktok', 'TikTok'], ['instagram', 'Instagram Reels'], ['youtube', 'YouTube Shorts'], ['facebook', 'Facebook'], ['x', 'X'], ['other', 'Other']];

export default function VideoForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const url = String(f.get('url') ?? '').trim();
    if (!/^https?:\/\//.test(url)) { setMsg({ ok: false, text: 'Paste the full link to the video.' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await createClient().from('auction_campus_videos').insert({
      member_id: userId, url, platform: String(f.get('platform')), about: String(f.get('about') ?? '').trim() || null,
      views: Number(String(f.get('views') ?? '').replace(/[^0-9]/g, '')) || 0,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    form.reset();
    setMsg({ ok: true, text: 'Sent for review.' });
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 12 }}>
      <h3>Submit a video</h3>
      <label className="field">Video link<input className="input" name="url" type="url" required placeholder="https://www.tiktok.com/@you/video/…" /></label>
      <div className="grid2">
        <label className="field">Platform<select className="input" name="platform">{PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="field">Views so far<input className="input" name="views" inputMode="numeric" /></label>
      </div>
      <label className="field">What’s it about? <span className="small muted">(optional)</span><input className="input" name="about" placeholder="e.g. Forklift lot in the December sale" /></label>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit video'}</button>
    </form>
  );
}
