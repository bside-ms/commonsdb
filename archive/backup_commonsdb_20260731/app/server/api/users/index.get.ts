import { like, or } from "drizzle-orm";
import { users } from "~/server/database/schema";
import { isAdminUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const isAdmin = await isAdminUser(event);
  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Not allowed",
    });
  }

  const { search } = getQuery(event);

  let where;
  if ((search as string)?.length) {
    where = or(
      like(users.username, `%${search}%`),
      like(users.email, `%${search}%`)
    );
  }

  return await useDrizzle.query.users.findMany({
    where,
  });
});
