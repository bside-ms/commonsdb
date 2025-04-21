import { getUserTasks } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");

  if (!userId || userId === "undefined") {
    throw createError({
      status: 400,
    });
  }

  return await getUserTasks(userId);
});
