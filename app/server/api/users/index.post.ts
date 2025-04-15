/**
 * Upsert User
 * ---
 * Receives the User Response after Keycloak Callback and updates or creates User in CommonsDb
 */

import { KeycloakUser } from "~/server/types/keycloak";

export default defineEventHandler(async (event) => {
  const body = await readBody<KeycloakUser>(event);

  const { sub, given_name, family_name, preferred_username, email } = body;

  const user = await prisma.user.upsert({
    where: {
      id: sub,
    },
    update: {
      email: email,
      username: preferred_username,
      firstname: given_name,
      lastname: family_name,
    },
    create: {
      id: sub,
      email: email,
      username: preferred_username,
      firstname: given_name,
      lastname: family_name,
      wallet: {
        create: {},
      },
    },
  });

  return user;
});
