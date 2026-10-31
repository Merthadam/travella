# Compact checkout country pickers

Continue approved checkout refinement using the existing Travella SearchSelect, which offers search and ten-country pages. No new design exploration needed for reuse of this established control. Execute inline through gsd-quick.

1. Replace nationality and passport issuing country native selects with SearchSelect; move its shared styles into a component-owned stylesheet so checkout works independently. Keep mobile picker width usable and preserve disabled reservation fields and ISO-code payloads.
2. Run checkout and picker regression coverage/build; verify actual authenticated Chrome desktop/mobile country paging, search, keyboard selection, empty-query results, Escape, independent values and steps. No actual reservation or booking.
3. Rebuild local stack with auth/source checks; inspect screenshots/network/console, clean test Plan and record evidence in artifacts/testing/2026-10-31-checkout-country-picker. Commit and update STATE.
