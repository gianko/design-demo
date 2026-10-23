import type { Meta, StoryObj } from "@storybook/react-vite";

// Stands in for a library component until the first one is built. It is
// painted with token classes only, so each theme × density combination differs.
const meta = {
  title: "Placeholder",
  render: () => (
    <div className="p-page">
      <div className="flex flex-col items-start gap-sm rounded-surface border border-line bg-surface p-page">
        <p className="text-body text-ink">Placeholder</p>
        <p className="text-caption text-ink-muted">
          Painted with token classes only.
        </p>
        <span className="flex h-control items-center rounded-control bg-accent px-control text-label text-on-accent">
          Accent
        </span>
      </div>
    </div>
  ),
} satisfies Meta;

export default meta;

export const Placeholder: StoryObj<typeof meta> = {};
