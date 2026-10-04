---
phase: 12
status: approved-direction
source: user-selected prototype B
---
# Travel studio — UI contract

## Authority
User selected B (“b is perfect”). Use its screenshot and running prototype as visual reference. No new prototype offer or alternative design round. Production wiring and responsive/accessibility details below extend the agreed design.

## Layout and components
Desktop: centered ~1160px studio, dark green left 44% editorial/live-profile panel, white right 56% form. Travella header, slim top progress with four labeled steps. Rounded joined panels, generous white space. Left panel shows active headline, decorative globe and live travel profile. Right shows chapter/step label, fields, Back and Continue. Optional steps expose Skip for now. Final Continue is “Make it mine”.

Narrow screens <=700px: single column, compact dark introduction above form. Avoid duplicating a tall profile summary ahead of every form. Prototype hides decorative globe/live profile on mobile; retain that behavior. Navigation controls fit 320px, are touch-sized and never hidden under fixed chrome. Production has no prototype bottom switcher, inspector, Start over reset, fake completion screen or preview banner.

Use frontend/src/features/onboarding/ with small step components, shared StepActions and ProfilePreview; Tailwind with Travella theme tokens. Preserve B's #1c3e35 dark surface, warm pale background and muted green accents. Font inherits existing Inter/system stack. Approximate sizes: desktop headline 39px, mobile 32px, section title 24px, body 14px, labels 13px. Raise prototype's tiny explanatory labels to readable production sizes (normally >=12px). Interactive targets >=44px.

## Screens
1. Home: required labeled city combobox; countries/regions disambiguated in suggestions. Selecting city exposes nearby airport choices; optional airport search and “I’ll choose an airport later”. Changing city clears a now-unconfirmed airport selection, with visible notice. Google attribution stays visible. No exact street-address request, browser geolocation prompt, or map interaction required.
2. Citizenship: searchable full versioned country catalog, multiple removable passport cards. Flags are decorative; names remain accessible. No passport numbers/documents. Existing unmatched nationality text is shown as a legacy value to review, never silently dropped.
3. Needs: separate optional free-text accessibility and food allergy/dietary textareas, max1000 each; no preset diagnoses or checkboxes. Explain these saved preferences help later trip conversations. No personal field content in console/error telemetry.
4. Interests: softly floating selectable activity bubbles, five-selection counter, custom-interest input. Case/whitespace-insensitive deduplication. Custom counts as one. Continue enabled at five, Skip always available. Selected bubbles show checkmark and pressed state; do not rank or infer interests. Motion stops on hover/focus and respects reduced-motion preference.

## Saves, progress and recovery
Preview updates immediately from draft; wording must not claim saved until server acknowledgement. Continue/Skip save current step, then advance. While saving, disable duplicate submit and expose Saving… status. On failure retain draft and position; show inline Retry. Back does not write or erase edits. Refresh resumes server-confirmed progress, not unsaved keystrokes. Top progress animates subtly when a step is saved; completed optional skips count. Existing users see a brief “We’ve brought your saved preferences with you” explanation once, prefilled.

Completion: successful final save marks current onboarding version complete and routes to existing Plans page. Existing users encounter v2 once, with no preference editor added.

## Accessibility and empty/error states
Semantic form labels, required/optional text, proper combobox/listbox keyboard behavior; focus heading on step change and first invalid field after validation. Live region for save/error/count. Visible focus, contrast, descriptive remove controls. Keyboard navigation must not trigger prototype variant shortcuts. Reduced motion removes continuous transforms. No-results and Google load/rate-limit failures show retry and a manual city+country fallback, clearly marked unverified; airport remains optional. Backend requires meaningful city+country for manual entry.

## Evidence and acceptance
Visual baseline: artifacts/testing/2026-10-05-onboarding-prototypes/plan/B-travel-studio.jpg.
During implementation capture all four screens, returned-user prefill, error/resume and actual 390px mobile. Verify in Chrome DevTools with example account and inspect console/network. No automated tests requested. See 12-VALIDATION.md.
