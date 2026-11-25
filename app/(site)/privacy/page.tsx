import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <article className="wrap section stack" style={{ maxWidth: 820, gap: 14 }}>
      <div className="alert alert-err">Draft for review by a Kenyan advocate before launch. Text in [brackets] must be completed.</div>
      <h1>Privacy policy</h1>
      <p>[YOUR COMPANY LTD] (“we”) is the data controller for personal data collected through this website, and handles it in line with the Data Protection Act, 2019. [Registered with the Office of the Data Protection Commissioner, registration no. [NUMBER].]</p>

      <h2>What we collect</h2>
      <p>Name, email, mobile number, account type and company details; National ID, passport or company registration number and KRA PIN; the identity document you upload; your bids, purchases, invoices and payments; and technical data such as log-in times and IP address. Valuation requests include the contact and asset details you send.</p>

      <h2>Why we use it</h2>
      <p>To verify bidders and prevent fraud; to run auctions and record bids; to issue invoices, receive payments and meet tax and accounting obligations (including KRA requirements); to arrange collection; to answer enquiries; and, with your consent, to send you auction alerts. The legal bases are performing our contract with you, our legal obligations, and our legitimate interest in running a secure marketplace.</p>

      <h2>Who sees it</h2>
      <p>Our staff who need it; the seller of a lot you win (your name and contact details for collection); our service providers for hosting, database and email (Vercel and Supabase, which may store data outside Kenya with appropriate safeguards); payment providers such as Safaricom M-Pesa and our bank; and authorities where the law requires. Other bidders see only your bidder number, never your name.</p>

      <h2>Identity documents</h2>
      <p>Uploaded documents are stored privately and are visible only to you and our verification staff.</p>

      <h2>How long we keep it</h2>
      <p>Account data for as long as your account is open; transaction and invoice records for [7] years for tax purposes; identity documents for [PERIOD] after your last transaction.</p>

      <h2>Your rights</h2>
      <p>You may ask to see, correct or delete your data, object to its use, or withdraw consent to marketing, by writing to [EMAIL]. You may also complain to the Office of the Data Protection Commissioner.</p>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you logged in and the site secure.</p>
    </article>
  );
}
