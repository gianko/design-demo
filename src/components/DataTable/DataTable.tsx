import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Checkbox } from "../Checkbox/Checkbox.tsx";
import { defaultState } from "../Screen/default-state.ts";
import { useScreenState, useSelection } from "../Screen/screen-state.tsx";
import type { dataTableEntry } from "./DataTable.registry.ts";

// The screen's list: a native table on a flat surface, one row per item, each
// with a Checkbox first. DataTable owns ticking rows and the ScreenHost holds
// the selection (ADR 0011): a tick that leaves rows ticked enters
// `rows-selected` if the screen isn't in it, after a failure too, and one
// that leaves none returns to the default state, each in the same update. A
// confirmed action clears the selection and a failed one keeps it, both in
// the host. A selected row fills with `selected` and its box is ticked, so
// the state never rests on colour alone.
// Rows don't answer hover: nothing in them opens yet. A column whose cell is
// an Amount puts its header at the end edge, above the cents.
export const dataTable = tv({
  slots: {
    root: "overflow-x-auto rounded-surface border border-line bg-surface",
    table: "w-full border-collapse",
    headerRow: "h-row",
    header:
      "px-xs align-middle text-column-header whitespace-nowrap text-ink-muted",
    row: "h-row border-t border-line transition-colors duration-base ease-standard motion-reduce:duration-fast",
    // One line per row, so every row keeps the density's height; a long name
    // widens its column, and a narrow screen scrolls the table sideways. The
    // cell's node is held to it too: a Text's paragraph sets its own wrap.
    cell: "px-xs align-middle text-body text-nowrap text-ink *:text-nowrap",
    select: "w-0 pl-xs align-middle",
    // A flex box, so the Checkbox sits centred in the row rather than on the
    // cell's text baseline.
    selector: "flex",
  },
  variants: {
    selected: { true: { row: "bg-selected" }, false: {} },
    money: { true: { header: "text-right" }, false: { header: "text-left" } },
  },
  defaultVariants: { selected: false, money: false },
});

type Row = { id: string };

export type DataTableProps<R extends Row = Row> = Omit<
  PropsOf<typeof dataTableEntry>,
  "rows"
> & {
  rows: readonly R[];
  // The cell slot: one node per column for a row, in column order.
  cell: (row: R) => ReactNode;
};

const rowsSelected = "rows-selected";

// The nodes `cell` gives for one row, a fragment's children one each.
function cellsOf(node: ReactNode) {
  const nodes = Children.toArray(node);
  const [only] = nodes;
  if (
    nodes.length === 1 &&
    isValidElement<{ children?: ReactNode }>(only) &&
    only.type === Fragment
  ) {
    return Children.toArray(only.props.children);
  }
  return nodes;
}

export function DataTable<R extends Row>({
  rows,
  columns,
  cell,
}: DataTableProps<R>) {
  const { state } = useScreenState();
  const selection = useSelection();
  const selected: ReadonlySet<string> = new Set(selection.selected);

  const select = (next: ReadonlySet<string>) => {
    const target = next.size > 0 ? rowsSelected : defaultState;
    selection.select([...next], state === target ? undefined : target);
  };
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    select(next);
  };

  const cells = rows.map((row) => {
    const nodes = cellsOf(cell(row));
    if (nodes.length !== columns.length) {
      throw new Error(
        `DataTable has ${columns.length} columns but its cell slot gives ${nodes.length} nodes for row ${row.id}; give one cell node per column, in the same order.`
      );
    }
    return nodes;
  });
  const money = columns.map((_, i) => {
    const node = cells[0]?.[i];
    return isValidElement(node) && node.type === Amount;
  });
  const chosen = rows.filter((row) => selected.has(row.id)).length;
  const all =
    chosen === 0 ? false : chosen === rows.length ? true : ("mixed" as const);

  const slots = dataTable();
  return (
    <div data-component="DataTable" className={slots.root()}>
      <table className={slots.table()}>
        <thead>
          <tr className={slots.headerRow()}>
            <th scope="col" className={slots.select()}>
              <div className={slots.selector()}>
                <Checkbox
                  label="Select all rows"
                  checked={all}
                  disabled={rows.length === 0}
                  onCheckedChange={(on) =>
                    select(new Set(on ? rows.map((row) => row.id) : []))
                  }
                />
              </div>
            </th>
            {columns.map((name, i) => (
              <th
                key={i}
                scope="col"
                className={dataTable({ money: money[i] }).header()}
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const isSelected = selected.has(row.id);
            const each = dataTable({ selected: isSelected });
            return (
              <tr key={row.id} className={each.row()}>
                <td className={each.select()}>
                  <div className={each.selector()}>
                    <Checkbox
                      label={`Select ${row.id}`}
                      checked={isSelected}
                      onCheckedChange={(on) => toggle(row.id, on)}
                    />
                  </div>
                </td>
                {cells[r]!.map((node, i) => (
                  <td key={i} className={each.cell()}>
                    {node}
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
