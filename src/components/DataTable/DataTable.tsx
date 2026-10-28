import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { tv } from "tailwind-variants/lite";
import type { PropsOf } from "../../registry/entry.ts";
import { Amount } from "../Amount/Amount.tsx";
import { Button, type ButtonProps } from "../Button/Button.tsx";
import { Checkbox } from "../Checkbox/Checkbox.tsx";
import { useSelection } from "../Screen/screen-state.tsx";
import { SheetHost, transitionSheet } from "../Sheet/sheet-host.tsx";
import {
  StatusTag,
  statusTag,
  statusWords,
  type StatusTagProps,
} from "../StatusTag/StatusTag.tsx";
import type { dataTableEntry } from "./DataTable.registry.ts";
import "./DataTable.css";

// The screen's list: a native table on a flat surface, one row per item. A
// selectable table puts a Checkbox first in each row, and one that isn't has
// none and never touches the selection (#203). DataTable owns ticking rows and
// the ScreenHost holds the selection (ADR 0011). The selection is the
// table's own, not a screen state (ADR 0013): ticking enters no state and
// runs no View Transition. A confirmed action clears the selection and a
// failed one keeps it, both in the host. A selected row fills with
// `selected` and its box is ticked, so the state never rests on colour
// alone.
// A table with a detail slot opens a row's Sheet when the row is clicked or
// Enter is pressed on it (ADR 0011), through transitionSheet's View
// Transition, so the sheet slides in from the end edge and back out past it
// on close. The open sheet is DataTable's own state, not a screen
// state. Such a row takes focus and answers hover and press; in a selectable
// table, ticking its box selects and doesn't open it. The Sheet renders after
// the table's surface; it draws in the top layer, so nested-cards reads it as
// a surface of its own wherever it sits in the DOM (#254). A table with no
// detail slot has rows that don't answer hover, since nothing in them opens.
// A column whose cell is an Amount puts its header at the end edge, above
// the cents. A column whose cell is a StatusTag keeps room for the widest
// status word whichever words it shows, so the columns hold still when a
// screen state changes its statuses (#276); each tag keeps its own width.
// When the statuses its StatusTags are bound to change, such as an action's
// confirmed result, the rows whose status changed are marked `data-flip`
// and flip in the stagger DataTable.css sets out (ADR 0011). A table
// renders its first statuses still: nothing animates on page load.
// A table of more than 10 rows scrolls inside its frame, under a header row
// stuck to the top (#296).
// A table with actions is selectable, and only such a table (ADR 0013): the
// actions are its footer, inside the frame below the scrolling body, always
// shown while it has rows. The footer says how many rows are ticked, in the
// selectionText form for that number, and holds the actions' Buttons at its
// end edge, disabled while no row is ticked. While one of them is pending,
// the selection is locked: every Checkbox is aria-disabled and ticking does
// nothing until the action settles. When a confirmed result clears the
// selection and so disables the footer Button that had focus, focus moves to
// the table.
export const dataTable = tv({
  slots: {
    // The frame: the flat surface. It scrolls sideways if the columns outgrow
    // a narrow screen, so it clips the table's corners too.
    root: "overflow-x-auto rounded-surface border border-line bg-surface",
    // The body: up to the header row and 10 rows at the density's row
    // height, then it scrolls down (#296). As wide as the table, and at
    // least the frame, so the frame, not the body, scrolls sideways and
    // clips the corners as before. Focus scrolls a row clear of the header
    // row (DataTable.css).
    body: "max-h-table w-max min-w-full overflow-y-auto",
    // Focus can land on the table from script (a footer Button disabled
    // under it), and a keyboard user sees where it went: the focus ring,
    // inside the table's edge, since the frame clips (DataTable.css).
    table: "w-full border-collapse focus-visible:focus-ring",
    headerRow: "h-row",
    header:
      "px-xs align-middle text-column-header whitespace-nowrap text-ink-muted",
    row: "h-row border-t border-line transition-colors duration-base ease-standard motion-reduce:duration-fast",
    // One line per row, so every row keeps the density's height; a long name
    // widens its column, and a narrow screen scrolls the table sideways. The
    // cell's node is held to it too: a Text's paragraph sets its own wrap.
    cell: "px-xs align-middle text-body text-nowrap text-ink *:text-nowrap",
    // A StatusTag cell's room: every status word, invisible and hidden from
    // assistive technology, in the one grid area behind the cell's own tag,
    // which stays its own width at the start edge. Inline, so the tag sits on
    // the cell's line as it does on its own.
    room: "inline-grid justify-items-start *:col-start-1 *:row-start-1",
    // A flex box, so the word's tag inside takes its own width and height,
    // off any line of text.
    word: "invisible flex",
    select: "w-0 pl-xs align-middle",
    // A flex box, so the Checkbox sits centred in the row rather than on the
    // cell's text baseline.
    selector: "flex",
    // The actions footer: below the body, outside its scroll, set off from
    // the rows by a `line` rule, a row high with the cells' side padding.
    // It is the frame's width and stuck to its start edge, so when a wide
    // table scrolls sideways on a phone the footer stays in view, and its
    // count and Buttons wrap onto lines of their own rather than spill.
    footer:
      "sticky start-0 flex min-h-row flex-wrap items-center justify-between gap-x-sm gap-y-xs border-t border-line px-xs py-3xs",
    // The selected count: plain text, not a live region, since the Checkbox
    // just ticked already says what changed. A control high, so on a line of
    // its own it sits like the Buttons below it.
    count: "flex min-h-control items-center text-body text-ink-muted",
    // The Buttons, at the end edge, on a line of their own when they wrap.
    buttons: "ms-auto flex flex-wrap justify-end gap-xs",
  },
  variants: {
    selected: { true: { row: "bg-selected" }, false: {} },
    // The row opens its Sheet. Its focus ring sits inside the row, since the
    // surface clips anything outside it (DataTable.css).
    opens: { true: { row: "focus-visible:focus-ring" }, false: {} },
    money: { true: { header: "text-right" }, false: { header: "text-left" } },
    // More rows than the body holds, so it scrolls down: the header row is
    // stuck to the top of the body, opaque and drawn over the rows passing
    // under it, Checkboxes included. Only then, so a table that fits paints
    // as it did before the cap (#296).
    scrolls: {
      true: { headerRow: "sticky top-0 z-raised bg-surface" },
      false: {},
    },
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
  defaultVariants: {
    selected: false,
    opens: false,
    money: false,
    scrolls: false,
  },
});

type Row = { id: string };

// The rows the body holds under its header row before it scrolls down: the
// `max-h-table` token is the header row and this many rows at the density's
// row height (#296).
const rowsInView = 10;

export type DataTableProps<R extends Row = Row> = Omit<
  PropsOf<typeof dataTableEntry>,
  "rows"
> & {
  rows: readonly R[];
  // The cell slot: one node per column for a row, in column order.
  cell: (row: R) => ReactNode;
  // The detail slot: the Sheet a row opens, for that row.
  detail?: (row: R) => ReactNode;
  // The actions slot: the footer's Buttons, which act on the Selection.
  actions?: ReactNode;
};

type SelectionText = NonNullable<DataTableProps["selectionText"]>;

// What the footer says with `count` rows ticked: the UI spec's words, the
// library putting in only the number (ADR 0013).
function selectedCount(text: SelectionText, count: number) {
  if (count === 0) return text.none;
  if (count === 1) return text.one;
  return text.other.replaceAll("{count}", String(count));
}

// Marks a table with a detail slot: what the open-sheet render (ADR 0011)
// counts tables by.
const detailAttribute = "data-detail";
// Marks a table with actions: what the rows-ticked render (ADR 0013) counts
// tables by.
const actionsAttribute = "data-actions";

// The open-sheet render's library test attribute (ADR 0011), which only the
// Storybook preview sets, for a screen's open-sheet story: on an element
// around the screen, it names one of the tables with a detail slot inside
// it, counted from 0 in document order, and that table starts with its
// first row's Sheet open, with no View Transition.
export const openDetailAttribute = "data-test-open-detail";

// The rows-ticked render's library test attribute (ADR 0013), which only
// the Storybook preview sets, for a screen's rows-ticked story and for an
// action clicked in a table's footer: on an element around the screen, it
// names one of the tables with actions inside it, counted from 0 in document
// order, and that table starts with every row ticked, with no View
// Transition.
export const tickRowsAttribute = "data-test-tick-rows";

// Whether `attribute` around `table` names it, among the tables marked with
// `marker`.
function namedBy(table: HTMLElement, attribute: string, marker: string) {
  const scope = table.closest(`[${attribute}]`);
  if (!scope) return false;
  const tables = [
    ...scope.querySelectorAll(`[data-component="DataTable"][${marker}]`),
  ];
  return tables.indexOf(table) === Number(scope.getAttribute(attribute));
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

// A StatusTag cell's node in its room: the tag first, so the room's baseline
// is the tag's, then every word StatusTag can show, each in StatusTag's own
// box with no status colour, so it's as wide as the tag showing it (#276).
function StatusRoom({ children }: { children: ReactNode }) {
  const slots = dataTable();
  const { root } = statusTag();
  return (
    <span className={slots.room()}>
      {children}
      {Object.values(statusWords).map((word) => (
        <span key={word} aria-hidden className={slots.word()}>
          <span className={root()}>{word}</span>
        </span>
      ))}
    </span>
  );
}

export function DataTable<R extends Row>({
  rows,
  columns,
  selectionText,
  cell,
  detail,
  actions,
}: DataTableProps<R>) {
  const selection = useSelection();
  // Only a table with actions is selectable; one without shows no
  // selection, even one the host starts with.
  const selectable = actions !== undefined;
  const selected: ReadonlySet<string> = new Set(
    selectable ? selection.selected : []
  );
  const buttons = cellsOf(actions);
  // A footer Button's action is running: the selection holds still until it
  // settles, so the rows it acts on are the rows shown ticked.
  const locked = buttons.some(
    (node) =>
      isValidElement<ButtonProps>(node) &&
      node.type === Button &&
      node.props.pending === true &&
      node.props.disabled !== true
  );

  const select = (next: ReadonlySet<string>) => {
    if (!locked) selection.select([...next]);
  };
  // The open row's id.
  const [open, setOpen] = useState<string | null>(null);
  const opened = detail && rows.find((row) => row.id === open);
  // The open-sheet render (ADR 0011): the table the test attribute names
  // opens its first row before the first paint, as a state it starts in,
  // with no View Transition. The rows-ticked render (ADR 0013) ticks every
  // row the same way.
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const first = rows[0];
    const at = root.current!;
    if (detail && first && namedBy(at, openDetailAttribute, detailAttribute)) {
      setOpen(first.id);
    }
    if (selectable && namedBy(at, tickRowsAttribute, actionsAttribute)) {
      selection.select(rows.map((row) => row.id));
    }
    // Only as the table first renders: once open or ticked, the sheet and
    // the rows are the person's.
  }, []);
  const openDetail = (id: string) => transitionSheet("open", () => setOpen(id));
  const closeDetail = () => transitionSheet("close", () => setOpen(null));

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

  // The columns whose cells are of one component, read from the first row's.
  const columnsOf = (component: ComponentType<never>) =>
    columns.map((_, i) => {
      const node = cells[0]?.[i];
      return isValidElement(node) && node.type === component;
    });
  const moneyColumns = columnsOf(Amount);
  const statusColumns = columnsOf(StatusTag);
  const chosen = rows.filter((row) => selected.has(row.id)).length;
  const all =
    chosen === 0 ? false : chosen === rows.length ? true : ("mixed" as const);

  // The footer's Buttons are disabled while no row is ticked. When that
  // disables the one that had focus, as a confirmed result clearing the
  // selection does, focus moves to the table, next to what was acted on
  // (ADR 0013). A browser may blur a Button as it's disabled, before this
  // runs, so the footer notes a blur of that kind.
  const disabled = chosen === 0;
  const table = useRef<HTMLTableElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const blurredAsDisabled = useRef(false);
  useLayoutEffect(() => {
    const had = blurredAsDisabled.current;
    blurredAsDisabled.current = false;
    if (!disabled || !footer.current) return;
    const focused = document.activeElement;
    const kept =
      focused instanceof HTMLElement &&
      footer.current.contains(focused) &&
      focused.matches(":disabled");
    const dropped = had && (!focused || focused === document.body);
    if (kept || dropped) table.current!.focus({ preventScroll: true });
  }, [disabled]);

  const slots = dataTable({ scrolls: rows.length > rowsInView });
  return (
    <>
      <div
        ref={root}
        data-component="DataTable"
        {...(detail && { [detailAttribute]: "" })}
        {...(selectable && { [actionsAttribute]: "" })}
        className={slots.root()}
      >
        <div className={slots.body()}>
          <table
            ref={table}
            // Focusable from script only, in a table with a footer.
            tabIndex={selectable ? -1 : undefined}
            className={slots.table()}
          >
            <thead>
              <tr className={slots.headerRow()}>
                {selectable && (
                  <th scope="col" className={slots.select()}>
                    <div className={slots.selector()}>
                      <Checkbox
                        label="Select all rows"
                        checked={all}
                        disabled={rows.length === 0}
                        locked={locked}
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
                    className={dataTable({ money: moneyColumns[i] }).header()}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => {
                const isSelected = selected.has(row.id);
                const each = dataTable({
                  selected: isSelected,
                  opens: !!detail,
                });
                const opens = detail && {
                  tabIndex: 0,
                  onClick: () => openDetail(row.id),
                  // Enter on the row itself, not on its checkbox.
                  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                    if (
                      event.key !== "Enter" ||
                      event.target !== event.currentTarget
                    )
                      return;
                    event.preventDefault();
                    openDetail(row.id);
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
                            locked={locked}
                            onCheckedChange={(on) => toggle(row.id, on)}
                          />
                        </div>
                      </td>
                    )}
                    {cells[r]!.map((node, i) => (
                      <td key={i} className={each.cell()}>
                        {statusColumns[i] ? (
                          <StatusRoom>{node}</StatusRoom>
                        ) : (
                          node
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selectable && (
          <div
            ref={footer}
            className={slots.footer()}
            onBlur={(event) => {
              blurredAsDisabled.current =
                event.relatedTarget === null &&
                event.target.matches(":disabled");
            }}
          >
            <p className={slots.count()}>
              {selectionText && selectedCount(selectionText, chosen)}
            </p>
            <div className={slots.buttons()}>
              {buttons.map((node) =>
                isValidElement<ButtonProps>(node) && node.type === Button
                  ? cloneElement(node, {
                      disabled: node.props.disabled === true || disabled,
                      followsSelection: true,
                    })
                  : node
              )}
            </div>
          </div>
        )}
      </div>
      {opened && <SheetHost onClose={closeDetail}>{detail(opened)}</SheetHost>}
    </>
  );
}
