import { serverSupabaseUser } from "#supabase/server";
import { TaskWithCategories, TaskWithOccurrences } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  return $fetch<TaskWithCategories[] & TaskWithOccurrences[]>(
    `/api/users/${user.user_metadata.sub}/tasks`
  );
});
