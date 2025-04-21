import { users, wallets } from "../database/schema";
import { KeycloakUser } from "../types/keycloak";
import { eq } from "drizzle-orm";

export const upsertUser = async (keycloakUser: KeycloakUser) => {
  const { sub, given_name, family_name, preferred_username, email } =
    keycloakUser;

  const user = await useDrizzle.query.users.findFirst({
    where: eq(users.id, sub),
  });

  if (!user) {
    // create
    await useDrizzle.transaction(async (tx) => {
      // create wallet
      const wallet = (await tx.insert(wallets).values({}).returning()).at(0);

      await tx.insert(users).values({
        id: sub,
        email: email,
        username: preferred_username,
        firstname: given_name,
        lastname: family_name,
        walletId: wallet!.id,
      });
    });
  } else {
    // update
    await useDrizzle
      .update(users)
      .set({
        email: email,
        username: preferred_username,
        firstname: given_name,
        lastname: family_name,
      })
      .where(eq(users.id, sub));
  }

  return await useDrizzle.query.users.findFirst({
    where: eq(users.id, sub),
  });
};
