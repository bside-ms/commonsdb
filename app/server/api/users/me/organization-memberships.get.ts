export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const organizationMemberships = await prisma.organizationMember.findMany({
    where: {
      userId: {
        equals: user.id,
      },
    },
    include: {
      organization: true,
    },
  });

  return organizationMemberships;
});
