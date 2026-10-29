"""Allowlisted projection of the documented LiteAPI booking detail shape."""
from copy import deepcopy
import json
import pytest
from pydantic import ValidationError

from services.mcps.stay_confirmation import reservation
from services.mock_booking import StayGuest, StayReservation


def state():
    return {'hotel_id': 'lp1', 'room_count': 2,
            'rooms': [{'room': 1, 'name': 'Prebook one'}, {'room': 2, 'name': 'Prebook two'}],
            'total': {'amount': '200', 'currency': 'EUR'}}


def room(number):
    return {'occupancy_number': number, 'roomType': {'name': f'Confirmed {number}'},
            'boardName': 'Breakfast', 'adults': number, 'children': 0,
            'firstName': f'Guest{number}', 'lastName': 'Tester',
            'email': 'private@example.com',
            'rate': {'cancellationPolicies': {'refundableTag': 'RFN', 'cancelPolicyInfos': [
                {'cancelTime': '2027-05-01 12:00:00', 'timezone': 'UTC', 'amount': 30, 'currency': 'EUR'}]},
                'retailRate': {'taxesAndFees': [
                    {'description': 'City tax', 'included': False, 'amount': 4, 'currency': 'EUR'}]}}}


def test_reordered_documented_booking_rooms_preserve_guest_room_associations():
    result = reservation(state(), {'bookedRooms': [room(2), room(1)]})
    assert result['guests'] == [
        {'room': 1, 'firstName': 'Guest1', 'lastName': 'Tester'},
        {'room': 2, 'firstName': 'Guest2', 'lastName': 'Tester'}]
    assert [r['room'] for r in result['rooms']] == [1, 2]
    assert result['roomSource'] == 'booking'


def test_room_lead_takes_precedence_over_repeated_nested_holder_details():
    first = room(1)
    first['guests'] = [{'firstName': 'Second', 'lastName': 'Tester', 'occupancyNumber': 2},
                       {'firstName': 'Invalid', 'lastName': 'Tester', 'occupancyNumber': 9}]
    result = reservation(state(), {'bookedRooms': [first, room(2)]})
    assert result['guests'] == [{'room': 1, 'firstName': 'Guest1', 'lastName': 'Tester'},
                                {'room': 2, 'firstName': 'Guest2', 'lastName': 'Tester'}]


def test_nested_guest_is_used_only_when_room_lead_is_missing():
    first = room(1)
    first.pop('firstName')
    first.pop('lastName')
    first['guests'] = [{'firstName': 'Nested', 'lastName': 'Tester', 'occupancyNumber': 1}]
    result = reservation(state(), {'bookedRooms': [first, room(2)]})
    assert result['guests'][0] == {'room': 1, 'firstName': 'Nested', 'lastName': 'Tester'}


def test_observed_duplicate_room_numbers_keep_both_leads_without_inventing_assignments():
    # Actual sandbox shape: distinct room leads, repeated room ID and nested holder.
    final = [room(1), room(1)]
    for item, first in zip(final, ['Alex', 'Sam']):
        item.update(firstName=first, lastName='Tester', guests=[
            {'firstName': 'Alex', 'lastName': 'Tester', 'occupancyNumber': 1}])
    result = reservation(state(), {'bookedRooms': final})
    assert result['guests'] == [{'room': None, 'firstName': 'Alex', 'lastName': 'Tester'},
                                {'room': None, 'firstName': 'Sam', 'lastName': 'Tester'}]
    assert result['roomSource'] == 'prebook'
    assert StayReservation.model_validate(result).guests[1].room is None


def test_missing_room_identifiers_do_not_assume_array_position():
    final = [room(2), room(1)]
    for item in final:
        item.pop('occupancy_number')
    result = reservation(state(), {'bookedRooms': final})
    assert [guest['room'] for guest in result['guests']] == [None, None]
    assert result['roomSource'] == 'prebook'


@pytest.mark.parametrize('number', [True, '1', 0, 5])
def test_nullable_guest_room_remains_strict_and_bounded(number):
    with pytest.raises(ValidationError):
        StayGuest.model_validate({'room': number, 'firstName': 'Alex', 'lastName': 'Tester'})


def test_final_room_terms_occupancy_board_and_taxes_replace_prebook_as_one_source():
    result = reservation(state(), {'bookedRooms': [room(1), room(2)], 'price': 220, 'currency': 'EUR'})
    assert result['roomSource'] == result['priceSource'] == 'booking'
    assert result['total'] == {'amount': '220', 'currency': 'EUR'}
    first = result['rooms'][0]
    assert first['name'] == 'Confirmed 1' and first['board'] == 'Breakfast'
    assert first['occupancy'] == '1 adults, 0 children'
    assert first['refundable'] is True and '30 EUR' in first['cancellation']
    assert first['cancellationDeadline'] == '2027-05-01 12:00:00 UTC'
    assert first['excludedTaxes'] == [{'name': 'City tax', 'amount': '4', 'currency': 'EUR'}]
    assert 'private@example.com' not in json.dumps(result)


def test_room_policy_precedes_rate_and_global_policy_with_documented_aliases():
    first = room(1)
    first['board'] = first.pop('boardName')
    first['children_count'] = first.pop('children')
    first['cancellationPolicies'] = {'refundableTag': 'NRFN'}
    second = room(2)
    second['rate'].pop('cancellationPolicies')
    result = reservation(state(), {'bookedRooms': [first, second],
                                  'cancellationPolicies': {'refundableTag': 'NRFN'}})
    assert result['roomSource'] == 'booking'
    assert all(r['refundable'] is False for r in result['rooms'])


def test_incomplete_or_duplicate_final_room_set_keeps_prebook_source_without_mixing():
    for final in ([room(1)], [room(1), room(1)]):
        result = reservation(state(), {'bookedRooms': final})
        assert result['roomSource'] == 'prebook'
        assert [r['name'] for r in result['rooms']] == ['Prebook one', 'Prebook two']
    for field in ('roomType', 'boardName', 'adults', 'children', 'rate'):
        final = [room(1), room(2)]
        final[1].pop(field)
        result = reservation(state(), {'bookedRooms': final})
        assert result['roomSource'] == 'prebook'
        assert [r['name'] for r in result['rooms']] == ['Prebook one', 'Prebook two']


def test_projection_does_not_mutate_provider_response_or_prebook_state():
    original_state, booking = state(), {'bookedRooms': [room(2), room(1)]}
    before = deepcopy((original_state, booking))
    reservation(original_state, booking)
    assert (original_state, booking) == before


def test_missing_final_tax_information_does_not_erase_prebook_property_charges():
    before = state()
    before['rooms'][0]['excludedTaxes'] = [{'name': 'City tax', 'amount': '4', 'currency': 'EUR'}]
    rooms = [room(1), room(2)]
    rooms[0]['rate'].pop('retailRate')
    result = reservation(before, {'bookedRooms': rooms})
    assert result['roomSource'] == 'prebook'
    assert result['rooms'][0]['excludedTaxes'] == before['rooms'][0]['excludedTaxes']
