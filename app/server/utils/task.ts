import { and, asc, eq, gt } from "drizzle-orm";
import { DateTime, WeekdayNumbers } from "luxon";
import {
  Task,
  TaskFrequency,
  TaskOccurrence,
  TaskOccurrenceStatus,
  TaskStatus,
} from "~/types/tasks";
import { taskAssignments, taskOccurrences, tasks } from "../database/schema";

export const getNextDueEndDate = (dueEndDate: string, frequency: any) => {
  const dt = DateTime.fromSQL(dueEndDate);
  switch (frequency) {
    case TaskFrequency.DAILY:
      return dt.plus({ days: 1 });
    case TaskFrequency.WEEKLY:
      return dt
        .plus({ weeks: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.MONTHLY:
      return dt
        .plus({ months: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.QUARTERLY:
      return dt
        .plus({ quarters: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.YEARLY:
      return dt
        .plus({ years: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    default:
      break;
  }
};

export const getFutureOccurrences = async (task: Task) => {
  return await useDrizzle.query.taskOccurrences.findMany({
    where: and(
      eq(taskOccurrences.taskId, task.id),
      gt(taskOccurrences.dueEndDate, new Date().toISOString())
    ),
    orderBy: asc(taskOccurrences.dueEndDate),
  });
};

export const getNumberOfFutureOccurrencesToCreate = (
  task: Task,
  occurrences: TaskOccurrence[]
) => {
  switch (task.frequency) {
    case TaskFrequency.IRREGULAR:
      return 1;
    case TaskFrequency.DAILY:
      return 90 - occurrences.length;
    case TaskFrequency.WEEKLY:
      return 12 - occurrences.length;
    case TaskFrequency.MONTHLY:
      return 6 - occurrences.length;
    case TaskFrequency.QUARTERLY:
      return 4 - occurrences.length;
    case TaskFrequency.YEARLY:
      return 2 - occurrences.length;
    default:
      return 0;
  }
};

export const getTasksWithOccurrences = async (
  filter?: any,
  sort?: string | null,
  skip: number = 0,
  take: number = 25
) => {
  //   let whereRaw = "";
  //   let havingRaw = "";
  //   if (filter) {
  //     const filterObj = JSON.parse(filter as string);
  //     const whereConditions = Object.keys(filterObj)
  //       .map((key) => {
  //         if (key === "assignmentStatus") {
  //           const values = filterObj[key];

  //           havingRaw = "HAVING ";

  //           if (values.includes("OPEN")) {
  //             havingRaw += `count(tr.*) < t."maxResponsibilities"`;
  //             if (values.includes("ASSIGNED")) {
  //               havingRaw += ` OR count(tr.*) >= t."maxResponsibilities"`;
  //             }
  //           } else {
  //             if (values.includes("ASSIGNED")) {
  //               havingRaw += `count(tr.*) >= t."maxResponsibilities"`;
  //             }
  //           }

  //           return null;
  //         }

  //         return `t."${key}" IN (${filterObj[key].map((x: string) => `'${x}'`).join(",")})`;
  //       })
  //       .filter((x) => !!x);

  //     if (whereConditions.length) {
  //       whereRaw = `WHERE ${whereConditions.join(" AND ")}`;
  //     }
  //   }

  //   let orderByRaw = `ORDER BY t."priority" DESC, t."dueEndDate" ASC`;
  //   if (sort) {
  //     const sortMapping = {
  //       DUE_ASC: { field: "dueEndDate", dir: "asc" },
  //       DUE_DESC: { field: "dueEndDate", dir: "desc" },
  //       PRIORITY_ASC: { field: "priority", dir: "asc" },
  //       PRIORITY_DESC: { field: "priority", dir: "desc" },
  //     };

  //     if (sort in sortMapping) {
  //       //@ts-expect-error
  //       const sortColumn = sortMapping[sort];
  //       orderByRaw = `ORDER BY t."${sortColumn.field}" ${sortColumn.dir}`;
  //     }
  //   }

  //   const tasks = await prisma.$queryRawUnsafe<
  //     Task & { responsibiltyCount: number; totalCount: number }[]
  //   >(`
  //       SELECT t.*, count(tr.*) AS "responsibiltyCount", count(t.*) OVER() AS "totalCount"
  //       FROM "Task" t
  //       LEFT JOIN "CategoriesOnTasks" cat ON t.id = cat."taskId"
  //       LEFT JOIN "TaskResponsibility" tr ON t.id = tr."taskId"
  //       ${whereRaw}
  //       GROUP BY t.id
  //       ${orderByRaw}
  //       ${havingRaw}
  //       LIMIT ${take}
  //       OFFSET ${skip}
  //     `);

  //   const occurrences = await prisma.taskOccurrence.findMany({
  //     where: {
  //       taskId: {
  //         in: tasks.map((t: any) => t.id),
  //       },
  //     },
  //     orderBy: {
  //       dueEndDate: "asc",
  //     },
  //   });
  //   const totalCount = tasks.at(0)?.totalCount;

  return {
    items: [],
    totalCount: 0,
    skip,
    take,
  };
};

export const getUserTasks = async (userId: string) => {
  const openUserAssignments = await useDrizzle.query.taskAssignments.findMany({
    with: {
      task: {
        with: {
          categories: true,
          occurrences: {
            where: eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
            orderBy: asc(taskOccurrences.dueEndDate),
          },
        },
      },
    },
    where: and(
      eq(taskAssignments.userId, userId),
      eq(tasks.status, TaskStatus.PROCESSING)
    ),
  });

  return openUserAssignments.map((x) => x.task);
};
