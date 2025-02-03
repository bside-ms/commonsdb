import { DateTime } from "luxon";

export const formatISODateTime = (datetime: string, fmt?: string) => {
  if (fmt) {
    return DateTime.fromISO(datetime).toFormat(fmt);
  }

  return DateTime.fromISO(datetime)
    .setLocale("de")
    .toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);
};
