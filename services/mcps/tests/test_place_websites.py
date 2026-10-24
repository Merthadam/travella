import asyncio

import pytest

from services.mcps import map_server
from services.mcps.transport import ToolAuthContext, authenticated_context
from services.agent.editing_contracts import SignedActivityPlace
from services.agent.place_tickets import sign_place, verified_place


def raw(website=None):
    return {'id': 'test-place', 'displayName': {'text': 'Garden'}, 'location': {'latitude': 45.4, 'longitude': 9.2}, 'websiteUri': website}


@pytest.mark.parametrize('website', [None, '', 'javascript:alert(1)', 'https://localhost', 'https://user:pw@example.org', 'http://127.0.0.1'])
def test_missing_or_unsafe_site_does_not_discard_place(website):
    place = map_server._place(raw(website))
    assert place['name'] == 'Garden'
    assert place['website'] is None


@pytest.mark.parametrize('website', ['https://example.org/garden', 'http://example.org/'])
def test_provider_website_passes_signed_projection_and_cannot_be_changed(monkeypatch, website):
    monkeypatch.setenv('CANVAS_EVIDENCE_SIGNING_KEY', 'test-key-' * 8)
    place = map_server._place(raw(website))
    signed = sign_place('user', 'plan', place)
    assert verified_place('user', 'plan', SignedActivityPlace.model_validate(signed))['website'] == website
    signed['website'] = 'https://different.example.org'
    with pytest.raises(ValueError):
        verified_place('user', 'plan', SignedActivityPlace.model_validate(signed))


def test_search_and_details_request_websites(monkeypatch):
    monkeypatch.setenv('GOOGLE_MAPS_SERVER_API_KEY', 'test-key')
    calls = []
    async def request(method, url, **kwargs):
        calls.append(kwargs['headers']['X-Goog-FieldMask'])
        return {'places': [raw('https://example.org')]} if method == 'POST' else raw('https://example.org')
    monkeypatch.setattr(map_server, '_google_request', request)
    with authenticated_context(ToolAuthContext('actor', 'plan', 'assertion')):
        result = asyncio.run(map_server.search_places('garden', {'south': 45, 'north': 46, 'west': 9, 'east': 10}, 'activity', 'plan'))
        details = asyncio.run(map_server.get_place_details('test-place', 'plan'))
    assert result['places'][0]['website'] == 'https://example.org'
    assert details['place']['website'] == 'https://example.org'
    assert 'places.websiteUri' in calls[0].split(',')
    assert 'websiteUri' in calls[1].split(',')
