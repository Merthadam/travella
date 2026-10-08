---
phase: quick-261008-qgn
plan: '01'
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified: [frontend/src/AccountApp.jsx, frontend/src/features/account/AccountSettingsPage.jsx, frontend/src/features/account/account.css, frontend/src/features/appearance/AppearanceProvider.jsx, frontend/src/features/appearance/appearance.css, frontend/src/features/plans/components/ChatMarkdown.module.css]
---
<objective>Promote Account's light/dark choice to the application root. Preserve selected C design and all user data/navigation behavior. Existing stored Account choice migrates to a global browser appearance preference, survives navigation and reload, and themes Plans, conversation, Trip Brief, dialogs, authentication and onboarding surfaces.</objective>
<tasks>
<task type="auto"><name>1. Capture before/design and implement shared appearance ownership</name><action>Capture the existing Plans mismatch and a rendered intended dark Plans preview before source edits. Add a root provider with guarded storage and cross-tab updates. Remove Account's mount-scoped theme ownership/restoration; keep its same controls. Preserve legacy saved selection. Theme existing surfaces through shared tokens and scoped dark rules; include Markdown and form/dialog contrast.</action><verify>Meaningful provider tests for migration, navigation persistence, storage failure and cross-tab updates; account regression suites; build.</verify><done>Account controls change the root theme and every route uses it.</done></task>
<task type="auto"><name>2. Verify dedicated local build and finish GSD evidence</name><action>Keep delivery on dedicated port5184; do not replace the other checkout's5174 stack. Rebuild current source image and preserve existing DB migration compatibility. Check authenticated Chrome desktop/mobile Account→Plans→Conversation→Account, direct reload, dark/light contrast, dialog/composer/Trip Brief, and console/network. Save inspected screenshots and verification record; commit scoped source and docs.</action><verify>Running source hashes and auth smoke; actual Chrome interactions and screenshots.</verify><done>Preview5184 contains verified changes and task status complete.</done></task>
</tasks>
<threat_model>No new API/trust boundary. Browser preference stores only light/dark; no traveler data or credential changes. Keep draft guards and isolated preview deployment. Screenshots exclude personal data.</threat_model>
