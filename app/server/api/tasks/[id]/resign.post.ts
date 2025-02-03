import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const { userId } = await readBody(event);

  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  const userIdToResign: string = userId ?? user.user_metadata.sub;

  // has to be admin, if userIdToResign is not self-id
  if (
    userIdToResign !== user.user_metadata.sub &&
    !(await hasRoles(event, ["admin"]))
  ) {
    throw createError({
      statusCode: 403,
      message: "Not allowed",
    });
  }

  if (!taskId || !userIdToResign) {
    throw createError({
      statusCode: 400,
      message: "No task or user id",
    });
  }

  await prisma.taskResponsibility.delete({
    where: {
      userId_taskId: {
        taskId,
        userId: userIdToResign,
      },
    },
  });
});
