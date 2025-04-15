export const getWalletBalance = async (walletId: string | null) => {
  if (!walletId) return 0;

  const groupBy = await prisma.walletTransaction.groupBy({
    by: ["walletId"],
    where: {
      walletId,
    },
    _sum: {
      amount: true,
    },
  });

  if (!groupBy.length) return 0;

  return groupBy.find((x) => x.walletId === walletId)?._sum.amount;
};
