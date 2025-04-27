import { and, eq, inArray } from "drizzle-orm";
import {
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
  usersOnTasks,
} from "~/server/database/schema";
import { TaskOccurrenceStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { userId } = (await readBody(event)) ?? {};

  if (!taskId || taskId === "undefined") {
    throw createError({
      statusCode: 400,
    });
  }

  const { user } = await requireUserSession(event);

  // admin needed, if not resigning for the own user
  if (userId && userId !== user.id) {
    const isAdmin = await isAdminUser(event);
    if (!isAdmin) {
      throw createError({
        statusCode: 403,
        message: "Forbidden",
      });
    }
  }

  await useDrizzle.transaction(async (tx) => {
    const pendingTaskOccurrenceIds = await tx
      .select({
        id: taskOccurrences.id,
      })
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
          eq(taskOccurrences.taskId, taskId)
        )
      );

    // remove user from taskOccurrences
    await tx.delete(usersOnTaskOccurrences).where(
      and(
        eq(usersOnTaskOccurrences.userId, user.id),
        inArray(
          usersOnTaskOccurrences.taskOccurrenceId,
          pendingTaskOccurrenceIds.map((x) => x.id)
        )
      )
    );

    // remove user from task
    await tx
      .delete(usersOnTasks)
      .where(
        and(eq(usersOnTasks.userId, user.id), eq(usersOnTasks.taskId, taskId))
      );
  });
});
