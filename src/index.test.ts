// A generated screen imports everything through the barrel (ADR 0002), so the
// hooks it changes screen state with (ADR 0011) and reads its bound data and
// selection with (ADR 0004, ADR 0011), and the host its stories render it in,
// are exported from there.

import { expect, it } from "vitest";
import * as library from "./index.ts";

it.each([
  "useScreenState",
  "useAction",
  "useFixtureData",
  "useSelectedRows",
  "ScreenHost",
])("exports %s from the library barrel", (name) => {
  expect(library).toHaveProperty(name, expect.any(Function));
});
