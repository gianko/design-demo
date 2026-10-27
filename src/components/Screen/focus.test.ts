// keepingFocus moves focus to the element that took over the removed one's
// view transition name only when that element takes focus (ADR 0011, #244).
// A name can pass to an element that is no control and has no tabIndex, such
// as a bar's root or a row the Sheet closed back into; focusing it does
// nothing, so focus goes to the Screen instead of falling to the document.

import { afterEach, expect, it } from "vitest";
import { keepingFocus } from "./focus.ts";

afterEach(() => {
  document.body.replaceChildren();
});

function screenWith(html: string) {
  const main = document.createElement("main");
  main.dataset.component = "Screen";
  main.tabIndex = -1;
  main.innerHTML = html;
  document.body.append(main);
  return main;
}

it("lands on the Screen when the element carrying the name can't take focus", () => {
  const main = screenWith(
    '<div class="vt-action-result"><button>Pay</button></div>'
  );
  main.querySelector("button")!.focus();

  keepingFocus(() => {
    main.innerHTML = '<div class="vt-action-result">Paid</div>';
  })();

  expect(document.activeElement).toBe(main);
});

it("lands on the element carrying the name when it takes focus", () => {
  const main = screenWith(
    '<div class="vt-action-result"><button>Pay</button></div>'
  );
  main.querySelector("button")!.focus();

  keepingFocus(() => {
    main.innerHTML = '<div class="vt-action-result" tabindex="-1">Paid</div>';
  })();

  expect(document.activeElement).toBe(main.firstElementChild);
});
