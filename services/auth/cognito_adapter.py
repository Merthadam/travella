from typing import Any


class CognitoAdapter:
    """Small, mockable wrapper around the end-user Cognito API."""

    def __init__(self, client: Any, user_pool_id: str, app_client_id: str):
        self.client = client
        self.user_pool_id = user_pool_id
        self.app_client_id = app_client_id

    def register(self, first_name: str, last_name: str, email: str, password: str) -> dict[str, Any]:
        return self.client.sign_up(
            ClientId=self.app_client_id,
            Username=email,
            Password=password,
            UserAttributes=[
                {"Name": "given_name", "Value": first_name},
                {"Name": "family_name", "Value": last_name},
                {"Name": "email", "Value": email},
            ],
        )

    def confirm_email(self, email: str, code: str) -> dict[str, Any]:
        return self.client.confirm_sign_up(ClientId=self.app_client_id, Username=email, ConfirmationCode=code)

    def sign_in(self, email: str, password: str) -> dict[str, Any]:
        return self.client.initiate_auth(
            ClientId=self.app_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )

    def answer_challenge(self, session: str, challenge_name: str, responses: dict[str, str]) -> dict[str, Any]:
        return self.client.respond_to_auth_challenge(
            ClientId=self.app_client_id,
            Session=session,
            ChallengeName=challenge_name,
            ChallengeResponses=responses,
        )

    def forgot_password(self, email: str) -> dict[str, Any]:
        return self.client.forgot_password(ClientId=self.app_client_id, Username=email)

    def reset_password(self, email: str, code: str, new_password: str) -> dict[str, Any]:
        return self.client.confirm_forgot_password(
            ClientId=self.app_client_id,
            Username=email,
            ConfirmationCode=code,
            Password=new_password,
        )

    def refresh(self, refresh_token: str) -> dict[str, Any]:
        return self.client.initiate_auth(
            ClientId=self.app_client_id,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={"REFRESH_TOKEN": refresh_token},
        )

    def revoke(self, refresh_token: str) -> dict[str, Any]:
        return self.client.revoke_token(ClientId=self.app_client_id, Token=refresh_token)

    def global_sign_out(self, access_token: str) -> dict[str, Any]:
        return self.client.global_sign_out(AccessToken=access_token)

    def associate_software_token(self, access_token: str) -> dict[str, Any]:
        return self.client.associate_software_token(AccessToken=access_token)

    def verify_software_token(self, access_token: str, session: str, code: str) -> dict[str, Any]:
        return self.client.verify_software_token(AccessToken=access_token, Session=session, UserCode=code)

