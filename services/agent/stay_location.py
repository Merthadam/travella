"""Shared, host-resolved accommodation location evidence. Never mutates a Plan."""
import math

from .travel_contracts import HotelSearch, LocationAnchor, PlaceDetail


def saved_location_places(components):
    return {p['id']: p for p in components.get('map', {}).get('pins', [])}


async def resolve_stay_location(criteria, components, lookup):
    criteria = HotelSearch.model_validate(criteria).model_dump(mode='json')
    location = criteria.get('location')
    if not location:
        return criteria
    # Never accept model/browser names, coordinates or fabricated evidence.
    anchors = []
    places = saved_location_places(components)
    for identifier in location['saved_place_ids']:
        place = places.get(identifier)
        if not place:
            raise ValueError('location_place_changed')
        position = place.get('position') or {}
        anchors.append(LocationAnchor(id=identifier, name=place['name'],
            latitude=position.get('lat'), longitude=position.get('lng'), source='saved_place'))
    for identifier in location['reference_place_ids']:
        raw = await lookup('places/detail', {'place_id': identifier}, 'lookup')
        result = PlaceDetail.model_validate(raw)
        if result.place.id != identifier:
            raise ValueError('location_unavailable')
        anchors.append(result.place)
    if not anchors:
        criteria['location'] = None
        return criteria
    if not any(a.latitude is not None and a.longitude is not None for a in anchors):
        raise ValueError('location_unavailable')
    if location['matching'] == 'within_each' and any(a.latitude is None or a.longitude is None for a in anchors):
        raise ValueError('location_unavailable')
    location['anchors'] = [a.model_dump() for a in anchors]
    if not criteria.get('hotel_id'):
        location_query(location)
    return criteria


def distance_m(lat1, lon1, lat2, lon2):
    a, b = math.radians(lat1), math.radians(lat2)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371008.8 * 2 * math.asin(math.sqrt(min(1, max(0, h))))


def usable_anchors(location):
    return [a for a in (location or {}).get('anchors', []) if a['latitude'] is not None and a['longitude'] is not None]


def location_query(location):
    anchors = usable_anchors(location)
    if not anchors:
        raise ValueError('location_unavailable')
    first = anchors[0]
    # Hard intersection is a subset of the first circle. Flexible search covers
    # the selected places plus a margin with one bounded provider rate request.
    radius = location['radius_m'] if location['matching'] == 'within_each' else max(5000, math.ceil(max(distance_m(first['latitude'], first['longitude'], a['latitude'], a['longitude']) for a in anchors)) + 5000)
    if radius > 50000:
        raise ValueError('location_area_too_large')
    # LiteAPI live validation requires radius above 1000m. A larger retrieval
    # circle is a superset only; rank_location_results still enforces the exact
    # traveler radius against every anchor, with no silent relaxation.
    return {'latitude': first['latitude'], 'longitude': first['longitude'], 'radius': max(1001, radius)}


def rank_location_results(results, location):
    anchors = usable_anchors(location)
    if not anchors:
        return results
    ranked = []
    for hotel in results:
        lat, lng = hotel.get('latitude'), hotel.get('longitude')
        valid = isinstance(lat, (float, int)) and isinstance(lng, (float, int)) and math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180
        distances = [distance_m(lat, lng, a['latitude'], a['longitude']) for a in anchors] if valid else []
        if location['matching'] == 'within_each' and (not distances or max(distances) > location['radius_m']):
            continue
        ranked.append({**hotel, 'distance_mean_m': sum(distances)/len(distances) if distances else None,
                       'distance_max_m': max(distances) if distances else None, 'distance_count': len(distances)})
    return sorted(ranked, key=lambda hotel: hotel['distance_mean_m'] if hotel['distance_mean_m'] is not None else float('inf'))


def location_matches_saved(location, components):
    if not location:
        return True
    places = saved_location_places(components)
    for anchor in location.anchors:
        if anchor.source != 'saved_place':
            continue
        place = places.get(anchor.id)
        if not place or (place['name'], place.get('position', {}).get('lat'), place.get('position', {}).get('lng')) != (anchor.name, anchor.latitude, anchor.longitude):
            return False
    return True
