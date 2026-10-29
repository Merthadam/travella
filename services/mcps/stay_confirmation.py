"""Allowlisted stay evidence, with explicit provenance and no contact/payment secrets."""
from services.mock_booking import StayReservation
from .liteapi import obj, items, text, money, terms, excluded


def room_details(rates):
    result = []
    for index, rate in enumerate(rates):
        refundable, cancellation, deadline = terms(rate)
        result.append({
            'room': rate.get('occupancyNumber', index + 1),
            'name': text(rate.get('name'), 500) or 'Room name not supplied',
            'board': text(rate.get('boardName'), 300),
            'occupancy': (f"{rate['adultCount']} adults, {rate.get('childCount', 0)} children"
                          if isinstance(rate.get('adultCount'), int) else None),
            'refundable': refundable, 'cancellation': cancellation,
            'cancellationDeadline': deadline, 'excludedTaxes': excluded(rate),
        })
    return result


def _room_number(room):
    """Booking rooms use snake case; older responses used camel case."""
    return room.get('occupancy_number', room.get('occupancyNumber'))


def _confirmed_rooms(state, booking):
    """Use a complete final room set, never mix sources under one source label."""
    raw_rooms = items(booking.get('bookedRooms'))
    if len(raw_rooms) != state['room_count']:
        return None
    rates = []
    for raw in raw_rooms:
        room = obj(raw)
        rate = obj(room.get('rate'))
        number = _room_number(room)
        name = text(obj(room.get('roomType')).get('name'), 500)
        board = text(room.get('boardName'), 300) or text(room.get('board'), 300)
        adults, children = room.get('adults'), room.get('children', room.get('children_count'))
        policy = (obj(room.get('cancellationPolicies')) or obj(rate.get('cancellationPolicies'))
                  or obj(booking.get('cancellationPolicies')))
        taxes = obj(rate.get('retailRate')).get('taxesAndFees')
        if (type(number) is not int or not 1 <= number <= state['room_count']
                or not name or not board or type(adults) is not int or adults < 0
                or type(children) is not int or children < 0 or not policy
                or not isinstance(taxes, list)):
            return None
        rates.append({'occupancyNumber': number, 'name': name, 'boardName': board,
                      'adultCount': adults, 'childCount': children,
                      'cancellationPolicies': policy, 'retailRate': obj(rate.get('retailRate'))})
    if {rate['occupancyNumber'] for rate in rates} != set(range(1, state['room_count'] + 1)):
        return None
    return sorted(room_details(rates), key=lambda room: room['room'])


def _confirmed_guests(state, booking):
    """Preserve confirmed lead names even when supplier room IDs conflict."""
    rooms = [obj(room) for room in items(booking.get('bookedRooms'))]
    numbers = [_room_number(room) for room in rooms]
    sound_rooms = (len(numbers) == state['room_count']
                   and all(type(number) is int for number in numbers)
                   and set(numbers) == set(range(1, state['room_count'] + 1)))
    guests = []

    def append(guest, number):
        first, last = text(guest.get('firstName'), 50), text(guest.get('lastName'), 50)
        if first and last:
            known = type(number) is int and 1 <= number <= state['room_count']
            guests.append({'room': number if known else None, 'firstName': first, 'lastName': last})

    for room in rooms:
        number = _room_number(room) if sound_rooms else None
        # LiteAPI may repeat the holder in nested guests across every room.
        # Its room-level lead name is authoritative when supplied.
        if text(room.get('firstName'), 50) and text(room.get('lastName'), 50):
            append(room, number)
        else:
            for guest in items(room.get('guests')):
                guest = obj(guest)
                append(guest, guest.get('occupancyNumber', number) if sound_rooms else None)
    if not guests:
        for guest in items(booking.get('guests')):
            guest = obj(guest)
            append(guest, guest.get('occupancyNumber'))
    return sorted(guests, key=lambda guest: (guest['room'] is None, guest['room'] or 0))


def reservation(state, booking):
    """Final booking evidence takes precedence; incomplete room sets stay labeled."""
    hotel = obj(booking.get('hotel'))
    total = money({'amount': booking.get('price'), 'currency': booking.get('currency')})
    final_price = total['amount'] is not None and total['currency'] is not None
    guests = _confirmed_guests(state, booking)
    confirmed_rooms = _confirmed_rooms(state, booking)
    rooms = confirmed_rooms or state.get('rooms')
    if not rooms:  # Legacy technical receipt: do not invent per-room facts.
        rooms = [{'room': i + 1, 'name': state['room']['name'] if state['room_count'] == 1 else 'Room details not saved',
                  'board': state['room'].get('board_name') if state['room_count'] == 1 else None}
                 for i in range(state['room_count'])]
    return StayReservation.model_validate({
        'hotelId': state['hotel_id'], 'address': text(hotel.get('address'), 1000) or state.get('address'),
        'confirmationCode': text(booking.get('hotelConfirmationCode'), 100),
        'roomCount': state['room_count'], 'rooms': rooms, 'guests': guests,
        'total': total if final_price else state['total'], 'priceSource': 'booking' if final_price else 'prebook',
        'roomSource': 'booking' if confirmed_rooms else 'prebook',
        'paymentStatus': text(booking.get('paymentStatus'), 100),
        'terms': text(booking.get('termsAndConditions'), 12000) or state.get('terms'),
    }).model_dump(mode='json')
