import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event);

  if (!code) {
    throw createError({
      statusCode: 405,
      message: "Not allowed.",
    });
  }

  const client = await serverSupabaseClient(event);
  const { error } = await client.auth.exchangeCodeForSession(code as string);
  if (error) {
    throw createError({
      statusCode: error.status,
      message: error.message,
    });
  }

  const { user_metadata } = (await serverSupabaseUser(event)) ?? {};
  if (!user_metadata) {
    throw createError({
      statusCode: 400,
      message: "Could not load user.",
    });
  }

  await prisma.user.upsert({
    where: { id: user_metadata.sub },
    update: {
      email: user_metadata.email,
    },
    create: {
      id: user_metadata.sub,
      email: user_metadata.email,
      wallet: {
        create: {},
      },
    },
  });

  await sendRedirect(event, "/", 302);
});
