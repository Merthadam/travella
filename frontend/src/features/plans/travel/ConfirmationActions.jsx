import React from 'react';

export function ConfirmationActions({ onReturn, saveMessage, saveError, downloadLabel, onDownload, onPrint, downloaded, downloadNote, children }) {
  return <aside className="confirmation-actions" aria-label="Booking actions">
    <h2>Continue your trip.</h2>
    <p>Return to your trip overview for your flights, stay and saved places.</p>
    <button type="button" className="flight-primary confirmation-return" onClick={onReturn}>Return to my trip <span aria-hidden="true">→</span></button>
    <div className={`flight-save-status${saveError ? ' confirmation-save-error' : ''}`} role={saveError ? 'alert' : 'status'}>{saveMessage}</div>
    <div className="confirmation-downloads">
      <h3>Keep a copy</h3>
      <button type="button" className="flight-secondary" onClick={onDownload}>{downloadLabel}</button>
      <small>{downloadNote}</small>
      <button type="button" className="flight-secondary" onClick={onPrint}>Print / save as PDF</button>
      {downloaded && <p role="status">{downloaded}</p>}
      {children}
    </div>
  </aside>;
}
