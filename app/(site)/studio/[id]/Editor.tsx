'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kes } from '@/lib/format';
import {
  TEMPLATE_INFO, buildCaption, buildScript, postingPlan, shortLink, totalDuration, voiceFrom,
  type Lang, type Scene, type Script, type StudioSettings, type StudioVideo, type Template,
} from '@/lib/studio';
import Scheduler, { type PostRow, type Social } from './Scheduler';
import { H, W, buildSoundtrack, canRender, drawFrame, loadAssets, renderMp4, voiceSeconds, type Assets, type Plan } from '@/lib/studio-render';

type Feature = { id: string; status: string; posted_links: string[]; admin_note: string | null; created_at: string; posted_at: string | null };
const KIND_LABEL: Record<Scene['kind'], string> = { intro: 'Opening', photo: 'Photo', item: 'Lot', price: 'Price', when: 'Closing time', cta: 'Call to action' };
const FEATURE_LABEL: Record<string, string> = { requested: 'Requested — Mnada will schedule it', scheduled: 'Scheduled on Mnada pages', posted: 'Posted on Mnada pages', refused: 'Not posted — refunded' };

export default function Editor({ video, settings, auctionTitle, fileUrl: initialFile, voiceUrl: initialVoice, features, balance, staff, campaignLeft, posts, social, autopostOn }: {
  video: StudioVideo; settings: StudioSettings; auctionTitle: string; fileUrl: string | null; voiceUrl: string | null;
  features: Feature[]; balance: number; staff: boolean; campaignLeft: number | null; posts: PostRow[]; social: Social; autopostOn: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(video.items);
  const [template, setTemplate] = useState<Template>(video.template);
  const [lang, setLang] = useState<Lang>(video.lang);
  const [script, setScript] = useState<Script>(() => (video.script?.scenes?.length ? video.script : buildScript(video.items, video.template, video.lang, auctionTitle)));
  const [caption, setCaption] = useState(video.caption ?? buildCaption(video.items, video.template, video.lang, auctionTitle, video.link_code));
  const [voiceText, setVoiceText] = useState(script.voice ?? voiceFrom(script.scenes, lang));
  const [voiceUrl, setVoiceUrl] = useState(initialVoice);
  const [voiceLen, setVoiceLen] = useState(0);
  const [fileUrl, setFileUrl] = useState(initialFile);
  const [status, setStatus] = useState(video.status);
  const [renders, setRenders] = useState(video.renders);
  const [dirty, setDirty] = useState(!video.script?.scenes?.length);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [rendered, setRendered] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const voiceBuf = useRef<ArrayBuffer | null>(null);

  // stretch the last scene so a voiceover always fits
  const eff: Script = useMemo(() => {
    const total = totalDuration(script);
    const need = voiceLen ? voiceLen + 1.1 : 0;
    if (!need || need <= total) return script;
    const scenes = script.scenes.map((s, i) => (i === script.scenes.length - 1 ? { ...s, dur: s.dur + (need - total) } : s));
    return { ...script, scenes };
  }, [script, voiceLen]);
  const plan: Plan = useMemo(() => ({ script: eff, items, template, lang, code: video.link_code, watermark: status === 'draft' }), [eff, items, template, lang, video.link_code, status]);
  const duration = totalDuration(eff);
  const rendersLeft = settings.free_rerenders + 1 - renders;

  useEffect(() => { let on = true; loadAssets(items).then((a) => { if (on) setAssets(a); }); return () => { on = false; }; }, [items]);
  useEffect(() => { canRender().then(setSupported); }, []);
  useEffect(() => {
    if (!voiceUrl) { voiceBuf.current = null; setVoiceLen(0); return; }
    fetch(voiceUrl).then((r) => r.arrayBuffer()).then(async (b) => { voiceBuf.current = b; setVoiceLen(await voiceSeconds(b)); }).catch(() => setVoiceLen(0));
  }, [voiceUrl]);
  useEffect(() => {
    if (!assets || playing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawFrame(ctx, plan, assets, Math.min(1.2, duration));
  }, [assets, plan, playing, duration]);
  useEffect(() => () => stopRef.current?.(), []);

  const edit = (fn: (s: Script) => Script) => { setScript((s) => fn(s)); setDirty(true); };
  const setScene = (i: number, patch: Partial<Scene>) => edit((s) => ({ ...s, scenes: s.scenes.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  function rebuild(t: Template, l: Lang, its = items) {
    if (dirty && video.script?.scenes?.length && !confirm('Start the words again from the lot data? Your edits will be replaced.')) return false;
    const next = buildScript(its, t, l, auctionTitle);
    setScript(next); setVoiceText(next.voice ?? ''); setCaption(buildCaption(its, t, l, auctionTitle, video.link_code)); setDirty(true);
    return true;
  }

  const save = useCallback(async (quiet = false) => {
    const { error } = await supabase.from('auction_studio_videos').update({ script: { ...script, voice: voiceText }, caption, template, lang }).eq('id', video.id);
    if (error) { setMsg({ ok: false, text: error.message }); return false; }
    setDirty(false);
    if (!quiet) setMsg({ ok: true, text: 'Saved.' });
    return true;
  }, [supabase, script, voiceText, caption, template, lang, video.id]);

  async function play() {
    if (!assets) return;
    if (playing) { stopRef.current?.(); return; }
    const sound = await buildSoundtrack(duration, { music: script.music !== false, voice: voiceBuf.current });
    const ac = new AudioContext();
    const src = ac.createBufferSource(); src.buffer = sound; src.connect(ac.destination);
    const start = ac.currentTime + 0.05;
    src.start(start);
    let raf = 0;
    const ctx = canvasRef.current!.getContext('2d')!;
    const tick = () => {
      const t = ac.currentTime - start;
      if (t >= duration) { stop(); return; }
      drawFrame(ctx, plan, assets, Math.max(0, t));
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(raf); try { src.stop(); } catch { /* stopped */ } ac.close(); setPlaying(false); stopRef.current = null; };
    stopRef.current = stop;
    setPlaying(true);
    raf = requestAnimationFrame(tick);
  }

  async function aiRewrite() {
    if (dirty) await save(true);
    setBusy(true); setMsg(null);
    const res = await fetch('/api/studio/script', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ video_id: video.id }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: out.error ?? 'AI writing failed' }); return; }
    setScript(out.script); if (out.caption) setCaption(out.caption); setDirty(true);
    setMsg({ ok: true, text: 'Rewritten by AI — check the words, then save.' });
  }

  async function makeVoice() {
    setBusy(true); setMsg(null);
    await save(true);
    const res = await fetch('/api/studio/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ video_id: video.id, text: voiceText }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: out.error ?? 'Voiceover failed' }); return; }
    setVoiceUrl(supabase.storage.from('auction-studio').getPublicUrl(out.voice_path).data.publicUrl);
    setMsg({ ok: true, text: 'Voiceover added. Press play to hear it.' });
  }
  async function removeVoice() {
    await supabase.from('auction_studio_videos').update({ voice_path: null }).eq('id', video.id);
    setVoiceUrl(null);
  }

  async function refreshPrices() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('auction_studio_refresh', { p_video: video.id });
    if (error) { setBusy(false); setMsg({ ok: false, text: error.message }); return; }
    const { data } = await supabase.from('auction_studio_videos').select('items').eq('id', video.id).single();
    setBusy(false);
    if (data) { setItems(data.items); rebuild(template, lang, data.items); setMsg({ ok: true, text: 'Prices, photos and dates updated from the live listing.' }); }
  }

  async function makeVideo() {
    if (!assets) return;
    if (!supported) { setMsg({ ok: false, text: 'This browser can’t make videos. Use Chrome or Edge on a computer, or Chrome on Android.' }); return; }
    if (status === 'draft') {
      const price = staff ? 'free for staff' : campaignLeft ? 'included in your campaign pack' : `KES ${kes(settings.price_video_kes)} from your wallet`;
      if (!confirm(`Make the final video (${price})? You can re-render it ${settings.free_rerenders} more times after edits.`)) return;
    } else if (rendersLeft <= 0 && !staff) { setMsg({ ok: false, text: 'Free re-renders used up for this video — make a new one from Studio.' }); return; }
    setBusy(true); setMsg(null);
    if (!(await save(true))) { setBusy(false); return; }
    if (status === 'draft') {
      const { error } = await supabase.rpc('auction_studio_pay', { p_video: video.id });
      if (error) { setBusy(false); setMsg({ ok: false, text: error.message }); return; }
      setStatus('paid');
    }
    stopRef.current?.();
    try {
      setProgress(0);
      const sound = await buildSoundtrack(duration, { music: script.music !== false, voice: voiceBuf.current });
      const blob = await renderMp4({ ...plan, watermark: false }, assets, sound, setProgress);
      setRendered(blob);
      const path = `${video.owner_id}/${video.id}/video-${Date.now()}.mp4`;
      const up = await supabase.storage.from('auction-studio').upload(path, blob, { contentType: 'video/mp4' });
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabase.rpc('auction_studio_render_done', { p_video: video.id, p_path: path, p_duration: Math.round(duration * 10) / 10 });
      if (error) throw new Error(error.message);
      setFileUrl(supabase.storage.from('auction-studio').getPublicUrl(path).data.publicUrl);
      setStatus('ready'); setRenders((r) => r + 1);
      setMsg({ ok: true, text: 'Your video is ready — download it or share it below.' });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `Couldn’t make the video: ${(e as Error).message}. It’s still unlocked — try again.` });
    } finally { setProgress(null); setBusy(false); }
  }

  async function share() {
    try {
      const blob = rendered ?? (fileUrl ? await (await fetch(fileUrl)).blob() : null);
      if (!blob) return;
      const file = new File([blob], `mnada-${video.link_code}.mp4`, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: caption }); return; }
      setMsg({ ok: false, text: 'Sharing files works on phones. On a computer, download the video and upload it to TikTok, Instagram or Facebook.' });
    } catch { /* cancelled */ }
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: `${what} copied.` }); } catch { /* unavailable */ }
  }
  async function requestFeature(note: string) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('auction_studio_request_feature', { p_video: video.id, p_note: note });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Requested — Mnada’s team will post it on our pages and add the links here.' });
    if (!error) router.refresh();
  }

  const planList = postingPlan(items, lang);
  const openFeature = features.find((f) => f.status === 'requested' || f.status === 'scheduled');

  return (
    <>
      {msg && <div role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
      <div className="row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 10, flex: '0 0 auto', width: 320, maxWidth: '100%' }}>
          <canvas ref={canvasRef} width={W} height={H} style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 16, background: 'var(--navy)', display: 'block' }} aria-label="Video preview" />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={play} disabled={!assets || progress !== null}>{playing ? '■ Stop' : '▶ Play preview'}</button>
            <span className="small muted">{Math.round(duration)} s · 1080×1920</span>
          </div>
          {!assets && <span className="small muted">Loading photos…</span>}
          {assets && assets.every((a) => a.length === 0) && <span className="small" style={{ color: 'var(--warn)' }}>No photos could be loaded — the video will use plain backgrounds.</span>}
          {status === 'draft' && <span className="small muted">The preview is watermarked. The final video isn’t.</span>}
          {progress !== null && (
            <div className="stack" style={{ gap: 4 }}>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 4 }}><div style={{ width: `${Math.round(progress * 100)}%`, height: 8, background: 'var(--accent)', borderRadius: 4 }} /></div>
              <span className="small muted">Making your video… {Math.round(progress * 100)}% — keep this tab open</span>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={makeVideo} disabled={busy || !assets || supported === false}>
            {status === 'draft' ? (staff ? 'Make video (free for staff)' : campaignLeft ? `Make video (campaign pack, ${campaignLeft} left)` : `Make video — KES ${kes(settings.price_video_kes)}`) : `Re-render video${staff ? '' : ` (${Math.max(0, rendersLeft)} left)`}`}
          </button>
          {supported === false && <span className="small" style={{ color: 'var(--warn)' }}>This browser can’t make videos. Use Chrome or Edge on a computer, or Chrome on Android.</span>}
          {status === 'draft' && !staff && !campaignLeft && <span className="small muted">Wallet: KES {kes(balance)}{balance < settings.price_video_kes ? <> — <a href="/account/ai">top up</a></> : ''}</span>}
        </div>

        <div className="stack" style={{ gap: 18, flex: '1 1 420px' }}>
          {fileUrl && (
            <section className="panel stack" style={{ gap: 10, background: 'var(--green-bg)' }}>
              <h3>Ready to post</h3>
              <div className="row" style={{ gap: 8 }}>
                <a className="btn btn-primary" href={fileUrl} download={`mnada-${video.link_code}.mp4`}>Download MP4</a>
                <button type="button" className="btn btn-outline" onClick={share}>Share from phone…</button>
                <button type="button" className="btn btn-outline" onClick={() => copy(caption, 'Caption')}>Copy caption</button>
              </div>
              <span className="small">On your phone, “Share” opens TikTok, Instagram, Facebook or WhatsApp Status with the video attached. Paste the caption. Tracked link <b>{shortLink(video.link_code)}</b> — {video.clicks} clicks so far.</span>
            </section>
          )}

          <section className="panel stack" style={{ gap: 10 }}>
            <div className="row between"><h3>Style &amp; language</h3>{dirty && <button type="button" className="btn btn-primary btn-sm" onClick={() => save()}>Save changes</button>}</div>
            <div className="row" style={{ gap: 8 }}>
              <select className="input" style={{ width: 230 }} value={template} aria-label="Style" onChange={(e) => { const t = e.target.value as Template; if (rebuild(t, lang)) setTemplate(t); }}>
                {(Object.keys(TEMPLATE_INFO) as Template[]).filter((t) => items.length > 1 || t !== 'highlights').map((t) => <option key={t} value={t}>{TEMPLATE_INFO[t][0]}</option>)}
              </select>
              <select className="input" style={{ width: 150 }} value={lang} aria-label="Language" onChange={(e) => { const l = e.target.value as Lang; if (rebuild(template, l)) setLang(l); }}>
                <option value="en">English</option><option value="sw">Kiswahili</option>
              </select>
              <label className="check small"><input type="checkbox" checked={script.music !== false} onChange={(e) => edit((s) => ({ ...s, music: e.target.checked }))} />Music bed</label>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => rebuild(template, lang)}>Rewrite from lot data (free)</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={aiRewrite}>✨ AI rewrite (AI wallet)</button>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={refreshPrices}>Update prices &amp; dates</button>
            </div>
            <span className="small muted">Prices, dates and lot numbers come from your listing. Only say what’s true about the item — buyers rely on it.</span>
          </section>

          <section className="panel stack" style={{ gap: 10 }}>
            <h3>On-screen words</h3>
            {script.scenes.map((s, i) => (
              <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-end', borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                <span className="small" style={{ width: 96, fontWeight: 700 }}>{i + 1}. {KIND_LABEL[s.kind]}</span>
                <label className="field" style={{ flex: '2 1 200px' }}><span className="small muted">Main text</span>
                  <input className="input" value={s.text} maxLength={90} readOnly={s.kind === 'price' || s.kind === 'when'} onChange={(e) => setScene(i, { text: e.target.value })} /></label>
                {s.kind !== 'photo' && <label className="field" style={{ flex: '1 1 140px' }}><span className="small muted">Small text</span>
                  <input className="input" value={s.sub ?? ''} maxLength={60} onChange={(e) => setScene(i, { sub: e.target.value })} /></label>}
                <label className="field" style={{ width: 90 }}><span className="small muted">Seconds</span>
                  <input className="input" type="number" min={1.5} max={6} step={0.1} value={s.dur} onChange={(e) => setScene(i, { dur: Math.min(6, Math.max(1.5, Number(e.target.value) || s.dur)) })} /></label>
              </div>
            ))}
          </section>

          <section className="panel stack" style={{ gap: 8 }}>
            <h3>Voiceover <span className="small muted">(optional, KES {kes(settings.price_voice_kes)})</span></h3>
            <textarea className="input" rows={3} maxLength={600} value={voiceText} onChange={(e) => { setVoiceText(e.target.value); setDirty(true); }} />
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={busy || !voiceText.trim()} onClick={makeVoice}>{voiceUrl ? 'Make a new voiceover' : 'Make voiceover'}</button>
              {voiceUrl && <><audio controls src={voiceUrl} style={{ height: 34 }} /><button type="button" className="btn btn-outline btn-sm" onClick={removeVoice}>Remove</button></>}
            </div>
            <span className="small muted">AI voice in {lang === 'sw' ? 'Kiswahili' : 'English'}, mixed over the music. The video stretches to fit it.</span>
          </section>

          <section className="panel stack" style={{ gap: 8 }}>
            <div className="row between"><h3>Post caption</h3><button type="button" className="btn btn-outline btn-sm" onClick={() => copy(caption, 'Caption')}>Copy</button></div>
            <textarea className="input" rows={6} value={caption} onChange={(e) => { setCaption(e.target.value); setDirty(true); }} />
          </section>

          <Scheduler videoId={video.id} ready={status === 'ready'} caption={caption} plan={planList} social={social} autopostOn={autopostOn} posts={posts} />

          <section className="panel stack" style={{ gap: 8 }}>
            <h3>Feature on Mnada’s pages <span className="small muted">(KES {kes(settings.price_feature_kes)})</span></h3>
            <p className="small" style={{ color: 'var(--body)' }}>Mnada posts your video on our own TikTok, Instagram and Facebook{settings.mnada_handles ? ` (${settings.mnada_handles})` : ''} to reach our bidders. Refunded if we can’t post it.</p>
            {features.map((f) => (
              <div key={f.id} className="small"><span className={`pill ${f.status === 'posted' ? 'pill-green' : f.status === 'refused' ? 'pill-grey' : 'pill-warn'}`}>{FEATURE_LABEL[f.status] ?? f.status}</span>
                {f.posted_links.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>{new URL(l).hostname.replace('www.', '')}</a>)}
                {f.admin_note && <span className="muted"> · {f.admin_note}</span>}</div>
            ))}
            {!openFeature && (
              <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); requestFeature(String(f.get('note') ?? '')); }}>
                <input className="input" name="note" placeholder="Anything we should know? (optional)" style={{ flex: '1 1 220px' }} />
                <button type="submit" className="btn btn-outline btn-sm" disabled={busy || status !== 'ready'} title={status !== 'ready' ? 'Make the video first' : ''}>Request feature</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
