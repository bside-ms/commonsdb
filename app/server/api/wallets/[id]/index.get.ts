export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  const [wallet, balance] = await prisma.$transaction([
    prisma.wallet.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        transactions: true,
      },
    }),
    prisma.walletTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        walletId: id,
      },
    }),
  ]);

  return { ...wallet, balance: balance?._sum.amount ?? 0 };
});
