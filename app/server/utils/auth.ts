import type { H3Event } from "h3";
import { USER_ROLES } from "~/types/users";

export const isAdminUser = async (event: H3Event) => {
  const { user } = await getUserSession(event);

  if (!user) {
    return false;
  }

  return user.roles.includes(USER_ROLES.ADMIN);
};
