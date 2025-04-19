import Prisma from "@prisma/client";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { userId } = await readBody(event);

  if (!taskId || !userId) {
    throw createError({
      statusCode: 400,
      message: "Bad Request",
    });
  }

  const { user } = await requireUserSession(event);
  const isAdmin = await isAdminUser(event);

  if (userId !== user.id && !isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const task = await prisma.task.findUniqueOrThrow({
    where: {
      id: taskId,
    },
    include: {
      _count: {
        select: {
          responsibilities: {
            where: {
              userId,
            },
          },
        },
      },
    },
  });

  // just return, if responsibility for this user is not found/counted
  if (!task._count.responsibilities) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const r = await tx.taskResponsibility.delete({
      where: {
        userId_taskId: {
          taskId,
          userId,
        },
      },
    });

    // if responsibility was delete/released, update task.responsibilityStatus
    if (r) {
      const responsibilityStatus =
        task._count.responsibilities - 1 > 0
          ? Prisma.TaskResponsibilityStatus.PARTLY_ASSIGNED
          : Prisma.TaskResponsibilityStatus.OPEN;

      await tx.task.update({
        where: {
          id: task.id,
        },
        data: {
          responsibilityStatus,
        },
      });
    }
  });
});
