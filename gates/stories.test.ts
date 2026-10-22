import { describe, expect, it } from "vitest";
import { renders, selectStories, shotName } from "./stories.ts";

const index = {
  entries: {
    "button--primary": {
      type: "story",
      id: "button--primary",
      title: "Button",
    },
    "button--docs": { type: "docs", id: "button--docs", title: "Button" },
    "library-buttongroup--default": {
      type: "story",
      id: "library-buttongroup--default",
      title: "Library/ButtonGroup",
    },
    "screens-payouts--empty": {
      type: "story",
      id: "screens-payouts--empty",
      title: "Screens/Payouts",
      tags: ["dev"],
    },
  },
};

describe("selectStories", () => {
  it("gates every story, and no docs entry, without a target", () => {
    expect(selectStories(index).map((story) => story.id)).toEqual([
      "button--primary",
      "library-buttongroup--default",
      "screens-payouts--empty",
    ]);
  });

  it("matches a target against the title's last segment only", () => {
    expect(selectStories(index, "Button").map((story) => story.id)).toEqual([
      "button--primary",
    ]);
    expect(selectStories(index, "Payouts").map((story) => story.id)).toEqual([
      "screens-payouts--empty",
    ]);
  });

  it("fails a target that matches nothing", () => {
    expect(() => selectStories(index, "Buton")).toThrow('"Buton"');
  });

  it("fails a build with no stories", () => {
    expect(() => selectStories({ entries: {} })).toThrow("no stories");
  });
});

describe("renders", () => {
  it("renders each story in every theme × density", () => {
    const all = renders(selectStories(index, "Button"));
    expect(all.map(shotName)).toEqual([
      "button--primary--light-admin",
      "button--primary--light-contractor",
      "button--primary--dark-admin",
      "button--primary--dark-contractor",
    ]);
  });
});
