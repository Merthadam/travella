import { z } from 'zod';
const text = n => z.string().max(n);
const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const state = { status: z.enum(['ready', 'empty', 'loading', 'error']), error: text(240).optional() };
const unique = items => new Set(items.map(x => x.id)).size === items.length;
export const categories = {
  stay: { label: 'Stays', color: '#356AC3', icon: 'bed' },
  airport: { label: 'Airports', color: '#7656B5', icon: 'plane' },
  food: { label: 'Food', color: '#B75539', icon: 'cup' },
  activity: { label: 'Activities', color: '#28785E', icon: 'spark' },
  other: { label: 'Other', color: '#5C697A', icon: 'pin' },
};
export const safeUrl = z.string().max(2048).refine(value => {
  try {
    const u = new URL(value); const h = u.hostname.toLowerCase();
    return !/[\s\\]/.test(value) && u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && h.includes('.') && !/^[\d.]+$/.test(h) && !h.includes(':') && !/(^localhost$|\.(local|internal|localhost)$)/.test(h);
  } catch { return false; }
}, 'Use a public HTTPS website without credentials.');
const date = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v), 'Use a valid date.');
export const essentialsSchema = z.object({ ...state,
  dates: z.object({ start: date, end: date, note: text(120), flexible: z.boolean() }).strict(),
  travelers: z.number().int().min(1).max(50).nullable(),
  budget: z.object({ label: text(120), noFixedBudget: z.boolean() }).strict(),
}).strict().refine(d => !d.dates.start || !d.dates.end || d.dates.end >= d.dates.start, 'End date must follow start.').refine(d => !d.dates.flexible || (!d.dates.start && !d.dates.end), 'Flexible dates cannot include exact dates.').refine(d => !d.budget.noFixedBudget || !d.budget.label, 'Choose an amount or no fixed budget.');
export const themeItem = z.object({ id, kind: z.enum(['theme','pace','priority','must_do','avoid']), text: z.string().min(1).max(160), source: text(40).optional() }).strict();
export const themesSchema = z.object({ ...state, items: z.array(themeItem).max(20).refine(unique, 'Duplicate ids.') }).strict();
export const pinSchema = z.object({ id, name: z.string().min(1).max(120), category: z.enum(['stay','airport','food','activity','other']), position: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict(), description: text(240) }).strict();
export const mapSchema = z.object({ ...state, destination: text(120), final: z.boolean(), pins: z.array(pinSchema).max(50).refine(unique, 'Duplicate ids.') }).strict();
export const travelSchema = z.object({ ...state, need: z.enum(['undecided','needed','not-needed']), title: text(160), subtitle: text(160), detail: text(160), availability: z.enum(['preview','unavailable','ready']) }).strict();
const source = z.object({ title: text(120), url: safeUrl }).strict();
export const findingsSchema = z.object({ ...state, items: z.array(z.object({ id, title: z.string().min(1).max(120), summary: text(600), sources: z.array(source).max(5), certainty: z.enum(['supported','uncertain','conflicting','unavailable']), researchedAt: text(40).optional() }).strict()).max(30).refine(unique, 'Duplicate ids.') }).strict();
export const linkSchema = z.object({ id, title: z.string().min(1).max(120), url: safeUrl, purpose: text(240), category: z.enum(['official','transport','attraction','practical','other']) }).strict();
export const linksSchema = z.object({ ...state, items: z.array(linkSchema).max(20).refine(unique, 'Duplicate ids.') }).strict();
export const definitions = {
  essentials: { type: 'TripEssentials', title: 'Trip essentials', schema: essentialsSchema, icon: 'calendar' },
  map: { type: 'DestinationMap', title: 'Places & map', schema: mapSchema, icon: 'pin' },
  themes: { type: 'TripThemes', title: 'Themes & preferences', schema: themesSchema, icon: 'spark' },
  flights: { type: 'FlightsEntry', title: 'Flights', schema: travelSchema, icon: 'plane' },
  accommodation: { type: 'AccommodationEntry', title: 'Accommodation', schema: travelSchema, icon: 'bed' },
  findings: { type: 'ResearchFindings', title: 'Research findings', schema: findingsSchema, icon: 'book' },
  links: { type: 'ImportantLinks', title: 'Useful websites', schema: linksSchema, icon: 'link' },
};
export const ids = Object.keys(definitions);
