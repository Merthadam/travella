import React, { useId, useRef, useState } from "react";
import "./search-select.css";

export const PAGE_SIZE = 10;

export function Pagination({ page, total, onChange, label, announce = true }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!total) return null;
  return (
    <nav className="travel-pagination" aria-label={label}>
      <span role={announce ? 'status' : undefined}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
      {pages > 1 && <div>
        <button type="button" aria-label={`Previous ${label}`} disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" aria-label={`Next ${label}`} disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>}
    </nav>
  );
}

// Draft query text never replaces the chosen value. Leaving the control restores
// that value; only choosing a listed option changes the submitted criteria.
export function SearchSelect({ label, value, options, onChange, required = false, placeholder = "Search…" }) {
  const id = useId();
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [highlight, setHighlight] = useState(-1);
  const selected = options.find((option) => option.value === value);
  const term = query.trim().toLocaleLowerCase();
  const matches = options.filter((option) => `${option.label} ${option.value}`.toLocaleLowerCase().includes(term));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matches.length / PAGE_SIZE)));
  const visible = matches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  function reveal() { setOpen(true); setQuery(""); setPage(1); setHighlight(-1); }
  function choose(option) {
    onChange(option.value);
    setOpen(false);
    input.current?.focus();
  }
  function changePage(next) { setPage(next); setHighlight(-1); }
  return (
    <div className="travel-search-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={id}>{label}</label>
      <input
        ref={input} id={id} role="combobox" autoComplete="off"
        required={required} placeholder={placeholder}
        value={open ? query : selected?.label || ""}
        aria-expanded={open} aria-controls={`${id}-options`} aria-autocomplete="list"
        aria-activedescendant={open && visible[highlight] ? `${id}-option-${highlight}` : undefined}
        onClick={() => { if (!open) reveal(); }}
        onChange={(event) => { setOpen(true); setQuery(event.target.value); setPage(1); setHighlight(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) { reveal(); setHighlight(event.key === "ArrowDown" ? 0 : Math.min(PAGE_SIZE, matches.length) - 1); }
            else setHighlight((index) => event.key === "ArrowDown" ? Math.min(index + 1, visible.length - 1) : Math.max(index - 1, 0));
          } else if (open && (event.key === "PageDown" || event.key === "PageUp")) {
            event.preventDefault();
            changePage(Math.max(1, Math.min(currentPage + (event.key === "PageDown" ? 1 : -1), Math.ceil(matches.length / PAGE_SIZE))));
          } else if (open && event.key === "Enter") {
            event.preventDefault();
            if (visible[highlight]) choose(visible[highlight]);
            else if (matches.length === 1) choose(matches[0]);
          }
        }}
      />
      {open && <div className="travel-select-popover">
        <ul id={`${id}-options`} role="listbox" aria-label={`${label} choices`}>
          {visible.map((option, index) => <li
            key={option.value} id={`${id}-option-${index}`} role="option"
            aria-selected={option.value === value} className={index === highlight ? "is-highlighted" : ""}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
          >{option.label}{option.value === value && <span aria-hidden="true">✓</span>}</li>)}
        </ul>
        {!matches.length && <p role="status">No matches. Try another search.</p>}
        <Pagination page={currentPage} total={matches.length} onChange={changePage} label={`${label} choices`} />
      </div>}
    </div>
  );
}
