import React, { useEffect, useRef } from "react";

export const offerExpired = expiresAt => !Number.isFinite(Date.parse(expiresAt)) || Date.now() >= Date.parse(expiresAt);

export function TravelDetailsDialog({ observation, detached, evidenceExpired, refreshedAt, onClose, children, className = '', busy = false }) {
  const { item, snapshot, historical, reference } = observation;
  const { criteria, sandbox, searched_at: observedAt } = snapshot;
  const stay = snapshot.mode === "stays";
  const observedOnly = historical || Boolean(reference?.room_id);
  const ref = useRef();
  useEffect(() => {
    const focus = document.activeElement;
    ref.current?.showModal();
    return () => focus?.focus?.();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`travel-dialog ${className}`.trim()}
      aria-labelledby="travel-detail-title"
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        className="travel-close"
        aria-label="Close details"
        onClick={onClose}
      >
        ×
      </button>
      <span className="travel-kicker">
        {stay ? "A CLOSER LOOK" : "YOUR RETURN JOURNEY"}
      </span>
      <p className="travel-note">
        {sandbox ? "LiteAPI sandbox · test inventory" : "LiteAPI results"}
      </p>
      {detached && <p role="status">Earlier search · inspecting its original observation. The main results have changed.</p>}
      {observedOnly && <p role="status">Original observed offer · no availability refresh requested.</p>}
      <p className="travel-note">Observed {new Date(observedAt).toLocaleString()} · {criteria.check_in || criteria.departure_date} – {criteria.check_out || criteria.return_date}</p>
      {refreshedAt && <p className="travel-note">Room availability checked {new Date(refreshedAt).toLocaleString()}. The original search observation above is unchanged.</p>}
      {evidenceExpired && <p role="status">This offer has expired. Search again before choosing it.</p>}
      <h2 id="travel-detail-title">
        {stay ? item.name : item.airlines.join(" · ") || "Flight details"}
      </h2>
      {children}
      <p className="travel-note">
        Availability and prices can change. Mock bookings are test-only; save your canvas to keep the confirmed test booking.
      </p>
    </dialog>
  );
}
