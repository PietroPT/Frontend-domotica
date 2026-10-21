const nf = (d: number) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

export function watt(w: number): string {
  if (!Number.isFinite(w)) return '—';
  return Math.abs(w) >= 10000 ? `${nf(1).format(w / 1000)} kW` : `${nf(0).format(Math.round(w))} W`;
}

export function kw(w: number): string {
  return Number.isFinite(w) ? `${nf(2).format(w / 1000)} kW` : '—';
}

export function temp(t: number, digits = 1): string {
  return Number.isFinite(t) ? `${nf(digits).format(t)}°` : '—';
}

export function kwh(v: number): string {
  return Number.isFinite(v) ? `${nf(v < 10 ? 2 : 1).format(v)} kWh` : '—';
}

export function since(isoDate: string): string {
  const m = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (m < 1) return 'adesso';
  if (m < 60) return `da ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `da ${h} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim();
  return `da ${Math.floor(h / 24)} g`;
}

export function ago(isoDate: string): string {
  const s = since(isoDate);
  return s === 'adesso' ? s : s.replace(/^da /, '') + ' fa';
}

export function clock(d = new Date()): string {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function today(d = new Date()): string {
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function duration(sec: number): string {
  if (!Number.isFinite(sec)) return '—';
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
