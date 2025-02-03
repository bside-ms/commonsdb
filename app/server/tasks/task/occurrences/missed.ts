import { TaskOccurenceStatus } from "@prisma/client";

export default defineTask({
  meta: {
    name: "task:occurrences:missed",
    description: "Find Task Occurrences older than now and set Status 'missed'",
  },
  run: async () => {
    await prisma.taskOccurrence.updateMany({
      data: {
        status: TaskOccurenceStatus.MISSED,
      },
      where: {
        dueEndDate: {
          lte: new Date(),
        },
      },
    });

    return { result: "success" };
  },
});
