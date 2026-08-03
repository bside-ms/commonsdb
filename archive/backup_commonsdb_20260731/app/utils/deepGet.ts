export const deepGet = (obj: any, keys: string[]) =>
  keys.reduce((xs, x) => xs?.[x] ?? null, obj);

export const deepGetByPath = (obj: any, path: string) =>
  deepGet(
    obj,
    path
      .replace(/\[([^\[\]]*)\]/g, ".$1.")
      .split(".")
      .filter((t) => t !== "")
  );
