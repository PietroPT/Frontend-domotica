import { api } from './api';

export const SECTION_TITLES: Record<string, string> = {
  notifiche: 'Notifiche telecamere', sensori: 'Sensori disponibili', allarme: 'Allarme',
};
export type SecurityLayout = {
  revision: number;
  sections: string[];
  titles: Record<string, string>;
  sensors: string[];
  sensorNames: Record<string, string>;
  notifications: string[];
  notificationNames: Record<string, string>;
};
export function defaultSecurityLayout(): SecurityLayout {
  return { revision: 0, sections: Object.keys(SECTION_TITLES), titles: {}, sensors: [],
    sensorNames: {}, notifications: [], notificationNames: {} };
}
export function ordered<T>(items: T[], ids: string[], key: (item: T) => string): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (rank.get(key(a)) ?? ids.length) - (rank.get(key(b)) ?? ids.length));
}
export function moved(ids: string[], index: number, direction: number): string[] {
  const copy = [...ids], target = index + direction;
  if (index >= 0 && index < copy.length && target >= 0 && target < copy.length)
    [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
const DEMO_KEY = 'ha-dashboard.sicurezza.demo';
export async function loadSecurityLayout(demo: boolean): Promise<SecurityLayout> {
  if (!demo) return api('GET', 'sicurezza');
  try {
    const data = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    if (data && Array.isArray(data.sections) && data.sections.length === 3
      && new Set(data.sections).size === 3 && data.sections.every((s: string) => s in SECTION_TITLES)
      && Array.isArray(data.sensors) && Array.isArray(data.notifications)
      && data.titles && data.sensorNames && data.notificationNames) return data;
  } catch { /* La demo non deve dipendere da una vecchia copia malformata. */ }
  return defaultSecurityLayout();
}
export async function saveSecurityLayout(demo: boolean, data: SecurityLayout): Promise<SecurityLayout> {
  if (!demo) return api('PUT', 'sicurezza', data);
  const saved = { ...data, revision: data.revision + 1 };
  localStorage.setItem(DEMO_KEY, JSON.stringify(saved));
  return saved;
}
