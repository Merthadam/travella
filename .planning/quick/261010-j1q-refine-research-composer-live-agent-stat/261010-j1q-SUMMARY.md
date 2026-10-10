---
status: complete
---
# Research UI cleanup and alternatives

Implemented and committed composer/status/layout cleanup as `bcc8493`. Added three dev-only Research → Planning canvas alternatives after the user explicitly requested cleanup first, alternatives second. No alternative selected; production journey redesign is pending a future user choice, outside this completed preview delivery.

Validation: 7 focused tests and build pass. Authenticated Chrome DevTools live reply/reload, controlled stream/stop/error/retry, keyboard and responsive appearance pass. Each prototype's transitions, simulated generation, keyboard switching, reload and mutation isolation pass. The PlansApp suite has 7 pre-existing fixture failures reproduced on unchanged baseline.

Evidence: [verification](../../../artifacts/testing/2026-10-10-research-cleanup/verification.md).

Prototype archive: `prototype/research-flow-alternatives-261010-j1q`. Capture final selection before production implementation, then remove throwaway variant code as specified by the prototype skill.
