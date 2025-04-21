import { and, eq, inArray, not, sql } from "drizzle-orm";
import { organizationMembers, organizations } from "~/server/database/schema";
import { isOrganizationAdmin } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  const organizationId = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!organizationId || organizationId === "undefined") {
    throw createError({
      status: 400,
      message: "OrganizationId is required",
    });
  }

  const { user } = await requireUserSession(event);
  const isAdmin = await isAdminUser(event);

  if (!isAdmin) {
    const isOrgAdmin = await isOrganizationAdmin(organizationId, user.id);
    if (!isOrgAdmin) {
      throw createError({
        status: 403,
        message: "Not allowed",
      });
    }
  }

  const { members, ...organizationData } = body;

  await useDrizzle.transaction(async (tx) => {
    // update organization data
    await tx.update(organizations).set(organizationData);

    // delete members not in members payload
    await tx.delete(organizationMembers).where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        not(
          inArray(
            organizationMembers.userId,
            members?.map((m: any) => m.userId)
          )
        )
      )
    );

    // create or update current members
    if (members?.length) {
      await tx
        .insert(organizationMembers)
        .values(
          members.map((m: any) => ({
            organizationId,
            userId: m.userId,
            role: m.role,
          }))
        )
        .onConflictDoUpdate({
          target: [
            organizationMembers.organizationId,
            organizationMembers.userId,
          ],
          set: {
            role: sql`excluded.role`,
          },
        });
    }
  });

  const organization = await $fetch(
    `/api/admin/organizations/${organizationId}`
  );
  return organization;
});
