import { and, asc, eq, gt } from "drizzle-orm";
import { DateTime, WeekdayNumbers } from "luxon";
import {
  Task,
  TaskEndsAfter,
  TaskFrequency,
  TaskOccurrence,
  TaskOccurrenceInsert,
  TaskOccurrenceStatus,
  TaskStatus,
} from "~/types/tasks";
import { categoriesOnTasks, taskOccurrences, tasks } from "../database/schema";

enum DEFAULT_OCCURRENCE_CREATION_COUNT {
  "ONCE" = 1,
  "IRREGULAR" = 1,
  "DAILY" = 180,
  "WEEKLY" = 104,
  "MONTHLY" = 24,
  "QUARTERLY" = 8,
  "YEARLY" = 4,
}

interface DueDateTime {
  start?: DateTime | null;
  end: DateTime;
}

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
      eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
      gt(taskOccurrences.dueEndDate, new Date().toISOString())
    ),
    orderBy: asc(taskOccurrences.dueEndDate),
  });
};

/**
 *
 * @param task
 * @param initialDueDate: tasks due dates or least past occurrence dates
 */
export const getNextTaskOccurrencesData = (
  task: Task,
  initialDueDateTime: DueDateTime
) => {
  const taskOccurrences: TaskOccurrenceInsert[] = [];

  if (!task.frequency) {
    return taskOccurrences;
  }

  let dueDateTime = initialDueDateTime;

  if (
    task.endsAfter &&
    task.endsAfter === TaskEndsAfter.DATE &&
    task.endsAfterDate
  ) {
    const endsAfterDateTime = DateTime.fromSQL(task.endsAfterDate);
    do {
      taskOccurrences.push({
        taskId: task.id,
        status: TaskOccurrenceStatus.PENDING,
        dueStartDate: dueDateTime.start?.toISO() ?? null,
        dueEndDate: dueDateTime.end.toISO(),
      });

      dueDateTime = getNextDueDateTime(task, dueDateTime);
    } while (dueDateTime.end < endsAfterDateTime); // do while date not matched
  } else {
    const occurrencesToCreateCount =
      !task.endsAfter || task.endsAfter === TaskEndsAfter.NEVER
        ? DEFAULT_OCCURRENCE_CREATION_COUNT[task.frequency ?? "ONCE"]
        : task.endsAfterCount;

    for (let index = 0; index < (occurrencesToCreateCount ?? 1); index++) {
      taskOccurrences.push({
        taskId: task.id,
        status: TaskOccurrenceStatus.PENDING,
        dueStartDate: dueDateTime.start?.toISO() ?? null,
        dueEndDate: dueDateTime.end.toISO(),
      });

      dueDateTime = getNextDueDateTime(task, dueDateTime);
    }
  }

  return taskOccurrences;
};

export const getNextDueDateTime = (
  task: Task,
  due: DueDateTime
): DueDateTime => {
  let plus: any = { days: 1 };
  switch (task.frequency) {
    case TaskFrequency.DAILY:
      plus = { days: 1 };
      break;
    case TaskFrequency.WEEKLY:
      plus = { weeks: 1 };
      break;
    case TaskFrequency.MONTHLY:
      plus = { months: 1 };
      break;
    case TaskFrequency.QUARTERLY:
      plus = { quarters: 1 };
      break;
    case TaskFrequency.YEARLY:
      plus = { years: 1 };
      break;
  }

  if (task.frequency === TaskFrequency.DAILY) {
    return {
      start: due.start ? due.start.plus(plus) : null,
      end: due.end.plus(plus),
    };
  } else {
    return {
      start: due.start
        ? due.start
            .plus(plus)
            .set({ weekday: due.start.weekday as WeekdayNumbers })
        : null,
      end: due.end
        .plus(plus)
        .set({ weekday: due.end.weekday as WeekdayNumbers }),
    };
  }
};

export const getNumberOfFutureOccurrencesToCreate = (
  task: Task,
  occurrences: TaskOccurrence[]
) => {
  switch (task.frequency) {
    case TaskFrequency.IRREGULAR:
      return 1;
    case TaskFrequency.DAILY:
      return 180;
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
  // const openUserAssignments = await useDrizzle
  //   .select()
  //   .from(taskAssignments)
  //   .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
  //   .innerJoin(categoriesOnTasks, eq(categoriesOnTasks.taskId, tasks.id))
  //   .innerJoin(
  //     taskOccurrences,
  //     and(
  //       eq(taskOccurrences.taskId, tasks.id),
  //       eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
  //     )
  //   );
  // await useDrizzle.query.taskAssignments.findMany({
  //   with: {
  //     task: {
  //       with: {
  //         categories: true,
  //         occurrences: {
  //           where: eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING),
  //           orderBy: asc(taskOccurrences.dueEndDate),
  //         },
  //       },
  //     },
  //   },
  //   where: and(
  //     eq(taskAssignments.userId, userId),
  //     eq(tasks.status, TaskStatus.PROCESSING)
  //   ),
  // });
  // return openUserAssignments.map((x) => x.task);
};
