import {
  pgTable,
  uuid,
  text,
  pgEnum,
  timestamp,
  integer,
  numeric,
  primaryKey,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

export const taskPriorityEnum = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export const taskTypeEnum = pgEnum("task_type", ["SINGLE", "RECURRING"]);
export const taskStatusEnum = pgEnum("task_status", ["PROCESSING", "COMPLETE"]);
export const taskPublishingStatusEnum = pgEnum("task_publishing_status", [
  "DRAFT",
  "PUBLISHED",
  "FOLDED", // eingestellt [beendet]
]);
export const taskFrequencyEnum = pgEnum("task_frequency", [
  "IRREGULAR",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
]);
export const taskEndsAfterEnum = pgEnum("task_ends_after", [
  "NEVER",
  "COUNT",
  "DATE",
]);
export const taskOccurrenceStatusEnum = pgEnum("task_occurrence_status", [
  "PENDING",
  "COMPLETED",
  "MISSED",
]);

export const tasks = pgTable("tasks", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
  })
    .defaultNow()
    .$onUpdate(() => new Date().toISOString())
    .notNull(),

  status: taskStatusEnum().default("PROCESSING").notNull(),
  publishingStatus: taskPublishingStatusEnum().default("DRAFT").notNull(),

  title: text("title").notNull(),
  description: text("description"),

  type: taskTypeEnum().notNull(),
  frequency: taskFrequencyEnum(),
  dueStartDate: timestamp("due_start_date", { mode: "string" }),
  dueEndDate: timestamp("due_end_date", { mode: "string" }),
  endsAfter: taskEndsAfterEnum().notNull().default("NEVER"),
  endsAfterCount: integer("ends_after_count"),
  endsAfterDate: timestamp("ends_after_date", { mode: "string" }),

  priority: taskPriorityEnum(),
  expense: integer("expense"),
  factor: numeric("factor", { precision: 2 }),
});

export const tasksRelations = relations(tasks, ({ many }) => ({
  categories: many(categoriesOnTasks),
  occurrences: many(taskOccurrences),
  links: many(taskLinks),
  responsibleUsers: many(usersOnTasks),
}));

export const usersOnTasks = pgTable(
  "users_on_tasks",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    taskId: uuid("task_id")
      .references(() => tasks.id)
      .notNull(),

    assignedAt: timestamp("assigned_at", {
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id),

    resignedAt: timestamp("resigned_at", {
      mode: "string",
    }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.taskId] })]
);

export const usersOnTasksRelations = relations(usersOnTasks, ({ one }) => ({
  user: one(users, {
    fields: [usersOnTasks.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [usersOnTasks.taskId],
    references: [tasks.id],
  }),
  assignedByUser: one(users, {
    fields: [usersOnTasks.assignedByUserId],
    references: [users.id],
  }),
}));

export const taskOccurrences = pgTable("task_occurrences", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  taskId: uuid("task_id")
    .references(() => tasks.id)
    .notNull(),

  dueStartDate: timestamp("due_start_date", {
    mode: "string",
  }),
  dueEndDate: timestamp("due_end_date", {
    mode: "string",
  }),

  status: taskOccurrenceStatusEnum().default("PENDING").notNull(),
});

export const taskOccurrencesRelations = relations(
  taskOccurrences,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskOccurrences.taskId],
      references: [tasks.id],
    }),
  })
);

export const usersOnTaskOccurrences = pgTable(
  "users_on_task_occurrences",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    taskOccurrenceId: uuid("task_occurrence_id")
      .references(() => taskOccurrences.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.taskOccurrenceId] })]
);

export const usersOnTaskOccurrencesRelations = relations(
  usersOnTaskOccurrences,
  ({ one }) => ({
    user: one(users, {
      fields: [usersOnTaskOccurrences.userId],
      references: [users.id],
    }),
    taskOccurrence: one(taskOccurrences, {
      fields: [usersOnTaskOccurrences.taskOccurrenceId],
      references: [taskOccurrences.id],
    }),
  })
);

export const taskLinks = pgTable("task_links", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),

  label: text("label"),
  url: text("url").notNull(),

  taskId: uuid("task_id").references(() => tasks.id),
});

export const taskLinksRelations = relations(taskLinks, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLinks.taskId],
    references: [tasks.id],
  }),
}));

export const taskCategories = pgTable("task_categories", {
  id: uuid().primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
  })
    .defaultNow()
    .notNull(),

  name: text("url").unique().notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => taskCategories.id),
});

export const taskCategoriesRelations = relations(
  taskCategories,
  ({ one, many }) => ({
    parent: one(taskCategories, {
      fields: [taskCategories.parentId],
      references: [taskCategories.id],
    }),
    tasks: many(categoriesOnTasks),
  })
);

export const categoriesOnTasks = pgTable(
  "categories_on_tasks",
  {
    taskId: uuid("task_id")
      .references(() => tasks.id)
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => taskCategories.id)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.categoryId] })]
);

export const categoriesOnTasksRelations = relations(
  categoriesOnTasks,
  ({ one }) => ({
    task: one(tasks, {
      fields: [categoriesOnTasks.taskId],
      references: [tasks.id],
    }),
    category: one(taskCategories, {
      fields: [categoriesOnTasks.categoryId],
      references: [taskCategories.id],
    }),
  })
);
