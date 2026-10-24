# Remove map location chooser

User requests removal of the location-disambiguation panel before discussing place cards. Prior direct-implementation choice applies. Execute GSD quick inline.

- Remove candidate-selection state and UI; use the first valid geocode result for local viewport framing only. Saved pins and restored view retain priority. No durable destination mutation.
- Keep Show all places, error recovery, and place cards unchanged.
- Capture a browser DOM design preview before implementation and the authenticated actual map after rebuilding. Exercise filters, Show all places, and reload; check unchanged saved data, console/network, focused tests and build.
