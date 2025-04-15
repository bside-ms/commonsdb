import { getOrganizationWithMembers } from "~/server/utils/organization";
import { getWalletBalance } from "~/server/utils/wallet";

export default defineEventHandler(async (event) => {
  const organizationId = getRouterParam(event, "id");

  const { user } = await requireUserSession(event);
  const isAdmin = await isAdminUser(event);

  let where: any = {
    id: organizationId,
  };
  if (!isAdmin) {
    where = {
      ...where,
      members: {
        some: {
          userId: {
            equals: user.id,
          },
        },
      },
    };
  }

  const organization = await getOrganizationWithMembers(where);
  const balance = await getWalletBalance(organization.walletId);

  return {
    ...organization,
    wallet: {
      ...organization.wallet,
      balance,
    },
  };
});
