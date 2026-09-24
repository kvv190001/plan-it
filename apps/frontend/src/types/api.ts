// Response shapes returned by apps/backend — see docs/03-data-model.md and
// docs/04-api-design.md. Mirrors the raw (camelCase) drizzle rows the API
// returns; kept here rather than in @plan-it/shared since these are
// read/response shapes, not the request schemas already shared there.

export interface PublicUser {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  title: string | null
  createdAt: string
  participantIds: string[]
  lastMessage: {
    conversationId: string
    content: string
    senderId: string
    createdAt: string
  } | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  planId: string | null
  createdAt: string
}

export type PlanType = 'date' | 'hangout' | 'goal'
export type PlanStatus = 'proposed' | 'confirmed' | 'cancelled'
export type DisplayStatus = PlanStatus | 'completed' | 'active' | 'achieved' | 'abandoned'
export type ParticipantRole = 'owner' | 'participant' | 'viewer'
export type RsvpStatus = 'pending' | 'accepted' | 'declined'

export interface PlanParticipant {
  id: string
  planId: string
  userId: string
  role: ParticipantRole
  rsvpStatus: RsvpStatus
  createdAt: string
}

export interface EventDetails {
  planId: string
  location: string | null
  scheduledAt: string
  notes: string | null
}

export interface GoalMilestone {
  id: string
  planId: string
  title: string
  isDone: boolean
  position: number
  completedAt: string | null
}

export interface GoalDetails {
  planId: string
  description: string | null
  status: 'active' | 'achieved' | 'abandoned'
  milestones: GoalMilestone[]
}

export interface PlanBase {
  id: string
  type: PlanType
  title: string
  status: PlanStatus | 'active'
  displayStatus: DisplayStatus
  createdBy: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export interface DatePlan extends PlanBase {
  type: 'date'
  details: EventDetails
}

export interface HangoutPlan extends PlanBase {
  type: 'hangout'
  details: EventDetails
}

export interface GoalPlan extends PlanBase {
  type: 'goal'
  details: GoalDetails
}

export type Plan = DatePlan | HangoutPlan | GoalPlan

// GET /plans/:id includes participants; GET /plans (list) does not.
export type PlanWithParticipants = Plan & { participants: PlanParticipant[] }

export interface Comment {
  id: string
  commentableType: string
  commentableId: string
  authorId: string
  content: string
  createdAt: string
}

export interface ActivityEvent {
  id: string
  type: string
  planId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
  actorId: string
  actorDisplayName: string | null
  actorAvatarUrl: string | null
}
