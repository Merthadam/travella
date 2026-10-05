"""Shared reference lookup and allowlisted advisory profile projection.

Only the CRUD step writer derives the two legacy text fields from confirmed
structured values. All readers preserve empty values: a clear must not restore
an older mirrored preference. Progress and provider coordinates never enter this
projection.
"""

import json
from functools import lru_cache
from pathlib import Path

PROFILE_FIELDS = (
    "departure_base", "citizenships", "food_needs", "accessibility_needs",
    "travel_interests", "home_city", "default_airport", "interest_ids", "custom_interests",
)


@lru_cache(maxsize=3)
def reference_catalog(name: str) -> list[dict]:
    if name not in {"countries", "interests", "airports"}:
        raise ValueError("Unknown reference catalog")
    return json.loads((Path(__file__).with_name("travel_reference") / f"{name}.json").read_text())


def profile_context(profile: dict) -> dict:
    return {key: profile[key] for key in PROFILE_FIELDS if key in profile}


def derive_legacy_fields(payload: dict, step: str) -> None:
    if step == "home":
        city = payload["home_city"]
        airport = payload.get("default_airport")
        payload["departure_base"] = city["name"] + (f" ({airport})" if airport else "")
    elif step == "interests":
        labels = {item["id"]: item["label"] for item in reference_catalog("interests")}
        payload["travel_interests"] = ", ".join(
            [labels[value] for value in payload["interest_ids"]] + payload["custom_interests"]
        )
