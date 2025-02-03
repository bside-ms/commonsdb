import { Task, TaskFrequency, TaskOccurrence } from "@prisma/client";
import { DateTime, WeekdayNumbers } from "luxon";

export const getNextDueEndDate = (
  dueEndDate: Date,
  frequency: TaskFrequency
) => {
  const dt = DateTime.fromJSDate(dueEndDate);
  switch (frequency) {
    case TaskFrequency.DAILY:
      return dt.plus({ days: 1 });
    case TaskFrequency.WEEKLY:
      return dt
        .plus({ weeks: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.MONTHLY:
      return dt
        .plus({ months: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.QUARTERLY:
      return dt
        .plus({ quarters: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    case TaskFrequency.YEARLY:
      return dt
        .plus({ years: 1 })
        .set({ weekday: dt.weekday as WeekdayNumbers });
    default:
      break;
  }
};

export const getFutureOccurrences = async (task: Task) => {
  return prisma.taskOccurrence.findMany({
    where: {
      taskId: task.id,
      dueEndDate: {
        gt: new Date(),
      },
    },
    orderBy: {
      dueEndDate: "asc",
    },
  });
};

export const getNumberOfFutureOccurrencesToCreate = (
  task: Task,
  occurrences: TaskOccurrence[]
) => {
  switch (task.frequency) {
    case TaskFrequency.IRREGULAR:
      return 1;
    case TaskFrequency.DAILY:
      return 90 - occurrences.length;
    case TaskFrequency.WEEKLY:
      return 12 - occurrences.length;
    case TaskFrequency.MONTHLY:
      return 6 - occurrences.length;
    case TaskFrequency.QUARTERLY:
      return 4 - occurrences.length;
    case TaskFrequency.YEARLY:
      return 2 - occurrences.length;
    default:
      return 0;
  }
};
