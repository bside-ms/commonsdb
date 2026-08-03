export default defineNuxtRouteMiddleware((to) => {
  const { isAdminUser } = useUser();

  if (!isAdminUser.value) {
    throw createError({ status: 401, message: "Unauthorized" });
  }
});
