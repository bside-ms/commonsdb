import { TaskResponsibilityStatus } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { user } = await getUserSession(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  await prisma.$transaction(async (tx) => {
    // add responsibility for not fully assigned task
    const task = await tx.task.update({
      where: {
        id: taskId,
        responsibilityStatus: {
          not: TaskResponsibilityStatus.FULLY_ASSIGNED,
        },
      },
      data: {
        responsibilities: {
          create: {
            userId: user.id,
            assignedBy: "self",
          },
        },
      },
      include: {
        _count: {
          select: {
            responsibilities: true,
          },
        },
      },
    });

    // if task was updated, update task.responsibilityStatus
    if (task) {
      const responsibilityStatus =
        task.maxResponsibilities < task._count.responsibilities + 1
          ? TaskResponsibilityStatus.PARTLY_ASSIGNED
          : TaskResponsibilityStatus.FULLY_ASSIGNED;

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
