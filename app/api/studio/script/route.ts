import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Script, StudioVideo } from '@/lib/studio';

/** AI rewrite of a video's on-screen words and caption, using only the lot data. Billed to the user's AI wallet. */
export async function POST(request: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI writing isn’t switched on yet — the built-in writer is used instead.' }, { status: 501 });
  const { video_id } = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in first' }, { status: 401 });
  const { data: v } = await supabase.from('auction_studio_videos').select('*').eq('id', video_id).maybeSingle();
  if (!v) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const video = v as StudioVideo;
  const { data: st } = await supabase.rpc('auction_ai_status');
  const status = st as { enabled: boolean; active: boolean; staff_internal: boolean; balance_kes: number } | null;
  if (!status?.enabled) return NextResponse.json({ error: 'AI tools aren’t switched on yet' }, { status: 402 });
  if (!status.staff_internal && (!status.active || status.balance_kes <= 0)) return NextResponse.json({ error: 'Activate AI tools and top up to use AI writing' }, { status: 402 });

  const model = process.env.STUDIO_AI_MODEL || 'claude-haiku-5-5';
  const facts = video.items.map((i) => ({ title: i.title, category: i.category, price_kes: i.price_kes, price_label: i.price_label, closes_at: i.closes_at, location: i.location, lot_no: i.lot_no }));
  const scenes = video.script.scenes.map((s, i) => ({ i, kind: s.kind, text: s.text, sub: s.sub ?? '' }));
  const lang = video.lang === 'sw' ? 'Kiswahili' : 'English';
  const system = `You write short on-screen text for 20-second vertical auction videos for Mnada, an online auction house in Kenya.
Rules: use ONLY the facts given. Never invent condition, specifications, warranties, hours, brands or claims. Keep every price, date and lot number exactly as given.
Each "text" is at most 8 words; each "sub" at most 6 words. Punchy, plain, no emojis on screen. Write in ${lang}.
For "price" and "when" scenes keep the given text unchanged; you may only reword "sub".
Reply with JSON only: {"scenes":[{"i":0,"text":"...","sub":"..."}],"caption":"post caption, 2-4 short lines, may use 1-2 emojis","hashtags":"5-8 hashtags"}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 900, system, messages: [{ role: 'user', content: JSON.stringify({ auction: video.title, template: video.template, facts, scenes }) }] }),
  });
  if (!res.ok) return NextResponse.json({ error: 'The AI writer is unavailable — try again shortly' }, { status: 502 });
  const out = await res.json() as { content: { type: string; text?: string }[]; usage: { input_tokens: number; output_tokens: number } };
  const { error: chargeErr } = await supabase.rpc('auction_ai_charge_self', { p_action: 'studio:script', p_model: model, p_input_tokens: out.usage.input_tokens, p_output_tokens: out.usage.output_tokens });
  if (chargeErr) return NextResponse.json({ error: chargeErr.message }, { status: 402 });
  let parsed: { scenes?: { i: number; text?: string; sub?: string }[]; caption?: string; hashtags?: string } = {};
  try {
    const txt = out.content.find((c) => c.type === 'text')?.text ?? '';
    parsed = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  } catch { return NextResponse.json({ error: 'The AI reply couldn’t be read — try again' }, { status: 502 }); }
  const next: Script = { ...video.script, scenes: video.script.scenes.map((s, i) => {
    const p = parsed.scenes?.find((x) => x.i === i);
    if (!p) return s;
    const keepText = s.kind === 'price' || s.kind === 'when';
    return { ...s, text: keepText ? s.text : (p.text?.trim() || s.text).slice(0, 90), sub: (p.sub?.trim() ?? s.sub ?? '').slice(0, 60) };
  }) };
  const caption = [parsed.caption?.trim(), parsed.hashtags?.trim()].filter(Boolean).join('\n\n');
  return NextResponse.json({ script: next, caption: caption || null });
}
