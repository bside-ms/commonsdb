export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const balance = await getWalletBalance(id ?? null);
  return balance;
});
