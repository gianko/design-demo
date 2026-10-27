import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  fixtureVariant,
  type FixtureData,
  type Operations,
  type OperationName,
  type VariantName,
} from "../../fixtures/fixtures.ts";
import { defaultState } from "./default-state.ts";

// Screen states change only through the library (ADR 0011). A generated
// screen holds no state of its own: `useScreenState` reads the current state
// and `useAction` runs a fixtures operation and enters the state it settles
// in, and every change runs inside `document.startViewTransition`. The state
// lives in the ScreenHost around the generated screen, so the screen's own
// hooks and the Screen it renders see the same one. The host also holds the
// fixture variant, whose data `useFixtureData` reads for bound props and
// operation arguments (ADR 0004), and the selection: the rows DataTable has
// ticked, which `useSelectedRows` reads for an action's argument. Given the
// UI spec's declared states, a confirmed action brings the data of the state
// it enters, so the statuses it changed change on screen (the stagger).

export { defaultState };

// `confirm` follows a confirmed result and is the only type `ease-settle`
// runs under; `fail` follows a failed one. An untyped change (DataTable
// selection) runs `base`, `standard`.
export type TransitionType = "confirm" | "fail";

type ScreenStateContext = {
  state: string;
  // How many times a state has been entered, the one it is in included, so
  // re-entering the same state (a retry that fails again) is still a change.
  entries: number;
  // Enters `name`; `alongside` runs in the same update, so the transition's
  // old snapshot holds what it undoes (a Button's pending).
  enter: (name: string, type?: TransitionType, alongside?: () => void) => void;
  data: FixtureData;
  operations: Operations;
  // The ids of the ticked rows, in the order they were ticked.
  selected: readonly string[];
  // Sets the selection, entering `name` in the same update when given.
  select: (ids: readonly string[], name?: string) => void;
};

const HostContext = createContext<ScreenStateContext | null>(null);

// The screen state a host starts in, and the fixture variant the screen
// renders and its operations settle under: a UI spec's declared state. A
// story names one in `parameters.screenState`, which
// generator/screen-stories.ts writes and the Storybook preview hands to
// ScreenHost; this is the one shape all three hold to.
export type HostedState = { name: string; fixture: VariantName };

// `screenStates` is the UI spec's declared states, which a kept screen's
// stories carry for each of them, so a confirmed action shows the data of the
// state it enters.
// `openSheet` is the open-sheet render's (ADR 0011): which of the screen's
// DataTables with a detail slot, counted from 0 in document order, starts
// with its first row's Sheet open. The preview sets DataTable's
// `openDetailAttribute` around the story from it.
export type ScreenStateParameters = {
  screenState?: HostedState;
  screenStates?: readonly HostedState[];
  openSheet?: number;
};

export type ScreenHostProps = {
  // The default state, in the default variant, when not given.
  screenState?: HostedState;
  // The UI spec's declared states. A confirmed action has changed the data,
  // so the state it enters shows its own variant's data, in the same update
  // as the selection clears; the operations stay the starting variant's. A
  // failed action, and an untyped change, keep the data. Without them, or for
  // a state they don't name, the data never changes.
  states?: readonly HostedState[];
  // The selection the host starts with, such as a story's every row; the
  // fixture variant's when not given.
  selected?: readonly string[];
  children?: ReactNode;
};

const noStates: readonly HostedState[] = [];

// What hosts a generated screen: a story, the gate harness or an app. It
// holds the screen state, the fixture variant and the selection.
export function ScreenHost({
  screenState,
  states = noStates,
  selected: startSelected,
  children,
}: ScreenHostProps) {
  const initial = screenState?.name ?? defaultState;
  const variant = screenState?.fixture ?? "default";
  const fixture = useMemo(() => fixtureVariant(variant), [variant]);
  const { operations } = fixture;
  const [{ state, entries, selected, shown }, setEntered] = useState(() => ({
    state: initial,
    entries: 0,
    selected: startSelected ?? fixture.selected,
    // The variant whose data the screen shows.
    shown: variant,
  }));
  const data = useMemo(() => fixtureVariant(shown).data, [shown]);
  const enter = useCallback(
    (name: string, type?: TransitionType, alongside?: () => void) => {
      const update = () =>
        flushSync(() => {
          // A confirmed action has acted on the selection, so it clears in
          // the same update, and has changed the data, so the state it
          // enters shows its own variant's; a failed one keeps both for a
          // retry.
          const confirmed = type === "confirm";
          const entered = confirmed
            ? states.find((each) => each.name === name)
            : undefined;
          setEntered((last) => ({
            state: name,
            entries: last.entries + 1,
            selected: confirmed ? [] : last.selected,
            shown: entered?.fixture ?? last.shown,
          }));
          alongside?.();
        });
      if (typeof document.startViewTransition !== "function") {
        update();
        return;
      }
      document.startViewTransition({ update, types: type ? [type] : [] });
    },
    [states]
  );
  const select = useCallback(
    (ids: readonly string[], name?: string) => {
      const setSelected = () =>
        setEntered((last) => ({ ...last, selected: ids }));
      if (name === undefined) setSelected();
      else enter(name, undefined, setSelected);
    },
    [enter]
  );
  const value = useMemo(
    () => ({ state, entries, enter, data, operations, selected, select }),
    [state, entries, enter, data, operations, selected, select]
  );
  return <HostContext value={value}>{children}</HostContext>;
}

function useHost(hook: string) {
  const host = useContext(HostContext);
  if (!host) {
    throw new Error(
      `${hook} needs a ScreenHost around the screen, which holds its screen state, fixture variant and selection.`
    );
  }
  return host;
}

// The current screen state, and `enter(name)` to change it through a View
// Transition.
export function useScreenState() {
  const { state, enter } = useHost("useScreenState");
  return { state, enter: (name: string) => enter(name) };
}

// The data of the fixture variant the host renders, or of the state a
// confirmed action entered: what a UI spec's
// `{ "bind": "<path>" }` props and its operations' arguments read.
export function useFixtureData(): FixtureData {
  return useHost("useFixtureData").data;
}

// The ids of the rows ticked in the screen's DataTable: what an action such
// as payInvoices acts on.
export function useSelectedRows(): string[] {
  const { selected } = useHost("useSelectedRows");
  return useMemo(() => [...selected], [selected]);
}

// DataTable's read and write of the selection: `select(ids, name)` changes
// it, entering `name` in the same update when given.
export function useSelection() {
  const { selected, select } = useHost("useSelection");
  return { selected, select };
}

// Screen's own read of the state, for its data attribute. A Screen outside a
// host never changes state, so it is in the default one.
export function useCurrentScreenState() {
  return useContext(HostContext)?.state ?? defaultState;
}

// Changes each time a screen state is entered, the same one again included,
// so a live Text announces each entry. Outside a host nothing is entered.
export function useStateEntry() {
  return useContext(HostContext)?.entries ?? 0;
}

export type Action<N extends OperationName> = {
  // Runs the operation, unless it is already running.
  run: (...args: Parameters<Operations[N]>) => void;
  // True from `run` until the operation settles; its Button shows pending.
  pending: boolean;
};

// Runs one of the fixtures module's operations and, when it settles, enters
// `to.success` through a `confirm` transition or `to.failure` through a
// `fail` one.
export function useAction<N extends OperationName>(
  operation: N,
  to: { success: string; failure: string }
): Action<N> {
  const { enter, operations } = useHost("useAction");
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const { success, failure } = to;
  const run = useCallback(
    (...args: Parameters<Operations[N]>) => {
      if (running.current) return;
      running.current = true;
      setPending(true);
      const settle = (state: string, type: TransitionType) => {
        running.current = false;
        enter(state, type, () => setPending(false));
      };
      const call = operations[operation] as (
        ...args: Parameters<Operations[N]>
      ) => Promise<void>;
      call(...args).then(
        () => settle(success, "confirm"),
        () => settle(failure, "fail")
      );
    },
    [operations, operation, enter, success, failure]
  );
  return { run, pending };
}
