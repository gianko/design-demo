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

// Screen states change only through the library (ADR 0011). A generated
// screen holds no state of its own: `useScreenState` reads the current state
// and `useAction` runs a fixtures operation and enters the state it settles
// in, and every change runs inside `document.startViewTransition`. The state
// lives in the ScreenHost around the generated screen, so the screen's own
// hooks and the Screen it renders see the same one. The host also holds the
// fixture variant, whose data `useFixtureData` reads for bound props and
// operation arguments (ADR 0004).

export const defaultState = "default";

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
};

const HostContext = createContext<ScreenStateContext | null>(null);

export type ScreenHostProps = {
  // The fixture variant the screen renders, and its operations settle under.
  variant?: VariantName;
  // The screen state it starts in.
  state?: string;
  children?: ReactNode;
};

// What hosts a generated screen: a story, the gate harness or an app. It
// holds the screen state and the fixture variant.
export function ScreenHost({
  variant = "default",
  state: initial = defaultState,
  children,
}: ScreenHostProps) {
  const [{ state, entries }, setEntered] = useState({
    state: initial,
    entries: 0,
  });
  const { data, operations } = useMemo(
    () => fixtureVariant(variant),
    [variant]
  );
  const enter = useCallback(
    (name: string, type?: TransitionType, alongside?: () => void) => {
      const update = () =>
        flushSync(() => {
          setEntered((last) => ({ state: name, entries: last.entries + 1 }));
          alongside?.();
        });
      if (typeof document.startViewTransition !== "function") {
        update();
        return;
      }
      document.startViewTransition({ update, types: type ? [type] : [] });
    },
    []
  );
  const value = useMemo(
    () => ({ state, entries, enter, data, operations }),
    [state, entries, enter, data, operations]
  );
  return <HostContext value={value}>{children}</HostContext>;
}

function useHost(hook: string) {
  const host = useContext(HostContext);
  if (!host) {
    throw new Error(
      `${hook} needs a ScreenHost around the screen, which holds its screen state and fixture variant.`
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

// The data of the fixture variant the host renders: what a UI spec's
// `{ "bind": "<path>" }` props and its operations' arguments read.
export function useFixtureData(): FixtureData {
  return useHost("useFixtureData").data;
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
