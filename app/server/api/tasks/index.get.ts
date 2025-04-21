import { and, eq, inArray, not, sql } from "drizzle-orm";
import { taskAssignments, tasks } from "~/server/database/schema";
import { TaskStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  // TODO maybe: add 'for user' filter, to only show tasks not taken by the user
  // if not set, e.g. request by an admin, it is just a list of all tasks...

  // const { filter, sort } = getQuery<{ filter?: any; sort?: string }>(event);
  // return await getTasksWithOccurrences(filter, sort);

  // 'for user'
  const { user } = await requireUserSession(event);
  const userAssignmentTaskIds = (
    await useDrizzle.query.taskAssignments.findMany({
      columns: {
        taskId: true,
      },
      where: eq(taskAssignments.userId, user.id),
    })
  ).map((ta) => ta.taskId);

  const skip = 0;
  const take = 25;

  const results = await useDrizzle
    .select({
      items: tasks,
      totalCount: sql<number>`count(*) over()`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, TaskStatus.PROCESSING),
        not(inArray(tasks.id, userAssignmentTaskIds))
      )
    )
    .limit(take)
    .offset(skip);

  return {
    items: results.map((x) => x.items),
    totalCount: results.at(0)?.totalCount ?? 0,
    skip,
    take,
  };
});
