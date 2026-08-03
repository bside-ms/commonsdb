import { eq, sql } from "drizzle-orm";
import { walletTransactions } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const walletId = getRouterParam(event, "id");
  const { page, size } = getQuery(event);

  if (!walletId || walletId === "undefined") {
    throw createError({ status: 400 });
  }

  const limit = (size as number) ?? 10;
  const offset = (page as number) ?? 0 * limit;

  const results = await useDrizzle
    .select({
      items: walletTransactions,
      totalCount: sql<number>`count(*) over()`,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, walletId))
    .limit(limit)
    .offset(offset);

  return {
    items: results.map((x) => x.items),
    totalCount: results.at(0)?.totalCount ?? 0,
    skip: offset,
    take: limit,
  };
});
