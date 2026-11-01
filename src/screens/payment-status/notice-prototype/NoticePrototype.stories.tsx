/* eslint-disable -- PROTOTYPE: not a generated screen, so the screen rules do not apply. */
// PROTOTYPE, throwaway (prototype/inline-notice branch).
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoticePrototype } from "./NoticePrototype.tsx";

const meta = {
  title: "Prototypes/payment-status notice",
  component: NoticePrototype,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NoticePrototype>;

export default meta;

export const Playground: StoryObj<typeof meta> = {};
