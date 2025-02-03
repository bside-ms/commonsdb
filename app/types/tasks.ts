import type { Prisma } from "@prisma/client";

const taskIncludingOccurrences = {
  include: {
    occurrences: true,
  },
} satisfies Prisma.TaskDefaultArgs;
export type TaskWithOccurrences = Prisma.TaskGetPayload<
  typeof taskIncludingOccurrences
>;

const taskIncludingCategories = {
  include: {
    categories: true,
  },
} satisfies Prisma.TaskDefaultArgs;
export type TaskWithCategories = Prisma.TaskGetPayload<
  typeof taskIncludingCategories
>;

const taskIncludingLinks = {
  include: {
    links: true,
  },
} satisfies Prisma.TaskDefaultArgs;
export type TaskWithLinks = Prisma.TaskGetPayload<typeof taskIncludingLinks>;

const taskIncludingResponsibilities = {
  include: {
    responsibilities: true,
  },
} satisfies Prisma.TaskDefaultArgs;
export type TaskWithResponsibilities = Prisma.TaskGetPayload<
  typeof taskIncludingResponsibilities
>;

export type TaskFull = TaskWithOccurrences &
  TaskWithLinks &
  TaskWithCategories &
  TaskWithResponsibilities;
