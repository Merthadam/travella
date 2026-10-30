---
quick: 261030-qjo
status: planned
---
# Remove unused onboarding code

User approved the audited removals and preserving the current design; no prototype exploration. Inline GSD quick execution.

1. Capture production OnboardingFlow before removal in Chrome DevTools. Authenticate the example account; since it has completed onboarding, mount the production component with a synthetic blank profile and memory-only save responses to avoid overwriting its real preferences. Also inspect actual account preference controls read-only.
2. Remove createPlacesSession, searchCities, resolveCity, searchAddresses and resolvedCityDetails; remove saveTravelerProfile; remove eight unused city-results/chosen-home CSS rules and their dark-theme selector branches. Preserve all active components, shared helpers and existing-profile compatibility.
3. Run relevant existing frontend tests and build. Exercise all four onboarding steps, manual-address/provider-unavailable fallback, airport selection, Back/Continue, optional skipping and completion on desktop/mobile in Chrome. Compare screenshots, inspect console/network, disclose simulated saves and unavailable Maps service. No backend behavior changed.
4. Commit code, evidence and GSD summary/state updates. No push/deploy.
