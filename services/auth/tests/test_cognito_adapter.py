import unittest
from unittest.mock import Mock

from services.auth.cognito_adapter import CognitoAdapter


class CognitoAdapterTests(unittest.TestCase):
    def test_register_maps_product_attributes(self):
        client = Mock()
        adapter = CognitoAdapter(client, "pool", "client")
        adapter.register("Ada", "Traveler", "ada@example.test", "secret")
        client.sign_up.assert_called_once_with(
            ClientId="client",
            Username="ada@example.test",
            Password="secret",
            UserAttributes=[
                {"Name": "given_name", "Value": "Ada"},
                {"Name": "family_name", "Value": "Traveler"},
                {"Name": "email", "Value": "ada@example.test"},
            ],
        )

    def test_refresh_supports_rotation(self):
        client = Mock()
        CognitoAdapter(client, "pool", "client").refresh("refresh-token")
        client.get_tokens_from_refresh_token.assert_called_once_with(
            ClientId="client", RefreshToken="refresh-token"
        )

    def test_mfa_verification_accepts_exactly_one_authorization(self):
        client = Mock()
        adapter = CognitoAdapter(client, "pool", "client")
        adapter.verify_software_token("123456", session="challenge")
        client.verify_software_token.assert_called_once_with(Session="challenge", UserCode="123456")
        with self.assertRaises(ValueError):
            adapter.verify_software_token("123456", session="challenge", access_token="access")

    def test_mfa_enrollment_accepts_exactly_one_authorization(self):
        client = Mock()
        adapter = CognitoAdapter(client, "pool", "client")
        adapter.associate_software_token(session="challenge")
        client.associate_software_token.assert_called_once_with(Session="challenge")
        with self.assertRaises(ValueError):
            adapter.associate_software_token(session="challenge", access_token="access")


if __name__ == "__main__":
    unittest.main()
