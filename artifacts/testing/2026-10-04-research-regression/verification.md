# Research response regression

Date: 2026-10-04
Status: Fix available locally; live worker diagnosis succeeded, full browser acceptance remains incomplete.

## Failure evidence

- Local search service returned HTTP 200 for the affected research requests.
- Replaying the relevant query through the legacy connector produced `uncertain` with zero raw/valid candidates. `SdkResearchNode` treated this as fatal before invoking Claude's research worker.
- A separate live SDK replay successfully chose destination discovery, then raised `research_output_invalid` at the 2,000-character answer guard.
- Frontend source inspection found that the final stream result overwrote `interrupted` with `error`, hiding the message-level interrupted label and Retry button.
- Read-only database diagnostics found no remaining active research lease or database lock. No existing Plan or conversation was changed by the diagnostic replays.

## Changes

- Legacy candidate enrichment is optional; an empty/unavailable connector result no longer prevents the SDK research loop.
- Completed research without legacy cards still projects supported sources and shared destination candidate additions.
- Overlong streamed replies retain complete tokens and show an explicit shortening notice within the existing storage limit. Invalid/unobserved URLs remain rejected.
- Safe terminal error messages and interrupted/retry state are preserved.

## Executed checks

- `git diff --check`: passed.
- `npm --prefix frontend run build`: passed; existing >500 kB bundle warning remains.
- `uv run --locked python -m compileall -q services/agent`: passed.
- Local Cognito precheck: passed.
- `bash scripts/start-local-ready.sh`: rebuilt app, preserved database volumes, passed health and example-account sign-in/session/sign-out checks.
- SHA-256 comparison: all six changed application files match the running container.
- Live Claude Agent SDK replay on the rebuilt container: completed in 38 seconds; 1,686 answer characters; 120 text chunks; concatenated stream exactly matches the returned answer; two read sources and five candidate names. This run did not exceed the shortening threshold.
- Running agent health reports Claude Agent SDK / claude-sonnet-5-5.

## Limits

- No automated tests were added or run, following the session instruction.
- The live replay exercises the research worker, not the entire browser → shared-state persistence journey. End-to-end sidebar persistence, error/retry interaction, and cancellation remain unverified in this debugging turn.
- Chrome DevTools read-only inspection was available after refreshing the existing browser session. Example ownership could not be established for that existing Plan, so no browser Plan mutations were performed.
- Screenshot capture failed: Chrome DevTools denied this worktree because it is outside its configured workspace roots. No screenshot is claimed.
- The overflow safeguard is based on the reproduced length failure and source review; the successful post-fix model reply did not itself overflow.

Local review URL: http://localhost:5174 (refresh the existing tab).
