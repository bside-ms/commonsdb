import { asc, eq } from "drizzle-orm";
import { taskOccurrences, tasks } from "~/server/database/schema";

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
        // maybe only future occurrences ?
        orderBy: asc(taskOccurrences.dueEndDate),
      },
      assignments: {
        with: {
          user: true,
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
