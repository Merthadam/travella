import React, { useEffect, useRef, useState } from "react";
import { countries } from "../../onboarding/catalogs";
import { travelRequest } from "./travelApi";
import { SandboxCheckout, MockBookingRecovery } from "./SandboxCheckout";
import { FlightSandboxCheckout, FlightMockRecovery } from "./FlightSandboxCheckout";
import { StayDestination } from "./StayDestination";
import "./travel-search.css";

const currencies = ["EUR", "USD", "GBP", "HUF", "CAD", "AUD", "JPY", "CHF"];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export const priceLabel = (value) =>
  value?.amount != null && value?.currency
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: value.currency,
        maximumFractionDigits: 2,
      }).format(Number(value.amount))
    : "Price unavailable";
const duration = (minutes) =>
  minutes == null
    ? "Duration unavailable"
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const localTime = (value) => value?.slice(11, 16) || "—";
const refund = (value) =>
  value === true
    ? "Refundable"
    : value === false
      ? "Non-refundable"
      : "Cancellation terms unavailable";
function Country({ label, value, onChange }) {
  return (
    <label>
      {label}
      <select required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose country</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Ages({ label, ages, min, max, onChange, limit }) {
  return (
    <div className="travel-ages">
      <span>{label}</span>
      {ages.map((age, i) => (
        <label key={i}>
          Age {i + 1}
          <input
            required
            type="number"
            min={min}
            max={max}
            value={age}
            onChange={(e) =>
              onChange(ages.map((a, j) => (i === j ? e.target.value : a)))
            }
          />
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
            onClick={() => onChange(ages.filter((_, j) => i !== j))}
          >
            ×
          </button>
        </label>
      ))}
      <button
        type="button"
        disabled={ages.length >= limit}
        onClick={() => onChange([...ages, ""])}
      >
        + Add {label === "Children" ? "child" : "infant"}
      </button>
    </div>
  );
}
function Airport({ label, value, onChange, planId, active, onExpired }) {
  const [query, setQuery] = useState(value?.label || "");
  const [options, setOptions] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!active || value || query.trim().length < 2) {
      setOptions([]);
      setMessage("");
      return;
    }
    const controller = new AbortController();
    let live = true;
    const timer = setTimeout(async () => {
      setMessage("Finding airports…");
      try {
        const result = await travelRequest(
          planId,
          "airports",
          { q: query.trim() },
          controller.signal,
        );
        if (live) {
          setOptions(result.airports);
          setMessage(
            result.airports.length
              ? "Choose an airport below."
              : "No airports found. Try a city or airport code.",
          );
        }
      } catch (error) {
        if (live && error.name !== "AbortError") {
          setMessage("Airport search unavailable. Try again.");
          if (error.status === 401) onExpired?.();
        }
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, planId, active]);
  return (
    <div className="travel-airport">
      <label>
        {label}
        <input
          required
          maxLength={80}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
          }}
        />
      </label>
      {message && <small role="status">{message}</small>}
      {options.length > 0 && (
        <ul aria-label={`${label} suggestions`}>
          {options.map((a) => (
            <li key={a.iata}>
              <button
                type="button"
                onClick={() => {
                  const label = `${a.city || a.name} (${a.iata})`;
                  onChange({ iata: a.iata, label });
                  setQuery(label);
                  setOptions([]);
                }}
              >
                <b>{a.iata}</b> {a.name}
                <small>
                  {a.city} · {a.country_code}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Price({ price, stay }) {
  return (
    <div className="travel-price">
      <strong>{priceLabel(price)}</strong>
      <small>
        {stay ? "Total for all rooms & nights" : "Return total · all travelers"}
      </small>
      {price?.excluded_taxes?.map((tax, i) => (
        <small key={i}>
          + {priceLabel(tax)} {tax.name}
        </small>
      ))}
    </div>
  );
}
function Leg({ leg, label, expanded = false }) {
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
            {s.operating_airline && ` · Operated by ${s.operating_airline}`}
            {s.technical_stops.length > 0 &&
              ` · Technical stops: ${s.technical_stops.join(", ")}`}
          </p>
        ))}
    </div>
  );
}
function Room({ room, onCheckout }) {
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
      {onCheckout && room.checkout_token && <button type="button" onClick={() => onCheckout(room.checkout_token)}>Try mock booking</button>}
      <Price
        price={{ ...room.total, excluded_taxes: room.excluded_taxes }}
        stay
      />
    </article>
  );
}
function Detail({ item, stay, planId, criteria, sandbox, onClose, onExpired, onBookingResult }) {
  const ref = useRef();
  const [checkout, setCheckout] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState(item.rooms || []);
  const [loading, setLoading] = useState(stay);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const focus = document.activeElement;
    ref.current?.showModal();
    return () => focus?.focus?.();
  }, []);
  useEffect(() => {
    if (!stay) return;
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
          setRooms(availability.results[0]?.rooms || []);
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
  }, [item.hotel_id, retry]);
  return (
    <dialog
      ref={ref}
      className="travel-dialog"
      aria-labelledby="travel-detail-title"
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
      <h2 id="travel-detail-title">
        {stay ? item.name : item.airlines.join(" · ") || "Flight details"}
      </h2>
      {loading && <p role="status">Refreshing hotel and room details…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((x) => x + 1)}>Retry details</button>
        </p>
      )}
      {checkout && !stay ? <FlightSandboxCheckout key={checkout} planId={planId} offerToken={checkout} onClose={() => setCheckout(null)} onBookingResult={onBookingResult} /> : checkout ? <SandboxCheckout key={checkout} planId={planId} offerToken={checkout} onClose={() => setCheckout(null)} onBookingResult={onBookingResult} /> : stay ? (
        <>
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
            <Room key={room.id} room={room} onCheckout={sandbox && !loading ? setCheckout : null} />
          ))}
          {!loading && !rooms.length && (
            <p>No room offers are available for these dates.</p>
          )}
        </>
      ) : (
        <>
          <Leg leg={item.outbound} label="Outbound" expanded />
          <Leg leg={item.inbound} label="Return" expanded />
          <p>All times are local to each airport.</p>
          <h3>Baggage & fare conditions</h3>
          <p>{item.baggage_summary || "Baggage allowance not supplied."}</p>
          <p>{refund(item.refundable)}</p>
          <p>
            {item.cancellation_summary ||
              "Detailed fare conditions not supplied."}
          </p>
          <Price price={item.price} />
          {sandbox && item.checkout_token && <button className="travel-primary" onClick={() => setCheckout(item.checkout_token)}>Try mock flight booking</button>}
        </>
      )}
      <p className="travel-note">
        Availability and prices can change. Mock bookings are test-only; save your canvas to keep the confirmed test booking.
      </p>
    </dialog>
  );
}
export function filterResults(
  results,
  {
    stay,
    budget,
    refundable,
    direct,
    bag,
    sort,
    stars = "",
    rating = "",
    airline = "",
  },
) {
  const list = results.filter(
    (item) =>
      (!stars || (item.stars != null && item.stars >= Number(stars))) &&
      (!rating ||
        (item.review_score != null && item.review_score >= Number(rating))) &&
      (!airline || item.airlines?.includes(airline)) &&
      (!budget ||
        (item.price.amount != null &&
          Number(item.price.amount) <= Number(budget))) &&
      (!refundable ||
        (stay
          ? item.rooms.some((r) => r.refundable === true)
          : item.refundable === true)) &&
      (!direct || (item.outbound?.stops === 0 && item.inbound?.stops === 0)) &&
      (!bag || item.cabin_bag_included === true),
  );
  const metric = (item) =>
    sort === "price"
      ? Number(item.price.amount ?? Infinity)
      : stay
        ? -(item.review_score ?? -Infinity)
        : (item.outbound.duration_minutes ?? Infinity) +
          (item.inbound.duration_minutes ?? Infinity);
  return sort === "provider"
    ? list
    : list.sort((a, b) => metric(a) - metric(b));
}
export function TravelSearch({ planId, mode, active, initialData, onExpired, onBookingResult }) {
  const stay = mode === "accommodation";
  const dates = initialData?.essentials?.dates;
  const [city, setCity] = useState(initialData?.map?.destination || "");
  const [place, setPlace] = useState(null);
  const [country, setCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [start, setStart] = useState(dates?.flexible ? "" : dates?.start || "");
  const [end, setEnd] = useState(dates?.flexible ? "" : dates?.end || "");
  const [rooms, setRooms] = useState([{ adults: 2, children_ages: [] }]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState([]);
  const [infants, setInfants] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [cabin, setCabin] = useState("ECONOMY");
  const [currency, setCurrency] = useState("EUR");
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(null);
  const [detail, setDetail] = useState(null);
  const [compared, setCompared] = useState([]);
  const [stars, setStars] = useState("");
  const [rating, setRating] = useState("");
  const [airline, setAirline] = useState("");
  const [limit, setLimit] = useState(10);
  const [budget, setBudget] = useState("");
  const [refundable, setRefundable] = useState(false);
  const [direct, setDirect] = useState(false);
  const [bag, setBag] = useState(false);
  const [sort, setSort] = useState("provider");
  const pending = useRef(null);
  const epoch = useRef(0);
  useEffect(() => {
    if (!active) {
      epoch.current++;
      pending.current?.abort();
      setLoading(false);
      setDetail(null);
    }
    return () => {
      epoch.current++;
      pending.current?.abort();
    };
  }, [active, planId]);
  const roomChange = (i, patch) =>
    setRooms((prev) =>
      prev.map((room, j) => (i === j ? { ...room, ...patch } : room)),
    );
  function resetFilters() {
    setStars("");
    setRating("");
    setAirline("");
    setLimit(10);
    setBudget("");
    setRefundable(false);
    setDirect(false);
    setBag(false);
    setSort("provider");
  }
  async function search(event) {
    event.preventDefault();
    setError("");
    if (stay && !place) {
      setError("Choose a destination from the suggestions before searching.");
      return;
    }
    if (!stay && (!origin || !destination)) {
      setError("Choose both airports from the suggestions.");
      return;
    }
    const criteria = stay
      ? {
          destination: {
            city: place.name,
            country_code: country,
            place_id: place.place_id,
          },
          check_in: start,
          check_out: end,
          rooms: rooms.map((r) => ({
            adults: Number(r.adults),
            children_ages: r.children_ages.map(Number),
          })),
          guest_nationality: nationality,
          currency,
        }
      : {
          origin: origin.iata,
          destination: destination.iata,
          departure_date: start,
          return_date: end,
          adults: Number(adults),
          children_ages: children.map(Number),
          infant_ages: infants.map(Number),
          cabin_class: cabin,
          currency,
          country_code: country,
        };
    if (
      end <= start ||
      (!stay &&
        (origin.iata === destination.iata ||
          infants.length > Number(adults) ||
          Number(adults) + children.length + infants.length > 9)) ||
      (stay &&
        (Date.parse(end) - Date.parse(start) > 30 * 86400000 ||
          rooms.reduce(
            (n, r) => n + Number(r.adults) + r.children_ages.length,
            0,
          ) > 16))
    ) {
      setError(
        stay
          ? "Choose a stay of 1–30 nights with up to 16 guests."
          : "Choose different airports, ordered dates, and up to 9 travelers with no more infants than adults.",
      );
      return;
    }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const current = ++epoch.current;
    setLoading(true);
    try {
      const result = await travelRequest(
        planId,
        stay ? "hotels/search" : "flights/search",
        criteria,
        controller.signal,
      );
      if (current === epoch.current) {
        setSnapshot({ ...result, criteria });
        setCompared([]);
        resetFilters();
      }
    } catch (e) {
      if (current === epoch.current && e.name !== "AbortError") {
        setError(e.message || "Unable to connect. Please try again.");
        if (e.status === 401) onExpired?.();
      }
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }
  const results = filterResults(snapshot?.results || [], {
    stay,
    budget,
    refundable,
    direct,
    bag,
    sort,
    stars,
    rating,
    airline,
  });
  return (
    <section
      className="travel-search"
      hidden={!active}
      aria-label={stay ? "Accommodation search" : "Flight search"}
    >
      <header className="travel-heading">
        <span className="travel-kicker">
          {stay ? "SOMEWHERE TO CALL HOME" : "THE WAY THERE"}
        </span>
        <h2>
          {stay
            ? "Find your little corner of the world."
            : "A good trip starts with a good flight."}
        </h2>
        <p>
          {stay
            ? "Find a comfortable base for everything ahead."
            : "Compare the journey, the fare, and the time you get back."}
        </p>
      </header>
      {stay && initialData?.accommodation?.mockBooking && <section className="travel-empty" aria-label="Mock stay details">
        <h3>Mock booked · {initialData.accommodation.mockBooking.hotelName}</h3>
        <p>{initialData.accommodation.mockBooking.checkIn} – {initialData.accommodation.mockBooking.checkOut}</p>
        <p>Test reference: {initialData.accommodation.mockBooking.reference}</p>
        <p>Sandbox only — no real reservation or charge.</p>
      </section>}
      {!stay && initialData?.flights?.mockBooking && <section className="travel-empty" aria-label="Mock flight details">
        <h3>Mock booked · {initialData.flights.mockBooking.origin} ↔ {initialData.flights.mockBooking.destination}</h3>
        <p>{initialData.flights.mockBooking.departureDate} – {initialData.flights.mockBooking.returnDate}</p>
        <p>Test reference: {initialData.flights.mockBooking.reference}</p>
        <p>Sandbox only — no real ticket or charge.</p>
      </section>}
      {!stay && <FlightMockRecovery planId={planId} onOpen={setRecovery} />}
      {!stay && recovery && <FlightSandboxCheckout key={recovery} planId={planId} recoveryToken={recovery} onClose={() => setRecovery(null)} onBookingResult={onBookingResult} />}
      {stay && <MockBookingRecovery planId={planId} onOpen={setRecovery} />}
      {stay && recovery && <SandboxCheckout key={recovery} planId={planId} recoveryToken={recovery} onClose={() => setRecovery(null)} onBookingResult={onBookingResult} />}
      <form
        className="travel-form"
        onSubmit={search}
        onInvalid={(event) =>
          event.target.closest("details")?.setAttribute("open", "")
        }
      >
        <div className="travel-main-fields">
          {stay ? (
            <StayDestination
              query={city}
              setQuery={setCity}
              value={place}
              onChange={setPlace}
              country={country}
              planId={planId}
              active={active}
              onExpired={onExpired}
            />
          ) : (
            <>
              <Airport
                label="From airport"
                value={origin}
                onChange={setOrigin}
                planId={planId}
                active={active}
                onExpired={onExpired}
              />
              <Airport
                label="To airport"
                value={destination}
                onChange={setDestination}
                planId={planId}
                active={active}
                onExpired={onExpired}
              />
            </>
          )}
          <label>
            {stay ? "Check-in" : "Departure"}
            <input
              required
              type="date"
              min={today()}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            {stay ? "Check-out" : "Return"}
            <input
              required
              type="date"
              min={start || today()}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button className="travel-primary" disabled={loading}>
            {loading ? "Searching…" : stay ? "Search stays" : "Search flights"}
          </button>
        </div>
        <div className="travel-extra-fields">
          <Country
            label={stay ? "Destination country" : "Country of residence"}
            value={country}
            onChange={(next) => {
              setCountry(next);
              setPlace(null);
            }}
          />
          {stay && (
            <Country
              label="Guest nationality"
              value={nationality}
              onChange={setNationality}
            />
          )}
          <label>
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {!stay && (
            <label>
              Cabin
              <select value={cabin} onChange={(e) => setCabin(e.target.value)}>
                {["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c.toLowerCase().replace("_", " ")}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
        </div>
        <details className="travel-party">
          <summary>
            {stay
              ? `${rooms.length} room${rooms.length > 1 ? "s" : ""} · ${rooms.reduce((n, r) => n + Number(r.adults) + r.children_ages.length, 0)} guests`
              : `Return flights · ${Number(adults) + children.length + infants.length} travelers`}{" "}
            · edit travelers
          </summary>
          {stay ? (
            <>
              {rooms.map((r, i) => (
                <div key={i} className="travel-party-row">
                  <b>Room {i + 1}</b>
                  <label>
                    Adults
                    <input
                      type="number"
                      required
                      min="1"
                      max="6"
                      value={r.adults}
                      onChange={(e) =>
                        roomChange(i, { adults: e.target.value })
                      }
                    />
                  </label>
                  <Ages
                    label="Children"
                    ages={r.children_ages}
                    min={0}
                    max={17}
                    limit={4}
                    onChange={(ages) => roomChange(i, { children_ages: ages })}
                  />
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRooms(rooms.filter((_, j) => i !== j))}
                    >
                      Remove room {i + 1}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                disabled={rooms.length >= 4}
                onClick={() =>
                  setRooms([...rooms, { adults: 1, children_ages: [] }])
                }
              >
                + Add room
              </button>
            </>
          ) : (
            <div className="travel-party-row">
              <label>
                Adults (12+)
                <input
                  required
                  type="number"
                  min="1"
                  max="9"
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                />
              </label>
              <Ages
                label="Children"
                ages={children}
                min={2}
                max={11}
                limit={8}
                onChange={setChildren}
              />
              <Ages
                label="Infants"
                ages={infants}
                min={0}
                max={1}
                limit={8}
                onChange={setInfants}
              />
            </div>
          )}
          <small>
            Ages on the date of travel. Review these search details before
            submitting.
          </small>
        </details>
      </form>
      {loading && (
        <p className="travel-notice" role="status">
          Finding your options…{" "}
          {stay
            ? "Checking room availability."
            : "Flight search can take up to two minutes."}{" "}
          <button
            onClick={() => {
              epoch.current++;
              pending.current?.abort();
              setLoading(false);
            }}
          >
            Cancel search
          </button>
        </p>
      )}
      {error && (
        <p className="travel-error" role="alert">
          {error} {snapshot && "Your last completed results are still shown."}
        </p>
      )}
      {snapshot ? (
        <>
          <div className="travel-results-meta">
            <span>
              <b>{snapshot.sandbox ? "Sandbox results" : "LiteAPI results"}</b>{" "}
              ·{" "}
              {stay
                ? snapshot.criteria.destination.city
                : `${snapshot.criteria.origin} ↔ ${snapshot.criteria.destination}`}{" "}
              ·{" "}
              {stay
                ? snapshot.criteria.check_in
                : snapshot.criteria.departure_date}{" "}
              –{" "}
              {stay
                ? snapshot.criteria.check_out
                : snapshot.criteria.return_date}
            </span>
            <small>
              Checked {new Date(snapshot.searched_at).toLocaleTimeString()} ·{" "}
              {snapshot.criteria.currency} ·{" "}
              {stay
                ? `${snapshot.criteria.rooms.length} room(s) · ${snapshot.criteria.rooms.reduce((n, r) => n + r.adults + r.children_ages.length, 0)} guests`
                : `${snapshot.criteria.adults + snapshot.criteria.children_ages.length + snapshot.criteria.infant_ages.length} travelers`}
              {snapshot.sandbox && " · Test inventory"}
            </small>
          </div>
          <div className="travel-results-layout">
            <aside className="travel-filters">
              <h3>Make it your kind of trip</h3>
              <p>Filter these returned results</p>
              <label>
                Maximum total ({snapshot.criteria.currency})
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Any budget"
                />
              </label>
              {stay ? (
                <>
                  <label>
                    Minimum stars
                    <select
                      value={stars}
                      onChange={(e) => setStars(e.target.value)}
                    >
                      <option value="">Any</option>
                      {[3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} stars
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Minimum review score
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    >
                      <option value="">Any</option>
                      {[7, 8, 9].map((n) => (
                        <option key={n} value={n}>
                          {n}+
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  Airline
                  <select
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                  >
                    <option value="">All airlines</option>
                    {[
                      ...new Set(
                        snapshot.results.flatMap((item) => item.airlines),
                      ),
                    ]
                      .sort()
                      .map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                  </select>
                </label>
              )}
              <label className="travel-check">
                <input
                  type="checkbox"
                  checked={refundable}
                  onChange={(e) => setRefundable(e.target.checked)}
                />
                {stay ? "Has refundable room offers" : "Refundable fare"}
              </label>
              {!stay && (
                <>
                  <label className="travel-check">
                    <input
                      type="checkbox"
                      checked={direct}
                      onChange={(e) => setDirect(e.target.checked)}
                    />
                    Direct both ways
                  </label>
                  <label className="travel-check">
                    <input
                      type="checkbox"
                      checked={bag}
                      onChange={(e) => setBag(e.target.checked)}
                    />
                    Cabin bag included
                  </label>
                </>
              )}
              <button onClick={resetFilters}>Reset filters</button>
              <small>
                Unknown terms are excluded when a filter is selected.
              </small>
            </aside>
            <div className="travel-results">
              <div className="travel-results-heading">
                <h3>
                  {results.length} {stay ? "stays" : "return flights"} to
                  explore
                </h3>
                <label>
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="provider">Provider order</option>
                    <option value="price">Lowest total</option>
                    <option value="quality">
                      {stay ? "Review score" : "Shortest journey"}
                    </option>
                  </select>
                </label>
              </div>
              {!results.length && (
                <div className="travel-empty">
                  <h3>
                    {snapshot.results.length
                      ? "No options match these filters."
                      : "No availability for this search."}
                  </h3>
                  <p>
                    {snapshot.results.length
                      ? "Try a higher budget or reset your filters."
                      : stay
                        ? "Try a different destination, dates or guest details."
                        : "Try different dates, airports or traveler details."}
                  </p>
                  {snapshot.results.length > 0 && (
                    <button onClick={resetFilters}>Reset filters</button>
                  )}
                </div>
              )}
              {results.slice(0, limit).map((item) => (
                <article
                  className={`travel-result ${stay ? "stay" : "flight"}`}
                  key={item.id}
                >
                  {stay ? (
                    <>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.hidden = true;
                          }}
                        />
                      ) : (
                        <div className="travel-photo-placeholder">
                          ⌂<small>Photo unavailable</small>
                        </div>
                      )}
                      <div className="travel-result-body">
                        <small className="travel-kicker">
                          {item.stars
                            ? `${item.stars} STAR PROPERTY`
                            : "YOUR STAY"}
                        </small>
                        <h3>{item.name}</h3>
                        <p>{item.address || "Address unavailable"}</p>
                        {item.review_score != null && (
                          <p>
                            <b className="travel-rating">{item.review_score}</b>{" "}
                            Guest rating{" "}
                            {item.review_count != null &&
                              `· ${item.review_count} reviews`}
                          </p>
                        )}
                        <small>
                          {item.rooms[0]?.board_name || "Meal plan unavailable"}{" "}
                          · {refund(item.rooms[0]?.refundable)}
                        </small>
                      </div>
                    </>
                  ) : (
                    <div className="travel-result-body">
                      <h3>
                        {item.airlines.join(" · ") || "Airline unavailable"}
                      </h3>
                      <Leg leg={item.outbound} label="Outbound" />
                      <Leg leg={item.inbound} label="Return" />
                      <small>
                        {item.baggage_summary ||
                          "Baggage allowance unavailable"}
                      </small>
                    </div>
                  )}
                  <div className="travel-result-actions">
                    <Price price={item.price} stay={stay} />
                    <button
                      className="travel-primary"
                      onClick={() => setDetail(item)}
                    >
                      {stay ? "View rooms" : "View flight"} →
                    </button>
                    <label className="travel-check">
                      <input
                        type="checkbox"
                        checked={compared.includes(item.id)}
                        disabled={
                          !compared.includes(item.id) && compared.length >= 3
                        }
                        onChange={() =>
                          setCompared((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id],
                          )
                        }
                      />
                      Compare
                    </label>
                  </div>
                </article>
              ))}
              {results.length > limit && (
                <button onClick={() => setLimit((n) => n + 10)}>
                  Show more ({results.length - limit} remaining)
                </button>
              )}
            </div>
          </div>
          {compared.length > 0 && (
            <section className="travel-comparison">
              <div className="travel-results-heading">
                <h3>Your comparison ({compared.length}/3)</h3>
                <button onClick={() => setCompared([])}>
                  Clear comparison
                </button>
              </div>
              <div>
                {snapshot.results
                  .filter((item) => compared.includes(item.id))
                  .map((item) => (
                    <article key={item.id}>
                      <h4>{stay ? item.name : item.airlines.join(" · ")}</h4>
                      <Price price={item.price} stay={stay} />
                      <p>
                        {stay
                          ? refund(item.rooms[0]?.refundable)
                          : `${duration(item.outbound.duration_minutes)} out · ${duration(item.inbound.duration_minutes)} back`}
                      </p>
                      <button onClick={() => setDetail(item)}>
                        View details
                      </button>
                    </article>
                  ))}
              </div>
            </section>
          )}
          {snapshot.truncated && !stay && (
            <p className="travel-note">
              Showing the first 100 returned itineraries. Filters apply to these
              results.
            </p>
          )}
          {snapshot.notices.map((notice, i) => (
            <p className="travel-note" key={i}>
              {notice}
            </p>
          ))}
        </>
      ) : (
        <div className="travel-empty">
          <span className="travel-empty-icon">{stay ? "⌂" : "✈"}</span>
          <h3>
            {stay
              ? "A stay that fits your plans."
              : "Your next adventure starts here."}
          </h3>
          <p>Choose your travel details above to search LiteAPI.</p>
        </div>
      )}
      <p className="travel-note">
        Search results are not saved to your Plan. Sandbox flights and stays support test-only mock checkout. For flight testing, choose Nuitée Air when available.
      </p>
      {detail && (
        <Detail
          key={detail.id}
          item={detail}
          stay={stay}
          planId={planId}
          criteria={snapshot.criteria}
          sandbox={snapshot.sandbox}
          onClose={() => setDetail(null)}
          onExpired={onExpired}
          onBookingResult={onBookingResult}
        />
      )}
    </section>
  );
}
export function useTravelCapabilities(planId, onExpired) {
  const [capabilities, setCapabilities] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    setCapabilities(null);
    setError("");
    travelRequest(planId, "capabilities", null, controller.signal)
      .then((result) => {
        if (live) setCapabilities(result);
      })
      .catch((e) => {
        if (live && e.name !== "AbortError") {
          setError("Travel search is temporarily unavailable.");
          if (e.status === 401) onExpired?.();
        }
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [planId, attempt]);
  return { capabilities, error, retry: () => setAttempt((x) => x + 1) };
}
