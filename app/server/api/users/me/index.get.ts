import { eq } from "drizzle-orm";
import { users } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const userEntity = await useDrizzle.query.users.findFirst({
    where: eq(users.id, user.id),
    with: {
      wallet: true,
    },
  });

  if (!userEntity) {
    throw createError({
      statusCode: 404,
      message: "User Not Found",
    });
  }

  const balance = await getWalletBalance(userEntity?.walletId);

  return { user: userEntity, balance };
});
