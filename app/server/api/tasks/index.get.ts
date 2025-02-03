import { Prisma, TaskOccurenceStatus } from "@prisma/client";

export default defineEventHandler(async (event) => {
  // process filter queries and build where
  const { filter, sort } = getQuery(event);

  const skip = 0;
  const take = 25;

  let where = {};
  if (filter) {
    const filterObj = JSON.parse(filter as string);
    where = Object.keys(filterObj).reduce((x, key) => {
      return {
        ...x,
        [key]: {
          in: filterObj[key],
        },
      };
    }, {});
  }
  const query: Prisma.TaskFindManyArgs = {
    include: {
      categories: true,
      occurrences: {
        where: {
          status: TaskOccurenceStatus.PENDING,
        },
        orderBy: {
          dueEndDate: "asc",
        },
      },
      _count: {
        select: {
          responsibilities: true,
        },
      },
    },
    where: {
      ...where,
    },
    skip,
    take,
  };

  const [tasks, count] = await prisma.$transaction([
    prisma.task.findMany(query),
    prisma.task.count(),
  ]);

  return {
    // return only 'open' tasks
    items: tasks.filter(
      // @ts-ignore
      (t) => t.maxResponsibilities > t._count.responsibilities
    ),
    totalCount: count,
    skip,
    take,
  };
});
