import type { Meta, StoryObj } from "@storybook/react-vite";

// A sweep that runs while idle, next to a control. Eased and Instant differ
// only in whether the control eases its hover colour, so their mid-animation
// shots match unless the shot catches the control mid-transition.
const meta = {
  title: "GateFixtures/IdleAnimation",
  tags: ["animates-while-idle"],
  args: { eased: false },
  render: ({ eased }) => (
    <div className="flex flex-col items-start gap-sm bg-page p-page">
      <button
        className={`h-control rounded-control bg-surface px-control text-label text-ink hover:bg-accent ${eased ? "transition-colors duration-loop ease-linear" : ""}`}
      >
        Pending
      </button>
      <div className="h-control w-full overflow-hidden bg-surface">
        <div className="h-control w-full animate-progress-sweep bg-accent" />
      </div>
    </div>
  ),
} satisfies Meta<{ eased: boolean }>;

export default meta;

export const Instant: StoryObj<typeof meta> = {};

export const Eased: StoryObj<typeof meta> = { args: { eased: true } };
