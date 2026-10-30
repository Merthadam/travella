import React from "react";

const priceLabel = (value) =>
  value?.amount != null && value?.currency
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: value.currency,
        maximumFractionDigits: 2,
      }).format(Number(value.amount))
    : "Price unavailable";
export const duration = (minutes) =>
  minutes == null
    ? "Duration unavailable"
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const localTime = (value) => value?.slice(11, 16) || "—";
export const refund = (value) =>
  value === true
    ? "Refundable"
    : value === false
      ? "Non-refundable"
      : "Cancellation terms unavailable";
export function Price({ price, stay, room = false }) {
  return (
    <div className="travel-price">
      <strong>{price?.estimated ? 'Estimated ' : ''}{priceLabel(price)}</strong>
      <small>
        {stay ? room ? 'Observed room offer · total stay' : "Total for all rooms & nights" : "Return total · all travelers"}{price?.currency && ` · ${price.currency}`}
      </small>
      {price?.excluded_taxes?.map((tax, i) => (
        <small key={i}>
          + {priceLabel(tax)} {tax.name}
        </small>
      ))}
    </div>
  );
}
export function Leg({ leg, label, expanded = false }) {
  const first = leg.segments[0],
    last = leg.segments.at(-1);
  return (
    <div className="travel-leg">
      <small>
        {label} · {first.departure_at.slice(0, 10)}
      </small>
      <div className="travel-leg-line">
        <strong>
          {localTime(first.departure_at)} <small>{first.origin}</small>
        </strong>
        <span>
          {duration(leg.duration_minutes)}
          <i />
          {leg.stops == null
            ? "Stops unavailable"
            : leg.stops === 0
              ? "Direct"
              : `${leg.stops} stop${leg.stops > 1 ? "s" : ""}`}
        </span>
        <strong>
          {localTime(last.arrival_at)} <small>{last.destination}</small>
        </strong>
      </div>
      {last.arrival_at.slice(0, 10) !== first.departure_at.slice(0, 10) && (
        <small>Arrives {last.arrival_at.slice(0, 10)}</small>
      )}
      {expanded &&
        leg.segments.map((s, i) => (
          <p key={i}>
            {s.origin} → {s.destination} · {localTime(s.departure_at)}–
            {localTime(s.arrival_at)} ·{" "}
            {s.flight_number || s.airline || "Airline unavailable"}
            {(s.operating_airline || s.operating_code) && ` · Operated by ${s.operating_airline || s.operating_code}`}
            {s.technical_stops.length > 0 &&
              ` · Technical stops: ${s.technical_stops.join(", ")}`}
          </p>
        ))}
    </div>
  );
}
