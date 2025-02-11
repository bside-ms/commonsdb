export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id) {
    throw createError({
      status: 405,
      message: "Bad request",
    });
  }

  const { members, ...organizationData } = body;

  // update core data and disconnect/delete removes members
  const organization = await prisma.organization.update({
    where: {
      id,
    },
    data: {
      ...organizationData,
      members: {
        deleteMany: {
          organizationId: id,
          userId: {
            notIn: members?.map((m: any) => m.userId),
          },
        },
      },
    },
  });

  // create or update current members
  members.map(async (m: any) => {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: id, userId: m.userId },
      },
      update: { role: m.role },
      create: {
        organization: { connect: { id } },
        user: { connect: { id: m.userId } },
        role: m.role,
      },
    });
  });

  return organization;
});
