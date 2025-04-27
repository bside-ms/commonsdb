import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
  categoriesOnTasks,
  taskCategories,
  taskLinks,
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
  usersOnTasks,
} from "~/server/database/schema";

export enum TaskOccurrenceStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
}
export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}
export enum TaskType {
  SINGLE = "SINGLE",
  RECURRING = "RECURRING",
}
export enum TaskStatus {
  PROCESSING = "PROCESSING",
  COMPLETE = "COMPLETE",
}
export enum TaskPublishingStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  FOLDED = "FOLDED", // eingestellt [beendet]
}
export enum TaskFrequency {
  IRREGULAR = "IRREGULAR",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
}
export enum TaskEndsAfter {
  NEVER = "NEVER",
  COUNT = "COUNT",
  DATE = "DATE",
}

export type Task = InferSelectModel<typeof tasks>;
export type UserOnTask = InferSelectModel<typeof usersOnTasks>;

export type TaskOccurrence = InferSelectModel<typeof taskOccurrences>;
export type TaskOccurrenceInsert = InferInsertModel<typeof taskOccurrences>;
export type UserOnTaskOccurrence = InferSelectModel<
  typeof usersOnTaskOccurrences
>;

export type TaskLink = InferSelectModel<typeof taskLinks>;
export type TaskCategory = InferSelectModel<typeof taskCategories>;
export type CategoryOnTask = InferSelectModel<typeof categoriesOnTasks>;

export interface WithOccurrences {
  occurrences: TaskOccurrence[];
}
export interface WithResponsibleUsers {
  responsibleUsers: UserOnTask[];
}
