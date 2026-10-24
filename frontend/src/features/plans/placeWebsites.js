import { MAX_USEFUL_LINKS, websiteUrl } from '../../design-system/schemas';

// URL parsing normalizes host case, default ports and the empty root path.
// Keep query strings and path case: those can identify different pages.
const key = value => { const url = new URL(value); url.hash = ''; return url.href; };

export function appendPlaceWebsite(links, place) {
  if (!place.website) return true;
  const website = websiteUrl.parse(place.website);
  const existing = links.items.find(item => key(item.url) === key(website));
  if (existing) {
    existing.placeId ||= place.id;
    return true;
  }
  if (links.items.length >= MAX_USEFUL_LINKS) return false;
  links.items.push({ id: `place-${crypto.randomUUID()}`, placeId: place.id, title: place.name,
    url: website, purpose: `Website for ${place.name}`, category: 'official' });
  links.status = 'ready'; delete links.error;
  return true;
}

export function preservePlaceWebsites(current, incoming) {
  const items = current.items.filter(item => item.placeId);
  const urls = new Set(items.map(item => key(item.url)));
  const ids = new Set(items.map(item => item.id));
  for (const item of incoming.items) {
    if (items.length >= MAX_USEFUL_LINKS) break;
    if (!urls.has(key(item.url)) && !ids.has(item.id)) {
      items.push(item); urls.add(key(item.url)); ids.add(item.id);
    }
  }
  return { ...incoming, ...(items.length ? { status: 'ready' } : {}), items };
}
