# Dynamic researcher prototype verification

**Date:** 2026-10-03
**Preview:** `http://127.0.0.1:4175/.planning/sketches/002-dynamic-researcher/index.html?variant=A`
**Scope:** UI prototype only. The production application and backend were not changed by this sketch.

## Browser checks

- Opened and switched among A (Inline Research), B (Evidence Workspace), and C (Research Mission) in Chrome. Each variant kept the same Plan and conversation context; the URL parameter changed with the selection.
- Submitted “Check Tarifa’s wind season” in A and B. Each showed an in-progress tool activity, then completed web/place checks and a contextual answer that asks for dates before ranking conditions.
- Submitted “Is Vienna a good surf destination?” in C. The conversation and mission timeline showed a completed place-context check and explained that Vienna is inland relative to the surf brief.
- Clicked the sample “Save idea” button in A. It changed to “Saved (prototype)” and showed a simulated-only confirmation; no Plan API or persistence call was made.
- Switched C to Phone preview and visually inspected the stacked research and conversation layout. The transcript remains scrollable; the fixed prototype controls reduce available vertical space.
- Opened source previews and the Evidence/Activity tabs. They display clearly labeled sample evidence and traveler-safe activity; no model reasoning is shown.

## Chrome DevTools

- Console after serving from the repository root: **0 messages**.
- Network: prototype document returned **200**, shared theme stylesheet returned **200**, and the only other request was the local browser-extension cursor asset. The prototype makes no provider, CRUD, or external API calls by design.
- The first preview server root caused a theme stylesheet 404; I corrected the server root and reloaded before the final browser checks.

## Screenshot evidence

- [Variant A — Inline Research](plan/variant-a-inline-research.png) was captured using Chrome DevTools and visually inspected.
- Variants B and C were visually inspected in the live Chrome tab, including C’s phone preview, but their screenshots could not be saved after the undocked DevTools window became inaccessible to computer control. A later attempt to open the captured image through a data URL was blocked by the browser URL policy; I did not try another route around that restriction. The required saved screenshots for B and C remain incomplete.

## Limits

Every provider result, source, tool call, map lookup, and save action is simulated. These alternatives validate interaction structure only; they do not demonstrate live agent behavior or factual destination research.
