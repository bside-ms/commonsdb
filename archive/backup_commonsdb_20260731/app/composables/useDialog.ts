export const useDialog = () => {
  const isOpen = ref(false);

  const closeDialog = () => {
    isOpen.value = false;
  };

  return { isOpen, closeDialog };
};
