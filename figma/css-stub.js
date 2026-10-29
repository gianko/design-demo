// figma:sync-components reads each component's tv() config from its .tsx
// file, and DataTable's file imports its stylesheet, which only Vite can
// load. Run with `tsx --import ./figma/css-stub.js`, Node loads a .css
// import as an empty module: the frames read only what tv() gives.

import { register } from "node:module";

const hooks = `export async function load(url, context, next) {
  if (new URL(url).pathname.endsWith(".css")) {
    return { format: "module", source: "", shortCircuit: true };
  }
  return next(url, context);
}`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`);
