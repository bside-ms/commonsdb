import { getTasksWithOccurrences } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  const { filter, sort } = getQuery(event);
  return await getTasksWithOccurrences(filter, sort);
});
