---
status: complete
---
# Compact country pickers

Implemented in c13a431. Nationality and passport issuing country reuse SearchSelect with ten-item pagination and search. Shared component styles extracted for standalone reuse; checkout theme and full-width mobile country fields verified.

252 travel tests passed, 12 existing external-fixture skips; build, Docker auth/source checks and actual authenticated Chrome desktop/mobile paging/search/keyboard/empty-state/step-navigation checks passed. Test Plan cleaned; no actual reservation/booking. Evidence: artifacts/testing/2026-10-31-checkout-country-picker/verification.md. No push or merge; wider phase acceptance unchanged.
