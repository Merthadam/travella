import React, { useEffect, useId, useRef, useState } from 'react';

function TravelerCount({ label, description, singular, count, canRemove, canAdd, onRemove, onAdd }) {
  return <div className="flight-travelers-row">
    <div><strong>{label}</strong><small>{description}</small></div>
    <div className="flight-travelers-stepper">
      <button type="button" aria-label={`Remove ${singular}`} disabled={!canRemove} onClick={onRemove}>−</button>
      <output aria-label={`${label} count`}>{count}</output>
      <button type="button" aria-label={`Add ${singular}`} disabled={!canAdd} onClick={onAdd}>+</button>
    </div>
  </div>;
}

function TravelerAges({ singular, ages, min, max, onChange, onInvalid, showError, errorId }) {
  if (!ages.length) return null;
  return <div className="flight-travelers-ages">
    {ages.map((age, index) => <label key={index}>
      {singular} {index + 1} age
      <select required value={age} onInvalid={onInvalid}
        aria-invalid={showError && age === '' ? true : undefined}
        aria-describedby={showError && age === '' ? errorId : undefined}
        onChange={event => onChange(ages.map((value, i) => i === index ? event.target.value : value))}>
        <option value="">Select age</option>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(value =>
          <option key={value} value={value}>{value === 0 ? 'Under 1' : `${value} ${value === 1 ? 'year' : 'years'}`}</option>)}
      </select>
    </label>)}
  </div>;
}

export function FlightTravelers({ adults, children = [], infants = [], onAdultsChange, onChildrenChange, onInfantsChange }) {
  const [open, setOpen] = useState(false);
  const [showError, setShowError] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const frameRef = useRef(null);
  const id = useId();
  const adultCount = Number(adults);
  const total = adultCount + children.length + infants.length;
  const missingAge = [...children, ...infants].some(age => age === '');

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector('button:not(:disabled)')?.focus();
    const outside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const closeAndFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const revealInvalidAge = event => {
    event?.preventDefault();
    setShowError(true);
    setOpen(true);
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      panelRef.current?.querySelector('select:invalid')?.focus();
    });
  };
  const done = () => {
    if (panelRef.current?.querySelector('select:invalid')) revealInvalidAge();
    else { setShowError(false); closeAndFocus(); }
  };

  return <div className="flight-travelers" ref={rootRef}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        closeAndFocus();
      }
    }}>
    <button type="button" className="flight-travelers-trigger" ref={triggerRef}
      aria-expanded={open} aria-controls={`${id}-panel`} aria-haspopup="dialog"
      onClick={() => setOpen(value => !value)}>
      <span><strong>Travelers</strong><span>{total} {total === 1 ? 'traveler' : 'travelers'} · Return flights</span></span>
      <span aria-hidden="true">⌄</span>
    </button>
    <div className="flight-travelers-panel" role="dialog" aria-labelledby={`${id}-heading`}
      id={`${id}-panel`} ref={panelRef} hidden={!open}>
      <h3 id={`${id}-heading`}>Travelers</h3>
      <TravelerCount label="Adults" description="Ages 12+" singular="adult" count={adultCount}
        canRemove={adultCount > Math.max(1, infants.length)} canAdd={total < 9}
        onRemove={() => onAdultsChange(adultCount - 1)} onAdd={() => onAdultsChange(adultCount + 1)}/>
      <TravelerCount label="Children" description="Ages 2–11" singular="child" count={children.length}
        canRemove={children.length > 0} canAdd={total < 9}
        onRemove={() => onChildrenChange(children.slice(0, -1))} onAdd={() => onChildrenChange([...children, ''])}/>
      <TravelerAges singular="Child" ages={children} min={2} max={11} onChange={onChildrenChange}
        onInvalid={revealInvalidAge} showError={showError} errorId={`${id}-error`}/>
      <TravelerCount label="Infants" description="Under 2" singular="infant" count={infants.length}
        canRemove={infants.length > 0} canAdd={total < 9 && infants.length < adultCount}
        onRemove={() => onInfantsChange(infants.slice(0, -1))} onAdd={() => onInfantsChange([...infants, ''])}/>
      <TravelerAges singular="Infant" ages={infants} min={0} max={1} onChange={onInfantsChange}
        onInvalid={revealInvalidAge} showError={showError} errorId={`${id}-error`}/>
      <p className="flight-travelers-help">Up to 9 travelers. Each infant needs an adult. Ages are at departure.</p>
      {showError && missingAge && <p className="flight-travelers-error" id={`${id}-error`} role="alert">Choose an age for every child and infant.</p>}
      <button type="button" className="flight-travelers-done" onClick={done}>Done</button>
    </div>
  </div>;
}
