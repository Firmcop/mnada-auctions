import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Help & FAQ' };

const SECTIONS: { id: string; title: string; items: [string, React.ReactNode][] }[] = [
  {
    id: 'account',
    title: 'Registering',
    items: [
      ['Who can bid?', 'Anyone 18 or over, or any registered company, with a Kenyan mobile number. Every bidder is checked before they can bid.'],
      ['What do I need to register?', 'Your name, email, mobile number and National ID or passport number. Companies also give their registration number and KRA PIN. After signing up, upload a photo of your ID (or certificate of incorporation) on your account page.'],
      ['How long does approval take?', 'Usually within one working hour during office hours. You can browse and plan your bids in the meantime.'],
      ['Why do I have a bidding limit?', 'New bidders may get a limit until they have bought and paid with us. Contact us to raise it — for high-value lots we may ask for a refundable deposit.'],
    ],
  },
  {
    id: 'bidding',
    title: 'Bidding',
    items: [
      ['How do I place a bid?', 'Open a lot, enter an amount at or above the minimum bid, check the cost summary, tick to accept the terms of sale and press Confirm bid.'],
      ['Can I withdraw a bid?', 'No. A confirmed bid is binding. Check the description, photos, condition tags and collection details — or come to the viewing day — before you bid.'],
      ['What is auto-bid?', 'Enter the most you are willing to pay. We bid for you, one step at a time and only as high as needed to keep you in the lead, up to your maximum. Auto-bids are marked “(auto)” in the bid history. If an auto-bid and a later bid are for the same amount, the earlier one leads.'],
      ['What are the bid steps?', <>The minimum step depends on the current price: KES 1,000 below 50,000; KES 5,000 up to 200,000; KES 20,000 up to 1 million; KES 50,000 up to 5 million; KES 100,000 above that.</>],
      ['When does a lot close?', 'Each lot has its own closing time; lots in an auction close one minute apart. If anyone bids in the last 2 minutes, that lot is extended by 2 minutes, so everyone gets a fair chance to respond.'],
      ['What is a reserve?', 'Some lots have a hidden minimum price set by the seller. The lot page shows “Reserve met” or “Reserve not yet met”. If the highest bid at closing meets the reserve, that bidder wins automatically.'],
      ['What is allocation?', <>If bidding closes below the reserve — or on a “seller approval” lot — the lot goes to allocation. The seller has 48 hours to accept the highest bid, send the highest bidder a counter-offer (you can accept, decline or counter once more), offer it to the next bidder, or decline. Your highest bid stays binding until the seller decides. Follow it under <Link href="/account/offers">Offers &amp; allocation</Link>.</>],
      ['What are the three kinds of lot?', 'No reserve: the highest bid wins. Reserve price: the highest bid at or above the hidden reserve wins; below it, the lot goes to allocation. Seller approval: the seller always confirms the highest bid after closing.'],
    ],
  },
  {
    id: 'costs',
    title: 'Costs',
    items: [
      ['What will I pay in total?', 'The hammer price (your winning bid), plus the buyer’s premium shown on the lot (a percentage of the hammer price), plus any mandatory additional costs listed on the lot, plus 16% VAT on the premium and additional costs. Where the seller is VAT-registered, VAT also applies to the hammer price — the lot page says so. The bid panel shows the full estimate before you confirm.'],
      ['What are additional costs?', 'Some lots list fixed charges such as loading, crane offloading, delivery or assembly. Mandatory ones are added to the invoice; optional ones are available on request.'],
      ['Are transport costs included?', 'No, unless listed as an additional cost. Ask us for a transport quote before you bid.'],
    ],
  },
  {
    id: 'payment',
    title: 'Paying & collecting',
    items: [
      ['When and how do I pay?', 'Your invoice appears under My bids as soon as the lot closes. Pay within 5 working days by M-Pesa Paybill, bank transfer, RTGS or PesaLink, using the invoice number as the reference. Part-payments are added to the invoice. We remind you 2 days before the due date.'],
      ['What if I don’t pay on time?', 'The sale may be cancelled and the lot offered to the next bidder. The non-payment is recorded on your account, you may be charged for the seller’s loss, and you may lose your bidding rights. See the terms of sale.'],
      ['How do I collect?', 'Once the invoice is fully paid, collect on the dates shown for the auction. Bring your ID and the invoice. Some lots must be dismantled and removed by the buyer — check the condition tags.'],
    ],
  },
  {
    id: 'selling',
    title: 'Selling',
    items: [
      ['How do I sell with you?', <>Send a <Link href="/sell">valuation request</Link>. We visit or review your list, agree a reserve and dates with you, photograph and list the items, run the viewing day and handle payment and collection.</>],
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="wrap section" style={{ maxWidth: 900 }}>
      <h1>Help &amp; FAQ</h1>
      <nav aria-label="Topics" className="row small" style={{ margin: '16px 0 8px', gap: 8 }}>
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="btn btn-outline btn-sm">{s.title}</a>)}
      </nav>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="stack" style={{ marginTop: 28, gap: 6 }}>
          <h2 style={{ fontSize: 24 }}>{s.title}</h2>
          {s.items.map(([q, a]) => (
            <details key={q} style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
              <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{q}</summary>
              <p style={{ color: 'var(--body)', marginTop: 8 }}>{a}</p>
            </details>
          ))}
        </section>
      ))}
      <p className="small muted" style={{ marginTop: 32 }}>Still stuck? Call or WhatsApp [PHONE] or email [EMAIL]. See also the <Link href="/terms">terms of sale</Link>.</p>
    </div>
  );
}
