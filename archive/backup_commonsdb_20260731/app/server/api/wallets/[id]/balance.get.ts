export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id || id === "undefined") {
    throw createError({
      status: 400,
    });
  }

  const balance = await getWalletBalance(id);

  return balance;
});
