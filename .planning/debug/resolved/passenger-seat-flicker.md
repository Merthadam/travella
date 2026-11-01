---
status: resolved
trigger: "there is a flicker between passengers and seats in flight checkout lets fix that"
created: 2026-10-31
updated: 2026-10-31
---

# Passenger to seat transition flicker

GSD debug initialized and executed inline. Expected: one stable passenger-to-seat transition. Actual: user reports flicker between those checkout steps. Reproduction: submit passenger details to reserve test fare and continue. No error or onset supplied.

## Current Focus

Confirmed: attempted=true during prebook unmounts the passenger form; the loading banner shifts the grid, form removal clamps scrolling, and a passive effect resets scroll after the first seats frame.
Complete: desktop/mobile transition, validation retry, unit recovery checks, screenshots, canonical source checks and cleanup passed.

## Acceptance

- Preserve the passenger form and scroll position while reservation is pending; prevent duplicate submission.
- Transition directly to seats after a successful response.
- Preserve uncertain-response recovery, validation retry, explicit consent, updated fare disclosure, and seat/baggage selection behavior.
- Check desktop/mobile, pending, success, validation and uncertain failures with meaningful regression coverage, browser frames, screenshots, console and network checks.
- Rebuild the canonical Docker stack, verify authentication and changed-source hashes.
- Use isolated verification records and fictional passenger data; no booking/payment.

## Planning choice

User explicitly selected “Preserve the design and fix the flicker.” A small transition sketch documents the intended behavior; no production redesign.

## Evidence

- Code sets attempted before prebook completes and derives uncertain solely from attempted + review status.
- Built-in Chrome DevTools MCP cannot acquire its shared profile, which is held by a live Chrome process. Use a separate isolated instance of the same installed MCP server; do not stop unrelated sessions.
- Actual baseline frame capture: passenger panel height 1211.1 → 127.7px; scroll 764 → 266px during prebook. First seats frame scroll=266, next=0.
- Regression test failed before the fix because the Given name input was unmounted. All 21 checkout tests pass after the fix; travel/canvas suite: 312 passed, 12 existing skips. Production build passed.
- Canonical local launcher passed authentication readiness; all three changed production files match container SHA-256.
- Actual desktop verification: idle and pending panel/button/summary/scroll geometry identical, seats appear at scroll=0 in one frame. Real provider prebook/services requests returned 200; chosen seat and updated total reach final review with confirmation disabled.

## Resolution

Track pendingAction independently from attempted so only an active prebook keeps the passenger form mounted. A lost response still exposes recovery, including while checking status. Hide the progress announcement from visual flow when a checkout exists, suppress the premature status button during prebook, reserve submit-label dimensions, and reset scroll with a layout effect before paint.

Desktop has identical pending geometry and a single seats frame at scroll=0. Mobile validation rejection preserves editability and fresh consent; real retry retains the form and transitions directly to seats at scroll=0. Browser console/network and all screenshots reviewed. Isolated verification Plan soft-deleted and read back as recoverable. No final booking/payment. Evidence: artifacts/testing/2026-10-31-passenger-seat-flicker/verification.md.
