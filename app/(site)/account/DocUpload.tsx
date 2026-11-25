'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DocUpload({ userId, hasDoc }: { userId: string; hasDoc: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setMsg({ ok: false, text: 'File is over 10 MB.' }); return; }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/document-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('auction-kyc').upload(path, file, { upsert: false });
    if (error) { setBusy(false); setMsg({ ok: false, text: error.message }); return; }
    const { data: prof } = await supabase.from('auction_profiles').select('status').eq('id', userId).single();
    const patch: Record<string, string> = { doc_path: path };
    if (prof?.status === 'info_requested') patch.status = 'pending';
    const { error: e2 } = await supabase.from('auction_profiles').update(patch).eq('id', userId);
    setBusy(false);
    if (e2) { setMsg({ ok: false, text: e2.message }); return; }
    setMsg({ ok: true, text: 'Uploaded. We’ll review it shortly.' });
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Uploading…' : hasDoc ? 'Replace document' : 'Choose file'}
        <input type="file" accept="image/*,application/pdf" onChange={onFile} disabled={busy} className="sr" />
      </label>
      <span className="small muted">JPG, PNG or PDF · max 10 MB · only our verification team can see it</span>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
    </div>
  );
}
