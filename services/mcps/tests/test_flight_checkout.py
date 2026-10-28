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
    environment_shape = 'current'

    def __init__(self):
        self.prebooks = 0
        self.books = []
        self.selected = []
        self.service_calls = 0
        self.lose_services = False
        self.journey = flight_payload()['data'][0]['journeys'][0]
        self.journey = self.journey | self.journey['cheapestOffer']

    def prebook_data(self):
        self.journey['segments'][0]['segmentKey'] = 'out'
        return {'prebookId': 'PRIVATE_PREBOOK', 'booking': {'journey': self.journey, 'selectedServices': self.selected},
                'price': 260 + sum((12 if s['serviceId'] == 'PRIVATE_SEAT' else 30) * s['quantity'] for s in self.selected),
                'currency': 'EUR', 'paymentTypes': ['TRANSACTION_ID'], 'secretKey': 'pi_test_secret_test', 'transactionId': 'tr_test',
                'servicesAttachable': {'groups': [{'category': 'seat', 'services': [
                    {'serviceId': 'PRIVATE_SEAT_REFRESHED' if self.selected else 'PRIVATE_SEAT', 'name': 'Seat 12A', 'category': 'seat', 'segmentKey': 'out', 'passengerType': 'ALL', 'pricing': {'display': {'amount': 12, 'currency': 'EUR'}}, 'metadata': {'seat': {'available': True, 'seatRow': 12, 'seatColumn': 'A'}}}]},
                    {'category': 'baggage', 'services': [{'serviceId': 'PRIVATE_BAG', 'name': 'Checked bag 23kg', 'category': 'baggage', 'segmentKey': 'out', 'passengerType': 'ALL', 'pricing': {'display': {'amount': 30, 'currency': 'EUR'}}, 'metadata': {'baggage': {'maxQuantity': 2}}}]}]}}

    def __call__(self, req):
        path = req.url.path
        if path.endswith('/rates'):
            return httpx.Response(200, json=flight_payload())
        if path.endswith('/verify'):
            return httpx.Response(200, json={'data': [{'journey': self.journey}]})
        if path.endswith('/services'):
            self.service_calls += 1
            self.selected = json.loads(req.content)['selectedServices']
            if self.lose_services:
                self.lose_services = False
                raise httpx.ReadTimeout('private')
            return httpx.Response(200, json={'data': [self.prebook_data()]})
        if path.endswith('/prebooks/PRIVATE_PREBOOK'):
            return httpx.Response(200, json={'data': [self.prebook_data()]})
        if path.endswith('/prebooks'):
            self.prebooks += 1
            body = json.loads(req.content)
            self.last_prebook = body
            assert body['usePaymentSdk'] is True
            assert body['contact']['email'] == 'sandbox-guest@example.com'
            assert len(body['passengers']) == FLIGHT['adults']
            if self.lose_prebook:
                raise httpx.ReadTimeout('private')
            return httpx.Response(200, json={'data': [self.prebook_data()]})
        if path.endswith('/bookings/'):
            body = json.loads(req.content)
            self.books.append(body)
            assert body == {'prebookId': 'PRIVATE_PREBOOK', 'payment': {'method': 'TRANSACTION_ID', 'transactionId': 'tr_test'}}
            if self.lose_book:
                self.lose_book = False
                raise httpx.ReadTimeout('private')
            return httpx.Response(201, json={'data': [{'booking': {'bookingId': 'TEST_FLIGHT', 'status': self.status}}]})
        assert path.endswith('/bookings/TEST_FLIGHT')
        markers = {'ticketData': {'pointOfSale': {'environment': self.environment}}} if self.environment_shape == 'current' else {'providerEnvironment': self.environment} if self.environment_shape == 'legacy' else {'providerEnvironment': 'production', 'ticketData': {'pointOfSale': {'environment': 'sandbox'}}} if self.environment_shape == 'conflicting' else {}
        return httpx.Response(200, json={'data': [{'booking': {'bookingId': 'TEST_FLIGHT', 'status': self.status, **markers, 'passengers': 'PRIVATE'}}]})


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


def test_city_search_verify_preserves_selected_airports():
    payload = flight_payload()
    journey = payload['data'][0]['journeys'][0]
    journey['segments'][0]['destinationCode'] = 'MXP'
    journey['segments'][1]['originCode'] = 'LIN'
    verified = journey | journey['cheapestOffer']
    def respond(request):
        return httpx.Response(200, json=payload if request.url.path.endswith('/rates') else {'data': [{'journey': verified}]})
    api = LiteApi('sand_TEST', scope=('owner', 'plan'), transport=httpx.MockTransport(respond))
    result = run(api.call('flights/search', FLIGHT | {'destination': 'MIL'}))
    token = result['results'][0]['checkout_token']
    assert call(api, 'verify', token)['status'] == 'review'
    verified['segments'][0]['destinationCode'] = 'BGY'
    with pytest.raises(ProviderUnavailable, match='provider_response_invalid'):
        call(api, 'verify', token)


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


@pytest.mark.parametrize('shape,accepted', [('current', True), ('legacy', True), ('missing', False), ('conflicting', False)])
def test_readback_environment_shapes_fail_closed(setup, shape, accepted):
    api, supplier, token = setup
    supplier.environment_shape = shape; supplier.status = 'CONFIRMED'
    review = call(api, 'verify', token)['token']
    prebook = call(api, 'prebook', review, True)['token']
    if accepted:
        result = call(api, 'book', prebook, True)
        assert result['status'] == 'confirmed'
        assert 'ticketData' not in result and 'passengers' not in result
    else:
        with pytest.raises(ProviderUnavailable, match='provider_response_invalid'):
            call(api, 'book', prebook, True)


def party_data():
    from services.mcps.flight_checkout import passengers
    values = [{"first_name": p["firstName"], "last_name": "Example", "date_of_birth": p["birthday"],
               "gender": p["gender"], "nationality": p["nationality"], "document_issue_country": p["documentIssueCountry"],
               "document_number": p["documentNumber"], "document_expiry": p["documentExpiry"]} for p in passengers({'children_ages': [], 'infant_ages': [], **FLIGHT})]
    return {"passengers": values, "contact": {"first_name": "Alex", "last_name": "Example", "email": "sandbox-guest@example.com", "phone_country_code": "1", "phone_number": "2025550123"}}


def test_supplied_passengers_reach_provider_but_never_enter_receipt_or_projection(setup):
    from services.mcps.sandbox_checkout import unseal
    api, supplier, token = setup
    verified = call(api, 'verify', token)
    data = party_data()
    result = run(api.call('sandbox/flights/prebook', {"token": verified['token'], "confirm_mock": True, **data}))
    assert supplier.last_prebook['passengers'][0]['lastName'] == 'Example'
    private_state = unseal(api, result['token'], 'flight-checkout')
    assert 'Example' not in json.dumps(private_state)
    assert 'TEST0000' not in json.dumps(private_state)
    assert 'passengers' not in private_state and 'contact' not in private_state
    assert 'document_number' not in json.dumps(result)
    assert verified['passenger_ages'] == [30] * FLIGHT['adults']


@pytest.mark.parametrize('invalid', ['count', 'age', 'expiry', 'real_email', 'real_document', 'partial'])
def test_invalid_passengers_never_claim_or_reserve(setup, invalid):
    api, supplier, token = setup
    verified = call(api, 'verify', token)
    data = party_data()
    if invalid == 'count': data['passengers'].append(data['passengers'][0])
    if invalid == 'age': data['passengers'][0]['date_of_birth'] = FLIGHT['departure_date']
    if invalid == 'expiry': data['passengers'][0]['document_expiry'] = FLIGHT['return_date']
    if invalid == 'real_email': data['contact']['email'] = 'person@real-domain.com'
    if invalid == 'real_document': data['passengers'][0]['document_number'] = 'AB1234567'
    if invalid == 'partial': del data['contact']
    with pytest.raises((ProviderUnavailable, ValidationError)):
        run(api.call('sandbox/flights/prebook', {"token": verified['token'], "confirm_mock": True, **data}))
    assert supplier.prebooks == 0
    assert call(api, 'prebook', verified['token'], True)['status'] == 'ready_to_book'
    assert supplier.prebooks == 1


def test_services_reprice_clear_reject_stale_and_keep_receipt(setup):
    api, supplier, token = setup
    prebook = call(api, 'prebook', call(api, 'verify', token)['token'], True)
    seat, bag = prebook['services']
    assert 'PRIVATE' not in json.dumps(prebook)
    assert len(prebook['token']) < 40000
    selections = [{'id': seat['id'], 'passenger_index': 0, 'quantity': 1}, {'id': bag['id'], 'passenger_index': 1, 'quantity': 2}]
    def attach(token, choices):
        return run(api.call('sandbox/flights/services', {'token': token, 'confirm_mock': True, 'selected_services': choices}))
    seats_only = attach(prebook['token'], selections[:1])
    assert seats_only['flight']['price']['amount'] == '272'
    assert [s['id'] for s in seats_only['services'] if s['kind'] == 'seat'] == [seat['id']]
    changed = attach(seats_only['token'], selections)
    assert changed['flight']['price']['amount'] == '332'
    assert supplier.selected[0]['serviceId'] == 'PRIVATE_SEAT'
    assert changed['selected_services'][1]['passenger_index'] == 1
    with pytest.raises(ProviderUnavailable, match='checkout_changed'):
        call(api, 'book', prebook['token'], True)
    assert not supplier.books
    cleared = attach(changed['token'], [])
    assert cleared['flight']['price']['amount'] == '260' and cleared['selected_services'] == []
    assert call(api, 'status', prebook['token'])['token'] == cleared['token']
    supplier.status = 'CONFIRMED'
    final = call(api, 'book', cleared['token'], True)
    assert final['status'] == 'confirmed' and final['payment_secret'] is None
    assert call(api, 'book', cleared['token'], True)['status'] == 'confirmed'
    assert len(supplier.books) == 1


@pytest.mark.parametrize('invalid', ['forged', 'duplicate', 'passenger', 'quantity', 'occupied'])
def test_invalid_service_assignments_never_reach_provider(setup, invalid):
    api, supplier, token = setup
    prebook = call(api, 'prebook', call(api, 'verify', token)['token'], True)
    choice = {'id': prebook['services'][0]['id'], 'passenger_index': 0, 'quantity': 1}
    choices = [choice]
    if invalid == 'forged': choice['id'] = 'fake'
    if invalid == 'duplicate': choices.append(dict(choice))
    if invalid == 'passenger': choice['passenger_index'] = 8
    if invalid == 'quantity': choice['quantity'] = 2
    if invalid == 'occupied': choices.append({**choice, 'passenger_index': 1})
    with pytest.raises(ProviderUnavailable, match='invalid_services'):
        run(api.call('sandbox/flights/services', {'token': prebook['token'], 'confirm_mock': True, 'selected_services': choices}))
    assert supplier.service_calls == 0


def test_lost_service_response_requires_readback_before_payment(setup):
    api, supplier, token = setup
    prebook = call(api, 'prebook', call(api, 'verify', token)['token'], True)
    supplier.lose_services = True
    with pytest.raises(ProviderUnavailable):
        run(api.call('sandbox/flights/services', {'token': prebook['token'], 'confirm_mock': True, 'selected_services': [{'id': prebook['services'][0]['id'], 'passenger_index': 0}]}))
    with pytest.raises(ProviderUnavailable, match='checkout_changed'):
        call(api, 'book', prebook['token'], True)
    recovered = call(api, 'status', prebook['token'])
    assert recovered['status'] == 'ready_to_book' and recovered['flight']['price']['amount'] == '272'
    assert len(recovered['selected_services']) == 1 and not supplier.books
