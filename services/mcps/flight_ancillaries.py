"""Allowlisted provider inventory; provider identifiers stay in the connector."""
import hashlib
from .liteapi import ProviderUnavailable, items, obj, text, money


def catalog(raw, criteria):
    segments = items(obj(obj(raw.get("booking")).get("journey")).get("segments"))
    segments = [s for direction in ("OUTBOUND", "INBOUND") for s in segments if isinstance(s, dict) and s.get("direction") == direction]
    keys = {s.get("segmentKey"): i for i, s in enumerate(segments) if isinstance(s, dict) and s.get("segmentKey")}
    ages = [30] * criteria["adults"] + criteria["children_ages"] + criteria["infant_ages"]
    result = {}
    for group in items(obj(raw.get("servicesAttachable")).get("groups")):
        for service in items(obj(group).get("services")):
            s = obj(service)
            kind = s.get("category", obj(group).get("category"))
            provider_id = text(s.get("serviceId"), 20000)
            segment = keys.get(s.get("segmentKey"))
            price = money(obj(obj(s.get("pricing")).get("display")))
            metadata = obj(obj(s.get("metadata")).get(kind))
            if kind not in ("seat", "baggage") or not provider_id or segment is None or price["amount"] is None or price["currency"] != raw.get("currency"):
                continue
            if kind == "seat" and metadata.get("available") is not True:
                continue
            passenger_type = s.get("passengerType", "ALL")
            applicable = [i for i, age in enumerate(ages) if (kind != "seat" or age >= 2) and passenger_type in ("ALL", "ADULT" if age >= 12 else "CHILD" if age >= 2 else "INFANT")]
            if not applicable:
                continue
            sid = hashlib.sha256(provider_id.encode()).hexdigest()[:32]
            max_quantity = metadata.get("maxQuantity", 1) if kind == "baggage" else 1
            if type(max_quantity) is not int or max_quantity < 1:
                continue
            result[sid] = {"provider_id": provider_id, "id": sid, "kind": kind,
                           "label": text(s.get("name"), 200) or ("Seat" if kind == "seat" else "Extra bag"),
                           "segment_index": segment, "passenger_indexes": applicable, "price": price,
                           "max_quantity": min(max_quantity, 3),
                           "seat_row": metadata.get("seatRow") if type(metadata.get("seatRow")) is int else None,
                           "seat_column": text(metadata.get("seatColumn"), 2)}
            if len(result) >= 2000:
                return result
    return result


def select(inventory, choices):
    selected, payload, used, seated, occupied = [], [], set(), set(), set()
    for choice in choices:
        service = inventory.get(choice["id"])
        passenger, quantity = choice["passenger_index"], choice.get("quantity", 1)
        if not service or passenger not in service["passenger_indexes"] or not 1 <= quantity <= service["max_quantity"] or (choice["id"], passenger) in used:
            raise ProviderUnavailable("invalid_services")
        used.add((choice["id"], passenger))
        if service["kind"] == "seat":
            assignment = (service["segment_index"], passenger)
            if assignment in seated or service["id"] in occupied:
                raise ProviderUnavailable("invalid_services")
            seated.add(assignment)
            occupied.add(service["id"])
        selected.append({**{k: service[k] for k in ("id", "kind", "label", "segment_index", "price")}, "passenger_index": passenger, "quantity": quantity})
        payload.append({"serviceId": service["provider_id"], "passengerIndex": passenger, "quantity": quantity})
    return selected, payload


def prefer_selected(inventory, selections):
    """A refreshed catalog can issue a new ID for an already attached service."""
    result = dict(inventory)
    for selected in selections:
        retained = result.get(selected["id"])
        if not retained:
            continue
        for sid, candidate in list(result.items()):
            if sid == retained["id"] or candidate["kind"] != retained["kind"] or candidate["segment_index"] != retained["segment_index"]:
                continue
            same_seat = (retained["kind"] == "seat" and retained.get("seat_row") and retained.get("seat_column")
                         and (candidate.get("seat_row"), candidate.get("seat_column")) == (retained["seat_row"], retained["seat_column"]))
            if same_seat or candidate["label"] == retained["label"]:
                del result[sid]
    return result


def recover(inventory, raw):
    values = obj(raw.get("booking")).get("selectedServices")
    if not isinstance(values, list):
        raise ProviderUnavailable("provider_response_invalid")
    ids = {s["provider_id"]: s["id"] for s in inventory.values()}
    choices = []
    for value in values:
        value = obj(value)
        sid = ids.get(value.get("serviceId"))
        if not sid or type(value.get("passengerIndex")) is not int:
            raise ProviderUnavailable("provider_response_invalid")
        choices.append({"id": sid, "passenger_index": value["passengerIndex"], "quantity": value.get("quantity", 1)})
    return select(inventory, choices)[0]
