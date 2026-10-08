"""Short-lived provenance for ephemeral place suggestions returned to the browser.

The browser may return these cards on the next turn. A ticket binds every field
to its authenticated traveler and Plan; it confers no permission to save a Plan.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

from .editing_contracts import ActivityPlace, SignedActivityPlace


def _key() -> bytes:
    secret = os.getenv("CANVAS_EVIDENCE_SIGNING_KEY", "")
    if len(secret) < 32:
        raise ValueError("Place suggestion signing is unavailable.")
    return secret.encode()


def _signature(subject: str, plan_id: str, expires: int, place: dict) -> str:
    payload = json.dumps(["canvas-place-v1", subject, plan_id, expires, place],
                         sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hmac.new(_key(), payload.encode(), hashlib.sha256).hexdigest()


def sign_place(subject: str, plan_id: str, value: dict) -> dict:
    place = ActivityPlace.model_validate(value).model_dump(mode="json")
    expires = int(time.time()) + 3600
    return {**place, "ticket": f"{expires}.{_signature(subject, plan_id, expires, place)}"}


def verified_place(subject: str, plan_id: str, value: SignedActivityPlace) -> dict:
    place = ActivityPlace.model_validate(value.model_dump(exclude={"ticket"})).model_dump(mode="json")
    try:
        expiry, signature = value.ticket.split(".", 1)
        expires = int(expiry)
        if not int(time.time()) < expires <= int(time.time()) + 3600:
            raise ValueError
        if not hmac.compare_digest(signature, _signature(subject, plan_id, expires, place)):
            raise ValueError
    except (ValueError, TypeError):
        raise ValueError("These place suggestions expired or changed. Search again to refresh them.") from None
    return place
