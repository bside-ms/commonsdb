import { asc, eq } from "drizzle-orm";
import { taskOccurrences, tasks } from "~/server/database/schema";
import { TaskOccurrenceStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");

  if (!taskId || taskId === "undefined") {
    throw createError({ status: 400 });
  }

  const task = await useDrizzle.query.tasks.findFirst({
    with: {
      links: true,
      categories: true,
      occurrences: {
        where: eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
        orderBy: asc(taskOccurrences.dueEndDate),
      },
      responsibleUsers: {
        columns: {
          userId: true,
        },
      },
      // TODO: only maxAssignmentCount < count(assignments)
      //     _count: {
      //       select: {
      //         responsibilities: true,
      //       },
      //     },
    },
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    throw createError({ status: 404 });
  }

  return task;
});
