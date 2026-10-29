import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

export const PlanHeaderContext = createContext(null);

export function PlanHeaderSlot({ slot, children }) {
  const shell = useContext(PlanHeaderContext);
  if (!shell) return children;
  return shell[slot] ? createPortal(children, shell[slot]) : null;
}
