import { isOrganizationAdmin } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  const organizationId = getRouterParam(event, "id");
  const { userId } = await readBody(event);

  await requireUserSession(event);

  if (!organizationId) {
    throw createError({
      status: 400,
      message: "OrganizationId is required",
    });
  }

  return await isOrganizationAdmin(organizationId, userId);
});
