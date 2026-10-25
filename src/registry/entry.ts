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
  // Props only the code step sets, such as Button's pending from useAction
  // (ADR 0011). They stay in props, so the component's props type has them,
  // but the spec step never sees them and gate 1 rejects them on a UI spec
  // node like any prop the component doesn't take.
  codeOnly?: readonly string[];
  slots?: Record<string, Slot>;
};

// An entry whose codeOnly names only its own props. The narrowing lives here
// rather than in RegistryEntry, where `keyof` would keep a specific entry
// from widening to RegistryEntry.
type CodeOnlyOwnPropsEntry<
  N extends string,
  P extends z.ZodObject,
> = RegistryEntry<N, P> & { codeOnly?: readonly (keyof P["shape"] & string)[] };

export function defineEntry<const N extends string, P extends z.ZodObject>(
  entry: CodeOnlyOwnPropsEntry<N, P>
): CodeOnlyOwnPropsEntry<N, P> {
  for (const name of entry.codeOnly ?? []) {
    if (!Object.hasOwn(entry.props.shape, name)) {
      throw new Error(
        `${entry.name} marks "${name}" code-only, but has no such prop`
      );
    }
    // specProps omits code-only props, and Zod 4 can't omit() from an object
    // with a top-level refine, which reads the whole object.
    if (entry.props.def.checks?.length) {
      throw new Error(
        `${entry.name} marks "${name}" code-only, but its props have a refinement, which Zod can't keep once a prop is omitted`
      );
    }
  }
  return entry;
}

// The props a UI spec node may give: the entry's props without its
// code-only ones.
export function specProps(entry: RegistryEntry): z.ZodObject {
  if (!entry.codeOnly?.length) {
    return entry.props;
  }
  const omitted = Object.fromEntries(
    entry.codeOnly.map((name) => [name, true] as const)
  );
  // omit() types its mask against a known shape, which a RegistryEntry's
  // props don't have; defineEntry has already checked the names.
  return entry.props.omit(omitted as never);
}

// The component's props type, so the component and its entry can't drift.
export type PropsOf<E extends RegistryEntry> = z.infer<E["props"]>;
