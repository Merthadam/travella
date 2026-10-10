import asyncio
import json

import httpx
import pytest
from pydantic import ValidationError

from services.mcps.liteapi import LiteApi, ProviderUnavailable
from services.mcps.tests.test_liteapi import FLIGHT, flight_payload


def run(coro):
    return asyncio.run(coro)


class Supplier:
    status = 'PENDING_CONFIRMATION'
    environment = 'sandbox'
    lose_prebook = False
    lose_book = False

    def __init__(self):
        self.prebooks = 0
        self.books = []
        self.journey = flight_payload()['data'][0]['journeys'][0]
        self.journey = self.journey | self.journey['cheapestOffer']

    def __call__(self, req):
        path = req.url.path
        if path.endswith('/rates'):
            return httpx.Response(200, json=flight_payload())
        if path.endswith('/verify'):
            return httpx.Response(200, json={'data': [{'journey': self.journey}]})
        if path.endswith('/prebooks'):
            self.prebooks += 1
            body = json.loads(req.content)
            assert body['usePaymentSdk'] is False
            assert body['contact']['email'] == 'sandbox-guest@example.com'
            assert len(body['passengers']) == FLIGHT['adults']
            if self.lose_prebook:
                raise httpx.ReadTimeout('private')
            return httpx.Response(200, json={'data': [{'prebookId': 'PRIVATE_PREBOOK', 'booking': {'journey': self.journey}, 'price': 260, 'currency': 'EUR', 'paymentTypes': ['ACC_CREDIT_CARD']}]})
        if path.endswith('/bookings/'):
            body = json.loads(req.content)
            self.books.append(body)
            assert body == {'prebookId': 'PRIVATE_PREBOOK', 'payment': {'method': 'ACC_CREDIT_CARD'}}
            if self.lose_book:
                self.lose_book = False
                raise httpx.ReadTimeout('private')
            return httpx.Response(201, json={'data': [{'booking': {'bookingId': 'TEST_FLIGHT', 'status': self.status}}]})
        assert path.endswith('/bookings/TEST_FLIGHT')
        return httpx.Response(200, json={'data': [{'booking': {'bookingId': 'TEST_FLIGHT', 'status': self.status, 'providerEnvironment': self.environment, 'passengers': 'PRIVATE'}}]})


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv('FLIGHT_CHECKOUT_JOURNAL', str(tmp_path/'checkouts.sqlite'))
    supplier = Supplier()
    api = LiteApi('sand_TEST', scope=('owner', 'plan'), transport=httpx.MockTransport(supplier))
    search = run(api.call('flights/search', FLIGHT))
    token = search['results'][0]['checkout_token']
    return api, supplier, token


def call(api, action, token, consent=False):
    return run(api.call('sandbox/flights/'+action, {'token': token, **({'confirm_mock': True} if consent else {})}))


def test_verified_prebook_repriced_confirmed_readback_and_recovery(setup):
    api, supplier, token = setup
    verified = call(api, 'verify', token)
    assert verified['status'] == 'review' and supplier.prebooks == 0
    review = verified['token']
    prebook = call(api, 'prebook', review, True)
    assert prebook['status'] == 'ready_to_book' and prebook['flight']['price']['amount'] == '260'
    assert call(api, 'prebook', review, True) == prebook
    assert call(api, 'status', review) == prebook
    assert supplier.prebooks == 1
    pending = call(api, 'book', prebook['token'], True)
    assert pending['status'] == 'pending'
    supplier.status = 'CONFIRMED'
    confirmed = call(api, 'status', review)
    assert confirmed['status'] == 'confirmed' and confirmed['booking_id'] == 'TEST_FLIGHT'
    assert 'PRIVATE' not in json.dumps(confirmed)
    supplier.status = 'CANCELLED'
    assert call(api, 'status', review)['status'] == 'cancelled'


def test_prebook_timeout_never_repeats_provider_reservation(setup):
    api, supplier, token = setup
    review = call(api, 'verify', token)['token']
    supplier.lose_prebook = True
    with pytest.raises(ProviderUnavailable): call(api, 'prebook', review, True)
    assert call(api, 'status', review)['status'] == 'unknown'
    assert call(api, 'prebook', review, True)['status'] == 'unknown'
    assert supplier.prebooks == 1


def test_lost_booking_response_retries_same_prebook_only(setup):
    api, supplier, token = setup
    review = call(api, 'verify', token)['token']
    prebook = call(api, 'prebook', review, True)['token']
    supplier.lose_book = True
    with pytest.raises(ProviderUnavailable): call(api, 'book', prebook, True)
    assert call(api, 'status', prebook)['status'] == 'ready_to_book'
    supplier.status = 'CONFIRMED'
    assert call(api, 'book', prebook, True)['status'] == 'confirmed'
    assert supplier.books[0] == supplier.books[1] and supplier.prebooks == 1


@pytest.mark.parametrize('key,scope', [('live_TEST',('owner','plan')),('sand_TEST',('other','plan')),('sand_TEST',('owner','other')),('sand_TEST',None)])
def test_wrong_scopes_and_live_keys_never_call_provider(setup,key,scope):
    _, _, token = setup
    api = LiteApi(key, scope=scope, transport=httpx.MockTransport(lambda _: pytest.fail('Provider called')))
    with pytest.raises(ProviderUnavailable): call(api, 'verify', token)


def test_confirmation_and_sandbox_environment_required(setup):
    api, supplier, token = setup
    review = call(api, 'verify', token)['token']
    with pytest.raises(ValidationError): call(api, 'prebook', review)
    prebook = call(api, 'prebook', review, True)['token']
    with pytest.raises(ValidationError): call(api, 'book', prebook)
    supplier.status = 'CONFIRMED'; supplier.environment = 'production'
    with pytest.raises(ProviderUnavailable): call(api, 'book', prebook, True)
