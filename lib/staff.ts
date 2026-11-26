export type StaffRole = 'owner' | 'operations' | 'finance' | 'lister';
export type Area = 'staff' | 'finance' | 'people' | 'operations' | 'catalogue' | 'any';

export const ROLE_LABEL: Record<StaffRole, [string, string]> = {
  owner: ['Owner', 'Everything, including staff access'],
  operations: ['Operations', 'Auctions, lots, customers, sellers, auctioneers, Listing Help, yard — no finance'],
  finance: ['Finance', 'Payments, payouts, expenses, reports, AI billing — read customers, no lot editing'],
  lister: ['Lister / photographer', 'Lots, listings, bulk import, yard stock and Listing Help job work — no customer or money data'],
};

const AREAS: Record<Exclude<Area, 'any'>, StaffRole[]> = {
  staff: ['owner'],
  finance: ['owner', 'finance'],
  people: ['owner', 'operations', 'finance'],
  operations: ['owner', 'operations'],
  catalogue: ['owner', 'operations', 'lister'],
};

export function canArea(role: StaffRole | null | undefined, area: Area) {
  if (!role) return false;
  return area === 'any' || AREAS[area].includes(role);
}

/** Admin pages and the area each needs. */
export const PAGE_AREA: [string, Area][] = [
  ['/admin/staff', 'staff'],
  ['/admin/finance', 'finance'], ['/admin/expenses', 'finance'], ['/admin/reports', 'finance'], ['/admin/payouts', 'finance'], ['/admin/ai', 'finance'],
  ['/admin/bidders', 'people'], ['/admin/sellers', 'people'], ['/admin/invoices', 'people'], ['/admin/enquiries', 'people'], ['/admin/valuations', 'people'], ['/admin/consignments', 'people'],
  ['/admin/auctioneers', 'operations'], ['/admin/help/services', 'operations'],
  ['/admin/auctions', 'catalogue'], ['/admin/lots', 'catalogue'], ['/admin/listings', 'catalogue'], ['/admin/import', 'catalogue'], ['/admin/stock', 'catalogue'], ['/admin/help', 'catalogue'],
];

export function areaFor(path: string): Area {
  const hit = PAGE_AREA.filter(([p]) => path === p || path.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : 'any';
}
