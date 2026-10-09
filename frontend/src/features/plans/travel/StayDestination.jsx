import React, { useEffect, useState } from "react";
import { travelRequest } from "./travelApi";

export function StayDestination({
  query,
  setQuery,
  value,
  onChange,
  country,
  planId,
  active,
  onExpired,
}) {
  const [options, setOptions] = useState([]);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOptions([]);
    setFailed(false);
    if (!active || value || query.trim().length < 2 || !country) {
      setMessage(
        value
          ? `Selected: ${value.name}${value.address ? `, ${value.address}` : ""}`
          : !country
            ? "Choose a destination country to find cities."
            : "Type a city, then choose a suggestion.",
      );
      return;
    }
    const controller = new AbortController();
    let live = true;
    setMessage("Finding destinations…");
    const timer = setTimeout(async () => {
      try {
        const result = await travelRequest(
          planId,
          "places",
          { q: query.trim(), country_code: country },
          controller.signal,
        );
        if (live) {
          setOptions(result.places);
          setMessage(
            result.places.length
              ? "Choose your destination below."
              : "No destinations found. Check the city and country.",
          );
        }
      } catch (error) {
        if (live && error.name !== "AbortError") {
          setMessage("Destination suggestions unavailable. Please retry.");
          setFailed(true);
          if (error.status === 401) onExpired?.();
        }
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, country, value, planId, active, retry]);
  return (
    <div className="travel-airport travel-stay-destination">
      <label>
        Destination city
        <input
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
            setOptions([]);
          }}
        />
      </label>
      <small role="status">{message}</small>
      {failed && (
        <button type="button" onClick={() => setRetry((n) => n + 1)}>
          Retry destinations
        </button>
      )}
      {options.length > 0 && (
        <ul aria-label="Destination city suggestions">
          {options.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => {
                  onChange(place);
                  setQuery(place.name);
                  setOptions([]);
                }}
              >
                <b>{place.name}</b>
                <small>{place.address}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
