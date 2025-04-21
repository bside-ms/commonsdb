import { and, eq } from "drizzle-orm";
import { taskOccurrences, tasks } from "~/server/database/schema";
import {
  Task,
  TaskFrequency,
  TaskOccurrence,
  TaskOccurrenceStatus,
  TaskType,
} from "~/types/tasks";

const updateOccurrences = async (
  task: Task & { occurrences: TaskOccurrence[] }
) => {
  if (task.type === TaskType.SINGLE) {
    if (!task.occurrences?.length) {
      await runTask("task:occurrences:create", {
        payload: { taskId: task.id },
      });
    } else {
      const singleOccurrence = task.occurrences.at(0);

      // update pending occurrences
      await useDrizzle
        .update(taskOccurrences)
        .set({
          dueStartDate: task.dueStartDate,
          dueEndDate: task.dueEndDate,
        })
        .where(
          and(
            eq(taskOccurrences.id, singleOccurrence!.id),
            eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
          )
        );
    }

    return;
  }

  if (task.type === TaskType.RECURRING) {
    if (
      !task.dueEndDate ||
      !task.frequency ||
      (task.frequency === TaskFrequency.IRREGULAR && task.occurrences?.length)
    ) {
      return;
    }

    // delete pending tasks...
    await useDrizzle
      .delete(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.taskId, task.id),
          eq(taskOccurrences.status, TaskOccurrenceStatus.PENDING)
        )
      );

    // ...and create new
    await runTask("task:occurrences:create", {
      payload: { taskId: task.id },
    });
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
        },
        where: eq(tasks.id, taskId as string),
      });

      await updateOccurrences(task as Task & { occurrences: TaskOccurrence[] });
    }

    return { result: "success" };
  },
});
