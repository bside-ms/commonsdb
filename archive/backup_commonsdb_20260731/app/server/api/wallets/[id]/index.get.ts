import { getWalletWithBalance } from "~/server/utils/wallet";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id || id === "undefined") {
    throw createError({ status: 400 });
  }

  return await getWalletWithBalance(id);
});
