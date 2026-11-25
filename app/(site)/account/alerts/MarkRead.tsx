'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function MarkRead() {
  const router = useRouter();
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from('auction_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', data.user.id).is('read_at', null);
      router.refresh();
    }}>Mark all as read</button>
  );
}
