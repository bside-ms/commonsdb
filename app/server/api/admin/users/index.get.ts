export default defineEventHandler(async (event) => {
  if (!(await hasRoles(event, ["admin"]))) {
    throw createError({
      statusCode: 403,
      message: "Not allowed",
    });
  }

  return await prisma.user.findMany();
});
