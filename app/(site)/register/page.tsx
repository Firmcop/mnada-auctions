'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [type, setType] = useState<'individual' | 'company'>('individual');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<'confirm' | 'in' | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    if (!f.get('terms')) { setErr('Please accept the terms of sale.'); return; }
    const phone = get('phone').replace(/\s/g, '');
    if (!/^(\+?254|0)?[17]\d{8}$/.test(phone)) { setErr('Enter a valid Kenyan mobile number, e.g. 712 345 678.'); return; }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: get('email'),
      password: get('password'),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        data: {
          app: 'mnada',
          full_name: get('full_name'),
          phone: '+254' + phone.replace(/^(\+?254|0)/, ''),
          account_type: type,
          company_name: type === 'company' ? get('company_name') : '',
          id_number: get('id_number'),
          kra_pin: get('kra_pin').toUpperCase(),
        },
      },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(data.session ? 'in' : 'confirm');
  }

  if (done) {
    return (
      <div className="wrap section" style={{ maxWidth: 640 }}>
        <div className="panel card stack" style={{ gap: 14 }}>
          <h1 style={{ fontSize: 30 }}>{done === 'confirm' ? 'Check your email' : 'Registration received'}</h1>
          <p style={{ color: 'var(--body)' }}>
            {done === 'confirm'
              ? 'We sent you a link to confirm your email address. After that, log in and upload your ID or company certificate so we can approve you for bidding.'
              : 'Next, upload your ID or company certificate so we can approve you for bidding — usually within one working hour.'}
          </p>
          <Link href={done === 'confirm' ? '/login' : '/account'} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {done === 'confirm' ? 'Go to log in' : 'Continue to your account'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)' }}>
      <div className="wrap row" style={{ padding: '44px 24px', gap: 36, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '1 1 300px', gap: 14 }}>
          <h1>Register to bid</h1>
          <p style={{ color: 'var(--body)' }}>Takes about three minutes. We verify every bidder so sellers can trust the result of each auction.</p>
          <p className="small muted">Already registered? <Link href="/login">Log in</Link></p>
        </div>
        <form onSubmit={submit} className="panel stack" style={{ flex: '2 1 520px', gap: 16, boxShadow: '0 8px 24px rgba(15,42,61,.06)' }}>
          <div role="group" aria-label="Account type" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['individual', 'company'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
                style={{ textAlign: 'left', padding: 14, borderRadius: 10, font: 'inherit', cursor: 'pointer', background: type === t ? '#FFF4EE' : '#fff', border: `2px solid ${type === t ? 'var(--accent)' : 'var(--line)'}` }}>
                <b>{t === 'individual' ? 'Individual' : 'Company'}</b>
                <div className="small muted">{t === 'individual' ? 'Verify with National ID or passport' : 'Invoices issued with your KRA PIN'}</div>
              </button>
            ))}
          </div>
          <label className="field">Full name<input className="input" name="full_name" required autoComplete="name" /></label>
          {type === 'company' && <label className="field">Company name<input className="input" name="company_name" required autoComplete="organization" /></label>}
          <div className="grid2">
            <label className="field">Email<input className="input" name="email" type="email" required autoComplete="email" /></label>
            <label className="field">Mobile (M-Pesa)
              <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <span className="input" style={{ width: 'auto', display: 'flex', alignItems: 'center', background: 'var(--surface)', fontWeight: 600 }}>+254</span>
                <input className="input" name="phone" type="tel" placeholder="712 345 678" required autoComplete="tel-national" />
              </span>
            </label>
          </div>
          <div className="grid2">
            <label className="field">{type === 'company' ? 'Company registration no.' : 'National ID or passport no.'}<input className="input" name="id_number" required /></label>
            <label className="field">KRA PIN<input className="input" name="kra_pin" placeholder="A000000000X" required={type === 'company'} /></label>
          </div>
          <label className="field">Password<input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          <label className="check"><input type="checkbox" name="terms" /><span>I accept the <a href="/terms" target="_blank" rel="noreferrer">terms of sale</a> and <a href="/privacy" target="_blank" rel="noreferrer">privacy policy</a>.</span></label>
          {err && <div role="alert" className="alert alert-err">{err}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 52 }}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
      </div>
    </div>
  );
}
