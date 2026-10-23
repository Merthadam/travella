# Phase 17 execution

User explicitly authorized implementation and subagent fan-out on 2026-10-23. Production branch feat/research-cleanup-17 preserves prototype/full-width-state-bar-20261023 at fb44c0b. Restored only prototype-touched production files to tested baseline 0812adc and removed our navigation/state-bar mocks; no user work discarded.

Execution adjustment: independently owned frontend, CRUD and agent work can be prepared concurrently; dependent integration and verification retain planned order. Frontend owns frontend/**. CRUD owns services/research_offers.py, services/trip_context.py and services/crud/**. Agent owns services/agent/**. Parent owns integration/build/browser evidence and phase state. Workers agree typed contracts before dependent implementation; no plan is complete before its cross-layer acceptance passes. No automatic deployment or external messages.
