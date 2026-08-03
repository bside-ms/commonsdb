import { ilike } from "drizzle-orm";
import { taskCategories } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const { name } = await readBody(event);

  const category = await useDrizzle.query.taskCategories.findFirst({
    where: ilike(taskCategories.name, name),
  });

  if (category) {
    return category;
  }

  return await useDrizzle.insert(taskCategories).values({
    name,
  });
});
