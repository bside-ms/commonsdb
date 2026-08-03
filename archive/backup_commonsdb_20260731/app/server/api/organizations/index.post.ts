import { createOrganization } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { members, ...organizationData } = body;

  return await createOrganization(organizationData, members);
});
