from dataclasses import dataclass, field
from enum import StrEnum


class AuthState(StrEnum):
    REGISTER = "register"
    VERIFY_EMAIL = "verify_email"
    MFA_OFFER = "mfa_offer"
    RECOVERY_CODES_REVIEW = "recovery_codes_review"
    SIGN_IN = "sign_in"
    MFA_CHALLENGE = "mfa_challenge"
    RECOVERY_CODE_CHALLENGE = "recovery_code_challenge"
    REPLACE_AUTHENTICATOR_REQUIRED = "replace_authenticator_required"
    FORGOT_PASSWORD_EMAIL = "forgot_password_email"
    NEUTRAL_CONFIRMATION = "neutral_confirmation"
    RESET_PASSWORD = "reset_password"
    SIGNED_IN = "signed_in"


@dataclass
class AuthFlow:
    state: AuthState = AuthState.SIGN_IN
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    return_path: str = "/plans"
    _secrets: dict[str, str] = field(default_factory=dict, repr=False)

    def register(self, first_name: str, last_name: str, email: str, password: str) -> None:
        self.first_name, self.last_name, self.email = first_name, last_name, email
        self._secrets["password"] = password
        self.state = AuthState.VERIFY_EMAIL

    def verify_email(self) -> None:
        self._secrets.pop("verification_code", None)
        self._secrets.pop("password", None)
        self.state = AuthState.MFA_OFFER

    def complete_mfa(self, enabled: bool) -> None:
        self.state = AuthState.RECOVERY_CODES_REVIEW if enabled else AuthState.SIGNED_IN

    def recovery_code_sign_in(self) -> None:
        self.state = AuthState.REPLACE_AUTHENTICATOR_REQUIRED

    def replace_authenticator(self) -> None:
        self.state = AuthState.RECOVERY_CODES_REVIEW

    def acknowledge_recovery_codes(self) -> None:
        self.state = AuthState.SIGNED_IN

    def start_recovery(self, email: str) -> None:
        self.email = email
        self.state = AuthState.NEUTRAL_CONFIRMATION

    def reset_password(self, password: str) -> None:
        self._secrets["password"] = password
        self.state = AuthState.SIGN_IN
        self._secrets.clear()

    def interrupt(self) -> None:
        self._secrets.clear()

