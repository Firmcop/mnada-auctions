export const EXPENSE_CATEGORIES: Record<string, string> = {
  transport: 'Transport & delivery', fuel: 'Fuel', casual_labour: 'Casual labour', loading_equipment: 'Loading equipment / crane hire',
  yard_rent: 'Yard rent', utilities: 'Utilities', marketing: 'Marketing & adverts', photography: 'Photography & video',
  ai_provider: 'AI provider bill', payment_fees: 'Payment & bank fees', staff: 'Staff costs', office: 'Office & admin',
  legal_licences: 'Legal & licences', other: 'Other',
};
export type Expense = {
  id: string; spent_on: string; category: string; description: string; supplier: string | null; amount_kes: number; vat_kes: number;
  paid_via: string | null; payment_ref: string | null; auction_id: string | null; help_request_id: string | null; receipt: string | null; created_at: string;
};
export const STOCK_STATUS: Record<string, [string, string]> = {
  received: ['In yard', 'pill-warn'], listed: ['Listed', 'pill-green'], sold: ['Sold — awaiting collection', 'pill-green'],
  collected: ['Collected', 'pill-grey'], returned: ['Returned to owner', 'pill-grey'], written_off: ['Written off', 'pill-grey'],
};
export type StockItem = {
  id: string; ref: string; title: string; description: string | null; category: string | null; quantity: number; condition: string | null;
  yard_location: string | null; owner_kind: 'mnada' | 'seller' | 'other'; owner_id: string | null; owner_name: string | null;
  help_request_id: string | null; consignment_id: string | null; storage_booking_id?: string | null; lot_id: string | null; listing_id: string | null; status: string;
  photos: string[]; notes: string | null; received_at: string; left_yard_at: string | null;
};
