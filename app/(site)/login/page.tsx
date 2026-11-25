'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    const { error } = await createClient().auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
    setBusy(false);
    if (error) { setErr(error.message === 'Email not confirmed' ? 'Please confirm your email first — check your inbox for our link.' : 'Email or password is incorrect.'); return; }
    router.replace(next.startsWith('/') ? next : '/account');
    router.refresh();
  }

  async function reset(e: React.MouseEvent) {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    if (!email) { setErr('Enter your email first, then click "Forgot password".'); return; }
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/account/password` });
    setResetSent(true);
  }

  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 16 }}>
      <h1 style={{ fontSize: 30 }}>Log in</h1>
      <label className="field">Email<input id="email" className="input" name="email" type="email" required autoComplete="email" /></label>
      <label className="field">Password<input className="input" name="password" type="password" required autoComplete="current-password" /></label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      {resetSent && <div role="status" className="alert alert-ok">If that email is registered, we&apos;ve sent a reset link.</div>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <div className="row between small">
        <a href="#" onClick={reset}>Forgot password?</a>
        <span>New here? <Link href="/register">Register to bid</Link></span>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="wrap section" style={{ maxWidth: 480 }}>
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
