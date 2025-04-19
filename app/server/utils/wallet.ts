import Prisma from "@prisma/client";

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

export const chargeWallet = async (
  walletId: string,
  amount: number,
  comment?: string
) => {
  const wallet = await prisma.wallet.findUnique({
    where: {
      id: walletId,
    },
  });

  if (!wallet) {
    throw createError({
      status: 404,
      message: "Wallet not found",
    });
  }

  await prisma.walletTransaction.create({
    data: {
      type: Prisma.WalletTransactionType.TRANSFER_IN,
      amount,
      comment,
      walletId: wallet.id,
    },
  });
};
