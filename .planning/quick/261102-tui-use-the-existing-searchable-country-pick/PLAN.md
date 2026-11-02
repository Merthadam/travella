---
status: complete
---
# Use the usual billing country pattern

User explicitly selected the existing Travella pattern while PR #33 was being prepared. Continue that chosen design, without another prototype round, and include this correction in the already-authorized main merge.

1. Replace FlightPayment's native billing-country select and duplicate country catalog with shared SearchSelect and the existing countries catalog. Keep the billing row aligned with existing form fields, with full-width country/postcode fields on mobile and a bounded searchable/paginated popover.
2. Verify selection submits its exact country code only to Stripe, query text does not replace selection, paging/search/Escape and mobile geometry. Run focused payment/checkout/picker tests and build; authenticate through Chrome DevTools and save visual evidence.
3. Update PR #33, validate the committed version in the isolated shipment checkout, and finish the requested main merge after checks pass. Preserve uncommitted accommodation work.

Visual plan: artifacts/testing/2026-11-02-billing-country/plan/approved-search-picker.png. Before state: user-supplied screenshot in the same directory.
