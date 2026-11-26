import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** AI voiceover (English or Swahili) for a Studio video. Charged at the flat Studio voice price. */
export async function POST(request: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI voiceover isn’t switched on yet — videos use the music bed only.' }, { status: 501 });
  const { video_id, text } = await request.json().catch(() => ({}));
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!clean) return NextResponse.json({ error: 'Nothing to read' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Log in first' }, { status: 401 });
  const { data: v } = await supabase.from('auction_studio_videos').select('id, lang').eq('id', video_id).maybeSingle();
  if (!v) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const voice = (v.lang === 'sw' ? process.env.ELEVENLABS_VOICE_SW : process.env.ELEVENLABS_VOICE_EN) || process.env.ELEVENLABS_VOICE_ID;
  if (!voice) return NextResponse.json({ error: 'No voice chosen yet (ELEVENLABS_VOICE_ID)' }, { status: 501 });
  const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: clean, model_id: process.env.ELEVENLABS_MODEL || 'eleven_v3', language_code: v.lang === 'sw' ? 'sw' : 'en' }),
  });
  if (!tts.ok) return NextResponse.json({ error: 'The voice service is unavailable — try again shortly' }, { status: 502 });
  const audio = new Uint8Array(await tts.arrayBuffer());
  const { error: chargeErr } = await supabase.rpc('auction_studio_charge_voice', { p_video: video_id });
  if (chargeErr) return NextResponse.json({ error: chargeErr.message }, { status: 402 });
  const path = `${user.id}/${video_id}/voice-${Date.now()}.mp3`;
  const up = await supabase.storage.from('auction-studio').upload(path, audio, { contentType: 'audio/mpeg' });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  await supabase.from('auction_studio_videos').update({ voice_path: path }).eq('id', video_id);
  return NextResponse.json({ voice_path: path });
}
