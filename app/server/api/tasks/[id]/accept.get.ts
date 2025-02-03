import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  const task = await prisma.task.findFirst({
    where: {
      id,
    },
    include: {
      responsibilities: true,
      occurrences: {
        where: {
          dueEndDate: {
            gt: new Date(),
          },
        },
        orderBy: {
          dueEndDate: "asc",
        },
      },
    },
  });

  if (!task) {
    throw createError({
      statusCode: 404,
      message: "Task not found",
    });
  }

  if (task.maxResponsibilities <= task.responsibilities.length) {
    throw createError({
      statusCode: 400,
      message: "Task already taken",
    });
  }

  await prisma.task.update({
    where: {
      id: task.id,
    },
    data: {
      responsibilities: {
        create: {
          userId: user.user_metadata.sub,
          assignedBy: "self",
        },
      },
    },
  });
});
