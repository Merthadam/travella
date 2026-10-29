import asyncio
import json
import time
import httpx
import pytest
from services.mcps.liteapi import LiteApi, ProviderUnavailable
from services.mcps.sandbox_checkout import cipher, unseal
from services.mcps.tests.test_liteapi import HOTEL, hotel_payload


@pytest.fixture(autouse=True)
def isolated_stay_journal(tmp_path, monkeypatch):
    monkeypatch.setenv('STAY_CHECKOUT_JOURNAL', str(tmp_path / 'stays.sqlite3'))


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
        if '/bookings/' in path:
            return httpx.Response(200, json={'data': self.booking})
        assert path.endswith('/book') and req.url.host == 'book.liteapi.travel'
        body = json.loads(req.content)
        assert body['sandbox'] is True and body['payment'] == {'method': 'ACC_CREDIT_CARD'}
        assert body['holder']['email'] == 'sandbox-guest@example.com'
        self.posts.append(body)
        self.booking = {'bookingId': 'TEST123', 'status': 'CONFIRMED', 'clientReference': body['clientReference'],
                        'hotelConfirmationCode': 'TEST456', 'holder': {'email': 'PRIVATE_EMAIL'},
                        'guests': body['guests'], 'price': 125.5, 'currency': 'EUR', 'paymentStatus': 'TEST'}
        if self.lose_response:
            raise httpx.ReadTimeout('private upstream details')
        return httpx.Response(200, json={'data': self.booking})


def setup():
    supplier = Supplier()
    api = LiteApi('sand_TEST', scope=('owner', 'plan'), transport=httpx.MockTransport(supplier))
    result = run(api.call('hotels/search', HOTEL))
    token = result['results'][0]['rooms'][0]['checkout_token']
    return api, supplier, token


def test_expired_journal_is_purged_without_checkout_traffic(monkeypatch):
    from services.mcps.sandbox_checkout import stored_checkout, prune_stay_receipts, receipt_database
    import sqlite3
    api, supplier, token = setup()
    prebook = run(api.call('sandbox/prebook', {'token': token}))
    stored_checkout(api, prebook['token'])
    now = int(time.time())
    monkeypatch.setattr('services.mcps.sandbox_checkout.time.time', lambda: now + 604801)
    prune_stay_receipts()
    with sqlite3.connect(receipt_database()) as db:
        assert db.execute('SELECT count(*) FROM receipts').fetchone()[0] == 0


def test_previous_supplier_booking_blocks_fresh_offer_after_receipt_removal():
    from services.mcps.sandbox_checkout import receipt_database
    import sqlite3
    api, supplier, token = setup()
    prebook = run(api.call('sandbox/prebook', {'token': token}))
    run(api.call('sandbox/book', {'token': prebook['token'], 'confirm_mock': True,
        'guests': [{'first_name': 'Alex', 'last_name': 'Tester'}]}))
    with sqlite3.connect(receipt_database()) as db, db:
        db.execute('DELETE FROM receipts')
    with pytest.raises(ProviderUnavailable, match='stay_already_booked'):
        run(api.call('sandbox/prebook', {'token': token}))
    assert len(supplier.posts) == 1


def test_final_booking_identity_change_cannot_produce_mixed_confirmation():
    api, supplier, token = setup()
    prebook = run(api.call('sandbox/prebook', {'token': token}))
    run(api.call('sandbox/book', {'token': prebook['token'], 'confirm_mock': True,
        'guests': [{'first_name': 'Alex', 'last_name': 'Tester'}]}))
    supplier.booking['hotel'] = {'hotelId': 'another-property'}
    with pytest.raises(ProviderUnavailable, match='provider_response_invalid'):
        run(api.call('sandbox/status', {'token': prebook['token']}))


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


def test_confirmation_retains_names_and_room_terms_without_contact_or_handles():
    api, supplier, token = setup()
    prebook = run(api.call('sandbox/prebook', {'token': token}))
    booked = run(api.call('sandbox/book', {'token': prebook['token'], 'confirm_mock': True,
                 'guests': [{'first_name': 'Alex', 'last_name': 'Tester'}]}))
    doc = booked['reservation']
    assert doc['guests'] == [{'room': 1, 'firstName': 'Alex', 'lastName': 'Tester'}]
    assert doc['confirmationCode'] == 'TEST456' and doc['priceSource'] == 'booking'
    assert doc['rooms'][0]['name'] and doc['roomSource'] == 'prebook'
    assert not any(value in json.dumps(doc) for value in ['email', 'PRIVATE', 'token', 'prebookId'])
    assert run(api.call('sandbox/status', {'token': prebook['token']}))['reservation'] == doc


def test_second_offer_in_same_plan_recovers_original_instead_of_booking_again():
    api, supplier, token = setup()
    first = run(api.call('sandbox/prebook', {'token': token}))
    # A second tab may prebook before the first tab submits.
    second = run(api.call('sandbox/prebook', {'token': token}))
    booked = run(api.call('sandbox/book', {'token': first['token'], 'confirm_mock': True,
                 'guests': [{'first_name': 'Alex', 'last_name': 'Tester'}]}))
    recovered = run(api.call('sandbox/prebook', {'token': token}))
    assert recovered['booking_id'] == booked['booking_id'] and len(supplier.posts) == 1
    from services.mcps.sandbox_checkout import seal, unseal
    alternate = unseal(api, second['token'], 'checkout'); alternate['prebook'] = 'OTHER'
    with pytest.raises(ProviderUnavailable, match='stay_already_booked'):
        run(api.call('sandbox/book', {'token': seal(api, 'checkout', alternate), 'confirm_mock': True,
            'guests': [{'first_name': 'Other', 'last_name': 'Tester'}]}))
    assert len(supplier.posts) == 1


def test_per_room_terms_and_unknown_final_values_are_not_invented():
    from services.mcps.stay_confirmation import room_details, reservation
    rates = [dict(name='Double', occupancyNumber=1, boardName='Breakfast', adultCount=2,
                  cancellationPolicies={'refundableTag': 'NRFN'}),
             dict(name='Twin', occupancyNumber=2, boardName='Room only', adultCount=1,
                  cancellationPolicies={'refundableTag': 'RFN', 'cancelPolicyInfos': [
                      {'cancelTime': '2027-01-01 12:00:00', 'timezone': 'UTC', 'amount': 20, 'currency': 'EUR'}]})]
    state = dict(hotel_id='lp1', room_count=2, total={'amount':'200','currency':'EUR'}, rooms=room_details(rates))
    doc = reservation(state, {'status':'CONFIRMED'})
    assert doc['rooms'][0]['refundable'] is False
    assert doc['rooms'][1]['cancellationDeadline'] == '2027-01-01 12:00:00 UTC'
    assert doc['priceSource'] == 'prebook' and doc['paymentStatus'] is None and doc['guests'] == []


def test_unknown_submission_is_not_sent_again_even_without_visible_provider_booking():
    api, supplier, token=setup()
    first=run(api.call('sandbox/prebook',{'token':token}))
    from services.mcps.sandbox_checkout import stored_checkout
    stored_checkout(api, first['token'])
    result=run(api.call('sandbox/book',{'token':first['token'],'confirm_mock':True,
        'guests':[{'first_name':'Alex','last_name':'Tester'}]}))
    assert result['status']=='not_found' and supplier.posts==[]
