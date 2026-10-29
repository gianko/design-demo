// The pages and layers of the fake Plugin API (fake-plugin-api.ts): enough of
// Figma's frames, components, component sets, text and SVG vectors for a
// figma:sync-components script to build and diff a set. Auto layout hugs
// its children or fills what a growing child is left, min and max limits
// clamp, a bound length takes its variable's value, and it throws
// where Figma does: text written before its font loads, an absolute child
// outside auto layout, a paint colour with alpha, and combining anything
// but components.

type Alias = { type: "VARIABLE_ALIAS"; id: string };
type FontName = { family: string; style: string };
type Paint = {
  type: string;
  color: Record<string, number>;
  opacity?: number;
  visible?: boolean;
  boundVariables?: { color?: Alias };
};

export type SceneDeps = {
  id: (prefix: string) => string;
  /** A bound variable's value in its collection's first mode, aliases followed. */
  resolve: (alias: Alias) => unknown;
  alias: (variable: { id: string }) => Alias;
  fontLoaded: (font: FontName) => boolean;
  textStyle: (id: string) => { fontName: FontName } | undefined;
  effectStyle: (id: string) => { effects: unknown[] } | undefined;
  /** Node properties whose writes are silently dropped. */
  ignoreNodeWrites: string[];
  /** What Figma returns for a property that varies, such as a stroke's sides. */
  mixed: symbol;
};

const numberFields = [
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "itemSpacing",
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
] as const;
// A frame's size limits: null, none, until something sets or binds them.
const limitFields = ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const;

const white: Paint = { type: "SOLID", color: { r: 1, g: 1, b: 1 } };
const black: Paint = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };

function checkPaints(paints: Paint[]) {
  for (const paint of paints) {
    if ("a" in paint.color) {
      throw new Error("in set_fills: Unrecognized key(s) in object: 'a'");
    }
  }
  return structuredClone(paints);
}

export function fakeScene(deps: SceneDeps) {
  const { id } = deps;

  class Base {
    readonly id = id("node");
    name = "";
    parent: Container | null = null;
    x = 0;
    y = 0;
    layoutPositioning_ = "AUTO";
    layoutGrow = 0;
    private _constraints = { horizontal: "MIN", vertical: "MIN" };
    private data: Record<string, string> = {};
    constructor(readonly type: string) {}
    getSharedPluginData(namespace: string, key: string) {
      return this.data[`${namespace}\n${key}`] ?? "";
    }
    setSharedPluginData(namespace: string, key: string, value: string) {
      this.data[`${namespace}\n${key}`] = value;
    }
    get layoutPositioning() {
      return this.layoutPositioning_;
    }
    set layoutPositioning(value: string) {
      const parent = this.parent as Frame | null;
      if (value === "ABSOLUTE" && (parent?.layoutMode ?? "NONE") === "NONE") {
        throw new Error(
          "in set_layoutPositioning: node must be a child of an auto-layout frame"
        );
      }
      this.layoutPositioning_ = value;
    }
    get constraints() {
      return { ...this._constraints };
    }
    set constraints(value: { horizontal: string; vertical: string }) {
      this._constraints = { ...value };
    }
    remove() {
      if (!this.parent) return;
      this.parent.children.splice(
        this.parent.children.indexOf(this as never),
        1
      );
      this.parent = null;
    }
    get width(): number {
      return 0;
    }
    get height(): number {
      return 0;
    }
  }

  class Container extends Base {
    children: (Frame | Text | Vector)[] = [];
    appendChild(node: Frame | Text | Vector) {
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
    insertChild(index: number, node: Frame | Text | Vector) {
      node.remove();
      node.parent = this;
      this.children.splice(index, 0, node);
    }
  }

  class Page extends Container {
    constructor() {
      super("PAGE");
    }
  }

  class Frame extends Container {
    layoutMode = "NONE";
    primaryAxisAlignItems = "MIN";
    counterAxisAlignItems = "MIN";
    primaryAxisSizingMode = "AUTO";
    counterAxisSizingMode = "AUTO";
    clipsContent = true;
    strokeTopWeight = 1;
    strokeRightWeight = 1;
    strokeBottomWeight = 1;
    strokeLeftWeight = 1;
    description = "";
    effectStyleId = "";
    private _effects: unknown[] = [];
    private _fills: Paint[] = [white];
    private _strokes: Paint[] = [];
    private bound: Record<string, Alias> = {};
    private numbers: Record<string, number> = {};
    limits: Record<string, number | null> = Object.fromEntries(
      limitFields.map((field) => [field, null])
    );
    private fixed = { width: 100, height: 100 };

    get strokeWeights() {
      return [
        this.strokeTopWeight,
        this.strokeRightWeight,
        this.strokeBottomWeight,
        this.strokeLeftWeight,
      ];
    }
    /** One weight for every side, or figma.mixed while they differ. */
    get strokeWeight(): number | symbol {
      const [top, ...rest] = this.strokeWeights;
      return rest.every((weight) => weight === top) ? top! : deps.mixed;
    }
    set strokeWeight(weight: number) {
      this.strokeTopWeight = weight;
      this.strokeRightWeight = weight;
      this.strokeBottomWeight = weight;
      this.strokeLeftWeight = weight;
    }
    get boundVariables() {
      return structuredClone(this.bound);
    }
    setBoundVariable(field: string, variable: { id: string } | null) {
      if (!variable) {
        delete this.bound[field];
        return;
      }
      const alias = deps.alias(variable);
      this.bound[field] = alias;
      if ((numberFields as readonly string[]).includes(field)) {
        this.numbers[field] = deps.resolve(alias) as number;
      }
      if ((limitFields as readonly string[]).includes(field)) {
        this.limits[field] = deps.resolve(alias) as number;
      }
    }
    number(field: string) {
      return this.numbers[field] ?? 0;
    }
    setNumber(field: string, value: number) {
      delete this.bound[field];
      this.numbers[field] = value;
    }
    get fills() {
      return structuredClone(this._fills);
    }
    set fills(paints: Paint[]) {
      this._fills = checkPaints(paints);
    }
    get strokes() {
      return structuredClone(this._strokes);
    }
    set strokes(paints: Paint[]) {
      this._strokes = checkPaints(paints);
    }
    get effects() {
      return structuredClone(this._effects);
    }
    set effects(effects: unknown[]) {
      this.effectStyleId = "";
      this._effects = structuredClone(effects);
    }
    async setEffectStyleIdAsync(styleId: string) {
      const style = deps.effectStyle(styleId);
      if (styleId && !style) throw new Error(`no effect style ${styleId}`);
      this.effectStyleId = styleId;
      this._effects = structuredClone(style?.effects ?? []);
    }
    get width() {
      return this.length("width");
    }
    get height() {
      return this.length("height");
    }
    private length(field: "width" | "height"): number {
      const [min, max] =
        field === "width"
          ? [this.limits.minWidth, this.limits.maxWidth]
          : [this.limits.minHeight, this.limits.maxHeight];
      const length = this.unlimited(field);
      return Math.min(max ?? Infinity, Math.max(min ?? 0, length));
    }
    private unlimited(field: "width" | "height"): number {
      const bound = this.bound[field];
      if (bound) return deps.resolve(bound) as number;
      const parent = this.parent;
      if (this.layoutGrow === 1 && parent instanceof Frame) {
        const along = parent.layoutMode === "HORIZONTAL" ? "width" : "height";
        const filled = along === field ? parent.fillFor(this, field) : null;
        if (filled !== null) return filled;
      }
      if (this.layoutMode !== "NONE") {
        const primary =
          (this.layoutMode === "HORIZONTAL") === (field === "width");
        const mode = primary
          ? this.primaryAxisSizingMode
          : this.counterAxisSizingMode;
        if (mode === "AUTO") return this.hug(field, primary);
      }
      return this.fixed[field];
    }
    /** What a child that fills this frame along `field` takes, or null while it hugs. */
    fillFor(child: Base, field: "width" | "height"): number | null {
      if (this.layoutMode === "NONE") return null;
      const primary =
        (this.layoutMode === "HORIZONTAL") === (field === "width");
      const mode = primary
        ? this.primaryAxisSizingMode
        : this.counterAxisSizingMode;
      if (mode === "AUTO" && !this.bound[field]) return null;
      const padding =
        field === "width"
          ? this.number("paddingLeft") + this.number("paddingRight")
          : this.number("paddingTop") + this.number("paddingBottom");
      const inner = this[field] - padding;
      if (!primary) return inner;
      const flow = this.children.filter(
        (node) => node.layoutPositioning !== "ABSOLUTE"
      );
      const others = flow
        .filter((node) => node !== child)
        .reduce((sum, node) => sum + node[field], 0);
      return (
        inner -
        others -
        this.number("itemSpacing") * Math.max(0, flow.length - 1)
      );
    }
    private hug(field: "width" | "height", primary: boolean) {
      const flow = this.children.filter(
        (child) => child.layoutPositioning !== "ABSOLUTE"
      );
      const lengths = flow.map((child) => child[field]);
      const padding =
        field === "width"
          ? this.number("paddingLeft") + this.number("paddingRight")
          : this.number("paddingTop") + this.number("paddingBottom");
      const content = primary
        ? lengths.reduce((sum, length) => sum + length, 0) +
          this.number("itemSpacing") * Math.max(0, flow.length - 1)
        : Math.max(0, ...lengths);
      return content + padding;
    }
    resize(width: number, height: number) {
      delete this.bound.width;
      delete this.bound.height;
      this.fixed = { width, height };
      if (this.layoutMode !== "NONE") {
        this.primaryAxisSizingMode = "FIXED";
        this.counterAxisSizingMode = "FIXED";
      }
    }
    resizeWithoutConstraints(width: number, height: number) {
      this.fixed = { width, height };
    }
  }
  for (const field of limitFields) {
    Object.defineProperty(Frame.prototype, field, {
      get(this: Frame) {
        return this.limits[field];
      },
      set(this: Frame, value: number | null) {
        this.setBoundVariable(field, null);
        this.limits[field] = value;
      },
    });
  }
  for (const field of numberFields) {
    Object.defineProperty(Frame.prototype, field, {
      get(this: Frame) {
        return this.number(field);
      },
      set(this: Frame, value: number) {
        this.setNumber(field, value);
      },
    });
  }

  class Text extends Base {
    private _characters = "";
    fontName: FontName = { family: "Inter", style: "Regular" };
    textStyleId = "";
    textAutoResize = "WIDTH_AND_HEIGHT";
    textAlignHorizontal = "LEFT";
    private _fills: Paint[] = [black];
    private sizing = "HUG";
    constructor() {
      super("TEXT");
    }
    get layoutSizingHorizontal() {
      return this.sizing;
    }
    set layoutSizingHorizontal(value: string) {
      const parent = this.parent as Frame | null;
      if (value === "FILL" && (parent?.layoutMode ?? "NONE") === "NONE") {
        throw new Error(
          "in set_layoutSizingHorizontal: FILL can only be set on children of auto-layout frames"
        );
      }
      this.sizing = value;
    }
    get characters() {
      return this._characters;
    }
    set characters(text: string) {
      if (!deps.fontLoaded(this.fontName)) {
        throw new Error(
          `in set_characters: Cannot write to node with unloaded font "${this.fontName.family} ${this.fontName.style}"`
        );
      }
      if (deps.ignoreNodeWrites.includes("characters")) return;
      this._characters = text;
    }
    async setTextStyleIdAsync(styleId: string) {
      const style = deps.textStyle(styleId);
      if (!style) throw new Error(`no text style ${styleId}`);
      if (!deps.fontLoaded(style.fontName)) {
        throw new Error(
          `in setTextStyleIdAsync: load ${style.fontName.family} ${style.fontName.style} first`
        );
      }
      this.fontName = { ...style.fontName };
      this.textStyleId = styleId;
    }
    get fills() {
      return structuredClone(this._fills);
    }
    set fills(paints: Paint[]) {
      this._fills = checkPaints(paints);
    }
    get width(): number {
      const parent = this.parent;
      if (this.sizing === "FILL" && parent instanceof Frame) {
        return parent.fillFor(this, "width") ?? this._characters.length * 8;
      }
      return this._characters.length * 8;
    }
    get height() {
      return 20;
    }
  }

  // A path createNodeFromSvg drew. Its paths keep the SVG's own data.
  class Vector extends Base {
    strokeWeight = 1;
    vectorPaths: { windingRule: string; data: string }[] = [];
    private _fills: Paint[] = [];
    private _strokes: Paint[] = [];
    private size = { width: 0, height: 0 };
    constructor() {
      super("VECTOR");
    }
    get fills() {
      return structuredClone(this._fills);
    }
    set fills(paints: Paint[]) {
      this._fills = checkPaints(paints);
    }
    get strokes() {
      return structuredClone(this._strokes);
    }
    set strokes(paints: Paint[]) {
      this._strokes = checkPaints(paints);
    }
    get width() {
      return this.size.width;
    }
    get height() {
      return this.size.height;
    }
    resize(width: number, height: number) {
      this.size = { width, height };
    }
    // As the Scale tool: its stroke scales with it.
    rescale(scale: number) {
      if (scale < 0.01) throw new Error("in rescale: scale must be >= 0.01");
      this.size = {
        width: this.size.width * scale,
        height: this.size.height * scale,
      };
      this.strokeWeight *= scale;
    }
  }

  const attribute = (tag: string, name: string) =>
    new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

  const pages: Page[] = [new Page()];
  pages[0]!.name = "Page 1";
  let current = pages[0]!;

  const api = {
    root: {
      get children() {
        return [...pages];
      },
    },
    get currentPage() {
      return current;
    },
    async setCurrentPageAsync(page: Page) {
      current = page;
    },
    createPage() {
      const page = new Page();
      pages.push(page);
      return page;
    },
    createFrame() {
      const frame = new Frame("FRAME");
      current.appendChild(frame);
      return frame;
    },
    createComponent() {
      const component = new Frame("COMPONENT");
      current.appendChild(component);
      return component;
    },
    createText() {
      const text = new Text();
      current.appendChild(text);
      return text;
    },
    // A frame the SVG's size, one vector per path, painted black where the
    // SVG paints at all, as currentColor comes in.
    createNodeFromSvg(svg: string) {
      const root = /<svg[^>]*>/.exec(svg)?.[0];
      if (!root) throw new Error("in createNodeFromSvg: Failed to parse SVG");
      const box = (attribute(root, "viewBox") ?? "0 0 0 0").split(/\s+/);
      const width = Number(attribute(root, "width") ?? box[2]);
      const height = Number(attribute(root, "height") ?? box[3]);
      const frame = new Frame("FRAME");
      current.appendChild(frame);
      frame.resize(width, height);
      for (const [tag] of svg.matchAll(/<path[^>]*>/g)) {
        const vector = new Vector();
        const paint = (name: string) =>
          attribute(tag, name) ?? attribute(root, name);
        vector.vectorPaths = [
          { windingRule: "NONZERO", data: attribute(tag, "d") ?? "" },
        ];
        vector.fills = paint("fill") === "none" ? [] : [black];
        const stroke = paint("stroke");
        vector.strokes = stroke && stroke !== "none" ? [black] : [];
        vector.strokeWeight = Number(paint("stroke-width") ?? 1);
        vector.resize(width, height);
        frame.appendChild(vector);
      }
      return frame;
    },
    combineAsVariants(nodes: Frame[], parent: Container) {
      if (!nodes.length || nodes.some((node) => node.type !== "COMPONENT")) {
        throw new Error(
          "in combineAsVariants: Expected an array of components"
        );
      }
      const set = new Frame("COMPONENT_SET");
      parent.appendChild(set);
      for (const node of nodes) set.appendChild(node);
      return set;
    },
  };

  function dump(node: Base): unknown {
    const base = {
      id: node.id,
      type: node.type,
      name: node.name,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      layoutPositioning: node.layoutPositioning,
      constraints: node.constraints,
      generator: node.getSharedPluginData("dill", "generator"),
      layoutGrow: node.layoutGrow,
    };
    if (node instanceof Vector) {
      return {
        ...base,
        vectorPaths: node.vectorPaths,
        fills: node.fills,
        strokes: node.strokes,
        strokeWeight: node.strokeWeight,
        drawn: node.getSharedPluginData("dill", "svg"),
      };
    }
    if (node instanceof Text) {
      return {
        ...base,
        characters: node.characters,
        fontName: node.fontName,
        textStyleId: node.textStyleId,
        textAutoResize: node.textAutoResize,
        textAlignHorizontal: node.textAlignHorizontal,
        layoutSizingHorizontal: node.layoutSizingHorizontal,
        fills: node.fills,
      };
    }
    if (node instanceof Frame) {
      return {
        ...base,
        layoutMode: node.layoutMode,
        alignment: [node.primaryAxisAlignItems, node.counterAxisAlignItems],
        sizing: [node.primaryAxisSizingMode, node.counterAxisSizingMode],
        clipsContent: node.clipsContent,
        strokeWeight:
          typeof node.strokeWeight === "number" ? node.strokeWeight : "mixed",
        strokeWeights: node.strokeWeights,
        numbers: numberFields.map((field) => node.number(field)),
        limits: node.limits,
        boundVariables: node.boundVariables,
        fills: node.fills,
        strokes: node.strokes,
        effectStyleId: node.effectStyleId,
        description: node.description,
        children: node.children.map(dump),
      };
    }
    return { ...base, children: (node as Page).children.map(dump) };
  }

  return { api, pages: () => pages.map(dump) };
}
