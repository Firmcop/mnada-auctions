'use client';
import { useState } from 'react';

export default function ShareBox({ link, code, clicks }: { link: string; code: string; clicks: number }) {
  const [copied, setCopied] = useState(false);
  const text = `I'm on Mnada — online auctions for machinery, vehicles, containers and steel in Kenya. Register with my link to bid: ${link}`;
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  }
  return (
    <section className="panel stack" style={{ gap: 10, background: 'var(--surface)' }}>
      <h3>Your link</h3>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" readOnly value={link} aria-label="Your referral link" style={{ flex: '1 1 280px' }} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primary" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        <a className="btn btn-outline" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
      </div>
      <span className="small muted">Code <b>{code}</b> — people can also type it when they register. Link opened {clicks} {clicks === 1 ? 'time' : 'times'}. To link a specific auction, add <code>?to=/auctions/…</code> to the end. For TikTok and Reels, put the code in your caption.</span>
    </section>
  );
}
