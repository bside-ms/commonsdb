import Prisma from "@prisma/client";
import { TaskFull } from "~/types/tasks";

export default defineEventHandler(async (event): Promise<TaskFull | null> => {
  const id = getRouterParam(event, "id");

  return prisma.task.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      links: true,
      categories: {
        include: {
          category: true,
        },
      },
      responsibilities: {
        select: {
          userId: true,
        },
      },
      occurrences: {
        where: {
          status: Prisma.TaskOccurenceStatus.PENDING,
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
  });
});
