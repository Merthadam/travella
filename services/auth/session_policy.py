from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

MAX_SESSION_AGE = timedelta(days=30)


def can_refresh(full_sign_in_at: datetime, now: datetime) -> bool:
    if full_sign_in_at.tzinfo is None or now.tzinfo is None:
        raise ValueError("session timestamps must be timezone-aware")
    return now < full_sign_in_at + MAX_SESSION_AGE


def sanitize_internal_return(path: str | None, fallback: str = "/plans") -> str:
    if not path:
        return fallback
    parsed = urlsplit(path)
    if parsed.scheme or parsed.netloc or not parsed.path.startswith("/") or parsed.path.startswith("//"):
        return fallback
    forbidden = ("token", "password", "code", "secret", "email")
    candidate = parsed.path
    if parsed.query and any(word in parsed.query.lower() for word in forbidden):
        return fallback
    return candidate or fallback

