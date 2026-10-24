---
status: passed
threats_open: 0
reviewed_base: ea10333
reviewed_source: 8275f16
---

# Canvas improvements scoped security review

Inline review of the full source diff against current main. Not a repository-wide audit.

- CRUD ownership/revision/challenge boundaries remain enforced before snapshot writes. Autosave uses the same authenticated API and retains request identity/payload after ambiguous failure; later changes are queued. Conflicts stop automatic retries. Browser reads alone do not save except the explicitly requested provider enrichment of already selected pins.
- Research key rotation accepts only the exact stored normalized finding and matching stored proof in the authorized Plan. Edited claims, forged/cross-plan proofs, unauthorized requests and stale revisions remain rejected by real HTTP tests.
- Website fields are validated in provider, agent, frontend and durable models. Only public-shaped HTTP/HTTPS links with no credentials, IP literals, nonstandard ports or local suffixes are accepted. These are browser links, not server fetch targets; noreferrer/noopener prevent opener access. Research citation URLs retain HTTPS requirements. No change to supplier booking authorization.
- Place metadata is optional and length-bounded; React renders it as text. Provider resolution verifies the hashed exact Google identity before enriching existing pins. Signed activity tickets include websites and editorial metadata, retaining subject/Plan/expiry binding.
- Autosave, generation and enrichment cannot bypass existing busy/editor guards; pending asynchronous responses are scoped to current Plan epochs. Removal retains explicit confirmation and undo. Finalization not implemented.
- No credentials, raw provider payloads or session material introduced in tracked evidence. Photos remain dynamic with attribution. Metadata is stored within the existing JSONB snapshot, no destructive migration.

Evidence: 104 passing CRUD/provider tests and 114 passing focused frontend tests, plus prior real-browser save/reload and deletion/recovery verification. No open security finding in this scoped review.
