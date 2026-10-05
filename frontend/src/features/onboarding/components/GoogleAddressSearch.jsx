import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../../lib/googleMaps';

// Google owns the input, predictions, keyboard selection and attribution.
export function GoogleAddressSearch({ onSelect, onEdit, disabled = false }) {
  const host = useRef(null);
  const widget = useRef(null);
  const callbacks = useRef({ onSelect, onEdit });
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  callbacks.current = { onSelect, onEdit };

  useEffect(() => {
    let current = true;
    let element;
    const container = host.current;
    let lastValue = '';
    const select = event => {
      lastValue = element.value;
      callbacks.current.onSelect(event.placePrediction);
    };
    // The widget's clear button does not emit a normal bubbling input event.
    // Read its public value after Google's own event handlers finish.
    const edit = () => setTimeout(() => {
      if (!current || element.value === lastValue) return;
      lastValue = element.value;
      callbacks.current.onEdit();
    }, 0);
    const fail = () => { if (current) setError(true); };
    setReady(false); setError(false);
    loadGoogleMaps({ libraries: ['places'] }).then(({ libraries }) => {
      if (!current) return;
      element = new libraries.places.PlaceAutocompleteElement();
      element.placeholder = 'Search your home address';
      element.setAttribute('aria-label', 'Your home address');
      element.addEventListener('gmp-select', select);
      element.addEventListener('gmp-error', fail);
      for (const type of ['input', 'change', 'click', 'keyup']) container.addEventListener(type, edit, true);
      container.replaceChildren(element);
      widget.current = element;
      setReady(true);
    }).catch(fail);
    return () => {
      current = false;
      element?.removeEventListener('gmp-select', select);
      element?.removeEventListener('gmp-error', fail);
      for (const type of ['input', 'change', 'click', 'keyup']) container.removeEventListener(type, edit, true);
      element?.remove();
      widget.current = null;
    };
  }, [attempt]);

  useEffect(() => { if (widget.current) widget.current.disabled = disabled; }, [disabled, ready]);

  return <div className="ts-google-address">
    <div ref={host} />
    {!ready && !error && <p className="ts-help" role="status">Loading Google address search…</p>}
    {error && <div className="ts-lookup-error" role="status"><p>Google address search couldn’t load. Retry or enter your address manually.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry Google search</button></div>}
  </div>;
}
