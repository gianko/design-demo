import { createContext, useContext } from "react";

// Screen's one polite status region. It is in the DOM, empty, before any
// screen state is entered, because a region inserted with its copy already in
// it is announced by some screen-reader and browser pairs and not others. A
// library component that confirms an action's result (a live Text; P1's Toast,
// ADR 0011) hands its copy to `announce` instead of being a region itself.
// Outside a Screen there is no region, so nothing is announced.
export const AnnounceContext = createContext<(text: string) => void>(() => {});

export function useAnnounce() {
  return useContext(AnnounceContext);
}
