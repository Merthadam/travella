import React, { useEffect, useRef, useState } from "react";
import { airportSelection } from "./travelDefaults";
import { useTravelWorkspace } from "./useTravelWorkspace";
import { countries } from "../../onboarding/catalogs";
import { travelRequest } from "./travelApi";
import { readStayReceipt, readFlightReceipt } from "./bookingReceipts";
import { SearchSelect, Pagination, PAGE_SIZE } from "./SearchSelect";
import { StaySearchFilters } from "./StaySearchFilters";
import { FlightTravelers } from "./FlightTravelers";
import { StayDestination } from "./StayDestination";
import { travelState, TravelPhoto, parseTravelRegistrySnapshot } from "./CanvasTravel";
import { CarrierMarks } from "./CarrierMark";
import { TravelComparison, comparisonEntry, referenceKey } from './TravelComparison';
import { FlightDetails } from "./FlightDetails";
import { StayDetails } from "./StayDetails";
import { Leg, Price, refund, duration } from "./TravelPresentation";
import "./travel-search.css";

const currencies = ["EUR", "USD", "GBP", "HUF", "CAD", "AUD", "JPY", "CHF"];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
function Country({ label, value, onChange }) {
  return <SearchSelect label={label} value={value} onChange={onChange} options={countryOptions} required placeholder="Search country or code…" />;
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
  useEffect(() => { if (value) setQuery(value.label); }, [value]);
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
                  const selection = airportSelection(a);
                  const label = selection.label;
                  onChange(selection);
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
function CardEvidence({ snapshot, stay }) {
  const c = snapshot.criteria;
  const adults = stay ? c.rooms.reduce((sum, room) => sum + room.adults, 0) : c.adults;
  const children = stay ? c.rooms.reduce((sum, room) => sum + room.children_ages.length, 0) : c.children_ages.length;
  const nights = stay ? Math.round((Date.parse(c.check_out) - Date.parse(c.check_in)) / 86400000) : null;
  return <div className="travel-card-evidence" style={{ display: 'grid', gap: 4, marginTop: 8 }}>
    <small>{stay && `${nights} ${nights === 1 ? 'night' : 'nights'} · ${c.rooms.length} ${c.rooms.length === 1 ? 'room' : 'rooms'} · `}{adults} {adults === 1 ? 'adult' : 'adults'}{children > 0 && ` · ${children} ${children === 1 ? 'child' : 'children'}`}{!stay && c.infant_ages.length > 0 && ` · ${c.infant_ages.length} ${c.infant_ages.length === 1 ? 'infant' : 'infants'}`}</small>
    <small>Source: {snapshot.provider}{snapshot.sandbox && ' · Sandbox test inventory'}</small>
    <small>Observed {new Date(snapshot.searched_at).toLocaleString()} · Expires {new Date(snapshot.expires_at).toLocaleString()}</small>
  </div>;
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
      (!stars || item.stars == null || item.stars >= Number(stars)) &&
      (!rating ||
        item.review_score == null || item.review_score >= Number(rating)) &&
      (!airline || !item.airlines?.length || item.airlines.includes(airline)) &&
      (!budget ||
        item.price.amount == null || Number(item.price.amount) <= Number(budget)) &&
      (!refundable ||
        (stay
          ? !item.rooms.length || item.rooms.some((r) => r.refundable !== false)
          : item.refundable !== false)) &&
      (!direct || !(item.outbound?.stops > 0 || item.inbound?.stops > 0)) &&
      (!bag || item.cabin_bag_included !== false),
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
export function unknownFilterFacts(item, { stay, budget, refundable, direct, bag, stars, rating, airline }) {
  return [budget && item.price.amount == null && 'total price',
    stay && stars && item.stars == null && 'star rating', stay && rating && item.review_score == null && 'guest rating',
    refundable && (stay ? !item.rooms.length || !item.rooms.some(r => r.refundable === true) && item.rooms.some(r => r.refundable == null) : item.refundable == null) && 'refundability',
    !stay && direct && (item.outbound?.stops == null || item.inbound?.stops == null) && 'stops',
    !stay && bag && item.cabin_bag_included == null && 'cabin baggage',
    !stay && airline && !item.airlines?.length && 'airline'].filter(Boolean);
}
export function TravelSearch(props) {
  return props.workspace ? <ControlledTravelSearch {...props}/> : <StandaloneTravelSearch {...props}/>;
}
function StandaloneTravelSearch(props) {
  const workspace = useTravelWorkspace({ planId: props.planId, topic: props.mode === "accommodation" ? "stays" : "flights", initialData: props.initialData, travelerProfile: props.travelerProfile, active: props.active, onExpired: props.onExpired });
  return <ControlledTravelSearch {...props} workspace={workspace}/>;
}
function ControlledTravelSearch({ planId, mode, active, initialData, onExpired, onFlightCheckout, onStayCheckout, importedSnapshot, importRequest = 0, importReason = "", onDiscuss, onChoose, onShortlist, onCompare, onComparisonChange, discussionDisabled, choiceDisabled, workspace }) {
  const stay = mode === "accommodation";
  const { snapshot, loading, error, imported, draftCriteria, view, detailsReference } = workspace.state;
  const field = name => [draftCriteria[name], value => workspace.setDraft(name, value)];
  const local = name => [view[name], value => workspace.setView(current => ({ [name]: typeof value === "function" ? value(current[name]) : value, ...(name !== "page" ? { page: 1 } : {}) }))];
  const [stayFilters, setStayFilters] = field("stayFilters"), [city, setCity] = field("city"), [place, setPlace] = field("place"), [country, setCountry] = field("country"), [nationality, setNationality] = field("nationality");
  const [start, setStart] = field("start"), [end, setEnd] = field("end"), [rooms, setRooms] = field("rooms"), [adults, setAdults] = field("adults"), [children, setChildren] = field("children"), [infants, setInfants] = field("infants");
  const [origin, setOrigin] = field("origin"), [destination, setDestination] = field("destination"), [cabin, setCabin] = field("cabin"), [currency, setCurrency] = field("currency");
  const [stars, setStars] = local("stars"), [rating, setRating] = local("rating"), [airline, setAirline] = local("airline"), [page, setPage] = local("page"), [budget, setBudget] = local("budget"), [refundable, setRefundable] = local("refundable"), [direct, setDirect] = local("direct"), [bag, setBag] = local("bag"), [sort, setSort] = local("sort");
  const compared = view.comparison_refs.filter(ref => ref.search_id === snapshot?.search_id).map(ref => ref.option_id);
  const setCompared = value => workspace.setView(current => ({ comparison_refs: (typeof value === "function" ? value(current.comparison_refs.map(ref => ref.option_id)) : value).map(option_id => current.comparison_refs.find(ref => ref.search_id === snapshot.search_id && ref.option_id === option_id) || ({ search_id: snapshot.search_id, option_id, room_id: null })) }));
  const [comparison, setComparison] = useState([]), [comparisonError, setComparisonError] = useState(false), [discussing, setDiscussing] = useState(false);
  const comparisonRun = useRef(0);
  useEffect(() => {
    onComparisonChange?.(comparison.map(entry => entry.reference));
    return () => onComparisonChange?.([]);
  }, [comparison, onComparisonChange]);
  useEffect(() => { setComparison([]); comparisonRun.current++; return () => { comparisonRun.current++; }; }, [planId, mode, active, workspace.state.instanceId]);
  async function discussComparison(entries) {
    if (!onCompare || entries.length < 2) return;
    const run = ++comparisonRun.current; setDiscussing(true); setComparisonError(false);
    try { const result = await onCompare(entries.map(entry => ({ title: stay ? entry.item.name : entry.item.airlines.join(' / '), reference: entry.reference }))); if (run === comparisonRun.current) setComparisonError(!result); }
    catch { if (run === comparisonRun.current) setComparisonError(true); }
    finally { if (run === comparisonRun.current) setDiscussing(false); }
  }
  function openComparison() {
    const entries = view.comparison_refs.map(ref => comparisonEntry(snapshot, ref)).filter(Boolean);
    if (entries.length < 2 || entries.length > 3) return;
    setComparison(entries); void discussComparison(entries);
  }
  async function compareRoom({ reference }) {
    workspace.setView(current => ({ comparison_refs: current.comparison_refs }));
    const token = workspace.getWorkspaceContext(), run = ++comparisonRun.current;
    const current = () => {
      const now = workspace.getWorkspaceContext();
      return run === comparisonRun.current && now.instance_id === token.instance_id && now.revision === token.revision;
    };
    try {
      const original = parseTravelRegistrySnapshot(await travelRequest(planId, 'research/snapshot', { search_id: reference.search_id }));
      if (!current()) return;
      if (original.plan_id !== planId || original.mode !== 'stays') throw new Error('Invalid room evidence');
      const entry = comparisonEntry(original, reference);
      if (!entry) throw new Error('Room evidence unavailable');
      const base = comparison.length ? comparison : view.comparison_refs.map(ref => comparisonEntry(snapshot, ref)).filter(Boolean);
      const index = base.findIndex(value => referenceKey(value.reference) === referenceKey(entry.reference));
      if (index < 0 && base.length >= 3) { setError('Compare up to three options. Remove one to add another.'); return; }
      setComparison(index < 0 ? [...base, entry] : base.map((value, i) => i === index ? entry : value));
      setComparisonError(false);
    } catch (err) { if (!current()) return; if (err.status === 401) onExpired?.(); setError('This room observation is unavailable. Search again to compare current rooms.'); }
  }
  const setError = value => workspace.dispatch({ type: "error", value });
  const detail = detailsReference?.item;
  const setDetail = item => workspace.dispatch({ type: "details", value: item ? { item, snapshot, reference: { search_id: snapshot.search_id, option_id: item.id, room_id: null } } : null });
  const [stayCatalogs, setStayCatalogs] = useState(null);
  useEffect(() => setStayCatalogs(null), [planId]);
  const [, setImportClock] = useState(0);
  const resultsHeading = useRef(null), heading = useRef(null), form = useRef(null);
  const importIntent = useRef(null);
  const importIntentKey = `${planId}:${mode}:${importRequest}`;
  if (importIntent.current?.key !== importIntentKey) importIntent.current = { key: importIntentKey, revision: workspace.state.revision };
  useEffect(() => {
    if (!snapshot || !active) return;
    const timer = setInterval(() => setImportClock(Date.now()), 10000);
    return () => clearInterval(timer);
  }, [snapshot, active]);
  useEffect(() => {
    if (importedSnapshot && workspace.importSnapshot(importedSnapshot, `${planId}:${mode}:${importedSnapshot.search_id}:${importRequest}`, importReason, importIntent.current.revision)) heading.current?.focus();
  }, [importedSnapshot?.search_id, importRequest, planId, mode]);
  const roomChange = (i, patch) =>
    setRooms((prev) =>
      prev.map((room, j) => (i === j ? { ...room, ...patch } : room)),
    );
  function resetFilters() {
    workspace.setView({ stars: '', rating: '', airline: '', page: 1, budget: '', refundable: false, direct: false, bag: false, sort: 'provider' });
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
    if (!stay && (
      !Number.isInteger(Number(adults)) || Number(adults) < 1 || Number(adults) > 9 ||
      children.some(age => age === "" || !Number.isInteger(Number(age)) || Number(age) < 2 || Number(age) > 11) ||
      infants.some(age => age === "" || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 1)
    )) {
      setError("Choose at least one adult and an age for every child and infant in Travelers.");
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
          ...(stayFilters.hotel_type_ids.length ? { hotel_type_ids: stayFilters.hotel_type_ids } : {}),
          ...(stayFilters.facility_ids.length ? { facility_ids: stayFilters.facility_ids, strict_facility_filtering: stayFilters.strict_facility_filtering } : {}),
          ...(stayFilters.refundable_rates_only ? { refundable_rates_only: true } : {}),
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
    await workspace.search(criteria);
  }
  const unavailable = imported && (importReason || travelState(snapshot, initialData));
  const evidenceExpired = snapshot && Date.now() >= Date.parse(snapshot.expires_at);
  const applied = workspace.state.appliedCriteria;
  const appliedStart = applied?.check_in || applied?.departure_date, appliedEnd = applied?.check_out || applied?.return_date;
  const savedDates = initialData?.essentials?.dates;
  const appliedTravelers = applied && (stay ? applied.rooms.reduce((n, room) => n + room.adults + room.children_ages.length, 0) : applied.adults + applied.children_ages.length + applied.infant_ages.length);
  const exploratory = applied && (savedDates?.start && (savedDates.start !== appliedStart || savedDates.end !== appliedEnd) || initialData?.essentials?.travelers && initialData.essentials.travelers !== appliedTravelers);
  function editSearch() { form.current?.querySelector('input')?.focus(); form.current?.scrollIntoView?.({ block: 'start' }); }
  function openDetail(item) {
    if (imported && (importReason || travelState(snapshot, initialData))) { setImportClock(Date.now()); return; }
    setDetail(item);
  }
  const results = filterResults(unavailable ? [] : (snapshot?.results || []).filter(item => !view.dismissed_ids.includes(item.id)), {
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
  const currentPage = Math.min(page, Math.max(1, Math.ceil(results.length / PAGE_SIZE)));
  function changeResultsPage(next) {
    setPage(next);
    resultsHeading.current?.focus();
    resultsHeading.current?.scrollIntoView?.({ behavior: "instant", block: "start" });
  }
  const paging = <Pagination page={currentPage} total={results.length} onChange={changeResultsPage} label="results pages" />;
  return (
    <section
      className="travel-search"
      hidden={!active}
      aria-label={stay ? "Accommodation search" : "Flight search"}
    >
      <header className="travel-heading">
        <h2 ref={heading} tabIndex={-1}>{stay ? 'Find a place to stay' : 'Find your flights'}</h2>
        <p>{stay ? 'Compare places, rooms and total prices.' : 'Compare return flights, fares and journey times.'}</p>
      </header>
      {stay && initialData?.accommodation?.mockBooking && <section className="travel-empty" aria-label="Mock stay details">
        <h3>Mock booked · {initialData.accommodation.mockBooking.hotelName}</h3>
        <p>{initialData.accommodation.mockBooking.checkIn} – {initialData.accommodation.mockBooking.checkOut}</p>
        <p>Test reference: {initialData.accommodation.mockBooking.reference}</p>
        <button className="travel-primary" onClick={() => onStayCheckout?.({ savedBooking: initialData.accommodation.mockBooking })}>View stay confirmation</button>
        <p>Sandbox only — no real reservation or charge.</p>
      </section>}
      {!stay && initialData?.flights?.mockBooking && <section className="travel-empty" aria-label="Mock flight details">
        <h3>Mock booked · {initialData.flights.mockBooking.origin} ↔ {initialData.flights.mockBooking.destination}</h3>
        <p>{initialData.flights.mockBooking.departureDate} – {initialData.flights.mockBooking.returnDate}</p>
        <p>Test reference: {initialData.flights.mockBooking.reference}</p>
        <p>Sandbox only — no real ticket or charge.</p>
        <button className="travel-primary" onClick={() => onFlightCheckout?.({ savedBooking: initialData.flights.mockBooking })}>View itinerary & receipt</button>
      </section>}
      {!stay && !initialData?.flights?.mockBooking && readFlightReceipt(planId) && <button type="button" onClick={() => onFlightCheckout?.({ recoveryToken: readFlightReceipt(planId) })}>Resume flight checkout</button>}
      {stay && !initialData?.accommodation?.mockBooking && readStayReceipt(planId) && <button type="button" onClick={() => onStayCheckout?.({ recoveryToken: readStayReceipt(planId) })}>Resume stay checkout</button>}
      <form
        ref={form}
        className="travel-form"
        onSubmit={search}
        onInvalid={(event) =>
          event.target.closest("details")?.setAttribute("open", "")
        }
      >
        <p className="travel-defaults-hint">Start with your saved trip details. You can change any field before searching.</p>
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
          {!stay && (
          <FlightTravelers
            adults={adults}
            children={children}
            infants={infants}
            onAdultsChange={setAdults}
            onChildrenChange={setChildren}
            onInfantsChange={setInfants}
          />
          )}
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
        {stay && <StaySearchFilters key={planId} planId={planId} active={active} value={stayFilters} onChange={setStayFilters} onExpired={onExpired} onCatalogs={setStayCatalogs}/>}
        {stay ? (
          <details className="travel-party">
            <summary>
              {`${rooms.length} room${rooms.length > 1 ? "s" : ""} · ${rooms.reduce((n, r) => n + Number(r.adults) + r.children_ages.length, 0)} guests`} · edit travelers
            </summary>
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
            <small>
              Ages on the date of travel. Review these search details before submitting.
            </small>
          </details>
        ) : null}
      </form>
      {workspace.state.draftDirty && snapshot && <p className="travel-notice">Your edited fields apply to the next search. Results below still use the applied search.</p>}
      {exploratory && <p className="travel-notice">Exploratory search · dates or travelers differ from your saved trip. Your trip is unchanged.</p>}
      {loading && (
        <p className="travel-notice" role="status">
          {snapshot ? 'Updating results…' : 'Finding your options…'}{" "}
          {stay
            ? "Checking room availability."
            : "Flight search can take up to two minutes."}{" "}
          <button
            onClick={() => {
              workspace.cancel();
            }}
          >
            Cancel search
          </button>
        </p>
      )}
      {error && (
        <p className="travel-error" role="alert">
          {error} {snapshot && "Your last completed results are still shown."}
          <button type="button" onClick={() => form.current?.requestSubmit()}>Retry search</button>
        </p>
      )}
      {unavailable ? <p role="status" className="travel-notice">{unavailable}</p> : snapshot ? (
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
          <div className="travel-filter-chips" aria-label="Applied search constraints">
            {applied?.hotel_type_ids?.map(id => <span key={`type-${id}`}>{stayCatalogs?.hotel_type_ids.find(item => item.id === id)?.name || 'Selected property type'}</span>)}
            {applied?.facility_ids?.map(id => <span key={`facility-${id}`}>{stayCatalogs?.facility_ids.find(item => item.id === id)?.name || 'Selected amenity'}</span>)}
            {applied?.facility_ids?.length > 0 && <span>{applied.strict_facility_filtering === false ? 'Any selected amenity' : 'All selected amenities'}</span>}
            {applied?.refundable_rates_only && <span>Refundable rates only</span>}
            {budget && <span>Maximum total {snapshot.criteria.currency} {budget}</span>}
            {stars && <span>{stars}+ stars</span>}{rating && <span>Review score {rating}+</span>}
            {airline && <span>{airline}</span>}{refundable && <span>Refundable offers</span>}
            {direct && <span>Direct both ways</span>}{bag && <span>Cabin bag included</span>}
          </div>
          {evidenceExpired && <p role="status">These observations have expired. Search again before choosing an option.</p>}
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
                <SearchSelect
                  label="Airline" value={airline} onChange={setAirline}
                  options={[{ value: "", label: "All airlines" }, ...[...new Set(snapshot.results.flatMap((item) => item.airlines))].sort().map((name) => ({ value: name, label: name }))]}
                  placeholder="Search airlines…"
                />
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
                Unknown terms remain visible and are labeled; they are not confirmed matches.
              </small>
            </aside>
            <div className="travel-results">
              <div className="travel-results-heading">
                <h3 ref={resultsHeading} tabIndex={-1}>
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
              {paging}
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
                  <button type="button" onClick={editSearch}>Edit search</button>
                </div>
              )}
              {results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item) => (
                <article
                  className={`travel-result ${stay ? "stay" : "flight"}`}
                  data-option-id={item.id}
                  key={item.id}
                >
                  {stay ? (
                    <>
                      <TravelPhoto url={item.image_url} name={item.name}/>
                      <div className="travel-result-body">
                        <small className="travel-kicker">
                          {item.stars
                            ? `${item.stars} STAR PROPERTY`
                            : "YOUR STAY"}
                        </small>
                        <h3>{item.name}</h3>
                        {unknownFilterFacts(item, { stay, ...view }).length > 0 && <p className="travel-note">Not confirmed for your filters: {unknownFilterFacts(item, { stay, ...view }).join(', ')}.</p>}
                        <p>{item.address || "Address unavailable"}</p>
                        <small>Property type unavailable · Distance unavailable</small>
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
                        <p>Property amenities: {item.facilities?.length ? item.facilities.slice(0, 5).join(', ') : 'Not supplied'}</p>
                        <small>Room amenities not supplied; check the exact room details.</small>
                        <CardEvidence snapshot={snapshot} stay/>
                      </div>
                    </>
                  ) : (
                    <div className="travel-result-body">
                      {unknownFilterFacts(item, { stay, ...view }).length > 0 && <p className="travel-note">Not confirmed for your filters: {unknownFilterFacts(item, { stay, ...view }).join(', ')}.</p>}
                      <h3>
                        {item.airlines.join(" · ") || "Airline unavailable"}
                      </h3>
                      <CarrierMarks item={item} showName={false}/>
                      <Leg leg={item.outbound} label="Outbound" />
                      <Leg leg={item.inbound} label="Return" />
                      <small>
                        {item.baggage_summary ||
                          "Baggage allowance unavailable"}
                      </small>
                      <p>{item.cancellation_summary || refund(item.refundable)}</p>
                      <small>Local airport times</small>
                      <CardEvidence snapshot={snapshot}/>
                    </div>
                  )}
                  <div className="travel-result-actions">
                    <Price price={item.price} stay={stay} />
                    {workspace.dismiss && snapshot.search_id && <button type="button" data-dismiss-option disabled={workspace.state.draftDirty || evidenceExpired} onClick={event => {
                      const button = event.currentTarget, focused = document.activeElement === button;
                      const buttons = Array.from(button.closest('.travel-search').querySelectorAll('[data-dismiss-option]'));
                      const next = buttons[buttons.indexOf(button) + 1] || buttons[buttons.indexOf(button) - 1];
                      workspace.dismiss({ search_id: snapshot.search_id, option_id: item.id, room_id: null });
                      if (focused) requestAnimationFrame(() => { if (document.activeElement === document.body || document.activeElement === button) (next?.isConnected ? next : resultsHeading.current)?.focus(); });
                    }}>Dismiss from results</button>}
                    <button
                      className="travel-primary"
                      onClick={() => openDetail(item)}
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
                        aria-describedby={compared.length >= 3 ? `${mode}-compare-limit` : undefined}
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
              {results.length > PAGE_SIZE && <Pagination page={currentPage} total={results.length} onChange={changeResultsPage} label="results pages" announce={false}/>}
            </div>
          </div>
          {compared.length > 0 && (
            <section className="travel-comparison">
              <div className="travel-results-heading">
                <h3>Your comparison ({compared.length}/3)</h3>
                <button type="button" disabled={compared.length < 2} onClick={openComparison}>Compare selected ({compared.length})</button>
                <button onClick={() => setCompared([])}>
                  Clear comparison
                </button>
              </div>
              {compared.length >= 3 && <p id={`${mode}-compare-limit`}>Compare up to three options. Remove one to add another.</p>}
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
                      <button onClick={() => openDetail(item)}>
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
      <TravelComparison entries={comparison} currentSearchId={snapshot?.search_id} onChoose={onChoose} onShortlist={onShortlist} choiceDisabled={choiceDisabled} onClose={() => { setComparison([]); comparisonRun.current++; setDiscussing(false); }} onDetails={entry => workspace.dispatch({ type: 'details', value: entry })} onDiscuss={onCompare ? () => discussComparison(comparison) : null} discussionError={comparisonError} discussing={discussing}/>
      {detail && (stay ? (
        <StayDetails
          key={`${detailsReference.snapshot.search_id}:${detail.id}:${detailsReference.reference?.room_id || ''}:${Boolean(detailsReference.historical)}`}
          planId={planId}
          observation={detailsReference}
          detached={detailsReference.snapshot.search_id !== snapshot?.search_id}
          onClose={() => setDetail(null)}
          onExpired={onExpired}
          onDiscuss={discussionDisabled ? undefined : onDiscuss}
          onChoose={choiceDisabled ? undefined : onChoose}
          onCompare={compareRoom}
          booked={Boolean(initialData?.accommodation?.mockBooking)}
          onCheckout={onStayCheckout ? value => { setDetail(null); onStayCheckout(value); } : undefined}
        />
      ) : (
        <FlightDetails
          key={`${detailsReference.snapshot.search_id}:${detail.id}:${Boolean(detailsReference.historical)}`}
          observation={detailsReference}
          detached={detailsReference.snapshot.search_id !== snapshot?.search_id}
          checkoutToken={workspace.getCheckoutToken(detailsReference.reference)}
          onClose={() => setDetail(null)}
          onDiscuss={discussionDisabled ? undefined : onDiscuss}
          onChoose={choiceDisabled ? undefined : onChoose}
          booked={Boolean(initialData?.flights?.mockBooking)}
          onCheckout={value => { setDetail(null); onFlightCheckout?.(value); }}
          onRefresh={() => { setDetail(null); form.current?.requestSubmit(); }}
        />
      ))}
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
