'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NewPasswordPage() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get('password'));
    const { error } = await createClient().auth.updateUser({ password: pw });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Password updated.' });
  }
  return (
    <div className="wrap section" style={{ maxWidth: 480 }}>
      <form onSubmit={submit} className="panel card stack" style={{ gap: 14 }}>
        <h1 style={{ fontSize: 28 }}>Set a new password</h1>
        <label className="field">New password<input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
        {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
        <button className="btn btn-primary" type="submit">Save password</button>
      </form>
    </div>
  );
}
