import re
from datetime import datetime, timedelta

MAX_SESSION_AGE = timedelta(days=30)


def can_refresh(full_sign_in_at: datetime, now: datetime) -> bool:
    if full_sign_in_at.tzinfo is None or now.tzinfo is None:
        raise ValueError("session timestamps must be timezone-aware")
    return full_sign_in_at <= now < full_sign_in_at + MAX_SESSION_AGE


def sanitize_internal_return(path: str | None, fallback: str = "/plans") -> str:
    if not path:
        return fallback
    # Allow only known private routes. Never retain arbitrary paths, encoded
    # separators, query strings, fragments, control characters or email addresses.
    if re.fullmatch(r"/plans(?:/[A-Za-z0-9_-]{1,128}(?:/(?:conversation|canvas))?)?", path):
        return path
    return fallback
