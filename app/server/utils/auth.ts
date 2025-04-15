import type { H3Event } from "h3";
import jwt from "jsonwebtoken";
import { USER_ROLES } from "~/types/users";

export const hasRoles = async (event: H3Event, roles: string[]) => {
  const session = await getUserSession(event);
  // const { access_token } = (await serverSupabaseSession(event)) ?? {};

  // if (!access_token) {
  //   throw createError({
  //     statusCode: 401,
  //     message: "Unauthorized",
  //   });
  // }

  // const payload = jwt.decode(access_token);
  // // check payload for roles.commonsdb_admin

  // return true;
};

export const isAdminUser = async (event: H3Event) => {
  const { user } = await getUserSession(event);

  if (!user) {
    return false;
  }

  return user.roles.includes(USER_ROLES.ADMIN);
};
