import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  friendCode: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((code) => code.toUpperCase()),
});

export interface FriendProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  user: FriendProfile;
}

export interface FriendRequestsResponse {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}
