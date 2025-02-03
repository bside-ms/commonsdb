import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Cannot load user",
    });
  }

  const userEntity = await prisma.user.findUnique({
    where: {
      id: user.user_metadata.sub,
    },
    include: {
      responsibilities: true,
      wallet: true,
    },
  });

  if (!userEntity) {
    throw createError({
      statusCode: 404,
      message: "Cannot find user",
    });
  }

  const balance = await prisma.walletTransaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      walletId: userEntity.wallet?.id,
    },
  });

  return { user: userEntity, balance: balance?._sum.amount ?? 0 };
});
