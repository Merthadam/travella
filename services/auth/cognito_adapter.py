from typing import Any


class CognitoAdapter:
    """Small, mockable wrapper around the end-user Cognito API."""

    def __init__(self, client: Any, user_pool_id: str, app_client_id: str):
        self.client = client
        self.user_pool_id = user_pool_id
        self.app_client_id = app_client_id

    def register(
        self, first_name: str, last_name: str, email: str, password: str
    ) -> dict[str, Any]:
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
        return self.client.confirm_sign_up(
            ClientId=self.app_client_id, Username=email, ConfirmationCode=code
        )

    def resend_confirmation(self, email: str) -> dict[str, Any]:
        return self.client.resend_confirmation_code(ClientId=self.app_client_id, Username=email)

    def get_user(self, access_token: str) -> dict[str, Any]:
        return self.client.get_user(AccessToken=access_token)

    def sign_in(self, email: str, password: str) -> dict[str, Any]:
        return self.client.initiate_auth(
            ClientId=self.app_client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )

    def answer_challenge(
        self, session: str, challenge_name: str, responses: dict[str, str]
    ) -> dict[str, Any]:
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
        return self.client.get_tokens_from_refresh_token(
            ClientId=self.app_client_id,
            RefreshToken=refresh_token,
        )

    def revoke(self, refresh_token: str) -> dict[str, Any]:
        return self.client.revoke_token(ClientId=self.app_client_id, Token=refresh_token)

    def global_sign_out(self, access_token: str) -> dict[str, Any]:
        return self.client.global_sign_out(AccessToken=access_token)

    def associate_software_token(
        self, *, access_token: str | None = None, session: str | None = None
    ) -> dict[str, Any]:
        if bool(access_token) == bool(session):
            raise ValueError("Exactly one access token or challenge session is required")
        authorization = {"AccessToken": access_token} if access_token else {"Session": session}
        return self.client.associate_software_token(**authorization)

    def verify_software_token(
        self, code: str, *, access_token: str | None = None, session: str | None = None
    ) -> dict[str, Any]:
        if bool(access_token) == bool(session):
            raise ValueError("Exactly one access token or challenge session is required")
        authorization = {"AccessToken": access_token} if access_token else {"Session": session}
        return self.client.verify_software_token(**authorization, UserCode=code)
