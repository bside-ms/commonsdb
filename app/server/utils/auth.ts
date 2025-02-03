import type { H3Event } from "h3";
import { serverSupabaseSession } from "#supabase/server";
import jwt from "jsonwebtoken";

export const hasRoles = async (event: H3Event, roles: string[]) => {
  const { access_token } = (await serverSupabaseSession(event)) ?? {};

  if (!access_token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const payload = jwt.decode(access_token);
  // check payload for roles.commonsdb_admin

  return true;
};
