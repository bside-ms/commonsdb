export const useFormatReproduction = (
  amountInMinutes: number,
  options?: {
    showMinutes?: boolean;
    showUnit?: boolean;
  }
) => {
  const amount = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(amountInMinutes / 60);

  if (options?.showMinutes) {
    if (amountInMinutes < 60) {
      return `${amountInMinutes} Minuten`;
    }

    return `${amount} ${amountInMinutes === 60 ? "Stunde" : "Stunden"}`;
  }

  return (
    amount +
    (options?.showUnit ? ` ${amountInMinutes === 60 ? "Repro" : "Repros"}` : "")
  );
};
