import unittest
from datetime import datetime, timedelta, timezone

from services.auth.session_policy import can_refresh, sanitize_internal_return
from services.auth.state_machine import AuthFlow, AuthState
from services.auth.token_validator import TokenValidationError, validate_claims


class AuthTests(unittest.TestCase):
    def test_valid_access_claims_are_subject_bound(self):
        identity = validate_claims(
            {
                "iss": "https://issuer",
                "token_use": "access",
                "client_id": "client",
                "sub": "traveler-1",
                "iat": 10,
                "exp": 100,
                "scope": "plans:read",
            },
            issuer="https://issuer",
            client_id="client",
            required_scopes=["plans:read"],
            now=20,
        )
        self.assertEqual(identity.subject, "traveler-1")

    def test_invalid_claims_rejected(self):
        with self.assertRaises(TokenValidationError):
            validate_claims(
                {
                    "iss": "bad",
                    "token_use": "id",
                    "client_id": "client",
                    "sub": "x",
                    "iat": 1,
                    "exp": 2,
                },
                issuer="https://issuer",
                client_id="client",
                now=1,
            )

    def test_refresh_stops_at_thirty_days(self):
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.assertTrue(can_refresh(start, start + timedelta(days=29, hours=23)))
        self.assertFalse(can_refresh(start, start + timedelta(days=30)))

    def test_return_path_is_internal_only(self):
        self.assertEqual(sanitize_internal_return("https://evil.example"), "/plans")
        self.assertEqual(sanitize_internal_return("/plans/123?token=secret"), "/plans")
        self.assertEqual(sanitize_internal_return("/plans/123"), "/plans/123")

    def test_flow_never_restores_secret_after_interrupt(self):
        flow = AuthFlow()
        flow.register("A", "Traveler", "a@example.test", "secret")
        flow.interrupt()
        self.assertEqual(flow.state, AuthState.VERIFY_EMAIL)
        self.assertNotIn("password", flow._secrets)

    def test_recovery_code_requires_replacement(self):
        flow = AuthFlow()
        flow.recovery_code_sign_in()
        self.assertEqual(flow.state, AuthState.REPLACE_AUTHENTICATOR_REQUIRED)
        flow.replace_authenticator()
        flow.acknowledge_recovery_codes()
        self.assertEqual(flow.state, AuthState.SIGNED_IN)


if __name__ == "__main__":
    unittest.main()
