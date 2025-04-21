import { eq } from "drizzle-orm";
import { taskAssignments, tasks } from "~/server/database/schema";
import { TaskAssignmentStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { user } = await requireUserSession(event);

  if (!taskId || taskId === "undefined") {
    throw createError({ statusCode: 400 });
  }

  const assignmentCount = await useDrizzle.$count(
    taskAssignments,
    eq(taskAssignments.taskId, taskId)
  );
  const { maxAssignmentCount } =
    (await useDrizzle.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: {
        maxAssignmentCount: true,
      },
    })) ?? {};

  if (maxAssignmentCount && assignmentCount < maxAssignmentCount) {
    await useDrizzle.transaction(async (tx) => {
      // add assignment
      await tx.insert(taskAssignments).values({
        taskId,
        userId: user.id,
        assignedBy: "self",
      });

      // update taskAssignmentStatus accordingly
      await tx
        .update(tasks)
        .set({
          assignmentStatus:
            assignmentCount + 1 < maxAssignmentCount
              ? TaskAssignmentStatus.PARTLY_ASSIGNED
              : TaskAssignmentStatus.FULLY_ASSIGNED,
        })
        .where(eq(tasks.id, taskId));
    });
  }
});
