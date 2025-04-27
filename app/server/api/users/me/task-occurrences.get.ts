import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import {
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
} from "~/server/database/schema";
import { TaskOccurrenceStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const earliestUserTaskOccurrences = await useDrizzle
    .select({
      taskId: taskOccurrences.taskId,
      minDueEndDate: sql`MIN(${taskOccurrences.dueEndDate})`.as(
        "minDueEndDate"
      ),
    })
    .from(taskOccurrences)
    .innerJoin(
      usersOnTaskOccurrences,
      and(
        eq(taskOccurrences.id, usersOnTaskOccurrences.taskOccurrenceId),
        eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
      )
    )
    .groupBy(taskOccurrences.taskId, usersOnTaskOccurrences.userId)
    .having(eq(usersOnTaskOccurrences.userId, user.id))
    .as("earliestUserTaskOccurrences");

  const userTaskOccurrences = await useDrizzle
    .select({
      task: tasks,
      nextOccurrence: taskOccurrences,
    })
    .from(usersOnTaskOccurrences)
    .innerJoin(
      taskOccurrences,
      eq(usersOnTaskOccurrences.taskOccurrenceId, taskOccurrences.id)
    )
    .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
    .innerJoin(
      earliestUserTaskOccurrences,
      and(
        eq(taskOccurrences.taskId, earliestUserTaskOccurrences.taskId),
        or(
          eq(
            taskOccurrences.dueEndDate,
            earliestUserTaskOccurrences.minDueEndDate
          ),
          and(
            isNull(taskOccurrences.dueEndDate),
            isNull(earliestUserTaskOccurrences.minDueEndDate)
          )
        )
      )
    )
    .where(
      and(
        eq(usersOnTaskOccurrences.userId, user.id),
        eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
      )
    )
    .orderBy(asc(taskOccurrences.dueEndDate));

  return userTaskOccurrences;
});
