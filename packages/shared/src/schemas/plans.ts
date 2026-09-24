import { z } from "zod";

// See docs/03-data-model.md and docs/05-plan-lifecycles.md for the rules
// these schemas encode.

export const planTypeSchema = z.enum(["date", "hangout", "goal"]);
export const planStatusSchema = z.enum(["proposed", "confirmed", "cancelled"]);
export const goalStatusSchema = z.enum(["active", "achieved", "abandoned"]);
export const rsvpStatusSchema = z.enum(["pending", "accepted", "declined"]);
export const participantRoleSchema = z.enum(["owner", "participant", "viewer"]);

const eventFields = {
  title: z.string().min(1).max(200),
  location: z.string().max(300).optional(),
  scheduledAt: z.coerce.date(),
  notes: z.string().max(2000).optional(),
};

export const createDatePlanSchema = z.object({
  type: z.literal("date"),
  ...eventFields,
  inviteeId: z.string().uuid(),
});

export const createHangoutPlanSchema = z.object({
  type: z.literal("hangout"),
  ...eventFields,
  inviteeIds: z.array(z.string().uuid()).min(1),
});

export const createGoalMilestoneInputSchema = z.object({
  title: z.string().min(1).max(200),
  position: z.number().int().min(0).optional(),
});

export const createGoalPlanSchema = z.object({
  type: z.literal("goal"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  viewerIds: z.array(z.string().uuid()).default([]),
  milestones: z.array(createGoalMilestoneInputSchema).default([]),
});

export const createPlanSchema = z.discriminatedUnion("type", [
  createDatePlanSchema,
  createHangoutPlanSchema,
  createGoalPlanSchema,
]);

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updateDateHangoutPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  location: z.string().max(300).nullable().optional(),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateGoalPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: goalStatusSchema.optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

export const inviteParticipantSchema = z.object({
  userId: z.string().uuid(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  position: z.number().int().min(0).optional(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isDone: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const listPlansQuerySchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  type: planTypeSchema.optional(),
  status: planStatusSchema.optional(),
});
