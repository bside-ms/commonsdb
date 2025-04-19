import { chargeWallet } from "~/server/utils/wallet";

export default defineEventHandler(async (event) => {
  const walletId = getRouterParam(event, "id");
  const { amount, comment } = await readBody(event);

  return await chargeWallet(walletId!, amount, comment);
});
