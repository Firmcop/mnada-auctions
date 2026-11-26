'use client';
import { photoUrl } from '@/lib/format';
import { shortLink, words, type Lang, type Scene, type Script, type StudioItem, type Template } from '@/lib/studio';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
const NAVY = '#0F2A3D';
const NAVY_DEEP = '#0A1E2C';
const ACCENT = '#C2410C';
const HEAD = 'Archivo, Inter, system-ui, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';

export type Assets = HTMLImageElement[][];
export type Plan = { script: Script; items: StudioItem[]; template: Template; lang: Lang; code: string; watermark: boolean };

/** Loads lot photos through Mnada's own image proxy so the canvas can be exported. */
export async function loadAssets(items: StudioItem[]): Promise<Assets> {
  const one = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/api/studio/img?u=${encodeURIComponent(photoUrl(src))}`;
  });
  const out = await Promise.all(items.map(async (it) => (await Promise.all((it.photos ?? []).slice(0, 4).map(one))).filter(Boolean) as HTMLImageElement[]));
  try { await Promise.all([document.fonts.load(`800 80px Archivo`), document.fonts.load(`600 40px Inter`), document.fonts.load(`700 40px Inter`)]); } catch { /* fonts optional */ }
  return out;
}

export function sceneAt(scenes: Scene[], t: number) {
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (t < acc + scenes[i].dur || i === scenes.length - 1) return { i, local: Math.max(0, t - acc), start: acc };
    acc += scenes[i].dur;
  }
  return { i: 0, local: 0, start: 0 };
}

function ease(x: number) { const c = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - c, 3); }

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const wordsArr = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const wd of wordsArr) {
    const test = line ? `${line} ${wd}` : wd;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && wordsArr.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, min: number, maxW: number, maxLines: number, family = HEAD) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxW, 99);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return { size: min, lines: wrap(ctx, text, maxW, maxLines) };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number, panX: number, panY: number) {
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * scale;
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2 + panX * (w - W) / 2, (H - h) / 2 + panY * (h - H) / 2, w, h);
}

function brandBg(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, NAVY);
  g.addColorStop(1, NAVY_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W * 0.8, H * 0.25 + Math.sin(t) * 40, 40, W * 0.8, H * 0.25, 900);
  r.addColorStop(0, 'rgba(194,65,12,0.55)');
  r.addColorStop(1, 'rgba(194,65,12,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
}

function wordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = ACCENT;
  roundRect(ctx, x, y - size * 0.85, size, size, size * 0.22);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = 'round';
  const cx = x + size / 2, cy = y - size * 0.35;
  ctx.beginPath(); ctx.moveTo(cx - size * 0.22, cy + size * 0.2); ctx.lineTo(cx + size * 0.12, cy - size * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + size * 0.02, cy - size * 0.26); ctx.lineTo(cx + size * 0.26, cy - size * 0.02); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${size * 0.95}px ${HEAD}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('mnada', x + size * 1.25, y);
}

function drawScene(ctx: CanvasRenderingContext2D, plan: Plan, assets: Assets, idx: number, local: number) {
  const sc = plan.script.scenes[idx];
  const w = words(plan.lang);
  const img = sc.item != null ? assets[sc.item]?.[(sc.photo ?? 0) % Math.max(1, assets[sc.item]?.length ?? 1)] : undefined;
  const p = local / sc.dur;
  const a = ease(local / 0.45);
  const lift = (1 - a) * 50;
  ctx.save();
  if (sc.kind !== 'cta' && img) {
    const dir = idx % 2 === 0 ? 1 : -1;
    drawCover(ctx, img, 1.06 + 0.1 * p, dir * (p - 0.5) * 0.6, 0);
    const g = ctx.createLinearGradient(0, H * 0.38, 0, H);
    g.addColorStop(0, 'rgba(10,30,44,0)');
    g.addColorStop(0.55, 'rgba(10,30,44,0.78)');
    g.addColorStop(1, 'rgba(10,30,44,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const top = ctx.createLinearGradient(0, 0, 0, 360);
    top.addColorStop(0, 'rgba(10,30,44,0.7)');
    top.addColorStop(1, 'rgba(10,30,44,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 360);
  } else {
    brandBg(ctx, local);
  }
  ctx.globalAlpha = a;
  ctx.textBaseline = 'top';
  const X = 72, MAXW = W - 144;

  if (sc.kind === 'cta') {
    ctx.textAlign = 'center';
    const f = fitFont(ctx, sc.text, 800, 120, 72, MAXW, 3);
    let y = 640 + lift;
    ctx.fillStyle = '#fff';
    f.lines.forEach((l) => { ctx.fillText(l, W / 2, y); y += f.size * 1.08; });
    if (sc.sub) { ctx.font = `600 46px ${BODY}`; ctx.fillStyle = '#C9D5DF'; wrap(ctx, sc.sub, MAXW, 2).forEach((l) => { y += 10; ctx.fillText(l, W / 2, y); y += 56; }); }
    const link = shortLink(plan.code);
    ctx.font = `700 50px ${BODY}`;
    const lw = Math.min(MAXW, ctx.measureText(link).width + 96);
    y += 70;
    ctx.fillStyle = ACCENT;
    roundRect(ctx, (W - lw) / 2, y, lw, 108, 54);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(link, W / 2, y + 28, MAXW - 60);
    ctx.font = `500 38px ${BODY}`;
    ctx.fillStyle = '#C9D5DF';
    ctx.fillText(w.link, W / 2, y + 150);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    wordmark(ctx, W / 2 - 190, 1640, 96);
  } else {
    const bottom = H - 230;
    if (sc.kind === 'intro' || sc.kind === 'item') {
      const f = fitFont(ctx, sc.text, 800, sc.kind === 'intro' ? 96 : 84, 56, MAXW, 4);
      const subH = sc.sub ? 74 : 0;
      let y = bottom - f.lines.length * f.size * 1.08 - subH + lift;
      if (sc.sub && sc.kind === 'intro') { ctx.font = `700 42px ${BODY}`; ctx.fillStyle = '#F5A27A'; ctx.fillText(wrap(ctx, sc.sub, MAXW, 1)[0] ?? '', X, y - 70); }
      ctx.font = `800 ${f.size}px ${HEAD}`;
      ctx.fillStyle = '#fff';
      f.lines.forEach((l) => { ctx.fillText(l, X, y); y += f.size * 1.08; });
      if (sc.sub && sc.kind === 'item') {
        ctx.font = `700 50px ${BODY}`;
        const tw = Math.min(MAXW, ctx.measureText(sc.sub).width + 60);
        ctx.fillStyle = ACCENT;
        roundRect(ctx, X, y + 16, tw, 84, 18);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(sc.sub, X + 30, y + 31, MAXW - 60);
      }
      if (sc.kind === 'item') {
        const n = plan.script.scenes.filter((s) => s.kind === 'item').length;
        const k = plan.script.scenes.slice(0, idx + 1).filter((s) => s.kind === 'item').length;
        ctx.font = `700 40px ${BODY}`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`${k}/${n}`, X, bottom - f.lines.length * f.size * 1.08 - subH - 70 + lift);
      }
    } else if (sc.kind === 'photo') {
      if (sc.text) {
        ctx.font = `700 52px ${BODY}`;
        const lines = wrap(ctx, sc.text, MAXW - 60, 2);
        const h = lines.length * 64 + 44;
        ctx.fillStyle = 'rgba(10,30,44,0.82)';
        roundRect(ctx, X, bottom - h + lift, MAXW, h, 22);
        ctx.fill();
        ctx.fillStyle = '#fff';
        lines.forEach((l, i) => ctx.fillText(l, X + 30, bottom - h + 22 + i * 64 + lift));
      }
    } else if (sc.kind === 'price') {
      ctx.font = `600 50px ${BODY}`;
      ctx.fillStyle = '#C9D5DF';
      if (sc.sub) ctx.fillText(sc.sub, X, bottom - 250 + lift);
      const f = fitFont(ctx, sc.text, 800, 130, 70, MAXW - 80, 1);
      ctx.font = `800 ${f.size}px ${HEAD}`;
      const tw = Math.min(MAXW, ctx.measureText(f.lines[0] ?? '').width + 80);
      const sc2 = 0.9 + 0.1 * ease(local / 0.6);
      ctx.save();
      ctx.translate(X, bottom - 170 + lift);
      ctx.scale(sc2, sc2);
      ctx.fillStyle = ACCENT;
      roundRect(ctx, 0, 0, tw, f.size + 60, 26);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(f.lines[0] ?? '', 40, 30);
      ctx.restore();
    } else if (sc.kind === 'when') {
      ctx.font = `700 46px ${BODY}`;
      ctx.fillStyle = '#F5A27A';
      if (sc.sub) ctx.fillText(sc.sub, X, bottom - 230 + lift);
      const f = fitFont(ctx, sc.text, 800, 92, 56, MAXW, 2);
      ctx.fillStyle = '#fff';
      let y = bottom - 160 + lift;
      f.lines.forEach((l) => { ctx.fillText(l, X, y); y += f.size * 1.08; });
    }
    ctx.globalAlpha = 1;
    wordmark(ctx, X, 210, 66);
  }
  ctx.restore();
}

/** Draws the whole frame at time t (seconds). */
export function drawFrame(ctx: CanvasRenderingContext2D, plan: Plan, assets: Assets, t: number) {
  const scenes = plan.script.scenes;
  const { i, local } = sceneAt(scenes, t);
  ctx.clearRect(0, 0, W, H);
  const FADE = 0.35;
  if (i > 0 && local < FADE) {
    drawScene(ctx, plan, assets, i - 1, scenes[i - 1].dur);
    ctx.save();
    ctx.globalAlpha = local / FADE;
    drawScene(ctx, plan, assets, i, local);
    ctx.restore();
  } else {
    drawScene(ctx, plan, assets, i, local);
  }
  // progress segments
  const n = scenes.length, gap = 10, segW = (W - 144 - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    const fill = k < i ? 1 : k === i ? Math.min(1, local / scenes[k].dur) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, 72 + k * (segW + gap), 64, segW, 10, 5); ctx.fill();
    if (fill > 0) { ctx.fillStyle = '#fff'; roundRect(ctx, 72 + k * (segW + gap), 64, Math.max(10, segW * fill), 10, 5); ctx.fill(); }
  }
  if (plan.template === 'closing' && scenes[i].kind !== 'cta') {
    const w = words(plan.lang);
    const pulse = 0.85 + 0.15 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(180,35,24,${pulse})`;
    roundRect(ctx, W - 72 - 440, 170, 440, 84, 42); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 40px ${HEAD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w.ends.toUpperCase(), W - 72 - 220, 213, 400);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  if (plan.watermark) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.font = `800 120px ${HEAD}`;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.textAlign = 'center';
    for (let y = -1100; y <= 1100; y += 420) ctx.fillText('PREVIEW · mnada', 0, y);
    ctx.restore();
  }
}

/** An original, royalty-free music bed (plus the voiceover if there is one). */
export async function buildSoundtrack(duration: number, opts: { music: boolean; voice?: ArrayBuffer | null }) {
  const sr = 44100;
  const len = Math.ceil(duration * sr);
  const ctx = new OfflineAudioContext(2, len, sr);
  const master = ctx.createGain();
  master.connect(ctx.destination);
  let voiceBuf: AudioBuffer | null = null;
  if (opts.voice) { try { voiceBuf = await ctx.decodeAudioData(opts.voice.slice(0)); } catch { voiceBuf = null; } }
  if (opts.music) {
    const music = ctx.createGain();
    music.gain.setValueAtTime(0, 0);
    music.gain.linearRampToValueAtTime(voiceBuf ? 0.32 : 0.75, 0.6);
    music.gain.setValueAtTime(voiceBuf ? 0.32 : 0.75, Math.max(0.7, duration - 1.2));
    music.gain.linearRampToValueAtTime(0, duration);
    music.connect(master);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500;
    lp.connect(music);
    const beat = 60 / 104;
    const bar = beat * 4;
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    for (let t = 0, c = 0; t < duration; t += bar, c++) {
      const ch = chords[c % 4];
      for (const n of ch) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.25); g.gain.linearRampToValueAtTime(0.045, t + bar - 0.1); g.gain.linearRampToValueAtTime(0, t + bar);
        o.connect(g).connect(lp); o.start(t); o.stop(Math.min(duration, t + bar));
      }
      for (let b = 0; b < 4 && t + b * beat < duration; b++) {
        const bt = t + b * beat;
        const bass = ctx.createOscillator(); bass.type = 'sine'; bass.frequency.value = hz(ch[0] - 12);
        const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, bt); bg.gain.exponentialRampToValueAtTime(0.22, bt + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, bt + beat * 0.9);
        bass.connect(bg).connect(music); bass.start(bt); bass.stop(Math.min(duration, bt + beat));
        if (b % 2 === 0) {
          const k = ctx.createOscillator(); k.frequency.setValueAtTime(130, bt); k.frequency.exponentialRampToValueAtTime(42, bt + 0.14);
          const kg = ctx.createGain(); kg.gain.setValueAtTime(0.5, bt); kg.gain.exponentialRampToValueAtTime(0.0001, bt + 0.2);
          k.connect(kg).connect(music); k.start(bt); k.stop(Math.min(duration, bt + 0.22));
        }
        const ht = bt + beat / 2;
        if (ht < duration) {
          const nb = ctx.createBuffer(1, Math.floor(sr * 0.05), sr);
          const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
          const src = ctx.createBufferSource(); src.buffer = nb;
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
          const hg = ctx.createGain(); hg.gain.value = 0.08;
          src.connect(hp).connect(hg).connect(music); src.start(ht);
        }
      }
    }
  }
  if (voiceBuf) {
    const v = ctx.createBufferSource(); v.buffer = voiceBuf;
    const vg = ctx.createGain(); vg.gain.value = 1;
    v.connect(vg).connect(master); v.start(0.5);
  }
  return ctx.startRendering();
}

/** Seconds of voiceover, so the video can be made long enough. */
export async function voiceSeconds(voice: ArrayBuffer) {
  try {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const b = await ctx.decodeAudioData(voice.slice(0));
    return b.duration;
  } catch { return 0; }
}

let aacReady: Promise<void> | null = null;
/** Some browsers (e.g. Chrome on Linux, Firefox) can't encode AAC natively: use Mediabunny's WASM encoder there. */
async function ensureAac() {
  if (!aacReady) {
    aacReady = (async () => {
      const mb = await import('mediabunny');
      if (!(await mb.canEncodeAudio('aac'))) {
        const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
        registerAacEncoder();
      }
    })();
  }
  return aacReady;
}

export async function canRender() {
  if (typeof window === 'undefined' || !('VideoEncoder' in window)) return false;
  try {
    const mb = await import('mediabunny');
    await ensureAac();
    return (await mb.canEncodeVideo('avc', { width: W, height: H })) && (await mb.canEncodeAudio('aac'));
  } catch { return false; }
}

/** Renders the MP4 in the browser (H.264 + AAC, 1080×1920, 30 fps). */
export async function renderMp4(plan: Plan, assets: Assets, soundtrack: AudioBuffer, onProgress: (p: number) => void) {
  const mb = await import('mediabunny');
  await ensureAac();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const duration = plan.script.scenes.reduce((a, s) => a + s.dur, 0);
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
  const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: 6_000_000, keyFrameInterval: 2 });
  const audio = new mb.AudioBufferSource({ codec: 'aac', bitrate: 160_000 });
  output.addVideoTrack(video, { frameRate: FPS });
  output.addAudioTrack(audio);
  await output.start();
  const frames = Math.ceil(duration * FPS);
  for (let f = 0; f < frames; f++) {
    drawFrame(ctx, plan, assets, f / FPS);
    await video.add(f / FPS, 1 / FPS);
    if (f % 10 === 0) onProgress(f / frames * 0.95);
  }
  await audio.add(soundtrack);
  await output.finalize();
  onProgress(1);
  return new Blob([output.target.buffer!], { type: 'video/mp4' });
}
