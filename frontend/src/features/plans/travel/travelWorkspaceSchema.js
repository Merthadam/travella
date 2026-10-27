import { z } from 'zod';
import { travelSnapshotSchema } from './CanvasTravel';

const id = z.string().min(1).max(100);
export const travelReferenceSchema = z.object({ search_id: id, option_id: id, room_id: id.nullable() }).strict();
export const emptyWorkspaceView = () => ({ budget: '', refundable: false, direct: false, bag: false, sort: 'provider', stars: '', rating: '', airline: '', page: 1, dismissed_ids: [], comparison_refs: [] });
export const travelWorkspaceViewSchema = z.object({
  budget: z.string().max(16).regex(/^(?:\d+(?:\.\d+)?)?$/),
  refundable: z.boolean(), direct: z.boolean(), bag: z.boolean(),
  sort: z.enum(['provider', 'price', 'quality']), stars: z.enum(['', '3', '4', '5']), rating: z.enum(['', '7', '8', '9']),
  airline: z.string().max(240), page: z.number().int().min(1).max(100),
  dismissed_ids: z.array(id).max(100), comparison_refs: z.array(travelReferenceSchema).max(3),
}).strict().superRefine((view, ctx) => {
  if (new Set(view.dismissed_ids).size !== view.dismissed_ids.length || new Set(view.comparison_refs.map(ref => JSON.stringify(ref))).size !== view.comparison_refs.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate workspace reference' });
});
export const travelWorkspaceContextSchema = z.object({
  instance_id: id, revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  search_id: id.nullable(), view: travelWorkspaceViewSchema, draft_dirty: z.boolean(),
}).strict().refine(value => new TextEncoder().encode(JSON.stringify(value)).length <= 32768, 'Workspace context too large');
export const travelWorkspaceUpdateSchema = z.object({
  action_id: id, plan_id: id, topic: z.enum(['stays', 'flights']), instance_id: id,
  base_revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), run_id: id,
  brief_digest: z.string().regex(/^[a-f0-9]{64}$/), search_id: id,
  snapshot: travelSnapshotSchema, view: travelWorkspaceViewSchema,
}).strict().superRefine((update, ctx) => {
  const { snapshot, view } = update;
  const member = ref => ref.search_id === snapshot.search_id && snapshot.results.some(item => item.id === ref.option_id && (!ref.room_id || snapshot.mode === 'stays' && item.rooms.some(room => room.id === ref.room_id)));
  if (snapshot.plan_id !== update.plan_id || snapshot.mode !== update.topic || snapshot.search_id !== update.search_id ||
      view.dismissed_ids.some(id => !snapshot.results.some(item => item.id === id)) || view.comparison_refs.some(ref => !member(ref)) ||
      (update.topic === 'stays' ? view.direct || view.bag || view.airline : view.stars || view.rating))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Workspace evidence does not match its scope' });
});
