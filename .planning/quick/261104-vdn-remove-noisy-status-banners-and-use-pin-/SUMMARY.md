---
status: complete
---
# Quiet feedback and accommodation pins

Replaced decorative notice/error blocks with shared neutral feedback styling, neutralized status/rating/number badges, and removed visible repeated workspace notices while preserving accessible announcements and quiet Undo. Accommodation markers now reuse the pointed SVG pin with a number, preserving selection and hotel-only fading.

135 focused tests, production build, canonical authentication readiness and five runtime source hash checks passed. Real Chrome example-account desktop/mobile search, dismiss/undo, cancellation, validation/correction, pin shape/selection and activity opacity verified. Screenshots inspected. One expected expired-snapshot HTTP409 recovered through a fresh search; existing development warnings remain.

Evidence: [verification](../../../artifacts/testing/2026-11-04-quiet-feedback-pins/verification.md). Preview: http://localhost:5202. Inline GSD quick workflow. No backend CRUD, durable choice, booking, push, merge or deployment. Wider phase acceptance unchanged.
