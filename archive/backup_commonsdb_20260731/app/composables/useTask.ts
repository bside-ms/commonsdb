import { DateTime } from "luxon";
import {
  TaskOccurrenceStatus,
  type Task,
  type TaskOccurrence,
  type WithOccurrences,
} from "~/types/tasks";

export const useTask = () => {
  const getDueEndDateFormatted = (
    occurrence?: TaskOccurrence
  ): string | null => {
    if (occurrence?.dueEndDate) {
      // when using users/me/task-occurrences it's an SQL Type, else ISO
      const nextDueEnd = DateTime.fromISO(occurrence.dueEndDate).isValid
        ? DateTime.fromISO(occurrence.dueEndDate)
        : DateTime.fromSQL(occurrence.dueEndDate);
      return nextDueEnd.toFormat("dd.LL.yyyy HH:mm");
    }

    return null;
  };

  const getNextPendingOccurrenceWithDueDate = (
    task: Task & { occurrences: TaskOccurrence[] }
  ) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.find(
      (o) => o.status === TaskOccurrenceStatus.PENDING && o.dueEndDate
    );
  };

  const getNextPendingOccurrence = (
    task: Task & { occurrences: TaskOccurrence[] }
  ) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.find(
      (o) => o.status === TaskOccurrenceStatus.PENDING
    );
  };

  const getNextPendingDueEndDateFormatted = (
    task: Task & WithOccurrences
  ): string | null => {
    const nextPendingOccurrence = getNextPendingOccurrence(task);
    if (!nextPendingOccurrence) return null;
    return getDueEndDateFormatted(nextPendingOccurrence);
  };

  const getNextOccurrence = (
    task: Task & { occurrences: TaskOccurrence[] }
  ) => {
    if (!task.occurrences?.length) {
      return null;
    }

    return task.occurrences.at(0);
  };

  const getNextDueEndDateFormatted = (
    task: Task & { occurrences: TaskOccurrence[] }
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
