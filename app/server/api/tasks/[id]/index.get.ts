export default defineEventHandler(async (event) => {
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
      occurrences: {
        // maybe only future occurrences ?
        orderBy: {
          dueEndDate: "asc",
        },
      },
      responsibilities: {
        include: {
          user: true,
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
