import { DateTime } from "luxon";

export default defineEventHandler(async (event) => {
  // if (!(await hasRoles(event, ["admin"]))) {
  //   throw createError({
  //     statusCode: 403,
  //     message: "Not allowed",
  //   });
  // }
  // const taskId = getRouterParam(event, "id");
  // const { taskOccurrenceId, userIds } = await readBody(event);
  // const taskOccurrence = await prisma.taskOccurrence.findUnique({
  //   where: {
  //     id: taskOccurrenceId,
  //   },
  //   include: {
  //     task: {
  //       include: {
  //         responsibilities: {
  //           include: {
  //             user: {
  //               include: {
  //                 wallet: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // if (!taskOccurrence || taskOccurrence.taskId !== taskId) {
  //   throw createError({
  //     statusCode: 404,
  //     message: "No occurrence found for this task",
  //   });
  // }
  // // SET OCCURRENCE AS COMPLETE
  // await prisma.taskOccurrence.update({
  //   where: {
  //     id: taskOccurrenceId,
  //   },
  //   data: {
  //     status: TaskOccurenceStatus.COMPLETED,
  //   },
  // });
  // // DEPOSIT REWARDS TO RESPONSIBLE PERSONS
  // const reward =
  //   taskOccurrence.task.expense && taskOccurrence.task.factor
  //     ? taskOccurrence.task.expense * taskOccurrence.task.factor
  //     : 0;
  // if (reward > 0 && userIds?.length) {
  //   const comment = `'${taskOccurrence.task.title}' am ${DateTime.now().toFormat("dd.LL.yyyy 'um' HH:mm 'Uhr'")} erledigt`;
  //   const wallets = await prisma.wallet.findMany({
  //     where: {
  //       userId: {
  //         in: userIds,
  //       },
  //     },
  //   });
  //   wallets.map(async (wallet) => {
  //     await $fetch(`/api/wallets/${wallet.id}/charge`, {
  //       method: "POST",
  //       body: {
  //         amount: reward,
  //         comment,
  //       },
  //     });
  //   });
  // }
});
