export default eventHandler(async (event) => {
  const { result } = await runTask("task:occurrences:update", {
    payload: { taskId: "101a6161-a8f8-4db7-9656-53eed61ea42c" },
  });

  return { result };
});
