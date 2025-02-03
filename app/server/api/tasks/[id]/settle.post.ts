import { serverSupabaseUser } from "#supabase/server";
import { TaskOccurenceStatus } from "@prisma/client";
import { DateTime } from "luxon";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { taskOccurrenceId } = await readBody(event);

  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  const taskOccurrence = await prisma.taskOccurrence.findUnique({
    where: {
      id: taskOccurrenceId,
    },
    include: {
      task: {
        include: {
          responsibilities: {
            include: {
              user: {
                include: {
                  wallet: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!taskOccurrence || taskOccurrence.taskId !== taskId) {
    throw createError({
      statusCode: 404,
      message: "No occurrence found for this task",
    });
  }

  if (!hasRoles(event, ["admin"])) {
    if (
      taskOccurrence.task.responsibilities.some(
        (r) => r.userId === user.user_metadata.sub
      )
    ) {
      throw createError({
        statusCode: 405,
        message: "User not allowed",
      });
    }
  }

  // SET OCCURRENCE AS COMPLETE
  await prisma.taskOccurrence.update({
    where: {
      id: taskOccurrenceId,
    },
    data: {
      status: TaskOccurenceStatus.COMPLETED,
    },
  });

  // DEPOSIT REWARDS TO RESPONSIBLE PERSONS
  const reward =
    taskOccurrence.task.expense && taskOccurrence.task.factor
      ? taskOccurrence.task.expense * taskOccurrence.task.factor
      : 0;
  if (reward > 0) {
    const comment = `'${taskOccurrence.task.title}' am ${DateTime.now().toFormat("dd.LL.yyyy 'um' HH:mm 'Uhr'")} erledigt`;
    taskOccurrence.task.responsibilities.map(async (r) => {
      if (r.user.wallet) {
        await $fetch(`/api/wallets/${r.user.wallet.id}/charge`, {
          method: "POST",
          body: {
            amount: reward,
            comment,
          },
        });
      }
    });
  }
});
