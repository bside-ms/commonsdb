export const getOrganizations = async (skip: number = 0, take: number = 25) => {
  const organizations = await prisma.organization.findMany({
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
