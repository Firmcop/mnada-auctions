'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, kes } from '@/lib/format';

type Rule = { id: string; category: string | null; min_hammer: number; pct: number };

export default function PremiumRules({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? null);
    if (!error) router.refresh();
  }
  const supabase = createClient();
  return (
    <section className="panel stack" style={{ gap: 10 }}>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      {rules.length === 0 && <span className="small muted">No rules — every auction uses its own premium %.</span>}
      {rules.map((r) => (
        <div key={r.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
          <span>{r.category ?? 'All categories'}</span>
          <span>{Number(r.min_hammer) > 0 ? `hammer from KES ${kes(r.min_hammer)}` : 'any hammer price'}</span>
          <b>{Number(r.pct)}%</b>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => run(supabase.from('auction_premium_rules').delete().eq('id', r.id))}>Remove</button>
        </div>
      ))}
      <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        run(supabase.from('auction_premium_rules').insert({ category: String(f.get('category') || '') || null, min_hammer: Number(String(f.get('min')).replace(/[^0-9]/g, '') || 0), pct: Number(f.get('pct')) })).then(() => form.reset());
      }}>
        <label className="field" style={{ width: 260 }}>Category<select className="input" name="category" defaultValue=""><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field" style={{ width: 200 }}>From hammer price (KES)<input className="input" name="min" inputMode="numeric" placeholder="0" /></label>
        <label className="field" style={{ width: 120 }}>Premium %<input className="input" name="pct" type="number" step="0.5" min="0" max="50" required /></label>
        <button className="btn btn-primary" type="submit">Add rule</button>
      </form>
    </section>
  );
}
