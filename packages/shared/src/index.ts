// Shared types and Zod schemas used by both apps/backend and apps/frontend.
// Populated starting Phase 1 (plan/participant/message schemas, socket event
// contracts). Kept minimal for now so the workspace link can be verified.

export const SHARED_PACKAGE_NAME = "@plan-it/shared";

export * from "./schemas/plans.js";
export * from "./schemas/conversations.js";
export * from "./schemas/activity.js";
export * from "./socketEvents.js";
