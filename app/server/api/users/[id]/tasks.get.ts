import { TaskOccurenceStatus } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, "id");

  const userTasks = await prisma.task.findMany({
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
    },
    where: {
      responsibilities: {
        some: {
          userId,
        },
      },
    },
  });

  return userTasks.filter((task) => task.occurrences.length);
});
