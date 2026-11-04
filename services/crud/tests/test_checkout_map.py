"""Checkout location persistence through FastAPI and the real test database."""
from copy import deepcopy
import jwt
import pytest
from .test_api import system as system, create, write_headers, mutate
from .test_stay_reservation import reservation_payload, save


def payload():
    value = reservation_payload()
    value['snapshot']['components']['accommodation']['mockBooking']['mapSynced'] = True
    value['snapshot']['components']['accommodation']['mockBooking']['reservation']['position'] = {'lat': 0.0, 'lng': 0.0}
    value['snapshot']['components']['map'] = {'status': 'ready', 'destination': '', 'final': False, 'pins': [
        {'id': 'existing_google_pin', 'name': 'Existing hotel', 'category': 'stay', 'position': {'lat': 45.0, 'lng': 9.0}, 'description': 'Traveler note'}]}
    return value


def test_associate_add_read_retry_remove_and_restore(system):
    plan = create(system); path = f"/v1/plans/{plan['plan_id']}/canvas"
    value = payload()
    revision = save(system, path, plan['revision'], value)
    original = deepcopy(value['snapshot']['components']['map']['pins'][0])
    value['snapshot']['components']['map']['pins'][0]['source'] = {'provider': 'liteapi', 'id': 'lp1'}
    revision = save(system, path, revision, value)
    actual = system.client.get(path).json()['snapshot']
    assert actual == value['snapshot']
    from services.agent.editing_contracts import CanvasEditRequest
    projected = CanvasEditRequest(draft=actual).model_dump()['draft']
    assert projected['components']['map']['pins'][0]['source'] == {'provider': 'liteapi', 'id': 'lp1'}
    assert 'reservation' not in projected['components']['accommodation']['mockBooking']
    pin = actual['components']['map']['pins'][0]
    assert {k: pin[k] for k in original} == original
    value['snapshot']['components']['map']['pins'].append({'id': 'airport_MXP', 'source': {'provider': 'iata', 'id': 'MXP'}, 'category': 'airport', 'name': 'Malpensa', 'position': {'lat': 45.63, 'lng': 8.72}, 'description': 'MXP'})
    revision = save(system, path, revision, value)
    assert system.client.get(path).json()['snapshot'] == value['snapshot']
    assert system.client.post(path+'/challenge', json=value, headers=write_headers(system, plan['revision'])).status_code == 409
    for auth, status in [('', 401), ('Bearer '+jwt.encode({**system.claims, 'sub': 'stranger'}, system.private, algorithm='RS256'), 404)]:
        headers = {**write_headers(system, revision, 'test-challenge'), 'Authorization': auth}
        assert system.client.get(path, headers=headers).status_code == status
        assert system.client.post(path+'/challenge', json=value, headers=headers).status_code == status
        assert system.client.put(path, json=value, headers=headers).status_code == status
    value['snapshot']['components']['map']['pins'].pop()
    save(system, path, revision, value)
    assert system.client.get(path).json()['snapshot'] == value['snapshot']
    current = system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    deleted = mutate(system, current, 'delete').json()
    assert system.client.get(path).status_code == 404
    assert mutate(system, deleted, 'restore').status_code == 200
    assert system.client.get(path).json()['snapshot'] == value['snapshot']


@pytest.mark.parametrize('bad', ['duplicate', 'airport_code', 'category', 'coordinate', 'private', 'sync_marker'])
def test_invalid_location_never_persists(system, bad):
    plan = create(system); path = f"/v1/plans/{plan['plan_id']}/canvas"; value = payload()
    pin = value['snapshot']['components']['map']['pins'][0]
    pin['source'] = {'provider': 'liteapi', 'id': 'lp1'}
    if bad == 'duplicate': value['snapshot']['components']['map']['pins'].append({**deepcopy(pin), 'id': 'other'})
    if bad == 'airport_code': pin['source'] = {'provider': 'iata', 'id': 'MILAN'}
    if bad == 'category': pin['category'] = 'food'
    if bad == 'coordinate': value['snapshot']['components']['accommodation']['mockBooking']['reservation']['position']['lat'] = 91.0
    if bad == 'sync_marker': value['snapshot']['components']['accommodation']['mockBooking']['mapSynced'] = 'yes'
    if bad == 'private': pin['source']['token'] = 'PRIVATE'
    assert system.client.post(path+'/challenge', json=value, headers=write_headers(system, plan['revision'])).status_code == 422
    assert system.client.get(path).json()['snapshot'] is None


def test_flight_sync_marker_survives_pin_removal_and_reload(system):
    plan = create(system)
    path = f"/v1/plans/{plan['plan_id']}/canvas"
    value = payload()
    value['snapshot']['components']['flights'] = {
        **value['snapshot']['components']['flights'], 'bookingStatus': 'mock-booked',
        'mockBooking': {'reference': 'TEST-FLIGHT', 'origin': 'BUD', 'destination': 'MXP',
                        'departureDate': '2027-05-10', 'returnDate': '2027-05-17', 'mapSynced': True}}
    value['snapshot']['components']['map']['pins'].append({
        'id': 'airport', 'name': 'Malpensa', 'category': 'airport',
        'position': {'lat': 45.63, 'lng': 8.72}, 'description': '',
        'source': {'provider': 'iata', 'id': 'MXP'}})
    revision = save(system, path, plan['revision'], value)
    value['snapshot']['components']['map']['pins'].pop()
    save(system, path, revision, value)
    assert system.client.get(path).json()['snapshot'] == value['snapshot']
