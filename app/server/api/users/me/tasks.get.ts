import { and, eq } from "drizzle-orm";
import {
  categoriesOnTasks,
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
} from "~/server/database/schema";
import { TaskOccurrenceStatus } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  // const userTaskAssignments = await useDrizzle
  //   .select()
  //   .from(taskAssignments)
  //   .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
  //   .innerJoin(categoriesOnTasks, eq(categoriesOnTasks.taskId, tasks.id))
  //   .innerJoin(
  //     taskOccurrences,
  //     and(
  //       eq(taskOccurrences.taskId, tasks.id),
  //       eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
  //     )
  //   )
  //   .where(eq(taskAssignments.userId, user.id));

  // const userTaskOccurrences =
  //   await useDrizzle.query.usersOnTaskOccurrences.findMany({
  //     with: {
  //       taskOccurrence: {},
  //     },
  //     where: eq(usersOnTaskOccurrences.userId, user.id),
  //   });

  // return userTaskAssignments;

  return [];
});
