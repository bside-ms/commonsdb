import { getOrganizations } from "~/server/utils/organization";

export default defineEventHandler(async (event) => {
  if (!(await hasRoles(event, ["admin"]))) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const { search } = getQuery(event);

  let where;
  if ((search as string)?.length) {
    where = {
      OR: [
        {
          name: {
            contains: search as string,
          },
        },
        {
          code: {
            contains: search as string,
          },
        },
      ],
    };
  }

  return await getOrganizations(where);
});
