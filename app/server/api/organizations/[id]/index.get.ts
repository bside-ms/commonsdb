import {
  getOrganizationWithMembers,
  isOrganizationMember,
} from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  const organizationId = getRouterParam(event, "id");

  const { user } = await requireUserSession(event);
  const isAdmin = await isAdminUser(event);

  if (!organizationId || organizationId === "undefined") {
    throw createError({ status: 400 });
  }

  if (!isAdmin) {
    const isMember = await isOrganizationMember(organizationId, user.id);
    if (!isMember) {
      throw createError({ status: 405 });
    }
  }

  const organization = await getOrganizationWithMembers(organizationId);
  const wallet = await getWalletWithBalance(organization.walletId);

  return {
    ...organization,
    wallet,
  };
});
