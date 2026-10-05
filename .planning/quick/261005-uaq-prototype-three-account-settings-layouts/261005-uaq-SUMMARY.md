---
status: complete
---

# Account settings prototype handoff

Three interactive design alternatives with light/dark mode are captured on `prototype/account-settings`. Start with `npm --prefix frontend run prototype:account`; visit `http://127.0.0.1:5176/?preview=account&variant=B&theme=light` and switch A/B/C in the bottom bar.

A uses a familiar section sidebar with modal editors. B carries forward the onboarding travel studio with a live profile panel and accordion sections. C uses a master/detail workspace with inline editors and a mobile selector. Header theme controls apply to the full interface, including editors. Variants and themes are shareable URL parameters. Edits are fictional, simulated and reset on reload.

Scope reflects the agreed personal details, travel preferences and security groups. Optional preferences can be cleared, interests have no minimum, and saving does not change any real Plan. Email/security actions explicitly preview their intended flows. No new external integration.

Build, Chrome DevTools interactions, desktop/mobile captures, console/network review and screenshot inspection completed. See [verification and all screenshots](../../../artifacts/testing/2026-10-05-account-prototypes/verification.md) (repository-relative canonical path: `artifacts/testing/2026-10-05-account-prototypes/verification.md`).

Decision: user selection pending. B is the closest visual continuation of onboarding; this is a recommendation only. Keep prototype code on this branch. Once the user selects a direction or combination, record the decision here and plan a production implementation with real authentication/CRUD verification; do not promote these stubs directly.
