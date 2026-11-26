import { createClient } from '@/lib/supabase/server';
import ImportTool from './ImportTool';

export default async function ImportPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('auction_auctions').select('id, title, first_close_at').neq('status', 'closed').order('created_at', { ascending: false });
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 28 }}>Bulk import</h1>
        <span className="muted">Add or update many products or auction lots at once from Excel, Google Sheets or CSV, with photos.</span>
      </div>
      <ImportTool auctions={data ?? []} />
    </>
  );
}
