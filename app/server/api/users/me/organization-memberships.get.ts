import { eq } from "drizzle-orm";
import { organizationMembers } from "~/server/database/schema";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  const organizationMemberships =
    await useDrizzle.query.organizationMembers.findMany({
      with: {
        organization: true,
      },
      where: eq(organizationMembers.userId, user.id),
    });

  return organizationMemberships;
});
