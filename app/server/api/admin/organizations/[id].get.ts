export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  return prisma.organization.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });
});
