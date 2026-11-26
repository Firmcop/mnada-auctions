import { requireArea } from '@/lib/require-area';
import { createClient } from '@/lib/supabase/server';
import { kes } from '@/lib/format';
import { canArea } from '@/lib/staff';
import type { StorageBooking, StorageCharge, StorageSettings, StorageSize } from '@/lib/storage';
import StorageAdmin from './StorageAdmin';

export default async function AdminStorage() {
  const role = await requireArea('people');
  const supabase = await createClient();
  const [{ data: settings }, { data: sizes }, { data: bookings }, { data: charges }, { data: stock }] = await Promise.all([
    supabase.from('auction_storage_settings').select('*').eq('id', 1).single(),
    supabase.from('auction_storage_sizes').select('*').order('sort'),
    supabase.from('auction_storage_bookings').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('auction_storage_charges').select('*').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1000),
    supabase.from('auction_stock').select('id, ref, title, status, storage_booking_id').not('storage_booking_id', 'is', null),
  ]);
  const b = (bookings ?? []) as StorageBooking[];
  const ids = Array.from(new Set(b.map((x) => x.user_id)));
  const { data: people } = ids.length ? await supabase.from('auction_profiles').select('id, full_name, business_name, phone').in('id', ids) : { data: [] };
  const active = b.filter((x) => x.status === 'active');
  const c = (charges ?? []) as StorageCharge[];
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Storage</h1>
        <span className="small muted">Items stored at the yard for sellers, viewed by buyers on site. Billed monthly per m³; bills are created automatically at the start of each month.</span>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">In storage</span><b>{active.length}</b><span className="small muted">{active.reduce((s, x) => s + Number(x.volume_m3), 0).toLocaleString('en-US')} m³ used</span></div>
        <div className="kpi"><span className="eyebrow">Monthly storage income</span><b>USD {active.reduce((s, x) => s + Number(x.monthly_usd ?? 0), 0).toLocaleString('en-US')}</b></div>
        <div className="kpi"><span className="eyebrow">Unpaid bills</span><b>KES {kes(c.filter((x) => x.status === 'pending').reduce((s, x) => s + Number(x.total_kes), 0))}</b></div>
        <div className="kpi"><span className="eyebrow">New requests</span><b>{b.filter((x) => x.status === 'requested').length}</b></div>
      </div>
      <StorageAdmin settings={settings as StorageSettings} sizes={(sizes ?? []) as StorageSize[]} bookings={b} charges={c} people={people ?? []}
        stock={stock ?? []} canFinance={canArea(role, 'finance')} canOps={canArea(role, 'operations')} />
    </>
  );
}
