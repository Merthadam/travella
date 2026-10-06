import unittest
from unittest.mock import Mock

from services.auth.cognito_adapter import CognitoAdapter


def test_account_reads_and_name_write_use_exact_botocore_shapes():
    import boto3
    from botocore.stub import Stubber
    client = boto3.client('cognito-idp', region_name='eu-north-1', aws_access_key_id='fixture', aws_secret_access_key='fixture')
    adapter = CognitoAdapter(client, 'eu-north-1_fixture', 'fixture')
    with Stubber(client) as stub:
        stub.add_response('describe_user_pool', {'UserPool': {'Id': 'eu-north-1_fixture'}}, {'UserPoolId': 'eu-north-1_fixture'})
        stub.add_response('describe_user_pool_client', {'UserPoolClient': {'ClientId': 'fixture'}}, {'UserPoolId': 'eu-north-1_fixture', 'ClientId': 'fixture'})
        stub.add_response('get_user_pool_mfa_config', {'MfaConfiguration': 'OPTIONAL'}, {'UserPoolId': 'eu-north-1_fixture'})
        assert adapter._account_configuration(client)['mfa']['MfaConfiguration'] == 'OPTIONAL'
        stub.add_response('update_user_attributes', {}, {'AccessToken': 'access', 'UserAttributes': [
            {'Name': 'given_name', 'Value': 'Ada'}, {'Name': 'family_name', 'Value': 'Traveler'}]})
        adapter.update_names('access', 'Ada', 'Traveler')
        stub.assert_no_pending_responses()


def test_email_operation_botocore_shapes():
    import boto3
    from botocore.stub import Stubber
    client = boto3.client('cognito-idp', region_name='eu-north-1', aws_access_key_id='fixture', aws_secret_access_key='fixture')
    adapter = CognitoAdapter(client, 'eu-north-1_fixture', 'fixture')
    with Stubber(client) as stub:
        stub.add_response('update_user_attributes', {}, {'AccessToken': 'access', 'UserAttributes': [{'Name': 'email', 'Value': 'new@example.com'}]})
        stub.add_response('get_user_attribute_verification_code', {}, {'AccessToken': 'access', 'AttributeName': 'email'})
        stub.add_response('verify_user_attribute', {}, {'AccessToken': 'access', 'AttributeName': 'email', 'Code': '123456'})
        adapter.update_email('access', 'new@example.com')
        adapter.resend_email('access')
        adapter.verify_email('access', '123456')
        stub.assert_no_pending_responses()


def test_password_operation_has_only_access_previous_and_proposed():
    import boto3
    from botocore.stub import Stubber
    client = boto3.client('cognito-idp', region_name='eu-north-1', aws_access_key_id='fixture', aws_secret_access_key='fixture')
    with Stubber(client) as stub:
        stub.add_response('change_password', {}, {'AccessToken': 'access', 'PreviousPassword': 'previous', 'ProposedPassword': 'proposed'})
        CognitoAdapter(client, 'pool', 'client').change_password('access', 'previous', 'proposed')
        stub.assert_no_pending_responses()


def test_authenticator_shapes_access_token_needs_no_session_and_explicit_preference():
    import boto3
    from botocore.stub import Stubber
    client = boto3.client('cognito-idp', region_name='eu-north-1', aws_access_key_id='fixture', aws_secret_access_key='fixture')
    adapter = CognitoAdapter(client, 'pool', 'client')
    with Stubber(client) as stub:
        stub.add_response('associate_software_token', {'SecretCode': 'FIXTUREKEYABCDEF'}, {'AccessToken': 'access'})
        stub.add_response('verify_software_token', {'Status': 'SUCCESS'}, {'AccessToken': 'access', 'UserCode': '123456'})
        stub.add_response('set_user_mfa_preference', {}, {'AccessToken': 'access', 'SoftwareTokenMfaSettings': {'Enabled': True, 'PreferredMfa': True}})
        stub.add_response('set_user_mfa_preference', {}, {'AccessToken': 'access', 'SoftwareTokenMfaSettings': {'Enabled': False, 'PreferredMfa': False}})
        assert adapter.associate_software_token(access_token='access') == {'SecretCode': 'FIXTUREKEYABCDEF'}
        adapter.verify_software_token('123456', access_token='access')
        adapter.set_software_token_preference('access', True)
        adapter.set_software_token_preference('access', False)
        stub.assert_no_pending_responses()


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
