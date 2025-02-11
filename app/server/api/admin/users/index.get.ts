export default defineEventHandler(async (event) => {
  if (!(await hasRoles(event, ["admin"]))) {
    throw createError({
      statusCode: 403,
      message: "Not allowed",
    });
  }

  const { search } = getQuery(event);

  let where;
  if ((search as string)?.length) {
    where = {
      OR: [
        {
          username: {
            contains: search as string,
          },
        },
        {
          email: {
            contains: search as string,
          },
        },
      ],
    };
  }

  return await prisma.user.findMany({
    where,
  });
});
