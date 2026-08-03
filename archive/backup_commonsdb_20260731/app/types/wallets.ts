import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import type { wallets, walletTransactions } from "~/server/database/schema";

export enum WalletTransactionType {
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
}

export type Wallet = InferSelectModel<typeof wallets>;
export type WalletTransaction = InferInsertModel<typeof walletTransactions>;

export interface WithBalance {
  balance: number;
}
