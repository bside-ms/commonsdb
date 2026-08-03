export default defineNuxtPlugin(async () => {
  const { user: sessionUser } = await useUserSession();
  if (!sessionUser.value) {
    return;
  }

  const { user, fetch } = useUser();
  if (!user.value) {
    await fetch();
  }
});
