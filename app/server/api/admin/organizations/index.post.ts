export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { members, ...organizationData } = body;

  return await prisma.organization.create({
    data: {
      ...organizationData,
      members: members?.length
        ? {
            create: members.map((m: any) => ({
              user: { connect: { id: m.userId } },
              role: m.role,
            })),
          }
        : {},
      wallet: {
        create: {},
      },
    },
  });
});
