import { and, eq, inArray, isNull, not, sql } from "drizzle-orm";
import {
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
  usersOnTasks,
} from "~/server/database/schema";
import { TaskOccurrenceStatus, TaskStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  // TODO maybe: add 'for user' filter, to only show tasks not taken by the user
  // if not set, e.g. request by an admin, it is just a list of all tasks...

  // const { filter, sort } = getQuery<{ filter?: any; sort?: string }>(event);
  // return await getTasksWithOccurrences(filter, sort);

  // 'for user'
  const { user } = await requireUserSession(event);

  const userOpenTaskIds = await useDrizzle
    .select({
      id: tasks.id,
    })
    .from(usersOnTasks)
    .innerJoin(tasks, eq(usersOnTasks.taskId, tasks.id))
    .where(
      and(
        eq(usersOnTasks.userId, user.id),
        eq(tasks.status, TaskStatus.PROCESSING),
      ),
    );

  const skip = 0;
  const take = 25;

  const results = await useDrizzle
    .select({
      items: {
        ...tasks,
      },
      totalCount: sql<number>`count(*) over()`,
    })
    .from(tasks)
    .leftJoin(usersOnTasks, eq(usersOnTasks.taskId, tasks.id))
    .where(
      and(
        eq(tasks.status, TaskStatus.PROCESSING),
        isNull(usersOnTasks.taskId), // no responsible users
        not(
          inArray(
            tasks.id,
            userOpenTaskIds.map((x) => x.id),
          ),
        ), // user is not already responsible
      ),
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
