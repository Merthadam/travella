# Suggestions in chat and shared stay search filters

User request: assistant recommendations belong in chat and should be searchable; manual search should expose agent capabilities such as apartment filtering. Prior prototype decline honored.

1. Render and inspect desktop/mobile outline before implementation.
2. Move research comparison/shortlist/preferred cards into chat history; filter visible suggestions by text and prepare fresh-search drafts. Preserve confirmation dialogs, independent histories, stale protections and manual search.
3. Add searchable provider-backed property types and amenities, all/any amenity matching, and refundable-only search. Use actual catalog IDs through existing authorized routes; preserve imported filters. Refresh catalogs before filtered searches so cached provider validation remains valid. Keep returned-result filters distinct from provider search criteria.
4. Focused React/API/connector tests, build, authenticated Chrome DevTools example-account journey with apartment search, chat cards/filtering, desktop/mobile, reload, console/network and inspected screenshots. Record evidence/STATE and commit.

Read-only live check confirmed existing hotels/catalog route returns Apartments, Aparthotels and other provider property types. No CRUD changes planned.
