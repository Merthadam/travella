# Chat Markdown rendering

Date: 2026-10-04
Status: Implementation complete; full browser acceptance pending.

## Scope

- Reused the approved chat layout; no new design alternatives or page layout changes.
- Assistant messages use react-markdown 10.1.0 and remark-gfm 4.0.1 for accumulated streaming text and restored history.
- Scoped Tailwind styles cover headings, paragraphs, emphasis, lists, quotes, rules, code and tables. Code and tables can scroll horizontally.
- User messages remain plain text. Separate source links and the existing Stop/Retry behavior remain in place.
- Raw HTML is skipped; image syntax renders alt text without loading remote images. Web links allow only HTTP(S) without embedded credentials, with isolated new tabs. GFM footnotes may link within the document.
- This frontend formatting incurs no extra model calls.

## Executed

- `npm --prefix frontend run build`: passed. Existing large-bundle warning remains; built JS is approximately 736 kB / 214 kB gzip.
- `git diff --check`: passed.
- `bash scripts/start-local-ready.sh`: rebuilt successfully; local health and example-account authentication passed, preserving database volumes.
- All five changed frontend/package source hashes match the running container.
- Chrome DevTools read-only inspection of the existing chat: four assistant Markdown blocks, four headings, five lists and 17 strong elements rendered; no document horizontal overflow at the current viewport. No console errors, only the existing Lit development warning. This is not claimed as a full example-account interaction journey.

## Pending / blocked

- Chrome DevTools rejected the before screenshot path because this worktree is outside its configured workspace roots. No before/after screenshot evidence is claimed.
- No automated tests or paid model calls were run.
- Full example-account browser interaction, live streaming, malformed-input cases and responsive/table overflow behavior remain unverified.

## Reference documentation

- https://github.com/remarkjs/react-markdown
- https://github.com/remarkjs/remark-gfm
