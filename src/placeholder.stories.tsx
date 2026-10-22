import type { Meta, StoryObj } from "@storybook/react-vite";

// Stands in for a library component until the first one is built.
const meta = {
  title: "Placeholder",
  render: () => <p>Placeholder</p>,
} satisfies Meta;

export default meta;

export const Placeholder: StoryObj<typeof meta> = {};
