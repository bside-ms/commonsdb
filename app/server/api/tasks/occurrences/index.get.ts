import { and, or, eq, inArray, isNull, not, sql } from "drizzle-orm";
import {
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
  usersOnTasks,
} from "~/server/database/schema";
import { TaskOccurrenceStatus, TaskStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  // TODO maybe: add 'for user' filter, to only show tasks not taken by the user
  // if not set, e.g. request by an admin, it is just a list of all tasks...

  // const { filter, sort } = getQuery<{ filter?: any; sort?: string }>(event);
  // return await getTasksWithOccurrences(filter, sort);

  // 'for user'
  const { user } = await requireUserSession(event);

  const userOpenTaskIds = await useDrizzle
    .select({
      id: tasks.id,
    })
    .from(usersOnTasks)
    .innerJoin(tasks, eq(usersOnTasks.taskId, tasks.id))
    .where(
      and(
        eq(usersOnTasks.userId, user.id),
        eq(tasks.status, TaskStatus.PROCESSING),
      ),
    );

  const skip = 0;
  const take = 25;

  const earliestTaskOccurrencePerTaskSubquery = await useDrizzle
    .select({
      taskId: taskOccurrences.taskId,
      minDueEndDate: sql`MIN(${taskOccurrences.dueEndDate})`.as(
        "minDueEndDate",
      ),
    })
    .from(taskOccurrences)
    .where(eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING))
    .groupBy(taskOccurrences.taskId)
    .as("earliestTaskOccurrencePerTask");

  const openTaskOccurrences = await useDrizzle
    .select({
      data: {
        ...taskOccurrences,
        task: {
          ...tasks,
        },
      },
      totalCount: sql<number>`count(*) over()`,
    })
    .from(taskOccurrences)
    .innerJoin(
      earliestTaskOccurrencePerTaskSubquery,
      and(
        eq(
          taskOccurrences.taskId,
          earliestTaskOccurrencePerTaskSubquery.taskId,
        ),
        or(
          // has minDueDate
          eq(
            taskOccurrences.dueEndDate,
            earliestTaskOccurrencePerTaskSubquery.minDueEndDate,
          ),
          // minDueDate is null
          and(
            isNull(taskOccurrences.dueEndDate),
            isNull(earliestTaskOccurrencePerTaskSubquery.minDueEndDate),
          ),
        ),
      ),
    )
    .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
    .leftJoin(
      usersOnTaskOccurrences,
      eq(taskOccurrences.id, usersOnTaskOccurrences.taskOccurrenceId),
    )
    .where(
      and(
        eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
        eq(tasks.status, TaskStatus.PROCESSING),
        isNull(usersOnTaskOccurrences.taskOccurrenceId), // no responsible users
        not(
          inArray(
            tasks.id,
            userOpenTaskIds.map((x) => x.id),
          ),
        ), // user is not already responsible
      ),
    )
    .limit(take)
    .offset(skip);

  return {
    items: openTaskOccurrences.map((x) => x.data),
    totalCount: openTaskOccurrences.at(0)?.totalCount ?? 0,
    skip,
    take,
  };
});
