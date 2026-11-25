/** Convert between ISO timestamps and <input type="datetime-local"> values in Nairobi time (UTC+3, no DST). */
export function isoToEatInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function eatInputToIso(v: string) {
  if (!v) return null;
  return new Date(`${v}:00+03:00`).toISOString();
}

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
