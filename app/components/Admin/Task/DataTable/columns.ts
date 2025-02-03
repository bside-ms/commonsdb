import { createColumnHelper, type ColumnDef } from "@tanstack/vue-table";
import { Repeat1Icon, RepeatIcon } from "lucide-vue-next";
import { DateTime, Duration } from "luxon";
import { h } from "vue";
import { Badge } from "~/components/ui/badge";
import { TaskType, type Task } from "@prisma/client";
import RowAction from "./RowAction.vue";
import { TaskPriority } from "~/types/tasks";

const columnHelper = createColumnHelper<Task>();
export const columns = ({
  onEdit,
  onCopy,
  onDelete,
}: {
  onEdit: any;
  onCopy: any;
  onDelete: any;
}) => {
  return [
    columnHelper.accessor("title", {
      header: "Titel",
      cell: ({ row }) => {
        const { type } = row.original;
        // const category = categories?.find((c) => !c.parent);
        return h("div", { class: "flex items-center gap-2" }, [
          type && type === TaskType.RECURRING
            ? h(RepeatIcon, { class: "w-4 h-4" })
            : h(Repeat1Icon, { class: "w-4 h-4" }),
          h(
            "span",
            { class: "max-w-[500px] truncate font-medium" },
            row.getValue("title")
          ),
          ...(type && type === TaskType.RECURRING
            ? [
                // h(SeriesDialog, { task: row.original })
              ]
            : []),
        ]);
      },
    }),
    // columnHelper.accessor("status", {
    //   header: "Status",
    //   cell: ({ row }) => {
    //     return h("div", {}, row.getValue("status"));
    //   },
    // }),
    columnHelper.accessor("priority", {
      header: "Prio",
      cell: ({ row }) => h("div", {}, row.getValue("priority")),
      sortingFn: (rowA: any, rowB: any, columnId: any): number => {
        const taskPriorityValues = Object.values(TaskPriority);
        const aIndex = taskPriorityValues.findIndex(
          (v) => v == rowA.getValue(columnId)
        );
        const bIndex = taskPriorityValues.findIndex(
          (v) => v === rowB.getValue(columnId)
        );
        return bIndex - aIndex;
      },
    }),
    columnHelper.accessor("dueEndDate", {
      header: "Fälligkeit",
      cell: ({ row }) => {
        // const { type, dueStartDate, dueEndDate, occurrences } = row.original;

        // if (
        //   type === TaskType.RECURRING &&
        //   occurrences?.length &&
        //   occurrences?.at(0)?.due
        // ) {
        //   const nextDue = DateTime.fromISO(occurrences!.at(0)!.due!.toString());
        //   return h("div", { class: "flex flex-col gap-1" }, [
        //     h("span", { class: "text-xs text-muted-foreground" }, "(nächste)"),
        //     h("div", {}, nextDue.toLocaleString(DateTime.DATETIME_SHORT)),
        //   ]);
        // }

        // if (type === "single" && due) {
        //   const date = DateTime.fromISO(due.toString());
        //   return h("div", {}, date.toLocaleString(DateTime.DATETIME_SHORT));
        // }

        // return h("div", {}, "keine");
        return h("div", {}, "todo: show next due");
      },
    }),
    columnHelper.accessor("expense", {
      header: "Aufwand (h)",
      cell: ({ row }) => {
        const { hours } = Duration.fromObject({
          minutes: row.getValue("expense"),
        })
          .shiftTo("hours")
          .toObject();
        return h("div", {}, hours);
      },
    }),
    columnHelper.accessor("factor", {
      header: "Faktor",
      cell: ({ row }) => h("div", { class: "w-max" }, row.getValue("factor")),
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const task = row.original;
        return h(
          "div",
          { class: "relative text-right" },
          h(RowAction, {
            task,
            "onRow:edit": onEdit,
            "onRow:copy": onCopy,
            "onRow:deleted": onDelete,
          })
        );
      },
    }),
  ] as Array<ColumnDef<Task, unknown>>;
};
