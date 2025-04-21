import { and, eq, inArray, not } from "drizzle-orm";
import { DateTime } from "luxon";
import { categoriesOnTasks, taskLinks, tasks } from "~/server/database/schema";
import { TaskType } from "~/types/tasks";

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!taskId || taskId === "undefined") {
    throw createError({ status: 400 });
  }

  const {
    type,
    hasDueDate,
    due,
    frequency,
    isAssignableToMany,
    maxAssignmentCount,
    categories,
    links,
    factor,
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
    throw new Error("Recurring Tasks need to have an end.");
  }

  const task = await useDrizzle.transaction(async (tx) => {
    const t = (
      await tx
        .update(tasks)
        .set({
          ...taskData,
          maxAssignmentCount: isAssignableToMany ? maxAssignmentCount : 1,
          type,
          dueStartDate: dueDateTime.startDateTime?.toISO(),
          dueEndDate: dueDateTime.endDateTime?.toISO(),
          frequency: type === TaskType.RECURRING ? frequency : null,
          factor: parseFloat(factor),
        })
        .where(eq(tasks.id, taskId))
        .returning()
    ).at(0);

    // delete old categoryRelations
    await tx.delete(categoriesOnTasks).where(
      and(
        eq(categoriesOnTasks.taskId, taskId),
        not(
          inArray(
            categoriesOnTasks.categoryId,
            categories.map((c: any) => c.value)
          )
        )
      )
    );

    // create new categoryRelations and ignore if already existing
    await tx
      .insert(categoriesOnTasks)
      .values(
        categories.map((c: any) => ({
          taskId,
          categoryId: c.value,
        }))
      )
      .onConflictDoNothing();

    // delete old links
    await tx.delete(taskLinks).where(
      not(
        inArray(
          taskLinks.id,
          links.filter((l: any) => !!l.id).map((l: any) => l.id)
        )
      )
    );

    // create new links
    await tx.insert(taskLinks).values(links.filter((l: any) => !l.id));

    return t;
  });

  if (task) {
    // trigger occurrence update
    await runTask("task:occurrences:update", {
      payload: { taskId: task.id },
    });
  }

  return task;
});
