import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the proxy refreshes sessions instead.
          }
        },
      },
    },
  );
}

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  account_type: 'individual' | 'company';
  company_name: string | null;
  id_number: string | null;
  kra_pin: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  bid_limit: number | null;
  is_admin: boolean;
  bidder_no: number;
  doc_path: string | null;
  email: string | null;
  seller_status: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
  business_name: string | null;
  business_description: string | null;
  business_location: string | null;
  payout_method: 'mpesa' | 'bank' | null;
  payout_details: string | null;
  commission_pct: number;
  admin_role: 'owner' | 'operations' | 'finance' | 'lister' | null;
  seller_applied_at: string | null;
  created_at: string;
};

/** Current user and their auction profile (null when logged out / no profile). */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from('auction_profiles').select('*').eq('id', user.id).maybeSingle();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

/** Lot ids the current user is watching (empty when logged out). */
export async function getWatchedIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | null | undefined) {
  if (!userId) return new Set<string>();
  const { data } = await supabase.from('auction_watch').select('lot_id').eq('user_id', userId);
  return new Set((data ?? []).map((w) => w.lot_id as string));
}
