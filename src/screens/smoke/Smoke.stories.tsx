// Written by `pnpm keep`: the default and one story per declared screen
// state, each with its fixture variant.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Smoke } from "./Smoke.tsx";

const meta = { title: "Screens/smoke", component: Smoke } satisfies Meta<
  typeof Smoke
>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
