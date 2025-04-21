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
export const taskAssignmentStatusEnum = pgEnum("task_assignment_status", [
  "OPEN",
  "PARTLY_ASSIGNED",
  "FULLY_ASSIGNED",
]);
export const taskFrequencyEnum = pgEnum("task_frequency", [
  "IRREGULAR",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
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
  assignmentStatus: taskAssignmentStatusEnum().default("OPEN").notNull(),

  title: text("title").notNull(),
  description: text("description"),

  type: taskTypeEnum().notNull(),
  frequency: taskFrequencyEnum(),
  dueStartDate: timestamp("due_start_date", { mode: "string" }),
  dueEndDate: timestamp("due_end_date", { mode: "string" }),

  priority: taskPriorityEnum(),
  expense: integer("expense"),
  factor: numeric("factor", { precision: 2 }),

  maxAssignmentCount: integer("max_assignment_count").default(1).notNull(),
});

export const tasksRelations = relations(tasks, ({ many }) => ({
  categories: many(categoriesOnTasks),
  occurrences: many(taskOccurrences),
  assignments: many(taskAssignments),
  links: many(taskLinks),
}));

export const taskAssignments = pgTable(
  "task_assignments",
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
    assignedBy: text("assigned_by"),

    resignedAt: timestamp("resigned_at", {
      mode: "string",
    }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.taskId] })]
);

export const taskAssignmentsRelations = relations(
  taskAssignments,
  ({ one }) => ({
    user: one(users, {
      fields: [taskAssignments.userId],
      references: [users.id],
    }),
    task: one(tasks, {
      fields: [taskAssignments.taskId],
      references: [tasks.id],
    }),
  })
);

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
      references: [categoriesOnTasks.id],
    }),
  })
);
