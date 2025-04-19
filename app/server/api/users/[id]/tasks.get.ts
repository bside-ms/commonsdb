import { getUserTasks } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");

  if (!userId) {
    throw createError({
      status: 400,
    });
  }

  return await getUserTasks(userId);
});
