import { and, eq } from "drizzle-orm";
import { taskAssignments, tasks } from "~/server/database/schema";
import { TaskAssignmentStatus } from "~/types/tasks";

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
    const assignment = await tx
      .delete(taskAssignments)
      .where(
        and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.userId, userId)
        )
      )
      .returning();

    // if assignment was delete/released, update task.responsibilityStatus
    if (assignment) {
      // OVERENGINEERED, but maybe good for future reference...
      // const { maxAssignmentCount, assignemtCount } =
      //   (
      //     await useDrizzle
      //       .select({
      //         maxAssignmentCount: tasks.maxAssignmentCount,
      //         assignemtCount: count(),
      //       })
      //       .from(taskAssignments)
      //       .innerJoin(tasks, eq(taskAssignments.taskId, tasks.id))
      //       .groupBy(taskAssignments.taskId, tasks.maxAssignmentCount)
      //       .having(eq(taskAssignments.taskId, taskId))
      //   ).at(0) ?? {};

      const assignemtCount = await tx.$count(
        taskAssignments,
        eq(taskAssignments.taskId, taskId)
      );

      await tx
        .update(tasks)
        .set({
          assignmentStatus:
            assignemtCount === 0
              ? TaskAssignmentStatus.OPEN
              : TaskAssignmentStatus.PARTLY_ASSIGNED,
        })
        .where(eq(tasks.id, taskId));
    }
  });
});
