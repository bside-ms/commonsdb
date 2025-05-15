import { sum, eq } from "drizzle-orm";
import { users, wallets, walletTransactions } from "../database/schema";
import { WalletTransactionType } from "~/types/wallets";

export const getWalletWithBalance = async (walletId: string) => {
  if (!walletId) {
    return null;
  }

  const { wallet, balance } =
    (
      await useDrizzle
        .select({ balance: sum(walletTransactions.amount), wallet: wallets })
        .from(walletTransactions)
        .innerJoin(wallets, eq(walletTransactions.walletId, wallets.id))
        .groupBy(walletTransactions.walletId, wallets.id)
        .having(eq(walletTransactions.walletId, walletId))
    ).at(0) ?? {};

  return {
    ...wallet,
    balance: balance ?? 0,
  };
};

export const getWalletBalance = async (walletId: string) => {
  if (!walletId) return 0;

  const { balance } =
    (
      await useDrizzle
        .select({ balance: sum(walletTransactions.amount) })
        .from(walletTransactions)
        .groupBy(walletTransactions.walletId)
        .having(eq(walletTransactions.walletId, walletId))
    ).at(0) ?? {};

  return balance ? parseInt(balance) : 0;
};

export const chargeWallet = async (
  walletId: string,
  amount: number,
  comment?: string,
) => {
  const wallet = await useDrizzle.query.wallets.findFirst({
    where: eq(wallets.id, walletId),
  });

  if (!wallet) {
    throw createError({
      status: 404,
      message: "Wallet not found",
    });
  }

  await useDrizzle.insert(walletTransactions).values({
    type: WalletTransactionType.TRANSFER_IN,
    amount,
    comment,
    walletId: wallet.id,
  });
};

export const chargeUserWallet = async (
  userId: string,
  amount: number,
  comment?: string,
) => {
  const [{ walletId }] = await useDrizzle
    .select({ walletId: users.walletId })
    .from(users)
    .where(eq(users.id, userId));

  if (!walletId) {
    throw createError({
      status: 404,
      message: "User not found",
    });
  }

  await chargeWallet(walletId, amount, comment);
};
