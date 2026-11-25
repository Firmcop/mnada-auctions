'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Lots close automatically every minute; this runs the same job on demand. */
export default function CloseNowButton() {
  const router = useRouter();
  const [text, setText] = useState<string | null>(null);
  return (
    <span className="row small" style={{ gap: 8 }}>
      {text && <span className="muted">{text}</span>}
      <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
        const { data, error } = await createClient().rpc('auction_close_due_lots');
        setText(error ? error.message : `${data} lot(s) closed`);
        router.refresh();
      }}>Process ended lots now</button>
    </span>
  );
}
