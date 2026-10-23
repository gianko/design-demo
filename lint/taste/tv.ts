// The class lists a tailwind-variants `tv()` call puts on one element
// together. A slot's classes are its base plus one option of each variant
// and the compound variants and compound slots that option set matches, so a
// rule that needs two classes side by side (a transition and its duration)
// reads them per option set, not per string. Only what is written as
// literals counts; anything computed adds no classes.

import type { Rule } from "eslint";

// One string of classes, and the node to report a finding on.
export type ClassList = { text: string; node: Rule.Node };

// The class lists one slot gets under one option set, and that set, e.g.
// "size: md, open: false" (empty for a call without variants).
export type Render = { lists: ClassList[]; options: string };

type Node = Rule.Node;
type SlotLists = Map<string, ClassList[]>;
type Conditions = Map<string, string[]>;

// The renders of a `tv({...})` call, and every class list in them; null for
// any other call.
export function tvRenders(
  call: Node
): { renders: Render[]; lists: Set<Node> } | null {
  if (
    call.type !== "CallExpression" ||
    call.callee.type !== "Identifier" ||
    call.callee.name !== "tv" ||
    call.arguments[0]?.type !== "ObjectExpression"
  ) {
    return null;
  }
  const config = call.arguments[0] as Node;

  const base: SlotLists = new Map();
  add(base, "base", classLists(property(config, "base")));
  for (const [slot, value] of entries(property(config, "slots"))) {
    add(base, slot, classLists(value));
  }

  const defaults = new Set(
    entries(property(config, "defaultVariants")).map(([name]) => name)
  );
  // Each variant's options, as the value that picks it. `null` is no option
  // at all: a variant left unset with no default and no `false` option.
  const variants = entries(property(config, "variants")).map(
    ([name, value]) => {
      const options = new Map(
        entries(value).map(([option, lists]) => [option, slotLists(lists)])
      );
      const keys = [...options.keys()];
      const boolean = keys.every((key) => key === "true" || key === "false");
      const values: (string | null)[] = boolean ? ["true", "false"] : keys;
      if (!boolean && !defaults.has(name) && !options.has("false")) {
        values.push(null);
      }
      return { name, options, values };
    }
  );

  const compounds = [
    ...elements(property(config, "compoundVariants")).map((compound) => ({
      conditions: conditions(compound, ["class", "className"]),
      lists: slotLists(
        property(compound, "class") ?? property(compound, "className")
      ),
    })),
    ...elements(property(config, "compoundSlots")).map((compound) => {
      const lists = classLists(
        property(compound, "class") ?? property(compound, "className")
      );
      const slots = elements(property(compound, "slots")).flatMap((slot) =>
        slot.type === "Literal" ? [String(slot.value)] : []
      );
      return {
        conditions: conditions(compound, ["class", "className", "slots"]),
        lists: new Map(slots.map((slot) => [slot, lists])),
      };
    }),
  ];

  // Every option set: one value of each variant.
  let sets: Map<string, string | null>[] = [new Map()];
  for (const { name, values } of variants) {
    sets = sets.flatMap((set) =>
      values.map((value) => new Map(set).set(name, value))
    );
  }

  const renders = sets.flatMap((set) => {
    const applied: SlotLists[] = [
      base,
      ...variants.flatMap(({ name, options }) => {
        const value = set.get(name);
        const lists = value == null ? undefined : options.get(value);
        return lists ? [lists] : [];
      }),
      ...compounds
        .filter(({ conditions }) => matches(conditions, set))
        .map(({ lists }) => lists),
    ];
    const slots = new Set(applied.flatMap((lists) => [...lists.keys()]));
    const options = [...set]
      .map(([name, value]) => `${name}: ${value ?? "unset"}`)
      .join(", ");
    return [...slots].map((slot) => ({
      lists: applied.flatMap((lists) => lists.get(slot) ?? []),
      options,
    }));
  });

  const lists = new Set<Node>();
  for (const { lists: each } of renders) {
    for (const { node } of each) lists.add(node);
  }
  return { renders, lists };
}

// A compound's conditions match when each names the set's value, a `false`
// condition matching an unset variant too, as tailwind-variants does.
function matches(conditions: Conditions, set: Map<string, string | null>) {
  return [...conditions].every(([name, values]) => {
    const value = set.get(name);
    return value == null ? values.includes("false") : values.includes(value);
  });
}

function conditions(compound: Node, skip: string[]): Conditions {
  return new Map(
    entries(compound)
      .filter(([name]) => !skip.includes(name))
      .map(([name, value]) => [
        name,
        (value.type === "ArrayExpression" ? elements(value) : [value]).flatMap(
          (element) =>
            element.type === "Literal" ? [String(element.value)] : []
        ),
      ])
  );
}

// A variant option's or compound's classes: a string for the base slot, or
// an object of slots.
function slotLists(value: Node | undefined): SlotLists {
  if (value?.type !== "ObjectExpression") {
    return new Map([["base", classLists(value)]]);
  }
  return new Map(entries(value).map(([slot, v]) => [slot, classLists(v)]));
}

// The literal class strings in a class value: a string, a template literal's
// parts, or an array of them.
function classLists(value: Node | undefined): ClassList[] {
  if (!value) return [];
  if (value.type === "Literal") {
    return typeof value.value === "string"
      ? [{ text: value.value, node: value }]
      : [];
  }
  if (value.type === "TemplateLiteral") {
    return value.quasis.map((quasi) => ({
      text: quasi.value.cooked ?? quasi.value.raw,
      node: quasi as Node,
    }));
  }
  if (value.type === "ArrayExpression") {
    return elements(value).flatMap(classLists);
  }
  return [];
}

function add(lists: SlotLists, slot: string, more: ClassList[]) {
  lists.set(slot, [...(lists.get(slot) ?? []), ...more]);
}

// An object literal's properties by name, skipping spreads and computed keys.
function entries(object: Node | undefined): [string, Node][] {
  if (object?.type !== "ObjectExpression") return [];
  return object.properties.flatMap((p) => {
    if (p.type !== "Property" || p.computed) return [];
    const name =
      p.key.type === "Identifier"
        ? p.key.name
        : p.key.type === "Literal"
          ? String(p.key.value)
          : null;
    return name === null ? [] : [[name, p.value as Node]];
  });
}

function property(object: Node | undefined, name: string): Node | undefined {
  return entries(object).find(([key]) => key === name)?.[1];
}

function elements(array: Node | undefined): Node[] {
  if (array?.type !== "ArrayExpression") return [];
  return array.elements.flatMap((element) =>
    element && element.type !== "SpreadElement" ? [element as Node] : []
  );
}
