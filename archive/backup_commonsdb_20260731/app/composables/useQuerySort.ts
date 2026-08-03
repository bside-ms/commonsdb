import { useRouteQuery } from "@vueuse/router";

export const useQuerySort = () => {
  const sortQuery = useRouteQuery("sort");

  const appliedSort = computed(() => {
    return (sortQuery.value as string)?.split(",");
  });

  const apply = (values: string[]) => {
    sortQuery.value = values.join(",");
  };

  return { appliedSort, apply };
};
