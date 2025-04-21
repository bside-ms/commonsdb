import { USER_ROLES, type User } from "~/types/users";
import type { Wallet, WalletTransaction } from "~/types/wallets";

export const useUser = () => {
  const user: Ref<User | null> = useState("current-user", () => null);
  const wallet: Ref<
    | (Wallet & { balance: number; transactions?: WalletTransaction[] | null })
    | null
  > = useState("current-user-wallet", () => null);

  const { user: sessionUser } = useUserSession();
  const isAdminUser = computed(() =>
    sessionUser.value?.roles.includes(USER_ROLES.ADMIN)
  );

  const fetch = async () => {
    const { data } = await useFetch("/api/users/me");

    const { user: me, balance } = data.value ?? {};
    user.value = me ?? null;
    wallet.value = me?.wallet
      ? {
          ...me.wallet,
          balance: balance ?? 0,
        }
      : null;
  };

  const fetchWallet = async () => {
    const { data } = await useFetch(`/api/wallets/${wallet.value?.id}`);

    // const { transactions, balance } = data.value ?? {};
    // walletTransactions.value = transactions ?? [];
    // walletBalance.value = balance ?? 0;
  };

  return {
    user,
    isAdminUser,
    fetch,
    wallet,
    fetchWallet,
  };
};
