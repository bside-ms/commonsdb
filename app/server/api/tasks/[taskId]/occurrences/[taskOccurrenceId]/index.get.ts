import { and, eq } from "drizzle-orm";
import { taskOccurrences } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "taskId");
  const taskOccurrenceId = getRouterParam(event, "taskOccurrenceId");

  const taskOccurrence = await useDrizzle.query.taskOccurrences.findFirst({
    where: and(
      eq(taskOccurrences.taskId, taskId!),
      eq(taskOccurrences.id, taskOccurrenceId!),
    ),
    with: {
      task: {
        with: {
          links: true,
        },
      },
    },
  });

  return taskOccurrence;
});
