import { OrganizationMemberRole } from "@prisma/client";

export const getOrganizations = async (
  where: any = {},
  skip: number = 0,
  take: number = 25
) => {
  const organizations = await prisma.organization.findMany({
    where,
    include: {
      _count: { select: { members: true } },
    },
    skip,
    take,
  });
  const totalCount = await prisma.organization.count();

  return {
    items: organizations,
    totalCount: totalCount ? Number(totalCount) : 0,
    skip,
    take,
  };
};

export const getOrganizationWithMembers = async (where: any) =>
  await prisma.organization.findUniqueOrThrow({
    where,
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              username: true,
            },
          },
        },
      },
      wallet: {
        select: {
          id: true,
        },
      },
    },
  });

export const isOrganizationAdmin = async (
  organizationId: string,
  userId: string
) => {
  return (
    (await prisma.organizationMember.count({
      where: {
        organizationId,
        userId,
        role: OrganizationMemberRole.ADMIN,
      },
    })) > 0
  );
};
