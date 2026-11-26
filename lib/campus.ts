import { SITE_URL } from '@/lib/seo';

export type CampusSettings = {
  programme_name: string; campuses: string[];
  scout_pct: number; scout_repeat_pct: number; scout_months: number;
  referral_pct: number; referral_months: number; first_bid_bonus_kes: number; attribution_days: number;
  level_bonus_pct: Record<Level, number>; crew_rates: { task: string; kes: number }[];
  creator_fee_kes: number; creator_bonus: { views: number; kes: number }[];
  min_payout_kes: number; wht_pct: number; lead_stipend_kes: number; monthly_prizes: string;
};
export type Level = 'recruit' | 'scout' | 'ambassador' | 'lead';
export type CampusRole = 'scout' | 'referrer' | 'crew' | 'creator' | 'inspector';
export type Member = {
  id: string; code: string; campus: string; course: string | null; year_of_study: number | null; student_id_no: string | null; student_id_path: string | null;
  mpesa_phone: string; roles: CampusRole[]; level: Level; status: 'pending' | 'active' | 'suspended' | 'rejected';
  approved_at: string | null; clicks: number; admin_note: string | null; created_at: string;
};
export type Lead = {
  id: string; member_id: string; business_name: string; contact_name: string; contact_phone: string; contact_email: string | null; location: string; items: string;
  category: string | null; est_value_kes: number | null; photos: string[]; status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'duplicate';
  seller_id: string | null; auctioneer_id: string | null; help_request_id: string | null; flag: string | null; admin_note: string | null; won_at: string | null; created_at: string;
};
export type Gig = {
  id: string; title: string; kind: 'photos' | 'video' | 'listing' | 'viewing' | 'inspection' | 'other'; details: string | null; location: string | null; campus: string | null;
  scheduled_for: string | null; pay_kes: number; help_request_id: string | null; lot_id: string | null;
  status: 'open' | 'claimed' | 'submitted' | 'approved' | 'rejected' | 'cancelled'; member_id: string | null; claimed_at: string | null;
  submission_note: string | null; submission_links: string[]; submitted_at: string | null; review_note: string | null; reviewed_at: string | null; created_at: string;
};
export type Video = {
  id: string; member_id: string; url: string; platform: string; about: string | null; views: number; status: 'submitted' | 'approved' | 'rejected';
  fee_kes: number; bonus_kes: number; review_note: string | null; created_at: string;
};
export type Earning = {
  id: string; member_id: string; kind: 'scout' | 'scout_repeat' | 'referral' | 'first_bid' | 'gig' | 'video' | 'prize' | 'stipend' | 'adjustment';
  amount_kes: number; base_kes: number | null; pct: number | null; status: 'pending' | 'approved' | 'paid' | 'cancelled';
  invoice_id: string | null; lead_id: string | null; gig_id: string | null; video_id: string | null; note: string | null; payout_id: string | null; created_at: string;
};
export type Challenge = { id: string; title: string; description: string | null; prize: string | null; starts_at: string; ends_at: string | null; active: boolean };
export type BoardRow = { rank: number; name: string; campus: string; level: Level; earned_kes: number; sales: number; bidders: number; is_me: boolean };

export const LEVEL_LABEL: Record<Level, string> = { recruit: 'Recruit', scout: 'Scout', ambassador: 'Ambassador', lead: 'Campus Lead' };
export const ROLE_INFO: Record<CampusRole, [string, string]> = {
  scout: ['Scout', 'Find businesses with machinery, vehicles, containers or steel to sell'],
  referrer: ['Bidder referrer', 'Share your link — earn when the people you bring buy'],
  crew: ['Crew', 'Paid field gigs: photos, video, listing and viewing days'],
  creator: ['Creator', 'TikTok and Reels about lots and auctions'],
  inspector: ['Inspector', 'Condition reports on machinery (engineering & technical students)'],
};
export const EARN_LABEL: Record<Earning['kind'], string> = {
  scout: 'Scout — first sale', scout_repeat: 'Scout — repeat sale', referral: 'Referred buyer', first_bid: 'New bidder bonus',
  gig: 'Gig', video: 'Video', prize: 'Prize', stipend: 'Campus Lead stipend', adjustment: 'Adjustment',
};
export const EARN_STATUS: Record<Earning['status'], [string, string]> = {
  pending: ['Pending — buyer paid, awaiting collection', 'pill-warn'],
  approved: ['Ready for payout', 'pill-green'],
  paid: ['Paid', 'pill-grey'],
  cancelled: ['Cancelled', 'pill-grey'],
};
export const LEAD_STATUS: Record<Lead['status'], [string, string]> = {
  new: ['New', 'pill-warn'], contacted: ['Contacted', 'pill-warn'], qualified: ['Qualified', 'pill-warn'],
  won: ['Signed up — earning', 'pill-green'], lost: ['Not going ahead', 'pill-grey'], duplicate: ['Already known', 'pill-grey'],
};
export const GIG_STATUS: Record<Gig['status'], [string, string]> = {
  open: ['Open', 'pill-green'], claimed: ['In progress', 'pill-warn'], submitted: ['Submitted — in review', 'pill-warn'],
  approved: ['Approved & paid to wallet', 'pill-green'], rejected: ['Not approved', 'pill-grey'], cancelled: ['Cancelled', 'pill-grey'],
};
export const GIG_KIND: Record<Gig['kind'], string> = { photos: 'Photos', video: 'Video', listing: 'Listing', viewing: 'Viewing day', inspection: 'Condition report', other: 'Other' };

export function siteUrl() {
  return SITE_URL.replace(/\/$/, '');
}

/** Badges earned, worked out from a student's activity. */
export function badgesFor(x: { leadsWon: number; sales: number; bidders: number; gigs: number; videos: number; rank: number | null; level: Level }) {
  const b: string[] = [];
  if (x.leadsWon > 0) b.push('First seller signed');
  if (x.sales > 0) b.push('First sale');
  if (x.sales >= 5) b.push('Deal maker (5 sales)');
  if (x.bidders >= 5) b.push('Crowd builder (5 bidders)');
  if (x.bidders >= 25) b.push('Crowd legend (25 bidders)');
  if (x.gigs >= 3) b.push('Crew regular');
  if (x.videos >= 3) b.push('Creator');
  if (x.rank !== null && x.rank <= 3) b.push(`Top ${x.rank} this month`);
  if (x.level === 'lead') b.push('Campus Lead');
  return b;
}
