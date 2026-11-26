'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ROLE_INFO, type CampusRole } from '@/lib/campus';

export default function JoinForm({ userId, campuses, defaultPhone, hasKraPin }: { userId: string; campuses: string[]; defaultPhone: string; hasKraPin: boolean }) {
  const router = useRouter();
  const [campus, setCampus] = useState(campuses[0] ?? 'Other');
  const [roles, setRoles] = useState<CampusRole[]>(['scout', 'referrer']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    if (!f.get('adult')) { setErr('You must be 18 or over to join.'); return; }
    if (!f.get('agree')) { setErr('Please accept the programme rules.'); return; }
    const mpesa = get('mpesa').replace(/\s/g, '');
    if (!/^(\+?254|0)?[17]\d{8}$/.test(mpesa)) { setErr('Enter a valid M-Pesa number.'); return; }
    const file = f.get('student_id') as File | null;
    if (!file || !file.size) { setErr('Upload a photo of your student ID.'); return; }
    if (file.size > 10 * 1024 * 1024) { setErr('Student ID file is over 10 MB.'); return; }
    const campusName = campus === 'Other' ? get('campus_other') : campus;
    if (!campusName) { setErr('Enter your college or university.'); return; }
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/campus-student-id-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('auction-kyc').upload(path, file, { upsert: false });
    if (up.error) { setBusy(false); setErr(up.error.message); return; }
    if (!hasKraPin && get('kra_pin')) {
      await supabase.from('auction_profiles').update({ kra_pin: get('kra_pin').toUpperCase() }).eq('id', userId);
    }
    const { error } = await supabase.from('auction_campus_members').insert({
      id: userId, code: 'PENDING', campus: campusName, course: get('course') || null, year_of_study: Number(get('year')) || null,
      student_id_no: get('student_id_no') || null, student_id_path: path, mpesa_phone: '+254' + mpesa.replace(/^(\+?254|0)/, ''),
      roles, confirmed_adult: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push('/campus/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel card stack" style={{ gap: 14 }}>
      <h2>Join Mnada Campus</h2>
      <div className="grid2">
        <label className="field">College or university
          <select className="input" value={campus} onChange={(e) => setCampus(e.target.value)}>
            {campuses.map((c) => <option key={c}>{c}</option>)}
            <option>Other</option>
          </select>
        </label>
        {campus === 'Other' && <label className="field">Name of your college<input className="input" name="campus_other" required /></label>}
        <label className="field">Course<input className="input" name="course" placeholder="e.g. Mechanical Engineering" /></label>
        <label className="field">Year of study<select className="input" name="year" defaultValue="2">{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select></label>
        <label className="field">Student ID / admission no.<input className="input" name="student_id_no" required /></label>
        <label className="field">M-Pesa number for payouts<input className="input" name="mpesa" type="tel" defaultValue={defaultPhone.replace(/^\+254/, '0')} required /></label>
        {!hasKraPin && <label className="field">KRA PIN <span className="small muted">(needed before your first payout)</span><input className="input" name="kra_pin" placeholder="A000000000X" /></label>}
      </div>
      <label className="field">Photo of your student ID<input className="input" type="file" name="student_id" accept="image/*,application/pdf" required /></label>
      <fieldset className="stack" style={{ gap: 6, border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>How do you want to earn? <span className="small muted">(pick any)</span></legend>
        {(Object.keys(ROLE_INFO) as CampusRole[]).map((r) => (
          <label key={r} className="check">
            <input type="checkbox" checked={roles.includes(r)} onChange={(e) => setRoles((x) => (e.target.checked ? [...x, r] : x.filter((y) => y !== r)))} />
            <span><b>{ROLE_INFO[r][0]}</b> — <span className="small">{ROLE_INFO[r][1]}</span></span>
          </label>
        ))}
      </fieldset>
      <label className="check"><input type="checkbox" name="adult" /><span>I am 18 or over.</span></label>
      <label className="check"><input type="checkbox" name="agree" /><span>I accept the programme rules above and the <a href="/terms#campus" target="_blank" rel="noreferrer">campus terms</a>. I won’t run auctions, handle buyers’ money or share anyone’s details without their consent.</span></label>
      {err && <div role="alert" className="alert alert-err">{err}</div>}
      <button type="submit" className="btn btn-primary" disabled={busy} style={{ minHeight: 50 }}>{busy ? 'Sending…' : 'Apply to join'}</button>
      <span className="small muted">We check your student ID and Mnada account, usually within a working day.</span>
    </form>
  );
}
