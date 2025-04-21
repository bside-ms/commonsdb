import { and, eq, not } from "drizzle-orm";
import { DateTime } from "luxon";
import { taskOccurrences, tasks } from "~/server/database/schema";
import {
  getFutureOccurrences,
  getNextDueEndDate,
  getNumberOfFutureOccurrencesToCreate,
} from "~/server/utils/task";
import { Task, TaskFrequency, TaskOccurrence, TaskType } from "~/types/tasks";

const createOccurrences = async (
  task: Task & { occurrences: TaskOccurrence[] }
) => {
  if (task.type === TaskType.SINGLE) {
    if (!task.occurrences?.length) {
      // create one occurrence
      await useDrizzle.insert(taskOccurrences).values({
        taskId: task.id,
        dueStartDate: task.dueStartDate,
        dueEndDate: task.dueEndDate,
      });
    }

    return;
  }

  if (task.type === TaskType.RECURRING) {
    const futureOccurrences = await getFutureOccurrences(task);

    if (
      !task.dueEndDate ||
      !task.frequency ||
      (task.frequency === TaskFrequency.IRREGULAR && task.occurrences?.length)
    ) {
      return;
    }

    const numberOfFutureOccurrencesToCreate =
      getNumberOfFutureOccurrencesToCreate(task, futureOccurrences);

    if (numberOfFutureOccurrencesToCreate > 0) {
      let lastDueEndDateTime: DateTime | null = DateTime.fromSQL(
        task.dueEndDate
      );

      let dueStartEndDiff = null;
      if (task.dueStartDate) {
        dueStartEndDiff = DateTime.fromSQL(task.dueEndDate).diff(
          DateTime.fromSQL(task.dueStartDate)
        );
      }

      if (futureOccurrences.length) {
        const lastOccurrence = futureOccurrences.at(-1);
        if (lastOccurrence?.dueEndDate) {
          lastDueEndDateTime = DateTime.fromSQL(lastOccurrence?.dueEndDate);
        }
      } else if (lastDueEndDateTime > DateTime.now()) {
        lastDueEndDateTime = null;
      }

      // replace this by prisma.taskOccurrence.createMany and Array.map() ??
      for (let i = 1; i <= numberOfFutureOccurrencesToCreate; i++) {
        const nextDueEndDate = lastDueEndDateTime
          ? getNextDueEndDate(lastDueEndDateTime.toISO()!, task.frequency)
          : DateTime.fromSQL(task.dueEndDate);

        if (nextDueEndDate) {
          await useDrizzle.insert(taskOccurrences).values({
            taskId: task.id,
            dueEndDate: nextDueEndDate.toISO(),
            dueStartDate: dueStartEndDiff
              ? nextDueEndDate.minus(dueStartEndDiff).toISO()
              : null,
          });
          lastDueEndDateTime = nextDueEndDate;
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
      const task = await useDrizzle.query.tasks.findFirst({
        with: {
          occurrences: true,
        },
        where: eq(tasks.id, taskId as string),
      });

      await createOccurrences(task as Task & { occurrences: TaskOccurrence[] });
    } else {
      const tasksResult = await useDrizzle.query.tasks.findMany({
        with: {
          occurrences: true,
        },
        where: and(
          eq(tasks.type, TaskType.RECURRING),
          not(eq(tasks.frequency, TaskFrequency.IRREGULAR))
        ),
      });

      await Promise.all(tasksResult.map(createOccurrences));
    }

    return { result: "success" };
  },
});
