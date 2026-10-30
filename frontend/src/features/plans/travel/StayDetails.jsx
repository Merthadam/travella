import React, { useEffect, useState } from "react";
import { travelRequest } from "./travelApi";
import { Price, refund } from "./TravelPresentation";
import { TravelDetailsDialog, offerExpired } from "./TravelDetailsDialog";

function Room({ room, onCheckout, onDiscuss, onChoose, onCompare }) {
  return (
    <article className="travel-room">
      <div>
        <h4>{room.name}</h4>
        <p>
          {room.board_name || "Meal plan unavailable"} ·{" "}
          {refund(room.refundable)}
        </p>
        <small>{room.occupancy_summary}</small>
        <p>
          {room.cancellation_summary ||
            "Cancellation deadline and penalties not supplied."}
        </p>
      </div>
      {(onDiscuss || onChoose) && <div className="travel-option-actions">{onDiscuss && <button type="button" onClick={onDiscuss}>Discuss room</button>}{onChoose && <button type="button" onClick={onChoose}>Choose for trip</button>}</div>}
      {onCompare && <button type="button" onClick={onCompare}>Compare room</button>}
      {onCheckout && room.checkout_token && <button type="button" onClick={() => onCheckout(room.checkout_token)}>Continue to stay checkout</button>}
      <Price
        price={{ ...room.total, excluded_taxes: room.excluded_taxes }}
        stay
        room
      />
    </article>
  );
}

export function StayDetails({ planId, observation, detached, booked, onClose, onExpired, onDiscuss, onChoose, onCompare, onCheckout }) {
  const { item, snapshot, historical, reference } = observation;
  const { criteria, sandbox } = snapshot;
  const roomId = reference?.room_id;
  const observedOnly = historical || Boolean(roomId);
  const [hotel, setHotel] = useState(null);
  const [roomObservation, setRoomObservation] = useState(() => ({
    rooms: roomId ? (item.rooms || []).filter(room => room.id === roomId) : item.rooms || [],
    reference: { search_id: snapshot.search_id, option_id: item.id },
    expiresAt: snapshot.expires_at,
    observedAt: null,
  }));
  const { rooms } = roomObservation;
  const evidenceExpired = offerExpired(roomObservation.expiresAt);
  const attach = room => ({ title: `${item.name} · ${room.name}`, reference: { ...roomObservation.reference, room_id: room.id } });
  const [loading, setLoading] = useState(!observedOnly);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (observedOnly) return;
    const controller = new AbortController();
    let live = true;
    setLoading(true);
    setError("");
    Promise.all([
      travelRequest(
        planId,
        "hotels/detail",
        { hotel_id: item.hotel_id },
        controller.signal,
      ),
      travelRequest(
        planId,
        "hotels/search",
        { ...criteria, hotel_id: item.hotel_id },
        controller.signal,
      ),
    ])
      .then(([details, availability]) => {
        if (live) {
          setHotel(details.hotel);
          setRoomObservation({
            rooms: availability.results[0]?.rooms || [],
            reference: { search_id: availability.search_id, option_id: availability.results[0]?.id },
            observedAt: availability.searched_at || null,
            expiresAt: availability.expires_at || (Number.isFinite(Date.parse(availability.searched_at)) ? new Date(Date.parse(availability.searched_at) + 600000).toISOString() : snapshot.expires_at),
          });
        }
      })
      .catch((e) => {
        if (live && e.name !== "AbortError") {
          setError(
            "Couldn’t refresh hotel details. Original search offers are shown below.",
          );
          if (e.status === 401) onExpired?.();
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [planId, item.hotel_id, snapshot, observedOnly, retry]);
  return (
    <TravelDetailsDialog observation={observation} detached={detached} evidenceExpired={evidenceExpired} refreshedAt={roomObservation.observedAt} onClose={onClose} className={!observedOnly ? 'travel-stay-dialog' : ''} busy={loading}>
      {loading ? <div className="travel-details-loading" role="status">
        <p>Refreshing hotel and room details…</p>
        <div className="travel-details-placeholder" aria-hidden="true"><span/><span/><span/></div>
      </div> : <>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((x) => x + 1)}>Retry details</button>
        </p>
      )}
      <p>{hotel?.address || item.address}</p>
      {hotel?.images?.length > 0 && (
        <div className="travel-gallery">
          {hotel.images.slice(0, 4).map((image, i) => (
            <img
              key={i}
              src={image.url}
              alt={image.caption || `${item.name}, photo ${i + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      )}
      <p>{hotel?.description}</p>
      {hotel?.facilities?.length > 0 && (
        <p>{hotel.facilities.join(" · ")}</p>
      )}
      <h3>Room offers for your stay</h3>
      {rooms.map((room) => (
        <Room key={room.id} room={room} onCheckout={sandbox && !booked && onCheckout && !loading && !evidenceExpired ? token => onCheckout({ offerToken: token }) : null} onCompare={!loading && roomObservation.reference.search_id && onCompare ? () => { onClose(); onCompare(attach(room)); } : null} onDiscuss={!evidenceExpired && roomObservation.reference.search_id && onDiscuss ? () => { onClose(); onDiscuss(attach(room)); } : null} onChoose={!evidenceExpired && roomObservation.reference.search_id && onChoose ? () => { onClose(); onChoose(attach(room)); } : null} />
      ))}
      {!loading && !rooms.length && (
        <p>No room offers are available for these dates.</p>
      )}
      </>}
    </TravelDetailsDialog>
  );
}
