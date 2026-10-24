// An in-memory stand-in for the slice of Figma's Plugin API that a
// figma:sync-tokens script touches, so its tests run without a Figma file.
// It throws where Figma was seen to throw in the spike: scopes on TIMING and
// EASING variables, an unknown mode, and a font that isn't loaded.

type Alias = { type: "VARIABLE_ALIAS"; id: string };
type Mode = { modeId: string; name: string };
type FontName = { family: string; style: string };
type Effect = {
  type: string;
  boundVariables?: Record<string, Alias>;
  [field: string]: unknown;
};

const scopeless = ["TIMING", "EASING"];

export function fakePluginApi(fonts: FontName[] = instrumentSans) {
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

  const figma = {
    variables: {
      getLocalVariableCollectionsAsync: async () => [...collections],
      getLocalVariablesAsync: async () => [...variables],
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
    });
  }

  return { figma, state };
}

export type FakePluginApi = ReturnType<typeof fakePluginApi>;

const instrumentSans: FontName[] = [
  "Regular",
  "Medium",
  "SemiBold",
  "Bold",
].map((style) => ({ family: "Instrument Sans", style }));
