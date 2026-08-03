export default defineEventHandler(async () => {
  const categories = await useDrizzle.query.taskCategories.findMany();
  return categories;
});
