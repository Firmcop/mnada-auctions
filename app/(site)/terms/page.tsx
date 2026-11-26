import type { Metadata } from 'next';
import { TERMS_VERSION } from '@/lib/format';

export const metadata: Metadata = { title: 'Terms of sale' };

export default function TermsPage() {
  return (
    <article className="wrap section stack" style={{ maxWidth: 820, gap: 14 }}>
      <div className="alert alert-err">Draft for review by a Kenyan advocate before launch. Text in [brackets] must be completed.</div>
      <h1>General terms of sale</h1>
      <p className="muted small">Version {TERMS_VERSION}. These terms apply to every auction and every bid on this website.</p>

      <h2>1. Who we are</h2>
      <p>The platform is operated by [YOUR COMPANY LTD], company no. [NUMBER], KRA PIN [PIN], of [ADDRESS], Kenya (“we”, “us”). Auctions are conducted by [NAME], a licensed auctioneer under the Auctioneers Act (Cap. 526), licence no. [NUMBER]. Unless a lot says it is our own stock, we sell as agent for the seller.</p>

      <h2>2. Registration</h2>
      <p>To bid you must be at least 18, or a registered company acting through an authorised person, and provide true information and identity documents. We may refuse, suspend or limit any account, set bidding limits and ask for a refundable deposit before you bid on some lots.</p>

      <h2>3. Lots and condition</h2>
      <p>Lots are sold as seen, with all faults, and without any warranty unless the lot description expressly says otherwise. Descriptions, photos, specifications and condition tags are given in good faith but are not guarantees. You are responsible for inspecting a lot, or having it inspected, before bidding. Viewing days are listed for each auction.</p>

      <h2>4. Bidding</h2>
      <p>4.1 Every bid you confirm is a binding offer to buy the lot at that price plus the costs in section 5, and cannot be withdrawn.</p>
      <p>4.2 An auto-bid authorises us to bid for you in the published steps up to your maximum. Where two bids are equal, the earlier one takes precedence.</p>
      <p>4.3 Each lot closes at its stated time. A bid received in the last 2 minutes extends that lot by 2 minutes. Our system clock is decisive.</p>
      <p>4.4 A lot may have a reserve price. If the highest bid is below the reserve when bidding closes, the lot is not sold.</p>
      <p>4.5 The highest bidder at closing (subject to any reserve) buys the lot, and a contract of sale is formed at that moment. We may cancel a sale, withdraw a lot, or correct an obvious error, including where we reasonably suspect fraud or a technical fault.</p>
      <p>4.6 Mnada employees, and staff of an auctioneer firm in that firm&apos;s own auctions, may not bid, directly or through anyone else.</p>

      <h2>5. Price and costs</h2>
      <p>You will pay: (a) the hammer price; (b) the buyer’s premium shown on the auction and lot page, calculated on the hammer price; (c) any mandatory additional costs listed on the lot; and (d) VAT at 16% on the premium and additional costs, and on the hammer price where the lot states it is subject to VAT. Transport, export and any other costs are your responsibility unless stated.</p>

      <h2>6. Payment</h2>
      <p>The invoice is issued when the lot closes and must be paid in full within 3 working days by M-Pesa or bank transfer, quoting the invoice number. Ownership passes to you only when we receive full payment. If you do not pay on time we may cancel the sale, re-sell the lot, and recover from you any shortfall and costs, keep any deposit, and close your account.</p>

      <h2>7. Collection and risk</h2>
      <p>Collect on the dates and at the place stated for the auction, with ID and proof of payment. Risk in the lot passes to you when bidding closes [CONFIRM WITH ADVOCATE]. Where a lot is marked “buyer dismantles”, you must dismantle and remove it safely, with competent people and suitable equipment, and you are liable for any damage or injury caused. Lots not collected on time may incur storage charges of [AMOUNT] per day and may be treated as abandoned after [NUMBER] days.</p>

      <h2>8. Our liability</h2>
      <p>To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability for any lot is limited to the buyer’s premium paid on it. Nothing in these terms limits liability that cannot be limited under Kenyan law, including under the Consumer Protection Act, 2012.</p>

      <h2>9. Complaints and disputes</h2>
      <p>Contact us first at [EMAIL] / [PHONE]. These terms are governed by the laws of Kenya and the courts of Kenya have jurisdiction.</p>

      <h2>10. Changes</h2>
      <p>We may update these terms. The version accepted with each bid is recorded and applies to that bid.</p>
    </article>
  );
}
