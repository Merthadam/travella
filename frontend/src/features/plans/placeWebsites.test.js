import { expect, test } from 'vitest';
import { appendPlaceWebsite, preservePlaceWebsites } from './placeWebsites';
import { linksSchema } from '../../design-system/schemas';

test('all 50 saved place websites fit alongside 20 generated research links', () => {
  const links = { status: 'ready', items: [] };
  for (let i = 0; i < 50; i++) expect(appendPlaceWebsite(links, { id: `pin-${i}`, name: `Place ${i}`, website: `https://example.org/place/${i}` })).toBe(true);
  const research = { status: 'ready', items: Array.from({ length: 20 }, (_, i) => ({ id: `research-${i}`, title: 'Research', url: `https://example.org/research/${i}`, purpose: '', category: 'other' })) };
  const merged = preservePlaceWebsites(links, research);
  expect(linksSchema.parse(merged).items).toHaveLength(70);
  expect(appendPlaceWebsite(merged, { id: 'extra', name: 'Extra', website: 'https://example.org/extra' })).toBe(false);
  expect(merged.items).toHaveLength(70);
});
