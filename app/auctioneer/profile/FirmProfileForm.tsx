'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/image';
import { photoUrl } from '@/lib/format';
import type { Firm, FirmPrivate } from '@/lib/auctioneer';

type Member = { user_id: string; role: string; name?: { name: string; email: string } };

export default function FirmProfileForm({ firm, priv, isOwner, userId, members }: { firm: Firm; priv: FirmPrivate | null; isOwner: boolean; userId: string; members: Member[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [logo, setLogo] = useState(firm.logo);
  const [method, setMethod] = useState<'bank' | 'mpesa'>(priv?.payout_method ?? 'bank');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const done = (error: { message: string } | null, ok = 'Saved.') => { setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok }); if (!error) router.refresh(); };

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await uploadPhoto(supabase, `auctioneers/${firm.id}/logo`, file);
    if (r.error || !r.path) { setMsg({ ok: false, text: `Upload failed: ${r.error}` }); return; }
    setLogo(r.path);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true);
    let licenceDoc = priv?.licence_doc ?? null;
    const doc = f.get('licence_doc') as File | null;
    if (doc && doc.size) {
      const ext = (doc.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${userId}/auctioneer-licence-${firm.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from('auction-kyc').upload(path, doc, { contentType: doc.type || undefined });
      if (up.error) { setBusy(false); setMsg({ ok: false, text: up.error.message }); return; }
      licenceDoc = path;
    }
    const { error } = await supabase.from('auction_auctioneers').update({
      name: g('name'), licence_no: g('licence_no'), licence_expiry: g('licence_expiry') || null, phone: g('phone') || null, email: g('email') || null,
      location: g('location') || null, about: g('about') || null, default_terms: g('default_terms') || null, logo,
    }).eq('id', firm.id);
    if (error) { setBusy(false); done(error); return; }
    const { error: e2 } = await supabase.from('auction_auctioneer_private').update({
      kra_pin: g('kra_pin') || null, payout_method: method, payout_details: g('payout_details') || null, licence_doc: licenceDoc,
    }).eq('auctioneer_id', firm.id);
    setBusy(false);
    done(e2, firm.status === 'approved' && (g('licence_no') !== firm.licence_no || g('licence_expiry') !== (firm.licence_expiry ?? '') || g('name') !== firm.name) ? 'Saved — licence or name changes are re-checked by Mnada before you can publish again.' : 'Saved.');
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    const { error } = await supabase.rpc('auction_firm_add_member', { p_auctioneer: firm.id, p_email: email });
    done(error, 'Team member added.');
    if (!error) e.currentTarget.reset();
  }
  async function removeMember(uid: string) {
    if (!window.confirm('Remove this person from the firm?')) return;
    const { error } = await supabase.from('auction_auctioneer_members').delete().eq('auctioneer_id', firm.id).eq('user_id', uid);
    done(error, 'Removed.');
  }

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <form onSubmit={save} className="stack" style={{ gap: 16 }}>
        <fieldset disabled={!isOwner} className="panel stack" style={{ gap: 12, border: 0 }}>
          <h3>Public profile</h3>
          {!isOwner && <span className="small muted">Only the firm owner can change these details.</span>}
          <div className="row" style={{ gap: 14 }}>
            <div className="thumb" style={{ width: 96, height: 96, borderRadius: 12 }}>{logo ? <img src={photoUrl(logo)} alt="Firm logo" /> : <span className="small muted">No logo</span>}</div>
            <label className="btn btn-outline btn-sm">Upload logo<input type="file" accept="image/*" className="sr" onChange={uploadLogo} /></label>
          </div>
          <div className="grid2">
            <label className="field">Firm name<input className="input" name="name" required defaultValue={firm.name} /></label>
            <label className="field">Office location<input className="input" name="location" defaultValue={firm.location ?? ''} /></label>
            <label className="field">Phone<input className="input" name="phone" defaultValue={firm.phone ?? ''} /></label>
            <label className="field">Email<input className="input" name="email" type="email" defaultValue={firm.email ?? ''} /></label>
          </div>
          <label className="field">About the firm<textarea className="input" name="about" rows={3} defaultValue={firm.about ?? ''} /></label>
          <label className="field">Default terms of sale (pre-filled on new auctions)<textarea className="input" name="default_terms" rows={4} defaultValue={firm.default_terms ?? ''} /></label>
        </fieldset>
        <fieldset disabled={!isOwner} className="panel stack" style={{ gap: 12, border: 0 }}>
          <h3>Licence, tax &amp; payouts (private)</h3>
          <div className="grid2">
            <label className="field">Licence number<input className="input" name="licence_no" required defaultValue={firm.licence_no} /></label>
            <label className="field">Licence valid until<input className="input" name="licence_expiry" type="date" defaultValue={firm.licence_expiry ?? ''} /></label>
            <label className="field">KRA PIN<input className="input" name="kra_pin" defaultValue={priv?.kra_pin ?? ''} /></label>
            <label className="field">Upload renewed licence (optional)<input className="input" name="licence_doc" type="file" accept="application/pdf,image/*" /></label>
            <label className="field">Payouts to
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value as 'bank' | 'mpesa')}><option value="bank">Bank account</option><option value="mpesa">M-Pesa</option></select>
            </label>
            <label className="field">{method === 'bank' ? 'Bank, branch and account number' : 'M-Pesa number'}<input className="input" name="payout_details" defaultValue={priv?.payout_details ?? ''} /></label>
          </div>
          <span className="small muted">Changing the licence number, expiry or firm name sends the firm back to Mnada for a quick re-check.</span>
          {isOwner && <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : 'Save'}</button>}
        </fieldset>
      </form>
      <section className="panel stack" style={{ gap: 10 }}>
        <h3>Team</h3>
        {members.map((m) => (
          <div key={m.user_id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid #F0F2F4' }}>
            <span><b>{m.name?.name ?? 'Member'}</b> · {m.name?.email ?? ''}</span>
            <span className="pill pill-grey">{m.role}</span>
            {isOwner && m.user_id !== userId ? <button type="button" className="btn btn-outline btn-sm" onClick={() => removeMember(m.user_id)}>Remove</button> : <span />}
          </div>
        ))}
        {isOwner && (
          <form onSubmit={addMember} className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
            <label className="field" style={{ flex: '1 1 260px' }}>Add staff by their Mnada account email<input className="input" name="email" type="email" required /></label>
            <button className="btn btn-outline" type="submit">Add</button>
          </form>
        )}
        <span className="small muted">Staff can create and edit auctions and lots. Staff can&apos;t bid in the firm&apos;s own auctions.</span>
      </section>
    </>
  );
}
