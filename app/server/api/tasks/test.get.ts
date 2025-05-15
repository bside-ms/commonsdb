export default eventHandler(async (event) => {
  const { result } = await runTask("task:occurrences:update", {
    payload: { taskId: "3563783c-a536-4d2e-b062-fefbee9e880a" },
  });

  return { result };
});
