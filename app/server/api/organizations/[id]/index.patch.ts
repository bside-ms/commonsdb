import { isOrganizationAdmin } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  const organizationId = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!organizationId) {
    throw createError({
      status: 400,
      message: "OrganizationId is required",
    });
  }

  const { user } = await requireUserSession(event);
  const isAdmin = await isAdminUser(event);

  if (!isAdmin) {
    if (!(await isOrganizationAdmin(organizationId, user.id))) {
      throw createError({
        status: 403,
        message: "Not allowed",
      });
    }
  }

  const { members, ...organizationData } = body;

  // update core data and disconnect/delete removes members
  const organization = await prisma.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      ...organizationData,
      members: {
        deleteMany: {
          organizationId,
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
        organizationId_userId: { organizationId, userId: m.userId },
      },
      update: { role: m.role },
      create: {
        organization: { connect: { id: organizationId } },
        user: { connect: { id: m.userId } },
        role: m.role,
      },
    });
  });

  return organization;
});
