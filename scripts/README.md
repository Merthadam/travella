# Local verification

Run `bash scripts/check.sh` from the checkout. It installs only locked Python and
JavaScript dependencies, checks Python lint/formatting, runs the API/security and
React integration tests, and builds the frontend. It exits nonzero on the first
failed check. It does not contact AWS or deploy anything.

During a task, use the narrower feedback command:

- Python: `uv run --locked pytest -q services/auth/tests/test_api.py`
- React: `npm test --prefix frontend`

Run the full script before accepting a wave. Phase completion additionally needs
the outstanding live-Cognito and manual checks in `01-VALIDATION.md`. Passing this
script alone is not phase verification.
