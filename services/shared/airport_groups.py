"""City search membership shared by connector and agent result validation."""
from services.shared.traveler_profile import reference_catalog

# Milan includes Bergamo even though the supplier labels its city as Bergamo.
METROPOLITAN_AIRPORTS = {"MIL": frozenset({"MXP", "LIN", "BGY"})}


def airport_members(code, provider_groups=None):
    if code in METROPOLITAN_AIRPORTS:
        return METROPOLITAN_AIRPORTS[code]
    # Connector metadata can extend city codes, never broaden an exact airport.
    if code in {airport["code"] for airport in reference_catalog("airports")}:
        return {code}
    return set((provider_groups or {}).get(code, [code]))
