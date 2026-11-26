'use client';
import { useState } from 'react';
import { SITE_URL } from '@/lib/seo';

/** Editable search title/description with a Google-style preview. Empty fields use the automatic defaults. */
export default function SeoFields({ path, autoTitle, autoDescription, title, description }: {
  path: string;
  autoTitle: string;
  autoDescription: string;
  title?: string | null;
  description?: string | null;
}) {
  const [t, setT] = useState(title ?? '');
  const [d, setD] = useState(description ?? '');
  const shownT = t || autoTitle;
  const shownD = d || autoDescription;
  const host = SITE_URL.replace(/^https?:\/\//, '');
  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 2 }}>
        <h3>Search engine listing</h3>
        <span className="small muted">Filled in automatically. Change it only if you want a different wording on Google.</span>
      </div>
      <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, fontFamily: 'Arial, sans-serif' }} aria-label="Google preview">
        <div style={{ fontSize: 12, color: '#4d5156' }}>{host}{path}</div>
        <div style={{ fontSize: 19, color: '#1a0dab', lineHeight: 1.3, margin: '3px 0' }}>{shownT} | Mnada</div>
        <div style={{ fontSize: 13, color: '#4d5156', lineHeight: 1.5 }}>{shownD}</div>
      </div>
      <label className="field">
        <span className="row between">Search title <span className="small" style={{ fontWeight: 400, color: shownT.length > 60 ? 'var(--danger)' : 'var(--muted)' }}>{shownT.length}/60</span></span>
        <input className="input" name="seo_title" value={t} placeholder={autoTitle} onChange={(e) => setT(e.target.value)} />
      </label>
      <label className="field">
        <span className="row between">Search description <span className="small" style={{ fontWeight: 400, color: shownD.length > 160 ? 'var(--danger)' : 'var(--muted)' }}>{shownD.length}/160</span></span>
        <textarea className="input" name="seo_description" rows={3} value={d} placeholder={autoDescription} onChange={(e) => setD(e.target.value)} />
      </label>
    </section>
  );
}
