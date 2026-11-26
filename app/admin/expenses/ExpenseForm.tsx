'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORIES } from '@/lib/erp';

type Opt = { id: string; title?: string; reference?: string; contact_name?: string };

export default function ExpenseForm({ auctions, jobs }: { auctions: Opt[]; jobs: Opt[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [vatIncl, setVatIncl] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    const amount = Number(g('amount').replace(/[^0-9.]/g, ''));
    if (!amount) { setMsg({ ok: false, text: 'Enter the amount.' }); return; }
    setBusy(true); setMsg(null);
    const supabase = createClient();
    let receipt: string | null = null;
    const file = f.get('receipt') as File | null;
    if (file && file.size) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `receipts/${g('spent_on').slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from('auction-finance').upload(path, file, { contentType: file.type || undefined });
      if (up.error) { setBusy(false); setMsg({ ok: false, text: `Receipt upload failed: ${up.error.message}` }); return; }
      receipt = path;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('auction_expenses').insert({
      spent_on: g('spent_on'), category: g('category'), description: g('description'), supplier: g('supplier') || null,
      amount_kes: amount, vat_kes: vatIncl ? Math.round((amount * 16) / 116) : 0, paid_via: g('paid_via') || null, payment_ref: g('payment_ref') || null,
      auction_id: g('auction_id') || null, help_request_id: g('help_request_id') || null, receipt, created_by: user?.id,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    form.reset(); setVatIncl(false);
    setMsg({ ok: true, text: 'Expense recorded.' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel stack" style={{ gap: 12 }}>
      <h3>Record an expense</h3>
      <div className="grid2">
        <label className="field">Date<input className="input" type="date" name="spent_on" required defaultValue={new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)} /></label>
        <label className="field">Category<select className="input" name="category">{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field">What for<input className="input" name="description" required placeholder="e.g. Lowbed hire, Athi River → yard" /></label>
        <label className="field">Supplier<input className="input" name="supplier" /></label>
        <label className="field">Amount paid (KES)<input className="input" name="amount" inputMode="decimal" required /></label>
        <label className="check" style={{ alignSelf: 'flex-end', paddingBottom: 10 }}><input type="checkbox" checked={vatIncl} onChange={(e) => setVatIncl(e.target.checked)} />Includes 16% VAT (supplier is VAT-registered)</label>
        <label className="field">Paid by<select className="input" name="paid_via" defaultValue="mpesa"><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cash">Cash</option><option value="card">Card</option></select></label>
        <label className="field">Payment reference<input className="input" name="payment_ref" placeholder="M-Pesa code / cheque no." /></label>
        <label className="field">For auction (optional)<select className="input" name="auction_id" defaultValue=""><option value="">—</option>{auctions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
        <label className="field">For Listing Help job (optional)<select className="input" name="help_request_id" defaultValue=""><option value="">—</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.reference} · {j.contact_name}</option>)}</select></label>
      </div>
      <label className="field">Receipt photo or PDF (optional)<input className="input" type="file" name="receipt" accept="image/*,application/pdf" /></label>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : 'Save expense'}</button>
    </form>
  );
}
