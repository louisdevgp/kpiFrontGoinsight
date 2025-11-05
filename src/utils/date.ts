// Normalise une date YYYY-MM-DD au lundi de la même semaine (UTC/ISO, lundi=1)
export function toMondayISO(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay() || 7; // 1..7 (0=dimanche -> 7)
  const diff = day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function dateTimeToISO(date: Date): string {
  return date.toISOString().slice(0, 16);
}