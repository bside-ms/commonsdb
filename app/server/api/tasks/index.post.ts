import Prisma from "@prisma/client";
import { DateTime } from "luxon";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const {
    type,
    hasDueDate,
    due,
    frequency,
    isAssignableToMany,
    maxResponsibilities,
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

  if (type === Prisma.TaskType.RECURRING && !dueDateTime.endDateTime) {
    throw new Error("Recurring Tasks need to have an end.");
  }

  const task = await prisma.task.create({
    data: {
      ...taskData,
      maxResponsibilities: isAssignableToMany ? maxResponsibilities : 1,
      type,
      dueStartDate: dueDateTime.startDateTime?.toISO(),
      dueEndDate: dueDateTime.endDateTime?.toISO(),
      frequency: type === Prisma.TaskType.RECURRING ? frequency : null,
      categories: categories?.length
        ? {
            create: categories.map((c: any) => ({
              category: { connect: { id: c.value } },
            })),
          }
        : {},
      links: links?.length
        ? {
            create: links,
          }
        : {},
    },
  });

  // trigger occurrence creation
  await runTask("task:occurrences:create", {
    payload: { taskId: task.id },
  });

  return task;
});
