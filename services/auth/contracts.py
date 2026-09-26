from dataclasses import dataclass
from typing import FrozenSet, Literal


@dataclass(frozen=True)
class ValidatedIdentity:
    subject: str
    client_id: str
    scopes: FrozenSet[str]
    issued_at: int
    expires_at: int


@dataclass(frozen=True)
class AuthProblem:
    code: Literal["unauthenticated", "forbidden", "not_found", "invalid_input", "retryable"]
    message: str
    retryable: bool = False
