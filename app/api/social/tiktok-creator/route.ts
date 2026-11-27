import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tiktokCreatorInfo, tiktokRefresh } from '@/lib/social/tiktok';

/** TikTok's required pre-post check: who is posting and which audiences/interactions are allowed. */
export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get('account');
  const supabase = await createClient();
  const { data: tok, error } = await supabase.rpc('auction_social_my_token', { p_account: account });
  if (error || !tok) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 403 });
  let access = tok.access_token as string;
  try {
    if (!tok.access_expires_at || new Date(tok.access_expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
      const r = await tiktokRefresh(tok.refresh_token);
      access = r.access_token;
      await supabase.rpc('auction_social_my_token_update', {
        p_account: account, p_access: r.access_token, p_refresh: r.refresh_token,
        p_access_exp: new Date(Date.now() + r.expires_in * 1000).toISOString(), p_refresh_exp: new Date(Date.now() + r.refresh_expires_in * 1000).toISOString(),
      });
    }
    return NextResponse.json(await tiktokCreatorInfo(access));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
