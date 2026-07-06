import { z } from "zod";

export const NotificationChannelSchema = z.enum(["email", "line", "push"]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  oauthProvider: z.string().min(1),
  oauthSubjectId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
});
export type User = z.infer<typeof UserSchema>;

export const NotificationTopicFilterSchema = z.object({
  factionIds: z.array(z.string().uuid()).default([]),
  legislatorIds: z.array(z.string().uuid()).default([]),
  categories: z.array(z.string()).default([]),
});
export type NotificationTopicFilter = z.infer<typeof NotificationTopicFilterSchema>;

export const NotificationSettingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  channel: NotificationChannelSchema,
  topicFilter: NotificationTopicFilterSchema,
  isEnabled: z.boolean(),
});
export type NotificationSetting = z.infer<typeof NotificationSettingSchema>;
