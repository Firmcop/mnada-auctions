'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/format';

export default function SellPage() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim() || null;
    setState('busy');
    setErr(null);
    const { error } = await createClient().from('auction_valuations').insert({
      name: g('name'), company: g('company'), phone: g('phone'), email: g('email'), kind: g('kind'),
      category: g('category'), location: g('location'), description: g('description'), timeline: g('timeline'),
    });
    if (error) { setErr(error.message); setState('idle'); return; }
    setState('done');
  }

  return (
    <>
      <section style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="wrap stack" style={{ padding: '56px 24px', gap: 16 }}>
          <span className="eyebrow" style={{ color: '#F5A27A' }}>For companies, receivers and asset owners</span>
          <h1 style={{ color: '#fff', maxWidth: 860, fontSize: 'clamp(32px, 4.6vw, 52px)' }}>Turn idle machinery, fleets and whole sites into cash.</h1>
          <p style={{ color: '#C9D5DF', fontSize: 18, maxWidth: 680 }}>We value your assets, photograph and list them, bring verified buyers to the viewing day, collect payment and manage collection.</p>
        </div>
      </section>
      <div className="wrap section stack" style={{ gap: 48 }}>
        <section className="stack" style={{ gap: 20 }}>
          <h2>Ways to sell</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {[
              ['Single items', 'One machine, vehicle or container added to the next themed auction.'],
              ['Full site auction', 'Closures, relocations and receiverships — a dedicated auction with on-site viewing.'],
              ['Fleet & surplus disposals', 'Recurring sales for contractors and companies replacing plant and vehicles.'],
            ].map(([t, d]) => (
              <div key={t} className="card stack" style={{ padding: 22, gap: 8 }}><b style={{ fontSize: 18 }}>{t}</b><span style={{ color: 'var(--body)' }}>{d}</span></div>
            ))}
          </div>
        </section>

        <section id="form" className="row" style={{ gap: 36, alignItems: 'flex-start' }}>
          <div className="stack" style={{ flex: '1 1 300px', gap: 12 }}>
            <h2>Request a free valuation</h2>
            <p style={{ color: 'var(--body)' }}>Tell us what you&apos;d like to sell. A specialist replies within one working day.</p>
          </div>
          {state === 'done' ? (
            <div className="card panel stack" style={{ flex: '2 1 520px', gap: 10 }}>
              <h3 style={{ fontSize: 22 }}>Thank you — request received</h3>
              <p style={{ color: 'var(--body)' }}>We&apos;ll call or email you within one working day. If you have photos or an asset list, have them ready.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="card panel stack" style={{ flex: '2 1 520px', gap: 16 }}>
              <div className="grid2">
                <label className="field">Your name<input className="input" name="name" required /></label>
                <label className="field">Company<input className="input" name="company" /></label>
                <label className="field">Mobile<input className="input" name="phone" type="tel" placeholder="+254" required /></label>
                <label className="field">Email<input className="input" name="email" type="email" /></label>
              </div>
              <label className="field">What are you selling?
                <select className="input" name="kind" defaultValue="A few items">
                  <option>A few items</option><option>A full site or business</option><option>A fleet or recurring surplus</option>
                </select>
              </label>
              <div className="grid2">
                <label className="field">Main category
                  <select className="input" name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className="field">Location of assets<input className="input" name="location" placeholder="Town / county" /></label>
              </div>
              <label className="field">Describe the items<textarea className="input" name="description" rows={4} placeholder="Make, model, year, quantity, condition…" required /></label>
              <label className="field">When do the assets need to be cleared?
                <select className="input" name="timeline"><option>No fixed date</option><option>Within 1 month</option><option>Within 3 months</option><option>Urgent — under 2 weeks</option></select>
              </label>
              {err && <div role="alert" className="alert alert-err">{err}</div>}
              <button className="btn btn-primary" type="submit" disabled={state === 'busy'} style={{ minHeight: 52 }}>{state === 'busy' ? 'Sending…' : 'Send valuation request'}</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
