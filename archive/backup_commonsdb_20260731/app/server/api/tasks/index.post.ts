import { DateTime } from "luxon";
import { taskLinks, tasks } from "~/server/database/schema";
import { TaskLink, TaskType } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const {
    description,
    type,
    hasDueDate,
    due,
    frequency,
    endsAfter,
    endsAfterCount,
    endsAfterDate,
    categories,
    links,
    ...taskData
  } = body;

  const dueDateTime: {
    startDateTime: DateTime | null;
    endDateTime: DateTime | null;
  } = {
    startDateTime: null,
    endDateTime: null,
  };

  if (hasDueDate) {
    if (due.startDate) {
      dueDateTime.startDateTime = DateTime.fromISO(
        `${due.startDate}T${due.startTime ?? "00:00:00"}`
      );
    }
    if (due.endDate) {
      dueDateTime.endDateTime = DateTime.fromISO(
        `${due.endDate}T${due.endTime ?? "23:59:59"}`
      );
    }
  }

  if (type === TaskType.RECURRING && !dueDateTime.endDateTime) {
    throw createError({
      status: 400,
      message: "Recurring Tasks need to have an end.",
    });
  }

  const task = await useDrizzle.transaction(async (tx) => {
    const task = (
      await tx
        .insert(tasks)
        .values({
          ...taskData,
          description:
            description?.length && description !== "<p></p>"
              ? description
              : null,
          type,
          ...(hasDueDate
            ? {
                dueStartDate: dueDateTime.startDateTime?.toISO(),
                dueEndDate: dueDateTime.endDateTime?.toISO(),
              }
            : {}),
          ...(type === TaskType.RECURRING
            ? {
                frequency,
                endsAfter,
                endsAfterCount,
                endsAfterDate,
              }
            : {}),
        })
        .returning()
    ).at(0);

    // TODO: categories

    if (task && links?.length) {
      await tx.insert(taskLinks).values(
        links.map((l: TaskLink) => ({
          ...l,
          taskId: task.id,
        }))
      );
    }

    return task;
  });

  if (task) {
    // trigger occurrence creation
    await runTask("task:occurrences:update", {
      payload: { taskId: task.id },
    });
  }

  return task;
});
