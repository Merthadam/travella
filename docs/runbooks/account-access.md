# Account access local runbook

## Python service checks

Run from the repository root:

```bash
PYTHONPATH=. python3 -m unittest discover -s services/auth/tests -v
```

The current slice is provider-neutral. Before connecting Cognito, provide issuer, app-client,
JWKS, and required-scope configuration through the service environment; never commit those
values or test credentials.

## React frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend currently demonstrates the safe stepper shell and does not claim live Cognito
registration until the adapter is configured. Passwords, MFA codes, recovery codes, and reset
tokens must remain memory-only in the eventual integration.

## Integration checkpoint

Before marking AUTH-01 through AUTH-08 complete, add a Cognito test-pool suite covering email
confirmation, software-token MFA, recovery-code replacement, password reset invalidation, refresh
cutoff, and token-derived ownership. The provider integration must preserve the neutral recovery
response and safe internal return rules documented in the Phase 1 plans.
