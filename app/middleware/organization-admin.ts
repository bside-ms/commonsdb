export default defineNuxtRouteMiddleware(async (to) => {
  const { isAdminUser } = useUser();

  // platform users are allowed
  if (isAdminUser.value) {
    return true;
  }

  const { user } = useUserSession();
  if (user.value) {
    const { id } = to.params;
    const isOrganizationAdmin = await $fetch(
      `/api/organizations/${id}/is-admin`,
      {
        method: "POST",
        body: {
          userId: user.value.id,
        },
      }
    );

    if (isOrganizationAdmin) {
      return true;
    }
  }

  throw createError({
    statusCode: 405,
    message: "Not allowed",
  });
});
