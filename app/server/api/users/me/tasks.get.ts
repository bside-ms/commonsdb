import { getUserTasks } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);
  return await getUserTasks(user.id);
});
