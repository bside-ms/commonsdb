import Prisma from "@prisma/client";
import { DateTime } from "luxon";
import {
  getFutureOccurrences,
  getNextDueEndDate,
  getNumberOfFutureOccurrencesToCreate,
} from "~/server/utils/task";
import { TaskWithOccurrences } from "~/types/tasks";

const createOccurrences = async (task: TaskWithOccurrences) => {
  if (task.type === Prisma.TaskType.SINGLE) {
    if (!task.occurrences?.length) {
      // create one occurrence
      await prisma.taskOccurrence.create({
        data: {
          taskId: task.id,
          dueStartDate: task.dueStartDate,
          dueEndDate: task.dueEndDate,
        },
      });
    }
    return;
  }

  if (task.type === Prisma.TaskType.RECURRING) {
    const futureOccurrences = await getFutureOccurrences(task);

    if (
      !task.dueEndDate ||
      !task.frequency ||
      (task.frequency === Prisma.TaskFrequency.IRREGULAR &&
        task.occurrences?.length)
    ) {
      return;
    }

    const numberOfFutureOccurrencesToCreate =
      getNumberOfFutureOccurrencesToCreate(task, futureOccurrences);
    if (numberOfFutureOccurrencesToCreate > 0) {
      let lastDueEndDate: Date | null = task.dueEndDate;

      let dueStartEndDiff = null;
      if (task.dueStartDate) {
        dueStartEndDiff = DateTime.fromJSDate(task.dueEndDate).diff(
          DateTime.fromJSDate(task.dueStartDate)
        );
      }

      if (futureOccurrences.length) {
        const lastOccurrence = futureOccurrences.at(-1);
        if (lastOccurrence?.dueEndDate) {
          lastDueEndDate = lastOccurrence?.dueEndDate;
        }
      } else if (lastDueEndDate > new Date()) {
        lastDueEndDate = null;
      }

      // replace this by prisma.taskOccurrence.createMany and Array.map() ??
      for (let i = 1; i <= numberOfFutureOccurrencesToCreate; i++) {
        const nextDueEndDate = lastDueEndDate
          ? getNextDueEndDate(lastDueEndDate, task.frequency)
          : DateTime.fromJSDate(task.dueEndDate);

        if (nextDueEndDate) {
          await prisma.taskOccurrence.create({
            data: {
              taskId: task.id,
              dueEndDate: nextDueEndDate.toISO(),
              dueStartDate: dueStartEndDiff
                ? nextDueEndDate.minus(dueStartEndDiff).toISO()
                : null,
            },
          });
          lastDueEndDate = nextDueEndDate.toJSDate();
        }
      }
    }
  }
};

export default defineTask({
  meta: {
    name: "task:occurrences:create",
    description: "Check Tasks to generate Occurrences",
  },
  run: async ({ payload, context }) => {
    const { taskId } = payload ?? {};

    if (taskId) {
      // run for single task
      const task = await prisma.task.findFirstOrThrow({
        where: {
          id: taskId,
        },
        include: {
          occurrences: true,
        },
      });

      await createOccurrences(task);
    } else {
      const tasks = await prisma.task.findMany({
        where: {
          type: Prisma.TaskType.RECURRING,
          frequency: {
            not: Prisma.TaskFrequency.IRREGULAR,
          },
        },
        include: {
          occurrences: true,
        },
      });

      await Promise.all(tasks.map(createOccurrences));
    }

    return { result: "success" };
  },
});
