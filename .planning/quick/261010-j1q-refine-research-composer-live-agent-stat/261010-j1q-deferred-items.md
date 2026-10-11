# Deferred items

- Existing `frontend/src/PlansApp.test.jsx` fixtures omit `researchContext`: 7 failures on both baseline `201fd74` and this branch. Focused PlanConversation fixtures were updated where new status assertions were added; broader fixture maintenance is separate.
- User selection of A/B/C (or a combination) is pending. Do not promote a recommendation into the production journey without the user's choice.
