import { TaskWithCategories, TaskWithOccurrences } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  return $fetch<(TaskWithCategories & TaskWithOccurrences)[]>(
    `/api/users/${user.id}/tasks`
  );
});
