import { KeycloakUser } from "../types/keycloak";

export const upsertUser = async (keycloakUser: KeycloakUser) => {
  const { sub, given_name, family_name, preferred_username, email } =
    keycloakUser;

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
};
