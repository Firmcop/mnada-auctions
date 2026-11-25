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
