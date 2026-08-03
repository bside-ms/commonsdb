export const usePagination = () => {
  const route = useRoute();

  const page = computed(() =>
    isNaN(parseInt(route.query.p as string))
      ? 1
      : parseInt(route.query.p as string)
  );

  return { page, limit: 25 };
};
