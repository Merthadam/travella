import { z } from 'zod';

const id = z.string().min(1).max(100), text = z.string().max(240);
const criteria = z.object(Object.fromEntries(['destination', 'check_in', 'check_out', 'departure_date', 'return_date', 'origin', 'adults', 'children', 'travelers', 'currency', 'cabin', 'refundable', 'property_type'].map(key => [key, z.union([z.string().max(240), z.number(), z.boolean(), z.null()]).optional()])));
const option = z.object({ id, title: z.string().min(1).max(160), summary: z.string().max(600).default(''), price_label: z.string().max(120).default(''), facts: z.array(text).max(8).default([]), unknowns: z.array(text).max(6).default([]), observed_at: z.string().datetime({ offset: true }), provider: z.string().max(50), criteria: criteria.default({}), reference: z.object({ search_id: id, option_id: id, room_id: id.nullable().optional() }).nullable().optional() });
const choice = option.extend({ evidence_id: id.optional(), facts_digest: z.string().max(64).optional(), selected_at: z.string().max(40).optional(), unbooked: z.literal(true).optional() });
const brief = z.object({
  digest: z.string().max(64).optional(), facts_digest: z.string().max(64).optional(), context_revision: z.number().int().optional(), plan_revision: z.number().int().optional(),
  destination: z.string().max(240).nullable().optional(), dates: z.object({ start: z.string().max(40).nullable().optional(), end: z.string().max(40).nullable().optional(), flexible: z.boolean().optional() }).optional(),
  travelers: z.number().nullable().optional(), budget: z.union([z.number(), z.string().max(240)]).nullable().optional(), no_fixed_budget: z.boolean().optional(),
  themes: z.array(z.object({ text, kind: z.string().max(40).optional(), source: z.string().max(120).optional() })).max(10).default([]),
  selected_places: z.array(z.object({ id: id.optional(), name: text, category: z.string().max(80).optional(), position: z.object({ lat: z.number(), lng: z.number() }).optional() })).max(10).default([]), omitted_places: z.number().int().nonnegative().default(0),
  accepted_choices: z.array(z.object({ topic: z.enum(['stays', 'flights']), title: z.string().max(160), summary: text.optional(), needs_review: z.boolean().optional(), unbooked: z.literal(true).optional() })).max(2).default([]),
});
export const travelTopicSchema = z.object({
  plan_id: id, topic: z.enum(['stays', 'flights']), revision: z.number().int().nonnegative(), brief: brief.optional(),
  messages: z.array(z.object({ message_id: id.optional(), role: z.enum(['user', 'assistant']), content: z.string().max(2000), status: z.string().max(32).optional(), sequence: z.number().int().optional(), comparison: z.object({ options: z.array(option).max(3) }).optional(), comparison_stale: z.boolean().optional() })).max(50),
  notes: z.object({ items: z.array(z.object({ text: z.string().max(400), kind: z.enum(['user_preference', 'assistant_inference', 'rejection', 'research_override']), source_message_ids: z.array(id).max(4) })).max(12), covered_through_sequence: z.number().int().optional(), comparison: z.object({ options: z.array(option).max(3) }).optional(), comparison_stale: z.boolean().optional(), incomplete: z.boolean() }).optional(),
  comparison: z.object({ options: z.array(option).max(3) }).nullable().optional(), comparison_stale: z.boolean().optional(), shortlist: z.array(choice).max(5).default([]), preferred: choice.nullable().default(null), readiness: z.enum(['researching', 'ready', 'needs_review']), locked: z.boolean().default(false),
});
export function travelTopicProjection(value, planId, topic) {
  if (!value || JSON.stringify(value).length > 100000) return null;
  const parsed = travelTopicSchema.safeParse(value);
  return parsed.success && parsed.data.plan_id === planId && parsed.data.topic === topic ? parsed.data : null;
}
