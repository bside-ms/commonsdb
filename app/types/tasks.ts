import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
  categoriesOnTasks,
  taskAssignments,
  taskCategories,
  taskLinks,
  taskOccurrences,
  tasks,
} from "~/server/database/schema";

export enum TaskAssignmentStatus {
  OPEN = "OPEN",
  PARTLY_ASSIGNED = "PARTLY_ASSIGNED",
  FULLY_ASSIGNED = "FULLY_ASSIGNED",
}
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

export type Task = InferSelectModel<typeof tasks>;
export type InsertTask = InferInsertModel<typeof tasks>;

export type TaskOccurrence = InferSelectModel<typeof taskOccurrences>;
export type TaskAssignment = InferSelectModel<typeof taskAssignments>;
export type TaskLink = InferSelectModel<typeof taskLinks>;
export type TaskCategory = InferSelectModel<typeof taskCategories>;
export type CategoryOnTask = InferSelectModel<typeof categoriesOnTasks>;

export interface WithOccurences {
  occurrences: TaskOccurrence[];
}
