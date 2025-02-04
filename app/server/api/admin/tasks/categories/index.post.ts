export default defineEventHandler(async (event) => {
  const { name } = await readBody(event);

  const category = await prisma.taskCategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (category) {
    return category;
  }

  return await prisma.taskCategory.create({
    data: {
      name,
    },
  });
});
