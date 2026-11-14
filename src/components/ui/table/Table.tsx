import type { KeyboardEvent, ReactNode } from "react";

export interface TableColumn<Row> {
  key: keyof Row | string;
  header: string;
  render?: (row: Row) => ReactNode;
  /** Right align numeric columns. */
  align?: "left" | "right";
}

export interface TableProps<Row> {
  ariaLabel?: string;
  /** Visible to screen readers. Describes what the table lists. */
  caption?: string;
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  getRowKey?: (row: Row, index: number) => string;
  /** Makes rows keyboard and pointer activatable. */
  onRowClick?: (row: Row) => void;
  isRowSelected?: (row: Row) => boolean;
  emptyMessage?: string;
}

export function Table<Row extends object>({
  ariaLabel = "Data table",
  caption,
  columns,
  emptyMessage = "Nothing to show.",
  getRowKey,
  isRowSelected,
  onRowClick,
  rows,
}: TableProps<Row>) {
  const onKey = (event: KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className="overflow-x-auto rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs">
      <table aria-label={caption ? undefined : ariaLabel} className="min-w-[720px] w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-[0.06em] text-gray-500">
          <tr>
            {columns.map((column) => (
              <th className={["px-4 py-3", column.align === "right" ? "text-right" : ""].join(" ")} key={String(column.key)} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-gray-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {rows.map((row, index) => {
            const selected = isRowSelected?.(row) ?? false;
            return (
              <tr
                aria-selected={onRowClick ? selected : undefined}
                className={[
                  "text-gray-700 hover:bg-gray-50",
                  onRowClick ? "focus-ring cursor-pointer" : "",
                  selected ? "bg-brand-25" : "",
                ].join(" ")}
                key={getRowKey ? getRowKey(row, index) : index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={(event) => onKey(event, row)}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td className={["px-4 py-3", column.align === "right" ? "whitespace-nowrap text-right tabular-nums" : ""].join(" ")} key={String(column.key)}>
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key as string] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
