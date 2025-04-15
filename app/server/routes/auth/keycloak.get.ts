export default defineOAuthKeycloakEventHandler({
  async onSuccess(event, { user, tokens }) {
    await $fetch("/api/users", {
      method: "POST",
      body: user,
    });

    await setUserSession(event, {
      user: {
        id: user.sub,
        roles: user.roles,
        firstname: user.given_name,
        lastname: user.family_name,
        username: user.preferred_username,
        email: user.email,
      },
      secure: {
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        refreshToken: tokens.refresh_token,
        refreshExpiresIn: tokens.refresh_expires_in,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, "/");
  },
  // Optional, will return a json error and 401 status code by default
  onError(event, error) {
    console.error("Keycloak OAuth error:", error);
    return sendRedirect(event, "/login");
  },
});
