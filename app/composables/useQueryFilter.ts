import { useRouteQuery } from "@vueuse/router";

export const useQueryFilter = () => {
  const filterQuery = useRouteQuery("filter");

  const appliedFilter = computed(() => {
    return filterQuery.value ? JSON.parse(filterQuery.value as string) : {};
  });

  const apply = (field: string, values: string[]) => {
    const filter = {
      ...appliedFilter.value,
    };

    if (values.length) {
      filter[field] = values;
    } else {
      delete filter[field];
    }

    filterQuery.value = JSON.stringify(filter);
  };

  return { appliedFilter, apply };
};
