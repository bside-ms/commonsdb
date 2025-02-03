import { Prisma, Task } from "@prisma/client";

export default defineEventHandler(async (event) => {
  if (!(await hasRoles(event, ["admin"]))) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // process filter queries and build where
  const { filter, sort } = getQuery(event);

  const skip = 0;
  const take = 25;

  // let where = {};
  // if (filter) {
  //   const filterObj = JSON.parse(filter as string);
  //   where = Object.keys(filterObj).reduce((x, key) => {
  //     if (key === "assignmentStatus") {
  //       return x;
  //     }

  //     return {
  //       ...x,
  //       [key]: {
  //         in: filterObj[key],
  //       },
  //     };
  //   }, {});
  // }

  // const query: Prisma.TaskFindManyArgs = {
  //   where,
  //   include: {
  //     categories: true,
  //     _count: {
  //       select: {
  //         responsibilities: true,
  //       },
  //     },
  //   },
  //   skip,
  //   take,
  // };
  // const [tasks, count] = await prisma.$transaction([
  //   prisma.task.findMany(query),
  //   prisma.task.count(),
  // ]);

  let whereRaw = "";
  let havingRaw = "";
  if (filter) {
    const filterObj = JSON.parse(filter as string);
    const whereConditions = Object.keys(filterObj)
      .map((key) => {
        if (key === "assignmentStatus") {
          const values = filterObj[key];

          havingRaw = "HAVING ";

          if (values.includes("OPEN")) {
            havingRaw += `count(tr.*) >= t."maxResponsibilities"`;
            if (values.includes("ASSIGNED")) {
              havingRaw += `count(tr.*) < t."maxResponsibilities"`;
            }
          } else {
            if (values.includes("ASSIGNED")) {
              havingRaw += `count(tr.*) < t."maxResponsibilities"`;
            }
          }

          return null;
        }

        return `t."${key}" IN (${filterObj[key].map((x: string) => `'${x}'`).join(",")})`;
      })
      .filter((x) => !!x);

    if (whereConditions.length) {
      whereRaw = `WHERE ${whereConditions.join(" AND ")}`;
    }
  }

  const tasks = await prisma.$queryRawUnsafe<
    Task & { responsibiltyCount: number; totalCount: number }[]
  >(`
      SELECT t.*, count(tr.*) AS "responsibiltyCount", count(t.*) OVER() AS "totalCount"
      FROM "Task" t 
      LEFT JOIN "CategoriesOnTasks" cat ON t.id = cat."taskId" 
      LEFT JOIN "TaskResponsibility" tr ON t.id = tr."taskId"
      ${whereRaw}
      GROUP BY t.id
      ${havingRaw}
      LIMIT ${take}
      OFFSET ${skip}
    `);

  const totalCount = tasks.at(0)?.totalCount;

  return {
    items: tasks.map((t) => {
      const { responsibiltyCount, totalCount, ...task } = t;
      return task;
    }),
    totalCount: totalCount ? Number(totalCount) : 0,
    skip,
    take,
  };
});
