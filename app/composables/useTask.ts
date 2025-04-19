import Prisma from "@prisma/client";
import type { TaskOccurrence } from "@prisma/client";
import type { TaskWithOccurrences } from "~/types/tasks";
import { DateTime } from "luxon";

export const useTask = () => {
  const getDueEndDateFormatted = (
    occurrence?: TaskOccurrence
  ): string | null => {
    if (occurrence?.dueEndDate) {
      const nextDueEnd = DateTime.fromISO(occurrence.dueEndDate.toString());
      return nextDueEnd.toFormat("dd.LL.yyyy HH:mm");
    }

    return null;
  };

  const getNextPendingOccurrenceWithDueDate = (task: TaskWithOccurrences) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.find(
      (o) => o.status === Prisma.TaskOccurenceStatus.PENDING && o.dueEndDate
    );
  };

  const getNextPendingOccurrence = (task: TaskWithOccurrences) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.find(
      (o) => o.status === Prisma.TaskOccurenceStatus.PENDING
    );
  };
  const getNextPendingDueEndDateFormatted = (
    task: TaskWithOccurrences
  ): string | null => {
    const nextPendingOccurrence = getNextPendingOccurrence(task);
    if (!nextPendingOccurrence) return null;
    return getDueEndDateFormatted(nextPendingOccurrence);
  };

  const getNextOccurrence = (task: TaskWithOccurrences) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.at(0);
  };
  const getNextDueEndDateFormatted = (
    task: TaskWithOccurrences
  ): string | null => {
    const nextOccurrence = getNextOccurrence(task);
    if (!nextOccurrence) return null;
    return getDueEndDateFormatted(nextOccurrence);
  };

  return {
    getNextOccurrence,
    getDueEndDateFormatted,
    getNextDueEndDateFormatted,
    getNextPendingOccurrence,
    getNextPendingOccurrenceWithDueDate,
    getNextPendingDueEndDateFormatted,
  };
};
