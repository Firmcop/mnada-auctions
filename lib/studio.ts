import { SITE_URL } from '@/lib/seo';

export type Lang = 'en' | 'sw';
export type Template = 'spotlight' | 'highlights' | 'closing';
export type PriceLabel = 'start' | 'current' | 'price' | 'offers' | 'request';

export type StudioItem = {
  lot_id?: string; listing_id?: string; lot_no?: number; title: string; category: string | null;
  price_kes: number | null; price_label: PriceLabel; photos: string[]; closes_at?: string | null; location: string | null; status?: string;
};
export type SceneKind = 'intro' | 'photo' | 'item' | 'price' | 'when' | 'cta';
export type Scene = { kind: SceneKind; dur: number; text: string; sub?: string; item?: number; photo?: number };
export type Script = { scenes: Scene[]; voice?: string; music?: boolean };

export type StudioVideo = {
  id: string; owner_id: string; source_kind: 'lot' | 'auction' | 'listing'; source_id: string; auction_id: string | null; title: string;
  template: Template; lang: Lang; items: StudioItem[]; script: Script; caption: string | null; target_path: string; link_code: string; clicks: number;
  status: 'draft' | 'paid' | 'ready'; campaign_id: string | null; paid_kes: number; renders: number; file_path: string | null; voice_path: string | null;
  duration_s: number | null; created_at: string; updated_at: string;
};
export type StudioSettings = {
  enabled: boolean; price_video_kes: number; price_campaign_kes: number; campaign_videos: number; price_feature_kes: number;
  price_voice_kes: number; free_rerenders: number; mnada_handles: string; price_autopost_month_kes: number; autopost_open: boolean;
};

export const TEMPLATE_INFO: Record<Template, [string, string]> = {
  spotlight: ['Lot spotlight', 'One item: photos, key facts, price and closing time'],
  highlights: ['Auction highlights', 'Top lots from one auction, one after another'],
  closing: ['Closing soon', 'Fast cuts with an urgent “ends soon” banner'],
};

const T = {
  en: {
    auction: 'Online auction', sale: 'For sale', start: 'Starting bid', current: 'Current bid', price: 'Price', offers: 'Open to offers', request: 'Price on request',
    closes: 'Closes', viewing: 'Viewing in', bidNow: 'Bid now on Mnada', buyNow: 'See it on Mnada', top: (n: number) => `Top ${n} lots`,
    ends: 'Ends soon', endsTonight: 'Ends tonight', lot: 'Lot', search: 'Search lot', link: 'Link in bio or visit',
  },
  sw: {
    auction: 'Mnada mtandaoni', sale: 'Inauzwa', start: 'Bei ya kuanzia', current: 'Zabuni ya sasa', price: 'Bei', offers: 'Karibu kwa ofa', request: 'Bei kwa ombi',
    closes: 'Unafungwa', viewing: 'Ukaguzi', bidNow: 'Weka zabuni yako sasa', buyNow: 'Tazama kwenye Mnada', top: (n: number) => `Bidhaa ${n} bora`,
    ends: 'Unaisha hivi karibuni', endsTonight: 'Unaisha leo usiku', lot: 'Kipengee', search: 'Tafuta kipengee', link: 'Kiungo kwenye bio au tembelea',
  },
};
export const words = (l: Lang) => T[l];

const SW_DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
const SW_MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'];

/** Date in Nairobi time, e.g. "Thu 3 Dec, 2:00 pm" or "Alhamisi 3 Desemba, 14:00". */
export function whenText(iso: string, lang: Lang) {
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  const day = d.getUTCDay(), date = d.getUTCDate(), mon = d.getUTCMonth(), h = d.getUTCHours(), m = d.getUTCMinutes();
  const mm = String(m).padStart(2, '0');
  if (lang === 'sw') return `${SW_DAYS[day]} ${date} ${SW_MONTHS[mon]}, ${String(h).padStart(2, '0')}:${mm}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[day]} ${date} ${months[mon]}, ${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

export function priceText(it: StudioItem, lang: Lang) {
  const w = words(lang);
  const label = w[it.price_label];
  if (it.price_kes == null || it.price_label === 'offers' || it.price_label === 'request') return { label, amount: it.price_kes != null ? `KES ${Math.round(it.price_kes).toLocaleString('en-US')}` : '' };
  return { label, amount: `KES ${Math.round(it.price_kes).toLocaleString('en-US')}` };
}

export function shortLink(code: string) {
  return `${SITE_URL.replace(/^https?:\/\//, '')}/l/${code}`;
}

/** "Ends tonight" only when the sale closes later today (Nairobi time); otherwise "Ends soon". */
export function endsWord(close: string | null, lang: Lang) {
  const w = words(lang);
  if (!close) return w.ends;
  const day = (ms: number) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
  const c = new Date(close).getTime();
  return c > Date.now() && day(c) === day(Date.now()) ? w.endsTonight : w.ends;
}

function earliestClose(items: StudioItem[]) {
  return items.map((i) => i.closes_at).filter(Boolean).sort()[0] ?? null;
}

/** First draft of the on-screen words, built only from the lot data. */
export function buildScript(items: StudioItem[], template: Template, lang: Lang, auctionTitle: string): Script {
  const w = words(lang);
  const isAuction = items.some((i) => i.lot_id);
  const close = earliestClose(items);
  const loc = items.find((i) => i.location)?.location ?? null;
  const scenes: Scene[] = [];
  if (template === 'spotlight' || items.length === 1) {
    const it = items[0];
    const p = priceText(it, lang);
    scenes.push({ kind: 'intro', dur: 2.4, text: it.title, sub: `${isAuction ? w.auction : w.sale}${it.category ? ` · ${it.category}` : ''}`, item: 0, photo: 0 });
    const photos = Math.max(1, Math.min(it.photos.length, 4));
    for (let k = 1; k < photos; k++) scenes.push({ kind: 'photo', dur: 2.4, text: k === 1 && loc ? `${w.viewing} ${loc}` : '', item: 0, photo: k });
    scenes.push({ kind: 'price', dur: 2.6, text: p.amount || p.label, sub: p.amount ? p.label : '', item: 0, photo: Math.min(photos - 1, 1) });
    if (close) scenes.push({ kind: 'when', dur: 2.2, text: whenText(close, lang), sub: template === 'closing' ? endsWord(close, lang) : w.closes, item: 0, photo: 0 });
    scenes.push({ kind: 'cta', dur: 3.2, text: isAuction ? w.bidNow : w.buyNow, sub: it.lot_no ? `${w.lot} ${it.lot_no}` : '' });
  } else {
    const shown = items.slice(0, template === 'closing' ? 6 : 5);
    scenes.push({ kind: 'intro', dur: template === 'closing' ? 2 : 2.6, text: template === 'closing' ? endsWord(close, lang) : w.top(shown.length), sub: auctionTitle, item: 0, photo: 0 });
    shown.forEach((it, i) => {
      const p = priceText(it, lang);
      scenes.push({ kind: 'item', dur: template === 'closing' ? 2.2 : 3, text: it.title, sub: [p.label, p.amount].filter(Boolean).join(' · '), item: i, photo: 0 });
    });
    if (close) scenes.push({ kind: 'when', dur: 2.2, text: whenText(close, lang), sub: w.closes, item: 0, photo: 0 });
    scenes.push({ kind: 'cta', dur: 3.2, text: w.bidNow, sub: auctionTitle });
  }
  return { scenes, voice: voiceFrom(scenes, lang), music: true };
}

export function voiceFrom(scenes: Scene[], lang: Lang) {
  return scenes.map((s) => {
    if (s.kind === 'price') return `${s.sub ?? ''} ${s.text}`.trim();
    if (s.kind === 'when') return `${s.sub ?? ''} ${s.text}`.trim();
    if (s.kind === 'item') return `${s.text}. ${s.sub ?? ''}`;
    return s.text;
  }).filter(Boolean).join('. ').replace(/\.\s*\./g, '.').slice(0, 600) + (lang === 'sw' ? '' : '');
}

export function totalDuration(script: Script) {
  return script.scenes.reduce((a, s) => a + s.dur, 0);
}

function tag(s: string) {
  return '#' + s.replace(/&/g, 'and').replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase());
}

/** Post caption and hashtags, from the lot data only. */
export function buildCaption(items: StudioItem[], template: Template, lang: Lang, auctionTitle: string, code: string) {
  const w = words(lang);
  const link = `https://${shortLink(code)}`;
  const close = earliestClose(items);
  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])).slice(0, 3);
  const tags = ['#Mnada', lang === 'sw' ? '#MnadaKenya' : '#AuctionKenya', '#Kenya', ...cats.map(tag), '#Nairobi'].join(' ');
  if (items.length === 1) {
    const it = items[0];
    const p = priceText(it, lang);
    const lines = [
      `${it.title}${it.location ? ` — ${it.location}` : ''}`,
      [p.label, p.amount].filter(Boolean).join(': '),
      close ? `${w.closes}: ${whenText(close, lang)}` : '',
      `${it.lot_id ? w.bidNow : w.buyNow} 👉 ${link}`,
    ];
    return `${lines.filter(Boolean).join('\n')}\n\n${tags}`;
  }
  const list = items.slice(0, 5).map((it) => `• ${it.title}${it.price_kes ? ` — KES ${Math.round(it.price_kes).toLocaleString('en-US')}` : ''}`).join('\n');
  return `${template === 'closing' ? endsWord(close, lang) : auctionTitle}\n${list}\n${close ? `${w.closes}: ${whenText(close, lang)}\n` : ''}${w.bidNow} 👉 ${link}\n\n${tags}`;
}

/** Suggested posting times, worked back from the closing time. */
export function postingPlan(items: StudioItem[], lang: Lang) {
  const close = earliestClose(items);
  const now = Date.now();
  const sw = lang === 'sw';
  if (!close) return [{ at: new Date(now).toISOString(), what: sw ? 'Chapisha sasa' : 'Post now', template: 'spotlight' as Template }];
  const c = new Date(close).getTime();
  const at = (ms: number) => new Date(ms).toISOString();
  const eat9 = (ms: number) => { const d = new Date(ms + 3 * 3600e3); d.setUTCHours(6, 0, 0, 0); return d.getTime(); };
  const plan: { at: string; what: string; template: Template }[] = [
    { at: at(now), what: sw ? 'Tangaza mnada' : 'Launch: announce the sale', template: 'highlights' },
    { at: at(c - 3 * 86400e3), what: sw ? 'Siku 3 zimebaki' : '3 days to go — top lots', template: 'highlights' },
    { at: at(c - 86400e3), what: sw ? 'Kesho unafungwa' : 'Closes tomorrow', template: 'spotlight' },
    { at: at(eat9(c)), what: sw ? 'Unafungwa leo' : 'Closing day, morning', template: 'closing' },
    { at: at(c - 2 * 3600e3), what: sw ? 'Saa 2 zimebaki' : '2 hours left', template: 'closing' },
  ];
  return plan.filter((p, i) => i === 0 || (new Date(p.at).getTime() > now + 3600e3 && new Date(p.at).getTime() < c));
}
