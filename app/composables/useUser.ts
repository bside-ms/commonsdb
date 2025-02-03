import type { WalletTransaction } from "@prisma/client";
import type { UserFull } from "~/types/users";

export const useUser = () => {
  const user: Ref<UserFull | null> = useState("current-user", () => null);

  const wallet = computed(() => user.value?.wallet);
  const walletBalance: Ref<number> = useState(
    "current-user-wallet-balance",
    () => 0
  );
  const walletTransactions: Ref<WalletTransaction[]> = useState(
    "current-user-wallet-transactions",
    () => []
  );

  const fetch = async () => {
    const { data } = await useFetch("/api/me");

    const { user: me, balance } = data.value ?? {};
    user.value = me;
    walletBalance.value = balance ?? 0;
  };

  const fetchWallet = async () => {
    const { data } = await useFetch(`/api/wallets/${wallet.value?.id}`);

    const { transactions, balance } = data.value ?? {};
    walletTransactions.value = transactions ?? [];
    walletBalance.value = balance ?? 0;
  };

  return {
    user,
    fetch,
    wallet,
    walletBalance,
    walletTransactions,
    fetchWallet,
  };
};
