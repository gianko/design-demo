// The exempt component (lint/taste/config.ts): an Avatar may be fully
// rounded, though the same class anywhere else fails (no-pill.fail.tsx).
export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="inline-flex size-icon rounded-full bg-selected text-caption">
      {initials}
    </span>
  );
}
