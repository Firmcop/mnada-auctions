# Mnada — online industrial auctions

Next.js 16 + Supabase (project `chumi-trade-hub-staging`, tables prefixed `auction_`).

Environment variables (Vercel → Settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Bidding, auto-bid, late-bid extension and lot closing run in Postgres functions
(`auction_place_bid`, `auction_close_due_lots`, scheduled every minute with pg_cron).
