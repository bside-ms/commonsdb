import type { Prisma } from "@prisma/client";

const userIncludingWallet = {
  include: {
    wallet: true,
  },
} satisfies Prisma.UserDefaultArgs;
export type UserWithWallet = Prisma.UserGetPayload<typeof userIncludingWallet>;

const userIncludingResponsibilities = {
  include: {
    responsibilities: true,
  },
} satisfies Prisma.UserDefaultArgs;
export type UserWithResponsibilities = Prisma.UserGetPayload<
  typeof userIncludingResponsibilities
>;

export type UserFull = UserWithWallet & UserWithResponsibilities;
