import { DateTime } from "luxon";
import { KeycloakToken } from "../types/keycloak";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session) {
    return;
  }

  // @ts-ignore
  const { secure, loggedInAt } = session;
  if (secure && loggedInAt) {
    const accessTokenExpiresAtDateTime = DateTime.fromMillis(
      loggedInAt + secure.expiresIn * 1000
    );
    const refreshTokenExpiresAtDateTime = DateTime.fromMillis(
      loggedInAt + secure.refreshExpiresIn * 1000
    );

    // valid access token
    if (DateTime.now() < accessTokenExpiresAtDateTime) {
      return;
    }

    // valid refresh token
    if (
      DateTime.now() > accessTokenExpiresAtDateTime &&
      DateTime.now() < refreshTokenExpiresAtDateTime
    ) {
      const {
        oauth: { keycloak },
      } = useRuntimeConfig();
      const basicAuthBase64 = Buffer.from(
        `${keycloak.clientId}:${keycloak.clientSecret}`
      ).toString("base64");

      // refresh
      const data = await $fetch<KeycloakToken>(
        `${keycloak.serverUrl}/realms/${keycloak.realm}/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuthBase64}`,
          },
          body: new URLSearchParams({
            client_id: keycloak.clientId,
            grant_type: "refresh_token",
            refresh_token: secure.refreshToken,
          }),
        }
      );

      await setUserSession(event, {
        secure: {
          accessToken: data.access_token,
          expiresIn: data.expires_in,
          refreshToken: data.refresh_token,
          refreshExpiresIn: data.refresh_expires_in,
        },
        loggedInAt: Date.now(),
      });
      return;
    }
  }

  // no session or valid tokens
  await clearUserSession(event);
});
