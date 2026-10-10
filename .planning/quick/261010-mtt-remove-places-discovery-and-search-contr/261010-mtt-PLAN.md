---
status: complete
---
# Refine approved places design

User approved A and requested removal of Find places and Search your places, plus a photo in each list row. Continue the selected design without another alternatives cycle.

1. Remove both controls and their unused state/actions/styles. Keep List/Map, category filters, notes, removal and undo.
2. Add modest real provider photo thumbnails beside saved place names, with attribution. Resolve Google-backed pins by exact provider-ID hash match; no guessed images, durable schema change or photo storage. Lazy-load visible list rows and gracefully omit unavailable photos.
3. Focused tests/build, authenticated Chrome DevTools desktop/mobile, photo failure and reload checks. Rebuild existing travella-places stack, verify source hashes, record evidence and commit.
