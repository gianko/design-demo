// What every *.registry.ts entry is built from (ADR 0004). This module stays
// free of Node built-ins so stories can import an entry.
import { z } from "zod";

type HasVariants = { variants: Record<string, Record<string, unknown>> };

// A variant's options as a Zod enum, read from the component's own tv()
// config, so the registry can't offer an option the component doesn't style.
export function variantEnum<
  C extends HasVariants,
  K extends keyof C["variants"] & string,
>(component: C, key: K) {
  const options = Object.keys(component.variants[key] ?? {});
  if (options.length === 0) {
    throw new Error(`tv() config has no options for variant "${key}"`);
  }
  if (options.every((option) => option === "true" || option === "false")) {
    throw new Error(
      `"${key}" is a boolean variant; give it a z.boolean() prop`
    );
  }
  return z.enum(options as [keyof C["variants"][K] & string]);
}

export type Slot = {
  // Component names this slot accepts; any registered component when absent.
  allow?: readonly string[];
};

export type RegistryEntry<
  N extends string = string,
  P extends z.ZodObject = z.ZodObject,
> = {
  name: N;
  // One line telling the spec step when to reach for this component.
  use: string;
  props: P;
  slots?: Record<string, Slot>;
};

export function defineEntry<const N extends string, P extends z.ZodObject>(
  entry: RegistryEntry<N, P>
): RegistryEntry<N, P> {
  return entry;
}

// The component's props type, so the component and its entry can't drift.
export type PropsOf<E extends RegistryEntry> = z.infer<E["props"]>;
