import { readFile } from "node:fs/promises";
import { afterEach, beforeAll, expect, it } from "vitest";

const captureScript = "https://mcp.figma.com/mcp/html-to-design/capture.js";

let head: string;

beforeAll(async () => {
  head = await readFile(`${import.meta.dirname}/preview-head.html`, "utf8");
});

afterEach(() => {
  document.head.innerHTML = "";
  location.hash = "";
});

/** Puts the preview head into the page the way Storybook does, scripts run. */
function loadHead() {
  const template = document.createElement("template");
  template.innerHTML = head;
  for (const node of template.content.childNodes) {
    if (node instanceof HTMLScriptElement && !node.src) {
      new Function(node.text)();
    } else {
      document.head.append(node.cloneNode(true));
    }
  }
}

const capture = () =>
  document.head.querySelector(`script[src="${captureScript}"]`);

// The gates abort every request that leaves Storybook, so a capture script
// on an ordinary render would fail every story on a console error.
it("loads nothing outside a capture", () => {
  loadHead();
  expect(capture()).toBeNull();
});

it("loads Figma's capture script when the URL asks for a capture", () => {
  location.hash = "#figmacapture=abc&figmadelay=1000";
  loadHead();
  expect(capture()).not.toBeNull();
});
