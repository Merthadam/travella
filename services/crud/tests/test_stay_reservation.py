"""Reservation persistence uses real HTTP handlers and the SQLAlchemy test database."""
from copy import deepcopy
from uuid import UUID
from datetime import timedelta
import json
import pytest
from services.mock_booking import StayReservation, without_stay_document
from services.agent.editing_contracts import CanvasEditRequest
from .test_api import system as system, create, write_headers, mutate
from .test_canvas_mock_booking import body


def reservation_payload():
    value = body()
    doc = StayReservation(hotelId='lp1', address='Example street', confirmationCode='HOTEL-TEST', roomCount=2,
        rooms=[{'room':1,'name':'Double','board':'Breakfast','cancellation':'Non-refundable'},
               {'room':2,'name':'Twin','cancellationDeadline':'2027-01-01 12:00 UTC'}],
        guests=[{'room':1,'firstName':'Alex','lastName':'Tester'}, {'room':2,'firstName':'Sam','lastName':'Tester'}],
        total={'amount':'450.50','currency':'EUR'}, priceSource='booking', terms='Provider terms')
    value['snapshot']['components']['accommodation']['mockBooking']['reservation'] = doc.model_dump()
    return value


def save(system, path, revision, payload):
    challenge = system.client.post(path+'/challenge', json=payload, headers=write_headers(system, revision))
    assert challenge.status_code == 200, challenge.text
    headers = write_headers(system, revision, challenge.json()['challenge'])
    result = system.client.put(path, json=payload, headers=headers)
    assert result.status_code == 200, result.text
    assert system.client.put(path, json=payload, headers=headers).json() == result.json()
    return result.json()['revision']


def test_reservation_save_read_update_delete_restore(system):
    plan = create(system); path = f"/v1/plans/{plan['plan_id']}/canvas"
    payload = reservation_payload()
    revision = save(system,path,plan['revision'],payload)
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    payload['snapshot']['components']['accommodation']['mockBooking']['reservation']['confirmationCode'] = 'HOTEL-FINAL'
    revision = save(system,path,revision,payload)
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']
    current = system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    deleted = mutate(system, current, 'delete').json()
    assert system.client.get(path).status_code == 404
    restored = mutate(system, deleted, 'restore')
    assert restored.status_code == 200
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']


def test_existing_stay_cannot_be_replaced(system):
    plan=create(system); path=f"/v1/plans/{plan['plan_id']}/canvas"; payload=reservation_payload()
    revision=save(system,path,plan['revision'],payload)
    other=deepcopy(payload); other['snapshot']['components']['accommodation']['mockBooking']['reference']='SECOND'
    assert system.client.post(path+'/challenge',json=other,headers=write_headers(system,revision)).status_code == 400
    assert system.client.get(path).json()['snapshot'] == payload['snapshot']


@pytest.mark.parametrize('field,value', [('token','SECRET'),('email','PRIVATE'),('cardNumber','SECRET'),('raw',{}),('roomCount',3)])
def test_private_or_inconsistent_document_rejected(system,field,value):
    plan=create(system); path=f"/v1/plans/{plan['plan_id']}/canvas"; payload=reservation_payload()
    payload['snapshot']['components']['accommodation']['mockBooking']['reservation'][field]=value
    assert system.client.post(path+'/challenge',json=payload,headers=write_headers(system,plan['revision'])).status_code == 422
    assert system.client.get(path).json()['snapshot'] is None


def test_document_removed_before_agent_context_without_mutating_saved_copy():
    snapshot=reservation_payload()['snapshot']
    projected=without_stay_document(snapshot)
    assert 'Alex' not in json.dumps(projected) and 'reservation' not in json.dumps(projected)
    assert 'Alex' in json.dumps(snapshot)
    request=CanvasEditRequest(draft=snapshot)
    assert 'Alex' not in request.model_dump_json()


def test_reservation_is_removed_with_plan_after_recovery_deadline(system):
    from services.crud.repository import PlanRepository
    from services.crud.models import PlanningCanvas
    plan=create(system); path=f"/v1/plans/{plan['plan_id']}/canvas"
    save(system,path,plan['revision'],reservation_payload())
    current=system.client.get(f"/v1/plans/{plan['plan_id']}").json()
    assert mutate(system,current,'delete').status_code == 200
    system.current[0] += timedelta(days=7)
    with system.factory() as db:
        assert PlanRepository(db,clock=lambda:system.current[0]).purge_expired() == 1
        assert db.get(PlanningCanvas,UUID(plan['plan_id'])) is None
    assert system.client.get(path).status_code == 404
