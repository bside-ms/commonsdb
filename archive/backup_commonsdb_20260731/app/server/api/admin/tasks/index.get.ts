import { getTasksWithOccurrences } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  if (!(await hasRoles(event, ["admin"]))) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const { filter, sort } = getQuery(event);
  return await getTasksWithOccurrences(filter, sort);
});
