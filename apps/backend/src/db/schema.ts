import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// See docs/03-data-model.md for the full data model this mirrors.

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'direct' | 'group'
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.conversationId, table.userId] })],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    planId: uuid("plan_id").references(() => plans.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)],
);

// ---------------------------------------------------------------------------
// Plans (shared core)
// ---------------------------------------------------------------------------

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'date' | 'hangout' | 'goal'
    title: text("title").notNull(),
    // date/hangout: 'proposed' | 'confirmed' | 'cancelled' ('completed' is derived, never stored)
    // goal: unused — goal_details.status is authoritative
    status: text("status").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("plans_created_by_idx").on(table.createdBy),
    index("plans_start_date_idx").on(table.startDate),
  ],
);

export const planParticipants = pgTable(
  "plan_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(), // 'owner' | 'participant' (date/hangout) | 'viewer' (goal)
    rsvpStatus: text("rsvp_status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("plan_participants_plan_user_unique").on(table.planId, table.userId)],
);

// ---------------------------------------------------------------------------
// Date / Hangout details
// ---------------------------------------------------------------------------

export const dateDetails = pgTable("date_details", {
  planId: uuid("plan_id")
    .primaryKey()
    .references(() => plans.id),
  location: text("location"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
});

export const hangoutDetails = pgTable("hangout_details", {
  planId: uuid("plan_id")
    .primaryKey()
    .references(() => plans.id),
  location: text("location"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
});

// ---------------------------------------------------------------------------
// Goal details
// ---------------------------------------------------------------------------

export const goalDetails = pgTable("goal_details", {
  planId: uuid("plan_id")
    .primaryKey()
    .references(() => plans.id),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active' | 'achieved' | 'abandoned'
});

export const goalMilestones = pgTable(
  "goal_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    title: text("title").notNull(),
    isDone: boolean("is_done").notNull().default(false),
    position: integer("position").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("goal_milestones_plan_position_idx").on(table.planId, table.position)],
);

// ---------------------------------------------------------------------------
// Comments (generic, reused across features)
// ---------------------------------------------------------------------------

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentableType: text("commentable_type").notNull(), // 'goal' for MVP
    commentableId: uuid("commentable_id").notNull(), // polymorphic reference, e.g. plans.id
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("comments_commentable_created_idx").on(
      table.commentableType,
      table.commentableId,
      table.createdAt,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id), // whose feed this shows up in
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id), // who performed the action
    type: text("type").notNull(), // 'plan_created' | 'plan_confirmed' | 'plan_cancelled' | 'milestone_completed' | 'goal_achieved' | 'comment_posted' | ...
    planId: uuid("plan_id").references(() => plans.id),
    payload: jsonb("payload"), // small denormalized snapshot for rendering without extra joins
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_events_user_created_idx").on(table.userId, table.createdAt)],
);
