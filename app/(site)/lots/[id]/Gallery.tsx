'use client';
import { useState } from 'react';
import { photoUrl } from '@/lib/format';

export default function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!photos.length) return <div className="ph" style={{ height: 380, borderRadius: 12 }}>Photos coming soon</div>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="thumb" style={{ height: 'min(460px, 60vw)', borderRadius: 12, background: '#E6EAEE' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(photos[i])} alt={`${title}, photo ${i + 1} of ${photos.length}`} />
      </div>
      {photos.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
          {photos.map((p, j) => (
            <button key={p} type="button" onClick={() => setI(j)} aria-label={`Show photo ${j + 1}`}
              className="thumb" style={{ height: 70, borderRadius: 8, border: j === i ? '2px solid var(--navy)' : '2px solid transparent', padding: 0, cursor: 'pointer', background: '#E6EAEE' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
