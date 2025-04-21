import { and, count, eq, sql } from "drizzle-orm";
import {
  organizationMembers,
  organizations,
  wallets,
} from "../database/schema";
import { OrganizationMemberRole } from "~/types/organizations";

export const getOrganizations = async (
  where: any = null,
  skip: number = 0,
  take: number = 25
) => {
  const results = await useDrizzle
    .select({
      items: {
        ...organizations,
        memberCount: count(organizations.id),
      },
      totalCount: sql<number>`count(*) over()`,
    })
    .from(organizations)
    .groupBy(organizations.id)
    .where(where)
    .limit(take)
    .offset(skip);

  return {
    items: results.map((x) => x.items),
    totalCount: results.at(0)?.totalCount ?? 0,
    skip,
    take,
  };
};

export const getOrganizationWithMembers = async (organizationId: string) => {
  const organization = await useDrizzle.query.organizations.findFirst({
    with: {
      members: {
        with: {
          user: {
            columns: {
              id: true,
              firstname: true,
              username: true,
            },
          },
        },
      },
      wallet: true,
    },
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw createError({
      status: 404,
    });
  }

  return organization;
};

export const isOrganizationAdmin = async (
  organizationId: string,
  userId: string
) => {
  return (
    (await useDrizzle.$count(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, OrganizationMemberRole.ADMIN)
      )
    )) > 0
  );
};

export const isOrganizationMember = async (
  organizationId: string,
  userId: string
) => {
  return (
    (await useDrizzle.$count(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      )
    )) > 0
  );
};

export const createOrganization = async (data: any, members?: any) => {
  return await useDrizzle.transaction(async (tx) => {
    // create wallet
    const wallet = (await tx.insert(wallets).values({}).returning()).at(0);

    // create organization
    const org = (
      await tx
        .insert(organizations)
        .values({
          ...data,
          walletId: wallet!.id,
        })
        .returning()
    ).at(0);

    if (org) {
      // add members
      if (members?.length) {
        tx.insert(organizationMembers).values(
          members.map((m: any) => ({
            organization: org.id,
            user: m.userId,
            role: m.role,
          }))
        );
      }
    }

    return org;
  });
};
