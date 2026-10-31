import React, { useEffect, useRef, useState } from "react";
import { safeTravelImage } from "./CanvasTravel";
import { travelRequest } from "./travelApi";
import { Price, refund } from "./TravelPresentation";
import { TravelDetailsDialog, offerExpired } from "./TravelDetailsDialog";

const dateLabel = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(+date) ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : value || 'Date unavailable';
};

function Room({ room, onCheckout, nights }) {
  return <article className="stay-room">
    <div className="stay-room-copy">
      <h4>{room.name}</h4>
      <p>{room.occupancy_summary || 'Occupancy unavailable'} · {room.board_name || 'Meal plan unavailable'}</p>
      <span className="stay-refund">{refund(room.refundable)}</span>
      <details className="stay-policy">
        <summary>Cancellation policy</summary>
        <p>{room.cancellation_summary || 'Cancellation deadline and penalties not supplied.'}</p>
      </details>
    </div>
    <div className="stay-room-action">
      <Price price={{ ...room.total, excluded_taxes: room.excluded_taxes }} stay room label={nights ? `Total for ${nights} nights` : 'Total stay'}/>
      {onCheckout && room.checkout_token
        ? <button type="button" className="travel-primary" onClick={() => onCheckout(room.checkout_token)}>Continue to checkout <span aria-hidden="true">→</span></button>
        : <small className="stay-checkout-unavailable">Checkout unavailable for this offer</small>}
    </div>
  </article>;
}

function HotelGallery({ images, name, onClose }) {
  const ref = useRef();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const trigger = document.activeElement;
    ref.current?.showModal();
    return () => trigger?.focus?.();
  }, []);
  const move = step => { setFailed(false); setIndex(value => (value + images.length + step) % images.length); };
  return <dialog ref={ref} className="travel-dialog stay-photo-dialog" aria-label={`${name} photos`} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDown={event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  }}>
    <button type="button" onClick={onClose}>← Back to rooms</button>
    <div className="stay-full-photo">{failed ? <p>Photo unavailable</p> : <img referrerPolicy="no-referrer" src={images[index].url} alt={images[index].caption || `${name}, photo ${index + 1}`} onError={() => setFailed(true)}/>}</div>
    <div className="stay-photo-controls">
      <button type="button" aria-label="Previous hotel photo" disabled={images.length < 2} onClick={() => move(-1)}>←</button>
      <small aria-live="polite">Photo {index + 1} of {images.length}</small>
      <button type="button" aria-label="Next hotel photo" disabled={images.length < 2} onClick={() => move(1)}>→</button>
    </div>
  </dialog>;
}

function HotelPhotos({ images, name }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const cover = images[0]?.url;
  useEffect(() => setFailed(false), [cover]);
  if (!images.length) return <div className="stay-no-photo">Hotel photos unavailable</div>;
  return <div className="stay-photos">
    <button type="button" className="stay-cover" aria-label={`View ${name} photos`} aria-haspopup="dialog" onClick={() => setExpanded(true)}>
      {failed ? <span>Photo unavailable</span> : <img referrerPolicy="no-referrer" src={cover} alt={images[0].caption || name} onError={() => setFailed(true)}/>}
      <span className="stay-photo-label">View photos ({images.length})</span>
    </button>
    {expanded && <HotelGallery images={images} name={name} onClose={() => setExpanded(false)}/>}
  </div>;
}

export function StayDetails({ planId, observation, detached, booked, onClose, onExpired, onCheckout }) {
  const { item, snapshot, historical, reference } = observation;
  const { criteria, sandbox } = snapshot;
  const roomId = reference?.room_id;
  const observedOnly = historical || Boolean(roomId);
  const [hotel, setHotel] = useState(null);
  const [roomObservation, setRoomObservation] = useState(() => ({
    rooms: roomId ? (item.rooms || []).filter(room => room.id === roomId) : item.rooms || [],
    expiresAt: snapshot.expires_at,
    observedAt: null,
  }));
  const { rooms } = roomObservation;
  const evidenceExpired = offerExpired(roomObservation.expiresAt);
  const [, updateExpiry] = useState(0);
  useEffect(() => {
    const remaining = Date.parse(roomObservation.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(() => updateExpiry(value => value + 1), Math.min(remaining + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [roomObservation.expiresAt]);
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
  const nights = Math.round((Date.parse(criteria.check_out) - Date.parse(criteria.check_in)) / 86400000);
  const party = criteria.rooms || [];
  const guests = party.reduce((total, room) => total + room.adults + (room.children_ages?.length || 0), 0);
  const images = (hotel?.images?.length ? hotel.images : item.image_url ? [{ url: item.image_url }] : []).map(image => ({ ...image, url: safeTravelImage(image.url) })).filter(image => image.url);
  const canCheckout = sandbox && !booked && onCheckout && !loading && !evidenceExpired;
  const checkout = token => {
    // Recheck at the action boundary, including after a suspended browser tab.
    if (!offerExpired(roomObservation.expiresAt)) onCheckout({ offerToken: token });
    else updateExpiry(value => value + 1);
  };
  return <TravelDetailsDialog observation={observation} onClose={onClose} className="travel-stay-dialog" busy={loading} compactStay>
    <div className="stay-detail-layout">
      <aside className="stay-property">
        <HotelPhotos images={images} name={item.name}/>
        <div className="stay-property-heading">
          {item.stars > 0 && <p className="stay-stars">{item.stars}-star hotel</p>}
          <h2 id="travel-detail-title">{item.name}</h2>
          <p>{hotel?.address || item.address || 'Address unavailable'}</p>
        </div>
        <details className="stay-about">
          <summary>About this hotel</summary>
          <p>{hotel?.description || 'Hotel description unavailable.'}</p>
          {(hotel?.facilities || item.facilities)?.length > 0 && <p>{(hotel?.facilities || item.facilities).join(' · ')}</p>}
        </details>
        <details className="stay-source">
          <summary>Price and availability details</summary>
          <p>{sandbox ? 'LiteAPI sandbox · test inventory' : 'LiteAPI results'}</p>
          <p>Observed {new Date(snapshot.searched_at).toLocaleString()}</p>
          {roomObservation.observedAt && <p>Room availability checked {new Date(roomObservation.observedAt).toLocaleString()}. The original search observation is unchanged.</p>}
          <p>Availability and prices can change.</p>
        </details>
      </aside>
      <section className="stay-rooms" aria-labelledby="stay-rooms-title">
        <div className="stay-rooms-heading"><div><span className="travel-kicker">YOUR STAY</span><h3 id="stay-rooms-title">Choose your room</h3></div>{!loading && <small>{rooms.length} room {rooms.length === 1 ? 'offer' : 'offers'}</small>}</div>
        <p className="stay-trip">{dateLabel(criteria.check_in)} – {dateLabel(criteria.check_out)}{nights > 0 && ` · ${nights} nights`}{guests > 0 && ` · ${guests} guests · ${party.length} ${party.length === 1 ? 'room' : 'rooms'}`}</p>
        {detached && <p className="travel-notice" role="status">Earlier search · inspecting its original observation. The main results have changed.</p>}
        {observedOnly && <p className="travel-notice" role="status">Original observed offer · no availability refresh requested.</p>}
        {evidenceExpired && !loading && <p className="travel-notice" role="status">This offer has expired. Search again to check current availability.</p>}
        {booked && <p className="travel-notice" role="status">A stay is already booked in this Plan.</p>}
        {loading ? <div className="travel-details-loading" role="status"><p>Refreshing hotel and room details…</p><div className="travel-details-placeholder" aria-hidden="true"><span/><span/><span/></div></div> : <>
          {error && <p className="travel-notice travel-error" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry details</button></p>}
          {rooms.map(room => <Room key={room.id} room={room} nights={nights > 0 ? nights : null} onCheckout={canCheckout ? checkout : null}/>)}
          {!rooms.length && <p className="travel-notice">No room offers are available for these dates.</p>}
          <p className="stay-assurance">{sandbox ? 'You’ll review the final total and guest details at checkout. Sandbox bookings are test-only.' : 'Availability and prices can change.'}</p>
        </>}
      </section>
    </div>
  </TravelDetailsDialog>;
}
