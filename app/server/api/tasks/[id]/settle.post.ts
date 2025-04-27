import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { taskOccurrences, tasks } from "~/server/database/schema";
import { isAdminUser } from "~/server/utils/auth";
import { chargeUserWallet } from "~/server/utils/wallet";
import {
  Task,
  TaskOccurrence,
  TaskOccurrenceStatus,
  TaskStatus,
  TaskType,
} from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { taskOccurrenceId, userIds } = await readBody<{
    taskOccurrenceId: string;
    userIds?: string[];
  }>(event);

  const { user } = await requireUserSession(event);

  if (!taskId || taskId === "undefined") {
    throw createError({ status: 400 });
  }

  // only admin user can settle a task for another user
  if (userIds && !isAdminUser(event)) {
    throw createError({
      statusCode: 403,
      message: "Only admins can settle a task for another user",
    });
  }

  const taskOccurrence = (await useDrizzle.query.taskOccurrences.findFirst({
    with: {
      task: true,
    },
    where: and(
      eq(taskOccurrences.id, taskOccurrenceId),
      eq(taskOccurrences.taskId, taskId)
    ),
  })) as TaskOccurrence & {
    task: Task;
  };

  if (!taskOccurrence) {
    throw createError({ status: 404 });
  }

  // check if settling user is assigned
  // if (
  //   !taskOccurrence.task.assignments.some((a: TaskAssignment) =>
  //     userIds ? userIds.includes(a.userId) : a.userId === user.id
  //   )
  // ) {
  //   throw createError({
  //     statusCode: 405,
  //     message: "User not assigned to task",
  //   });
  // }

  await useDrizzle.transaction(async (tx) => {
    // set occurrence as complete
    await tx
      .update(taskOccurrences)
      .set({ status: TaskOccurrenceStatus.COMPLETED })
      .where(eq(taskOccurrences.id, taskOccurrenceId));

    // update task status, if not recurring
    if (taskOccurrence.task.type === TaskType.SINGLE) {
      await tx
        .update(tasks)
        .set({ status: TaskStatus.COMPLETE })
        .where(eq(tasks.id, taskOccurrence.taskId));
    }

    // deposit reward
    const reward =
      taskOccurrence.task.expense && taskOccurrence.task.factor
        ? taskOccurrence.task.expense * parseFloat(taskOccurrence.task.factor)
        : 0;
    if (reward > 0) {
      const comment = `'${taskOccurrence.task.title}' am ${DateTime.now().toFormat("dd.LL.yyyy 'um' HH:mm 'Uhr'")} erledigt`;
      await chargeUserWallet(user.id, reward, comment);
    }
  });
});
