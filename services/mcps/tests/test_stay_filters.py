import asyncio
import json

import httpx
import pytest

from services.mcps.liteapi import LiteApi, ProviderUnavailable, _catalog_cache
from services.mcps.tests.test_liteapi import HOTEL


def test_provider_catalog_resolution_and_exact_filter_transport():
    _catalog_cache.clear()
    calls = []
    def supplier(request):
        calls.append(request)
        if request.url.path.endswith("hotelTypes"):
            return httpx.Response(200, json={"data": [{"id": 201, "name": "Apartment"}]})
        if request.url.path.endswith("facilities"):
            return httpx.Response(200, json={"data": [{"facility_id": 7, "facility": "Kitchen", "translation": [{"language": "de", "name": "Küche"}]}]})
        body = json.loads(request.content)
        assert body["hotelTypeIds"] == [201] and body["facilities"] == [7]
        assert body["strictFacilityFiltering"] is False and body["refundableRatesOnly"] is True
        return httpx.Response(200, json={"data": []})
    api = LiteApi("live_catalog_test", transport=httpx.MockTransport(supplier))
    async def run():
        types = await api.call("hotels/catalog", {"kind": "hotel_types", "q": "apart"})
        assert types["items"] == [{"id": 201, "name": "Apartment"}]
        await api.call("hotels/catalog", {"kind": "facilities"})
        await api.call("hotels/catalog", {"kind": "hotel_types"})
        result = await api.call("hotels/search", {**HOTEL, "hotel_type_ids": [201], "facility_ids": [7], "strict_facility_filtering": False, "refundable_rates_only": True})
        assert result["status"] == "empty" and len(calls) == 3
        with pytest.raises(ValueError):
            await api.call("hotels/search", {**HOTEL, "facility_ids": [9999]})
        assert len(calls) == 3
    asyncio.run(run())


def test_catalog_not_shared_across_credentials_and_no_hidden_filter_calls():
    _catalog_cache.clear()
    calls = []
    def supplier(request):
        calls.append(request)
        return httpx.Response(200, json={"data": [{"id": 201, "name": "Apartment"}]})
    one = LiteApi("live_catalog_one", transport=httpx.MockTransport(supplier))
    two = LiteApi("sand_catalog_two", transport=httpx.MockTransport(supplier))
    async def run():
        await one.call("hotels/catalog", {"kind": "hotel_types"})
        with pytest.raises(ProviderUnavailable):
            await two.call("hotels/search", {**HOTEL, "hotel_type_ids": [201]})
        assert len(calls) == 1
        assert (await two.call("hotels/catalog", {"kind": "hotel_types"}))["sandbox"]
        assert len(calls) == 2
    asyncio.run(run())
