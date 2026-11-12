import type { Key, ReactNode } from "react";
import { cx } from "./styles";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-aligned, tabular figures: prices, amounts, counts. */
  numeric?: boolean;
  /** On phones this column becomes the card's heading. One per table. */
  primary?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => Key;
  /** Read by screen readers; also shown above the table when visible is set. */
  caption: string;
  showCaption?: boolean;
  /** Shown instead of the table when there are no rows (e.g. an EmptyState). */
  empty?: ReactNode;
};

/**
 * A table on tablets and up; on phones each row turns into its own card with
 * the primary column as its heading and the rest as label/value pairs.
 */
export function Table<T>({ columns, rows, rowKey, caption, showCaption, empty }: Props<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <div>
      <div className="hidden overflow-x-auto rounded-card border border-line bg-card md:block">
        <table className="w-full border-collapse text-left">
          <caption className={showCaption ? "px-6 pt-5 pb-2 text-left font-medium" : "sr-only"}>
            {caption}
          </caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cx(
                    "px-6 py-3 text-xs font-semibold tracking-wider text-muted uppercase",
                    c.numeric && "text-right",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-line transition-colors duration-500 ease-basecamp last:border-b-0 hover:bg-paper"
              >
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-6 py-4 align-top", c.numeric && "text-right font-medium")}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-card border border-line bg-card p-5">
            <div className="text-lg font-semibold text-ink">{primary.cell(row)}</div>
            <dl className="mt-3 flex flex-col gap-2">
              {rest.map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-muted">{c.header}</dt>
                  <dd className={cx("text-right text-ink", c.numeric && "tabular font-medium")}>{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
