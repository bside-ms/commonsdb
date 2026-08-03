export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession();

  if (["/login", "/auth/keycloak", "/auth/logout"].includes(to.path)) {
    return;
  }

  if (!loggedIn.value) {
    return navigateTo("/login");
  }

  const { fetch } = useUser();
  fetch();
});
