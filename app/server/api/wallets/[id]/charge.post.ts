import { WalletTransactionType } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const walletId = getRouterParam(event, "id");
  const { amount, comment } = await readBody(event);

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
      type: WalletTransactionType.TRANSFER_IN,
      amount,
      comment,
      walletId: wallet.id,
    },
  });
});
