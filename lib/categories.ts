/** Category tree used by the mega menu, search, lots and direct-sale listings. */
export const CATEGORY_TREE: { name: string; short: string; subs: string[] }[] = [
  { name: 'Construction & earthmoving', short: 'Construction', subs: ['Excavators', 'Loaders & dozers', 'Cranes', 'Road & compaction', 'Dump trucks', 'Aerial work platforms', 'Telehandlers', 'Concrete equipment'] },
  { name: 'Metalworking', short: 'Metalworking', subs: ['Press brakes', 'Plasma & laser cutting', 'Saws', 'Lathes & milling', 'Plate rolls & bending', 'Welding', 'Compressors'] },
  { name: 'Lifting & handling', short: 'Lifting & handling', subs: ['Forklifts', 'Overhead & gantry cranes', 'Hoists & winches', 'Pallet trucks', 'Container handling'] },
  { name: 'Trucks & transport', short: 'Trucks & transport', subs: ['Tippers', 'Trailers', 'Tankers', 'Vans & pickups', 'Buses'] },
  { name: 'Container houses & modular', short: 'Containers & modular', subs: ['Container houses', 'Container offices', 'Container shops & kiosks', 'Shipping containers', 'A-frame cabins', 'Prefab buildings'] },
  { name: 'Steel structures', short: 'Steel structures', subs: ['Warehouses & sheds', 'Portal frames', 'Carports & canopies', 'Mezzanines', 'Roofing & cladding'] },
  { name: 'Agriculture', short: 'Agriculture', subs: ['Tractors', 'Implements', 'Irrigation', 'Crop processing'] },
  { name: 'Industrial & processing', short: 'Industrial', subs: ['Woodworking', 'Food processing', 'Plastics & resin', 'Generators & power', 'Workshop tools'] },
];

export const CATEGORY_NAMES = [...CATEGORY_TREE.map((c) => c.name), 'Other'];

export function subsOf(category: string | null | undefined) {
  return CATEGORY_TREE.find((c) => c.name === category)?.subs ?? [];
}

export function searchHref(cat?: string, sub?: string) {
  const p = new URLSearchParams();
  if (cat) p.set('cat', cat);
  if (sub) p.set('sub', sub);
  const s = p.toString();
  return s ? `/search?${s}` : '/search';
}
