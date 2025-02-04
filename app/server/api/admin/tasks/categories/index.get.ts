export default defineEventHandler(async () => {
  const categories = await prisma.taskCategory.findMany();
  return categories;
});
