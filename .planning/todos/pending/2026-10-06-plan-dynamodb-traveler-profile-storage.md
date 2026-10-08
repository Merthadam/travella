---
title: Plan DynamoDB traveler-profile storage
area: backend
created: 2026-10-06
source: User decision during Phase 13
---

User chose to finish Account settings on existing SQL and plan DynamoDB next. Evaluate traveler-keyed profile reads, sparse writes, conditional revision updates, idempotency receipt retention, ownership and atomicity; compare operational/cost implications at actual expected traffic. Design migration/backfill, rollback and cutover without resetting onboarding or preferences. Preserve the CRUD API contract and canonical profile authority over AgentCore Memory. Cognito identity and Auth security records stay outside this proposed profile-storage scope unless separately discussed. No migration or AWS provisioning is authorized by this planning item.
