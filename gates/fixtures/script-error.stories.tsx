import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";

// A render that otherwise passes every gate, with one script error after it
// mounts: an uncaught exception (pageerror) or a console error.
function Planted({ error }: { error: "page" | "console" }) {
  useEffect(() => {
    if (error === "page") {
      setTimeout(() => {
        throw new Error("planted page error");
      });
    } else {
      console.error("planted console error");
    }
  }, [error]);
  return (
    <div className="bg-page p-page">
      <p className="text-body text-ink">Script error</p>
    </div>
  );
}

const meta = {
  title: "GateFixtures/ScriptError",
  component: Planted,
} satisfies Meta<typeof Planted>;

export default meta;

export const PageError: StoryObj<typeof meta> = { args: { error: "page" } };

export const ConsoleError: StoryObj<typeof meta> = {
  args: { error: "console" },
};
