import { getOrganizations } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  if (!(await isAdminUser(event))) {
    throw createError({ status: 403 });
  }

  return await getOrganizations();
});
