'use client';
import { useEffect, useState } from 'react';

export type TikTokChoice = { privacy_level: string; disable_comment: boolean; disable_duet: boolean; disable_stitch: boolean; brand_content_toggle: boolean; brand_organic_toggle: boolean };
type Info = { creator_nickname?: string; creator_username?: string; creator_avatar_url?: string; privacy_level_options: string[]; comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean; max_video_post_duration_sec: number };
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me' };

/** TikTok's required posting choices: who is posting, audience (no default), interactions (off by default) and commercial-content disclosure. */
export default function TikTokOptions({ accountId, durationSec, onChange }: { accountId: string; durationSec: number; onChange: (c: TikTokChoice | null, problem: string | null) => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState('');
  const [allow, setAllow] = useState({ comment: false, duet: false, stitch: false });
  const [promo, setPromo] = useState(false);
  const [yours, setYours] = useState(false);
  const [branded, setBranded] = useState(false);

  useEffect(() => {
    let on = true;
    fetch(`/api/social/tiktok-creator?account=${accountId}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!on) return;
      if (!r.ok) setErr(j.error ?? 'Couldn’t reach TikTok'); else setInfo(j);
    });
    return () => { on = false; };
  }, [accountId]);

  useEffect(() => {
    let problem: string | null = null;
    if (err) problem = `TikTok: ${err}`;
    else if (!info) problem = 'Checking your TikTok account…';
    else if (durationSec > info.max_video_post_duration_sec) problem = `This TikTok account can post videos up to ${info.max_video_post_duration_sec}s.`;
    else if (!privacy) problem = 'Choose who can see the TikTok post.';
    else if (promo && !yours && !branded) problem = 'Say whether the video promotes your own business, a third party, or both.';
    else if (branded && privacy === 'SELF_ONLY') problem = 'Branded content can’t be private on TikTok.';
    onChange(problem ? null : {
      privacy_level: privacy, disable_comment: !allow.comment, disable_duet: !allow.duet, disable_stitch: !allow.stitch,
      brand_content_toggle: promo && branded, brand_organic_toggle: promo && yours,
    }, problem);
  }, [info, err, privacy, allow, promo, yours, branded, durationSec, onChange]);

  if (err) return <div className="alert alert-err small">TikTok: {err}</div>;
  if (!info) return <span className="small muted">Checking your TikTok account…</span>;
  return (
    <div className="stack" style={{ gap: 8, borderLeft: '3px solid var(--line)', paddingLeft: 12 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        {info.creator_avatar_url && <img src={info.creator_avatar_url} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />}
        <span className="small">Posting to TikTok as <b>{info.creator_nickname}</b>{info.creator_username ? ` (@${info.creator_username})` : ''}</span>
      </div>
      <label className="field" style={{ maxWidth: 260 }}><span className="small">Who can see this video</span>
        <select className="input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
          <option value="" disabled>Choose…</option>
          {info.privacy_level_options.map((p) => <option key={p} value={p} disabled={branded && p === 'SELF_ONLY'}>{PRIVACY[p] ?? p}</option>)}
        </select>
      </label>
      <div className="row" style={{ gap: 14 }}>
        <label className="check small" style={{ opacity: info.comment_disabled ? 0.5 : 1 }}><input type="checkbox" disabled={info.comment_disabled} checked={allow.comment} onChange={(e) => setAllow((a) => ({ ...a, comment: e.target.checked }))} />Allow comments</label>
        <label className="check small" style={{ opacity: info.duet_disabled ? 0.5 : 1 }}><input type="checkbox" disabled={info.duet_disabled} checked={allow.duet} onChange={(e) => setAllow((a) => ({ ...a, duet: e.target.checked }))} />Allow Duet</label>
        <label className="check small" style={{ opacity: info.stitch_disabled ? 0.5 : 1 }}><input type="checkbox" disabled={info.stitch_disabled} checked={allow.stitch} onChange={(e) => setAllow((a) => ({ ...a, stitch: e.target.checked }))} />Allow Stitch</label>
      </div>
      <label className="check small"><input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} />This video promotes a brand, product or service (disclose commercial content)</label>
      {promo && (
        <div className="stack" style={{ gap: 4, paddingLeft: 22 }}>
          <label className="check small"><input type="checkbox" checked={yours} onChange={(e) => setYours(e.target.checked)} /><span><b>Your brand</b> — you’re promoting yourself or your own business. Labelled “Promotional content”.</span></label>
          <label className="check small"><input type="checkbox" checked={branded} onChange={(e) => setBranded(e.target.checked)} /><span><b>Branded content</b> — you’re promoting another brand or a third party. Labelled “Paid partnership”.</span></label>
        </div>
      )}
      <span className="small muted">
        By posting, you agree to TikTok’s{' '}
        {branded && <><a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </>}
        <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>.
        After posting, it can take a few minutes for the video to appear on your profile.
      </span>
    </div>
  );
}
