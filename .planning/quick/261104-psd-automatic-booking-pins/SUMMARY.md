# Automatic booking pins

Implemented the traveler-requested automatic pin behavior and removed separate confirmation map controls. Existing confirmed bookings are backfilled; stable source identity deduplicates locations; persisted synchronization markers respect later manual removal. Added single-pin framing fix discovered during actual browser verification.

98 focused frontend tests, 63 backend/API tests, build and diff checks passed. Authenticated Chrome DevTools desktop/mobile checks confirmed the traveler’s GVA pin, simulated hotel association with preserved notes, MXP/LIN addition, reload and manual-removal persistence. Temporary test Plan deleted and GET 404 verified; user demo preserved. No new supplier transaction, push, merge or production deployment.

Evidence: `artifacts/testing/2026-11-04-automatic-booking-pins/verification.md`.
