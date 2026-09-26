import unittest
from unittest.mock import Mock

from services.auth.cognito_adapter import CognitoAdapter


class CognitoAdapterTests(unittest.TestCase):
    def test_register_maps_product_attributes(self):
        client = Mock()
        adapter = CognitoAdapter(client, "pool", "client")
        adapter.register("Ada", "Traveler", "ada@example.test", "secret")
        client.sign_up.assert_called_once_with(
            ClientId="client", Username="ada@example.test", Password="secret",
            UserAttributes=[
                {"Name": "given_name", "Value": "Ada"},
                {"Name": "family_name", "Value": "Traveler"},
                {"Name": "email", "Value": "ada@example.test"},
            ],
        )

    def test_refresh_uses_refresh_token_flow(self):
        client = Mock()
        CognitoAdapter(client, "pool", "client").refresh("refresh-token")
        client.initiate_auth.assert_called_once_with(
            ClientId="client", AuthFlow="REFRESH_TOKEN_AUTH", AuthParameters={"REFRESH_TOKEN": "refresh-token"}
        )


if __name__ == "__main__":
    unittest.main()
