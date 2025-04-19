import Prisma from "@prisma/client";
import type { Prisma as PrismaType } from "@prisma/client";
import { getTasksWithOccurrences } from "~/server/utils/task";

export default defineEventHandler(async (event) => {
  // TODO maybe: add 'for user' filter, to only show tasks not taken by the user
  // if not set, e.g. request by an admin, it is just a list of all tasks...

  // const { filter, sort } = getQuery<{ filter?: any; sort?: string }>(event);
  // return await getTasksWithOccurrences(filter, sort);

  // 'for user'
  const { user } = await requireUserSession(event);
  const userResponsibilityTaskIds = await prisma.taskResponsibility.groupBy({
    by: "taskId",
    where: {
      userId: user.id,
    },
  });

  const skip = 0;
  const take = 25;

  const query: PrismaType.TaskFindManyArgs = {
    where: {
      responsibilityStatus: {
        not: Prisma.TaskResponsibilityStatus.FULLY_ASSIGNED,
      },
      id: {
        notIn: userResponsibilityTaskIds.map((r) => r.taskId),
      },
    },
    include: {
      occurrences: true,
    },
    orderBy: {
      priority: "desc",
      // dueEndDate: "asc",
    },
    skip,
    take,
  };

  const [tasks, count] = await prisma.$transaction([
    prisma.task.findMany(query),
    prisma.task.count({ where: query.where }),
  ]);

  return {
    items: tasks,
    totalCount: count,
    skip,
    take,
  };
});
