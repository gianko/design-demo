import {
  Children,
  Fragment,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Checkbox } from "../Checkbox/Checkbox.tsx";
import { defaultState } from "../Screen/default-state.ts";
import { useScreenState, useSelection } from "../Screen/screen-state.tsx";
import { SheetHost, transitionSheet } from "../Sheet/sheet-host.tsx";
import { StatusTag, type StatusTagProps } from "../StatusTag/StatusTag.tsx";
import type { dataTableEntry } from "./DataTable.registry.ts";
import "./DataTable.css";

// The screen's list: a native table on a flat surface, one row per item. A
// selectable table puts a Checkbox first in each row, and one that isn't has
// none and never touches the selection (#203). DataTable owns ticking rows and
// the ScreenHost holds
// the selection (ADR 0011): a tick that leaves rows ticked enters
// `rows-selected` if the screen isn't in it, after a failure too, and one
// that leaves none returns to the default state, each in the same update. A
// confirmed action clears the selection and a failed one keeps it, both in
// the host. A selected row fills with `selected` and its box is ticked, so
// the state never rests on colour alone.
// A table with a detail slot opens a row's Sheet when the row is clicked or
// Enter is pressed on it (ADR 0011), through transitionSheet's View
// Transition, so the row expands into the sheet and the sheet shrinks back
// into it on close. The open sheet is DataTable's own state, not a screen
// state. Such a row takes focus and answers hover and press; in a selectable
// table, ticking its box selects and doesn't open it. The Sheet renders after
// the table's surface; it draws in the top layer, so nested-cards reads it as
// a surface of its own wherever it sits in the DOM (#254). A table with no
// detail slot has rows that don't answer hover, since nothing in them opens.
// A column whose cell is an Amount puts its header at the end edge, above
// the cents.
// When the statuses its StatusTags are bound to change, such as an action's
// confirmed result, the rows whose status changed are marked `data-flip`
// and flip in the stagger DataTable.css sets out (ADR 0011). A table
// renders its first statuses still: nothing animates on page load.
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
    // The row opens its Sheet. Its focus ring sits inside the row, since the
    // surface clips anything outside it (DataTable.css).
    opens: { true: { row: "focus-visible:focus-ring" }, false: {} },
    money: { true: { header: "text-right" }, false: { header: "text-left" } },
  },
  compoundVariants: [
    // A selected row keeps its fill under the pointer: selection outranks
    // hover.
    {
      opens: true,
      selected: false,
      class: { row: "hover:bg-surface-hover active:bg-surface-pressed" },
    },
  ],
  defaultVariants: { selected: false, opens: false, money: false },
});

type Row = { id: string };

export type DataTableProps<R extends Row = Row> = Omit<
  PropsOf<typeof dataTableEntry>,
  "rows"
> & {
  rows: readonly R[];
  // The cell slot: one node per column for a row, in column order.
  cell: (row: R) => ReactNode;
  // The detail slot: the Sheet a row opens, for that row.
  detail?: (row: R) => ReactNode;
};

const rowsSelected = "rows-selected";

// Marks a table with a detail slot: what the open-sheet render (ADR 0011)
// counts tables by.
const detailAttribute = "data-detail";

// The open-sheet render's library test attribute (ADR 0011), which only the
// Storybook preview sets, for a screen's open-sheet story: on an element
// around the screen, it names one of the tables with a detail slot inside
// it, counted from 0 in document order, and that table starts with its
// first row's Sheet open, with no View Transition.
export const openDetailAttribute = "data-test-open-detail";

// Whether the open-detail attribute around `table` names it.
function namedToOpen(table: HTMLElement) {
  const scope = table.closest(`[${openDetailAttribute}]`);
  if (!scope) return false;
  const tables = [
    ...scope.querySelectorAll(
      `[data-component="DataTable"][${detailAttribute}]`
    ),
  ];
  return (
    tables.indexOf(table) === Number(scope.getAttribute(openDetailAttribute))
  );
}

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

// What a row's StatusTags show, from its cell nodes.
function statusOf(nodes: readonly ReactNode[]) {
  return nodes
    .flatMap((node) =>
      isValidElement<StatusTagProps>(node) && node.type === StatusTag
        ? [node.props.status]
        : []
    )
    .join(" ");
}

// Each row's statuses as last rendered, the rows whose status changed in the
// last change that changed any, and how many times each row has flipped,
// which keys its element so a row that flips again replays its flip.
type Statuses = {
  shown: ReadonlyMap<string, string>;
  flipped: ReadonlySet<string>;
  flips: ReadonlyMap<string, number>;
};

function sameStatuses(
  a: ReadonlyMap<string, string>,
  b: ReadonlyMap<string, string>
) {
  return a.size === b.size && [...a].every(([id, s]) => b.get(id) === s);
}

export function DataTable<R extends Row>({
  rows,
  columns,
  selectable = false,
  cell,
  detail,
}: DataTableProps<R>) {
  const { state } = useScreenState();
  const selection = useSelection();
  // A table that isn't selectable shows no selection, even one the host
  // starts with.
  const selected: ReadonlySet<string> = new Set(
    selectable ? selection.selected : []
  );

  const select = (next: ReadonlySet<string>) => {
    const target = next.size > 0 ? rowsSelected : defaultState;
    selection.select([...next], state === target ? undefined : target);
  };
  // The open row's id, and each row's element, which its sheet opens from
  // and closes back into.
  const [open, setOpen] = useState<string | null>(null);
  const rowElements = useRef(new Map<string, HTMLTableRowElement>());
  const opened = detail && rows.find((row) => row.id === open);
  // The open-sheet render (ADR 0011): the table the test attribute names
  // opens its first row before the first paint, as a state it starts in,
  // with no View Transition.
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const first = rows[0];
    if (detail && first && namedToOpen(root.current!)) setOpen(first.id);
    // Only as the table first renders: once open, the sheet is the person's.
  }, []);
  const openDetail = (id: string, from: HTMLTableRowElement) =>
    transitionSheet("open", from, () => setOpen(id));
  const closeDetail = () =>
    transitionSheet(
      "close",
      (open !== null && rowElements.current.get(open)) || null,
      () => setOpen(null)
    );

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
  // A row flips when its status changes, not when it first appears; a change
  // that changes no status (rows added or removed) leaves the last flips be.
  const shown = new Map(rows.map((row, r) => [row.id, statusOf(cells[r]!)]));
  const [statuses, setStatuses] = useState<Statuses>(() => ({
    shown,
    flipped: new Set(),
    flips: new Map(),
  }));
  if (!sameStatuses(statuses.shown, shown)) {
    const changed = rows
      .map((row) => row.id)
      .filter((id) => {
        const was = statuses.shown.get(id);
        return was !== undefined && was !== shown.get(id);
      });
    setStatuses({
      shown,
      flipped: changed.length > 0 ? new Set(changed) : statuses.flipped,
      flips: new Map([
        ...statuses.flips,
        ...changed.map(
          (id) => [id, (statuses.flips.get(id) ?? 0) + 1] as const
        ),
      ]),
    });
  }

  const money = columns.map((_, i) => {
    const node = cells[0]?.[i];
    return isValidElement(node) && node.type === Amount;
  });
  const chosen = rows.filter((row) => selected.has(row.id)).length;
  const all =
    chosen === 0 ? false : chosen === rows.length ? true : ("mixed" as const);

  const slots = dataTable();
  return (
    <>
      <div
        ref={root}
        data-component="DataTable"
        {...(detail && { [detailAttribute]: "" })}
        className={slots.root()}
      >
        <table className={slots.table()}>
          <thead>
            <tr className={slots.headerRow()}>
              {selectable && (
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
              )}
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
              const each = dataTable({ selected: isSelected, opens: !!detail });
              const opens = detail && {
                tabIndex: 0,
                ref: (element: HTMLTableRowElement | null) => {
                  if (element) rowElements.current.set(row.id, element);
                  else rowElements.current.delete(row.id);
                },
                onClick: (event: { currentTarget: HTMLTableRowElement }) =>
                  openDetail(row.id, event.currentTarget),
                // Enter on the row itself, not on its checkbox.
                onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (
                    event.key !== "Enter" ||
                    event.target !== event.currentTarget
                  )
                    return;
                  event.preventDefault();
                  openDetail(row.id, event.currentTarget);
                },
              };
              return (
                <tr
                  key={`${row.id} ${statuses.flips.get(row.id) ?? 0}`}
                  className={each.row()}
                  data-flip={statuses.flipped.has(row.id) || undefined}
                  {...opens}
                >
                  {selectable && (
                    // Ticking selects; a click on the box doesn't open the row.
                    <td
                      className={each.select()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className={each.selector()}>
                        <Checkbox
                          label={`Select ${row.id}`}
                          checked={isSelected}
                          onCheckedChange={(on) => toggle(row.id, on)}
                        />
                      </div>
                    </td>
                  )}
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
      {opened && <SheetHost onClose={closeDetail}>{detail(opened)}</SheetHost>}
    </>
  );
}
