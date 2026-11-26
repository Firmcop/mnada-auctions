'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
      if (!window.confirm('Withdraw this item?')) return;
      await createClient().from('auction_consignments').update({ status: 'withdrawn' }).eq('id', id);
      router.refresh();
    }}>Withdraw</button>
  );
}
