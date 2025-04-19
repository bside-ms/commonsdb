import Prisma from "@prisma/client";
import { TaskWithOccurrences } from "~/types/tasks";

const updateOccurrences = async (task: TaskWithOccurrences) => {
  if (task.type === Prisma.TaskType.SINGLE) {
    if (!task.occurrences?.length) {
      await runTask("task:occurrences:create", {
        payload: { taskId: task.id },
      });
    } else {
      const singleOccurrence = task.occurrences.at(0);

      // update pending occurrences
      const res = await prisma.taskOccurrence.update({
        where: {
          id: singleOccurrence!.id,
          status: Prisma.TaskOccurenceStatus.PENDING,
        },
        data: {
          dueStartDate: task.dueStartDate,
          dueEndDate: task.dueEndDate,
        },
      });
    }
    return;
  }

  if (task.type === Prisma.TaskType.RECURRING) {
    if (
      !task.dueEndDate ||
      !task.frequency ||
      (task.frequency === Prisma.TaskFrequency.IRREGULAR &&
        task.occurrences?.length)
    ) {
      return;
    }

    // delete pending tasks...
    await prisma.taskOccurrence.deleteMany({
      where: {
        taskId: task.id,
        status: Prisma.TaskOccurenceStatus.PENDING,
      },
    });

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
      const task = await prisma.task.findFirstOrThrow({
        where: {
          id: taskId,
        },
        include: {
          occurrences: true,
        },
      });

      await updateOccurrences(task);
    }

    return { result: "success" };
  },
});
