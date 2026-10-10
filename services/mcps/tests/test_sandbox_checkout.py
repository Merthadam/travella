import asyncio
import json
import time
import httpx
import pytest
from services.mcps.liteapi import LiteApi, ProviderUnavailable
from services.mcps.sandbox_checkout import cipher, unseal
from services.mcps.tests.test_liteapi import HOTEL, hotel_payload


def run(coro):
    return asyncio.run(coro)


class Supplier:
    def __init__(self):
        self.posts = []
        self.booking = None
        self.lose_response = False

    def __call__(self, req):
        path = req.url.path
        if path.endswith('/hotels/rates'):
            return httpx.Response(200, json=hotel_payload())
        if path.endswith('/prebook'):
            assert json.loads(req.content)['usePaymentSdk'] is False
            rate = hotel_payload()['data'][0]['roomTypes'][0]['rates'][0] | {'occupancyNumber': 1}
            return httpx.Response(200, json={'data': {'prebookId': 'PRIVATE_PREBOOK', 'hotelId': 'lp1',
                'checkin': HOTEL['check_in'], 'checkout': HOTEL['check_out'], 'price': 125.5,
                'currency': 'EUR', 'roomTypes': [{'rates': [rate]}], 'termsAndConditions': 'Refreshed terms'}})
        if path.endswith('/bookings'):
            return httpx.Response(200, json={'data': [self.booking] if self.booking else []})
        assert path.endswith('/book') and req.url.host == 'book.liteapi.travel'
        body = json.loads(req.content)
        assert body['sandbox'] is True and body['payment'] == {'method': 'ACC_CREDIT_CARD'}
        assert body['holder']['email'] == 'sandbox-guest@example.com'
        self.posts.append(body)
        self.booking = {'bookingId': 'TEST123', 'status': 'CONFIRMED', 'clientReference': body['clientReference'],
                        'hotelConfirmationCode': 'TEST456', 'holder': {'email': 'PRIVATE_EMAIL'}}
        if self.lose_response:
            raise httpx.ReadTimeout('private upstream details')
        return httpx.Response(200, json={'data': self.booking})


def setup():
    supplier = Supplier()
    api = LiteApi('sand_TEST', scope=('owner', 'plan'), transport=httpx.MockTransport(supplier))
    result = run(api.call('hotels/search', HOTEL))
    token = result['results'][0]['rooms'][0]['checkout_token']
    return api, supplier, token


def test_real_flow_projection_price_refresh_readback_and_idempotency():
    api, supplier, token = setup()
    assert 'SECRET' not in token
    p = run(api.call('sandbox/prebook', {'token': token}))
    assert p['total']['amount'] == '125.5' and p['status'] == 'review'
    assert 'PRIVATE' not in json.dumps(p)
    body = {'token': p['token'], 'confirm_mock': True, 'guests': [{'first_name': 'Test', 'last_name': 'Guest'}]}
    booked = run(api.call('sandbox/book', body))
    assert booked['status'] == 'confirmed' and booked['booking_id'] == 'TEST123'
    assert 'PRIVATE' not in json.dumps(booked) and 'email' not in json.dumps(booked)
    assert run(api.call('sandbox/book', body)) == booked
    assert run(api.call('sandbox/status', {'token': p['token']})) == booked
    assert len(supplier.posts) == 1


def test_timeout_reconciles_instead_of_creating_second_booking():
    api, supplier, token = setup()
    p = run(api.call('sandbox/prebook', {'token': token}))
    supplier.lose_response = True
    result = run(api.call('sandbox/book', {'token': p['token'], 'confirm_mock': True,
                 'guests': [{'first_name': 'Test', 'last_name': 'Guest'}]}))
    assert result['status'] == 'confirmed' and len(supplier.posts) == 1


@pytest.mark.parametrize('key,scope', [('live_TEST', ('owner','plan')), ('sand_TEST', ('other','plan')), ('sand_TEST', ('owner','other')), ('sand_TEST', None)])
def test_live_keys_and_wrong_scopes_rejected_before_upstream(key, scope):
    api, _, token = setup()
    other = LiteApi(key, scope=scope, transport=httpx.MockTransport(lambda _: pytest.fail('Upstream called')))
    with pytest.raises(ProviderUnavailable):
        run(other.call('sandbox/prebook', {'token': token}))


def test_tampered_and_expired_handles_and_missing_consent():
    api, _, token = setup()
    with pytest.raises(ProviderUnavailable):
        run(api.call('sandbox/prebook', {'token': token[:-10] + 'abcdefghij'}))
    payload = cipher(api).decrypt(token.encode())
    expired = cipher(api).encrypt_at_time(payload, int(time.time())-901).decode()
    with pytest.raises(ProviderUnavailable):
        unseal(api, expired, 'offer')
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        run(api.call('sandbox/book', {'token': token, 'guests': []}))


def test_ski_resorts_and_small_municipalities_exclude_roads():
    def response(req):
        assert 'type' not in req.url.params
        return httpx.Response(200,json={'data': [
            {'placeId': str(i), 'displayName': kind, 'types': [kind]} for i, kind in
            enumerate(['ski_resort','administrative_area_level_3','route'])]})
    api=LiteApi('sand_TEST',transport=httpx.MockTransport(response))
    places=run(api.call('places',{'q':'Kreischberg','country_code':'AT'}))['places']
    assert [p['name'] for p in places] == ['ski_resort','administrative_area_level_3']
