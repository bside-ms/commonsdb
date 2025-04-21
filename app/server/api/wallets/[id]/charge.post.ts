import { chargeWallet } from "~/server/utils/wallet";

export default defineEventHandler(async (event) => {
  const walletId = getRouterParam(event, "id");
  const { amount, comment } = await readBody(event);

  if (!walletId || walletId === "undefined") {
    throw createError({
      status: 400,
    });
  }

  return await chargeWallet(walletId!, amount, comment);
});
