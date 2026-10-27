import { createContext, useContext } from "react";

// Whether a component renders inside an ActionBar: a failure Toast there is
// the bar's first row, and the bar is the one floating surface (#243).
export const InActionBar = createContext(false);

export function useInActionBar() {
  return useContext(InActionBar);
}
