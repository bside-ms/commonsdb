import { DateTime } from "luxon";

export const formatISODateTime = (datetime: string, fmt?: string) => {
  if (fmt) {
    return DateTime.fromSQL(datetime).toFormat(fmt);
  }

  return DateTime.fromSQL(datetime)
    .setLocale("de")
    .toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);
};

export const getDateTimeObject = (d: any) =>
  DateTime.fromISO(d).isValid ? DateTime.fromISO(d) : DateTime.fromSQL(d);
