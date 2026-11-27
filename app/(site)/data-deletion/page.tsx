import Link from 'next/link';

export const metadata = { title: 'Delete your data', description: 'How to disconnect social accounts from Mnada Studio and ask Mnada to delete your data.' };

export default function DataDeletion() {
  return (
    <article className="wrap section prose" style={{ maxWidth: 760 }}>
      <h1>Delete your data</h1>
      <h2>Disconnect a social media account</h2>
      <ol>
        <li>Log in and open <Link href="/studio#autopost">Mnada Studio → Auto-posting</Link>.</li>
        <li>Press <b>Disconnect</b> next to the Facebook Page, Instagram, TikTok or YouTube account.</li>
      </ol>
      <p>This immediately deletes our copy of that account’s access token and cancels any posts scheduled to it. Videos already published stay on your account; delete them in the platform’s own app if you wish.</p>
      <p>You can also remove Mnada from the platform’s settings: Facebook and Instagram — Settings → Business integrations (or Apps and websites); TikTok — Settings → Security → Manage app permissions; Google — myaccount.google.com → Security → Third-party connections. When you do this, Mnada can no longer post, and we delete the stored token the next time we notice it no longer works.</p>
      <h2>Delete your Mnada account and data</h2>
      <p>Email <b>[EMAIL]</b> from the address on your account with the subject “Delete my data”. We confirm within 7 days and delete your account, connected-account details, Studio videos and drafts within 30 days, except records the law requires us to keep (such as invoices and payment records for tax purposes), which we keep only for that period.</p>
      <p>See our <Link href="/privacy#social">privacy policy</Link> for what we collect and why.</p>
    </article>
  );
}
