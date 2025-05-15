import { and, desc, eq, gt, inArray, isNull, lt, not, or } from "drizzle-orm";
import { DateTime } from "luxon";
import {
  taskOccurrences,
  tasks,
  usersOnTaskOccurrences,
  usersOnTasks,
} from "~/server/database/schema";
import {
  Task,
  TaskFrequency,
  TaskOccurrence,
  TaskOccurrenceStatus,
  TaskStatus,
  TaskType,
  UserOnTask,
} from "~/types/tasks";

type TaskToUpdate = Task & { responsibleUsers: UserOnTask[] } & {
  occurrences: TaskOccurrence[];
};

const updateOccurrences = async (task: TaskToUpdate) => {
  if (
    task.type === TaskType.SINGLE ||
    (task.type === TaskType.RECURRING &&
      task.frequency === TaskFrequency.IRREGULAR)
  ) {
    if (!task.occurrences?.length) {
      await useDrizzle.insert(taskOccurrences).values({
        taskId: task.id,
        status: TaskOccurrenceStatus.PENDING,
        dueStartDate: task.dueStartDate,
        dueEndDate: task.dueEndDate,
      });
    } else {
      const firstPendingOccurrence = task.occurrences.find(
        (o) => o.status === TaskOccurrenceStatus.PENDING,
      );

      if (firstPendingOccurrence) {
        // update pending occurrences
        await useDrizzle
          .update(taskOccurrences)
          .set({
            dueStartDate: task.dueStartDate,
            dueEndDate: task.dueEndDate,
          })
          .where(eq(taskOccurrences.id, firstPendingOccurrence.id));
      }
    }
  } else if (task.type === TaskType.RECURRING) {
    if (!task.dueEndDate || !task.frequency) {
      return;
    }

    // find last occurrence
    const lastOccurrence = await useDrizzle.query.taskOccurrences.findFirst({
      where: and(
        eq(taskOccurrences.taskId, task.id),
        lt(taskOccurrences.dueEndDate, new Date().toISOString()),
      ),
      orderBy: [desc(taskOccurrences.dueEndDate)],
    });

    const nextOccurrencesData = getNextTaskOccurrencesData(
      task,
      lastOccurrence?.dueEndDate
        ? {
            start: lastOccurrence.dueStartDate
              ? DateTime.fromSQL(lastOccurrence.dueStartDate)
              : null,
            end: DateTime.fromSQL(lastOccurrence.dueEndDate),
          }
        : {
            start: task.dueStartDate
              ? DateTime.fromSQL(task.dueStartDate)
              : null,
            end: DateTime.fromSQL(task.dueEndDate),
          },
    );

    // TRANSACTION START
    await useDrizzle.transaction(async (tx) => {
      const existingPendingTaskOccurrences =
        await tx.query.taskOccurrences.findMany({
          where: and(eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)),
        });

      // DELETE ALL future pending occurrences with no matching dueStartDate and dueEndDate
      const taskOccurrencesToDelete = existingPendingTaskOccurrences.filter(
        (to) =>
          !nextOccurrencesData.find((x) =>
            to.dueStartDate
              ? DateTime.fromSQL(to.dueStartDate).toISO() === x.dueStartDate
              : to.dueStartDate === x.dueStartDate && to.dueEndDate
                ? DateTime.fromSQL(to.dueEndDate).toISO() === x.dueEndDate
                : to.dueEndDate === x.dueEndDate,
          ),
      );

      await tx.delete(taskOccurrences).where(
        inArray(
          taskOccurrences.id,
          taskOccurrencesToDelete.map((x) => x.id),
        ),
      );

      const newTaskOccurrences = nextOccurrencesData.filter(
        (x) =>
          !existingPendingTaskOccurrences.find((to) =>
            to.dueStartDate
              ? DateTime.fromSQL(to.dueStartDate).toISO() === x.dueStartDate
              : to.dueStartDate === x.dueStartDate && to.dueEndDate
                ? DateTime.fromSQL(to.dueEndDate).toISO() === x.dueEndDate
                : to.dueEndDate === x.dueEndDate,
          ),
      );

      if (!newTaskOccurrences.length) {
        return [];
      }

      return await tx.insert(taskOccurrences).values(newTaskOccurrences);
    });
    // TRANSACTION END
  }

  // HANDLE taskOccurrence responsibilities
  if (task.responsibleUsers?.length) {
    const noUserTaskOccurrenceIds = await useDrizzle
      .select({
        id: taskOccurrences.id,
      })
      .from(taskOccurrences)
      .leftJoin(
        usersOnTaskOccurrences,
        eq(usersOnTaskOccurrences.taskOccurrenceId, taskOccurrences.id),
      )
      .where(
        and(
          isNull(usersOnTaskOccurrences.taskOccurrenceId),
          eq(taskOccurrences.taskId, task.id),
        ),
      );

    if (noUserTaskOccurrenceIds.length) {
      const values = noUserTaskOccurrenceIds.flatMap((to) => {
        return task.responsibleUsers.flatMap((u) => ({
          taskOccurrenceId: to.id,
          userId: u.userId,
        }));
      });
      await useDrizzle.insert(usersOnTaskOccurrences).values(values);
    }
  }
};

export default defineTask({
  meta: {
    name: "task:occurrences:update",
    description: "Update or regenerate Task Occurrences",
  },
  run: async ({ payload }) => {
    const { taskId } = payload ?? {};

    if (taskId) {
      const task = await useDrizzle.query.tasks.findFirst({
        with: {
          occurrences: true,
          responsibleUsers: {
            where: isNull(usersOnTasks.resignedAt),
          },
        },
        where: and(
          eq(tasks.id, taskId as string),
          eq(tasks.status, TaskStatus.PROCESSING),
        ),
      });

      await updateOccurrences(task as TaskToUpdate);
    } else {
      const tasksToUpdate = await useDrizzle.query.tasks.findMany({
        with: {
          occurrences: true,
          responsibleUsers: {
            where: isNull(usersOnTasks.resignedAt),
          },
        },
        where: and(
          eq(tasks.id, taskId as string),
          eq(tasks.status, TaskStatus.PROCESSING),
          eq(tasks.type, TaskType.RECURRING),
          eq(tasks.frequency, TaskFrequency.IRREGULAR),
        ),
      });

      tasksToUpdate.map((t) => {
        updateOccurrences(t as TaskToUpdate);
      });
    }

    return { result: "success" };
  },
});
