// An in-memory stand-in for the slice of Figma's Plugin API that the
// figma:sync-* and figma:walk-capture scripts touch, so their tests run
// without a Figma file. It throws where Figma was seen to throw in the
// spike: scopes on TIMING and EASING variables, an unknown mode, and a font
// that isn't loaded. Pages and layers are in fake-scene.ts.

import { fakeScene } from "./fake-scene.ts";

type Alias = { type: "VARIABLE_ALIAS"; id: string };
type Mode = { modeId: string; name: string };
type FontName = { family: string; style: string };
type Effect = {
  type: string;
  boundVariables?: Record<string, Alias>;
  [field: string]: unknown;
};

const scopeless = ["TIMING", "EASING"];

export function fakePluginApi(
  fonts: FontName[] = instrumentSans,
  {
    ignoreWritesTo = [],
    ignoreNodeWrites = [],
  }: {
    /** Variables whose setValueForMode silently keeps the old value. */
    ignoreWritesTo?: string[];
    /** Layer properties whose writes are silently dropped. */
    ignoreNodeWrites?: string[];
  } = {}
) {
  let nextId = 1;
  const id = (prefix: string) => `${prefix}:${nextId++}`;
  const collections: Collection[] = [];
  const variables: Variable[] = [];
  const textStyles: TextStyle[] = [];
  const effectStyles: EffectStyle[] = [];
  const loaded = new Set<string>();
  const fontKey = ({ family, style }: FontName) => `${family}\n${style}`;

  class Collection {
    readonly id = id("VariableCollectionId");
    modes: Mode[] = [{ modeId: id("mode"), name: "Mode 1" }];
    hiddenFromPublishing = false;
    constructor(public name: string) {}
    get variableIds() {
      return variables
        .filter((v) => v.variableCollectionId === this.id)
        .map((v) => v.id);
    }
    renameMode(modeId: string, name: string) {
      this.modes.find((mode) => mode.modeId === modeId)!.name = name;
    }
    addMode(name: string) {
      const modeId = id("mode");
      this.modes.push({ modeId, name });
      return modeId;
    }
    removeMode(modeId: string) {
      this.modes = this.modes.filter((mode) => mode.modeId !== modeId);
    }
    remove() {
      collections.splice(collections.indexOf(this), 1);
    }
  }

  class Variable {
    readonly id = id("VariableID");
    private values: Record<string, unknown> = {};
    private _scopes = ["ALL_SCOPES"];
    private syntax: Record<string, string> = {};
    constructor(
      public name: string,
      public variableCollectionId: string,
      public resolvedType: string
    ) {}
    get valuesByMode() {
      return structuredClone(this.values);
    }
    get scopes() {
      return [...this._scopes];
    }
    set scopes(scopes: string[]) {
      if (scopeless.includes(this.resolvedType)) {
        throw new Error(`in set_scopes: ${this.resolvedType} has no scopes`);
      }
      this._scopes = [...scopes];
    }
    get codeSyntax() {
      return { ...this.syntax };
    }
    setValueForMode(modeId: string, value: unknown) {
      const collection = collections.find(
        (c) => c.id === this.variableCollectionId
      )!;
      if (!collection.modes.some((mode) => mode.modeId === modeId)) {
        throw new Error(`in setValueForMode: unknown mode ${modeId}`);
      }
      const alias = value as Alias;
      if (
        alias?.type === "VARIABLE_ALIAS" &&
        !variables.some((v) => v.id === alias.id)
      ) {
        throw new Error(`in setValueForMode: no variable ${alias.id}`);
      }
      if (ignoreWritesTo.includes(this.name)) return;
      this.values[modeId] = structuredClone(value);
    }
    setVariableCodeSyntax(platform: string, value: string) {
      this.syntax[platform] = value;
    }
    removeVariableCodeSyntax(platform: string) {
      delete this.syntax[platform];
    }
    remove() {
      variables.splice(variables.indexOf(this), 1);
    }
  }

  class TextStyle {
    readonly id = id("S");
    name = "";
    private font: FontName = { family: "Inter", style: "Regular" };
    boundVariables: Record<string, Alias> = {};
    get fontName() {
      return { ...this.font };
    }
    set fontName(font: FontName) {
      if (!loaded.has(fontKey(font))) {
        throw new Error(`in set_fontName: load ${font.family} first`);
      }
      this.font = { ...font };
    }
    setBoundVariable(field: string, variable: Variable) {
      if (!loaded.has(fontKey(this.font))) {
        throw new Error(`in setBoundVariable: load ${this.font.family} first`);
      }
      this.boundVariables[field] = alias(variable);
    }
    remove() {
      textStyles.splice(textStyles.indexOf(this), 1);
    }
  }

  class EffectStyle {
    readonly id = id("S");
    name = "";
    private list: Effect[] = [];
    get effects() {
      return structuredClone(this.list);
    }
    set effects(effects: Effect[]) {
      this.list = structuredClone(effects);
    }
    remove() {
      effectStyles.splice(effectStyles.indexOf(this), 1);
    }
  }

  const alias = (variable: Variable): Alias => ({
    type: "VARIABLE_ALIAS",
    id: variable.id,
  });

  // A captured layer, as a figma:walk-capture script reads it: the fields
  // Figma reports in boundVariables, and the modes the layer pins.
  type Paint = {
    type: "SOLID";
    color: { r: number; g: number; b: number };
    opacity: number;
    boundVariables?: { color: Alias };
  };
  type SceneNode = {
    id: string;
    name: string;
    type: string;
    fills: Paint[] | typeof mixed;
    strokes: Paint[];
    boundVariables: Record<string, Alias | Alias[]>;
    explicitVariableModes: Record<string, string>;
    children?: SceneNode[];
  };
  // What Figma returns for a property that varies across a text node's ranges.
  const mixed = Symbol("figma.mixed");
  const literalPaint = (spec: LiteralPaint): Paint => {
    const { rgb, visible = true } = Array.isArray(spec) ? { rgb: spec } : spec;
    const [r, g, b, opacity = 1] = rgb;
    return {
      type: "SOLID",
      color: { r: r! / 255, g: g! / 255, b: b! / 255 },
      opacity,
      ...(visible ? {} : { visible }),
    };
  };
  const nodes = new Map<string, SceneNode>();

  function sceneNode(spec: NodeSpec): SceneNode {
    const variable = (name: string) => {
      const found = variables.find((v) => v.name === name);
      if (!found) throw new Error(`addNode: no variable ${name}`);
      return alias(found);
    };
    // A bound paint carries its alias, as Figma's do; a literal one doesn't.
    const paints = (field: "fills" | "strokes") => [
      ...[spec.bound?.[field] ?? []]
        .flat()
        .map((name): Paint => ({
          ...literalPaint([0, 0, 0]),
          boundVariables: { color: variable(name) },
        })),
      ...(spec.literal?.[field] ?? []).map(literalPaint),
    ];
    const node: SceneNode = {
      id: id("node"),
      name: spec.name,
      type: spec.type ?? "FRAME",
      fills: spec.mixedFills ? mixed : paints("fills"),
      strokes: paints("strokes"),
      boundVariables: Object.fromEntries(
        Object.entries(spec.bound ?? {}).map(([field, bound]) => [
          field,
          Array.isArray(bound) ? bound.map(variable) : variable(bound),
        ])
      ),
      explicitVariableModes: Object.fromEntries(
        Object.entries(spec.explicitModes ?? {}).map(([name, modeName]) => {
          const collection = collections.find((c) => c.name === name)!;
          const mode = collection.modes.find((m) => m.name === modeName)!;
          return [collection.id, mode.modeId];
        })
      ),
      ...(spec.type === "TEXT"
        ? {}
        : { children: (spec.children ?? []).map(sceneNode) }),
    };
    nodes.set(node.id, node);
    return node;
  }

  const scene = fakeScene({
    id,
    alias: (variable) => ({ type: "VARIABLE_ALIAS", id: variable.id }),
    resolve(bound) {
      let value: unknown = bound;
      while ((value as Alias)?.type === "VARIABLE_ALIAS") {
        const variable = variables.find((v) => v.id === (value as Alias).id)!;
        const collection = collections.find(
          (c) => c.id === variable.variableCollectionId
        )!;
        value = variable.valuesByMode[collection.modes[0]!.modeId];
      }
      return value;
    },
    fontLoaded: (font) => loaded.has(fontKey(font)),
    textStyle: (styleId) => textStyles.find((style) => style.id === styleId),
    effectStyle: (styleId) =>
      effectStyles.find((style) => style.id === styleId),
    ignoreNodeWrites,
  });

  const figma = {
    ...scene.api,
    // Spread would read the getters once; these stay live.
    get root() {
      return scene.api.root;
    },
    get currentPage() {
      return scene.api.currentPage;
    },
    mixed,
    getNodeByIdAsync: async (nodeId: string) => nodes.get(nodeId) ?? null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [...collections],
      getLocalVariablesAsync: async () => [...variables],
      getVariableByIdAsync: async (variableId: string) =>
        variables.find((v) => v.id === variableId) ?? null,
      getVariableCollectionByIdAsync: async (collectionId: string) =>
        collections.find((c) => c.id === collectionId) ?? null,
      createVariableCollection(name: string) {
        const collection = new Collection(name);
        collections.push(collection);
        return collection;
      },
      createVariable(name: string, collection: Collection, type: string) {
        const variable = new Variable(name, collection.id, type);
        variables.push(variable);
        return variable;
      },
      createVariableAlias: alias,
      setBoundVariableForPaint(
        paint: Record<string, unknown>,
        field: string,
        variable: Variable
      ) {
        return {
          ...structuredClone(paint),
          boundVariables: { [field]: alias(variable) },
        };
      },
      setBoundVariableForEffect(
        effect: Effect,
        field: string,
        variable: Variable
      ): Effect {
        return {
          ...structuredClone(effect),
          boundVariables: {
            ...effect.boundVariables,
            [field]: alias(variable),
          },
        };
      },
    },
    getLocalTextStylesAsync: async () => [...textStyles],
    getLocalEffectStylesAsync: async () => [...effectStyles],
    createTextStyle() {
      const style = new TextStyle();
      textStyles.push(style);
      return style;
    },
    createEffectStyle() {
      const style = new EffectStyle();
      effectStyles.push(style);
      return style;
    },
    listAvailableFontsAsync: async () =>
      fonts.map((fontName) => ({ fontName })),
    async loadFontAsync(font: FontName) {
      if (!fonts.some((f) => fontKey(f) === fontKey(font))) {
        throw new Error(`in loadFontAsync: no font ${font.family}`);
      }
      loaded.add(fontKey(font));
    },
  };

  /** Everything the file holds, for comparing before and after a run. */
  function state() {
    return structuredClone({
      collections: collections.map(
        ({ id, name, modes, hiddenFromPublishing }) => ({
          id,
          name,
          modes,
          hiddenFromPublishing,
        })
      ),
      variables: variables.map((v) => ({
        id: v.id,
        name: v.name,
        collection: v.variableCollectionId,
        type: v.resolvedType,
        values: v.valuesByMode,
        scopes: v.scopes,
        codeSyntax: v.codeSyntax,
      })),
      textStyles: textStyles.map(({ id, name, fontName, boundVariables }) => ({
        id,
        name,
        fontName,
        boundVariables,
      })),
      effectStyles: effectStyles.map(({ id, name, effects }) => ({
        id,
        name,
        effects,
      })),
      pages: scene.pages(),
    });
  }

  /** Adds a captured layer tree bound to variables by name; returns its root's ID. */
  function addNode(spec: NodeSpec): string {
    return sceneNode(spec).id;
  }

  return { figma, state, addNode };
}

export type FakePluginApi = ReturnType<typeof fakePluginApi>;

export type NodeSpec = {
  name: string;
  type?: "FRAME" | "TEXT";
  /** Collection name → mode name. */
  explicitModes?: Record<string, string>;
  /** Field → variable name; paint and text fields take a list. */
  bound?: Record<string, string | string[]>;
  literal?: Partial<Record<"fills" | "strokes", LiteralPaint[]>>;
  /** A text node whose ranges have different fills: `fills` is figma.mixed. */
  mixedFills?: true;
  children?: NodeSpec[];
};

/** An unbound solid paint: [r, g, b] 0–255 with an optional opacity, or hidden. */
type LiteralPaint = number[] | { rgb: number[]; visible: false };

const AsyncFunction = (async () => {}).constructor as new (
  ...args: string[]
) => (figma: unknown) => Promise<unknown>;

/** Runs one script the way use_figma does: its body, with `figma` in scope. */
export function runScript(code: string, file: FakePluginApi) {
  return new AsyncFunction("figma", code)(file.figma);
}

// Inter is what a new text layer starts in, as in Figma.
const instrumentSans: FontName[] = [
  ...["Regular", "Medium", "SemiBold", "Bold"].map((style) => ({
    family: "Instrument Sans",
    style,
  })),
  { family: "Inter", style: "Regular" },
];
