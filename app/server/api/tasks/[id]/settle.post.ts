import Prisma from "@prisma/client";
import { DateTime } from "luxon";
import { isAdminUser } from "~/server/utils/auth";
import { chargeWallet } from "~/server/utils/wallet";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { taskOccurrenceId, userIds } = await readBody<{
    taskOccurrenceId: string;
    userIds?: string[];
  }>(event);

  const { user } = await getUserSession(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  // only admin user can settle a task for another user
  if (userIds && !isAdminUser(event)) {
    throw createError({
      statusCode: 403,
      message: "Only admins can settle a task for another user",
    });
  }

  const taskOccurrence = await prisma.taskOccurrence.findUniqueOrThrow({
    where: {
      id: taskOccurrenceId,
      taskId,
    },
    include: {
      task: {
        include: {
          responsibilities: {
            select: {
              userId: true,
              user: {
                select: {
                  walletId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // check if settling user is assigned
  if (
    !taskOccurrence.task.responsibilities.some((r) =>
      userIds ? userIds.includes(r.userId) : r.userId === user.id
    )
  ) {
    throw createError({
      statusCode: 405,
      message: "User not assigned to task",
    });
  }

  // set occurrence as complete
  await prisma.taskOccurrence.update({
    where: {
      id: taskOccurrenceId,
    },
    data: {
      status: Prisma.TaskOccurenceStatus.COMPLETED,
    },
  });

  // TODO: maybe we should not reward all assignees, but only these who completed the tasks?

  // deposit reward
  const reward =
    taskOccurrence.task.expense && taskOccurrence.task.factor
      ? taskOccurrence.task.expense * taskOccurrence.task.factor
      : 0;
  if (reward > 0) {
    const comment = `'${taskOccurrence.task.title}' am ${DateTime.now().toFormat("dd.LL.yyyy 'um' HH:mm 'Uhr'")} erledigt`;
    taskOccurrence.task.responsibilities.map(async (r) => {
      if (r.user.walletId) {
        await chargeWallet(r.user.walletId, reward, comment);
      }
    });
  }
});
