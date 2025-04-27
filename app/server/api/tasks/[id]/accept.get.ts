import { eq } from "drizzle-orm";
import { usersOnTasks } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { user } = await requireUserSession(event);

  if (!taskId || taskId === "undefined") {
    throw createError({ statusCode: 400 });
  }

  const responsibleUserCount = await useDrizzle.$count(
    usersOnTasks,
    eq(usersOnTasks.taskId, taskId)
  );
  // const { maxAssignmentCount } =
  //   (await useDrizzle.query.tasks.findFirst({
  //     where: eq(tasks.id, taskId),
  //     columns: {
  //       maxAssignmentCount: true,
  //     },
  //   })) ?? {};

  // if (maxAssignmentCount && assignmentCount < maxAssignmentCount) {
  // assign user to task
  await useDrizzle
    .insert(usersOnTasks)
    .values({
      taskId,
      userId: user.id,
      assignedByUserId: user.id,
    })
    .onConflictDoNothing();
  // }

  await runTask("task:occurrences:update", {
    payload: { taskId },
  });
});
