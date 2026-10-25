// The one naming function of ADR 0005. A token path gives its Figma variable,
// its --ds-* variable and code syntax, its Tailwind class and the theme key
// behind it, and the tokens.ts family it is listed under, so none of them can
// drift apart. Durations, delays and text roles have no theme key: they get
// named utilities instead.

export type TokenNames = {
  figma: string;
  cssVar: string;
  codeSyntax: string;
  themeKey?: string;
  className?: string;
  /** The name a class carries after its utility prefix, as tokens.ts lists it. */
  role?: string;
  family?: string;
};

// Colour roles sit in Tailwind's per-property namespaces, so `bg-ink` never
// compiles. The path's second segment picks the namespace.
const colorNamespaces: Record<string, [themeKey: string, prefix: string]> = {
  bg: ["background-color", "bg"],
  text: ["text-color", "text"],
  border: ["border-color", "border"],
  ring: ["ring-color", "ring"],
};

// Density and size tokens are named by role, and the path's second segment is
// the Tailwind namespace the role lives in.
const roleNamespaces: Record<string, string> = {
  padding: "p",
  height: "h",
  width: "w",
  "min-height": "min-h",
  size: "size",
  radius: "rounded",
  text: "text",
};

type Mapping = { themeKey?: string; prefix: string; family: string } | null;

function mapping(segments: string[]): Mapping {
  const [family, second] = segments;
  switch (family) {
    case "color": {
      const namespace = colorNamespaces[second ?? ""];
      if (!namespace) return null;
      const [themeKey, prefix] = namespace;
      return { themeKey, prefix, family: camel(themeKey) };
    }
    case "density":
    case "size": {
      const prefix = roleNamespaces[second ?? ""];
      if (!prefix) return null;
      // A text role is a named utility, not a theme key (#104).
      if (second === "text") return { prefix, family: "text" };
      return { themeKey: second, prefix, family: camel(second!) };
    }
    case "shadow":
      return { themeKey: "shadow", prefix: "shadow", family: "shadow" };
    case "space":
      return { themeKey: "spacing", prefix: "p", family: "spacing" };
    case "radius":
      return { themeKey: "radius", prefix: "rounded", family: "radius" };
    case "z":
      return { themeKey: "z-index", prefix: "z", family: "zIndex" };
    case "type":
      if (second === "weight") return null;
      if (second === "family") {
        return { themeKey: "font", prefix: "font", family: "font" };
      }
      return { prefix: "text", family: "text" };
    case "motion":
      switch (second) {
        case "duration":
        case "delay":
          return { prefix: second, family: second };
        case "ease":
        case "animate":
          return { themeKey: second, prefix: second, family: second };
      }
      return null;
  }
  return null;
}

/** The role name a class carries: the path after its family and namespace. */
function roleName(segments: string[]): string {
  const [family] = segments;
  const skip =
    family === "color" ||
    family === "density" ||
    family === "size" ||
    family === "motion" ||
    (family === "type" && segments[1] === "family")
      ? 2
      : 1;
  return segments.slice(skip).join("-");
}

export function tokenNames(path: string): TokenNames {
  const segments = path.split(".");
  const cssVar = `--ds-${segments.join("-")}`;
  const names: TokenNames = {
    figma: segments.join("/"),
    cssVar,
    codeSyntax: `var(${cssVar})`,
  };
  const map = mapping(segments);
  if (!map) return names;
  const name = roleName(segments);
  if (map.themeKey) names.themeKey = `--${map.themeKey}-${name}`;
  names.className = `${map.prefix}-${name}`;
  names.role = name;
  names.family = map.family;
  return names;
}

function camel(kebab: string): string {
  return kebab.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());
}
