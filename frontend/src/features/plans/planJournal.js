export const planStage = plan => plan.planning_stage === 'canvas' ? 'Canvas' : 'Research';
export function activityLabel(value, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today - day) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}
export function tripDates(plan) {
  if (plan.flexible_dates) return 'Flexible dates';
  const format = value => { const date = new Date(`${value}T12:00:00`); return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  return [plan.date_start, plan.date_end].filter(Boolean).map(format).filter(Boolean).join(' – ') || 'Dates undecided';
}
