// PROTOTYPE (wayfinder #15): stands in for the Figma output of tokens/build.ts (ADR 0005).
// The real build goes forward from DTCG JSON; this spike reads the hand-written
// tokens.css instead, because the pipeline under test starts at the payload.
// Usage: node spikes/figma/payload.mjs > spikes/figma/out/payload.json
import { readFileSync } from "node:fs";
import { clampChroma, converter, inGamut, parse } from "culori";

const css = readFileSync(new URL("../../src/tokens/tokens.css", import.meta.url), "utf8");
const toRgb = converter("rgb");
const srgb = inGamut("rgb");

// Pull `--ds-*: value;` declarations out of the first block whose selector matches.
function block(selector) {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/(--ds-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const light = block('[data-theme="light"]');
const dark = block('[data-theme="dark"]');
const admin = block('[data-density="admin"]');
const contractor = block('[data-density="contractor"]');
const scales = block(":root");

// One naming function: --ds-color-bg-surface-raised -> color/bg/surface-raised.
// (The real build derives both from the DTCG path; here we reverse the CSS name.)
const GROUPED = { color: 1, type: 1, motion: 1 };
function figmaName(cssVar) {
  const [family, ...rest] = cssVar.replace(/^--ds-/, "").split("-");
  if (family === "type" && rest[0] === "family") return "type/family";
  if (family === "type") return `type/${rest[0]}/${rest.slice(1).join("-")}`;
  if (GROUPED[family] && rest.length > 1) return `${family}/${rest[0]}/${rest.slice(1).join("-")}`;
  return `${family}/${rest.join("-")}`;
}
const codeSyntax = (cssVar) => ({ WEB: `var(${cssVar})` });
const outOfGamut = new Set();
const r4 = (x) => Math.round(x * 1e4) / 1e4;

function rgba(value) {
  const c = parse(value);
  if (!c) throw new Error(`unparseable colour ${value}`);
  // The real build fails here (ADR 0005). The spike clamps and reports, so it can go on.
  if (!srgb(c)) outOfGamut.add(value);
  const { r, g, b, alpha = 1 } = toRgb(srgb(c) ? c : clampChroma(c, "oklch"));
  return { r: r4(r), g: r4(g), b: r4(b), a: r4(alpha) };
}

// ---------- Primitives: every distinct opaque colour, named by hue family and lightness ----------
const HUES = [[330, "plum"], [85, "amber"], [75, "amber"], [70, "amber"], [25, "red"], [155, "green"], [250, "blue"]];
const prims = new Map(); // oklch string -> { name, value }
function primitiveFor(value) {
  const [, L, C, H] = value.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/) ?? [];
  if (!L) return null; // alpha colour: not a primitive
  const key = +C === 0 ? `${L} 0` : `${L} ${C} ${H}`; // achromatic: hue is noise
  if (!prims.has(key)) {
    const family = +C === 0 ? "neutral" : HUES.find(([h]) => h === +H)[1];
    prims.set(key, { family, L: Math.round(L * 100), C: Math.round(C * 1000), value: rgba(value) });
  }
  return prims.get(key);
}
const colorVars = Object.keys(light).filter((k) => k.startsWith("--ds-color-"));
for (const k of colorVars) { primitiveFor(light[k]); primitiveFor(dark[k]); }
// Disambiguate same family+L with chroma suffix.
const seen = {};
for (const p of prims.values()) (seen[`${p.family}/${p.L}`] ??= []).push(p);
for (const [base, ps] of Object.entries(seen)) for (const p of ps) p.name = ps.length > 1 ? `${base}-c${p.C}` : base;

const scope = {
  bg: ["FRAME_FILL", "SHAPE_FILL"], text: ["TEXT_FILL"], border: ["STROKE_COLOR"], ring: ["STROKE_COLOR"],
};
const colorValue = (v) => { const p = primitiveFor(v); return p ? { alias: p.name } : rgba(v); };

const px = (v) => parseFloat(v);
const ms = (v) => parseFloat(v);
function easing(v) {
  const [x1, y1, x2, y2] = v.match(/cubic-bezier\(([^)]*)\)/)[1].split(",").map(Number);
  return { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: { x1, y1, x2, y2 } };
}

function numberScopes(name) {
  if (/size$/.test(name)) return ["FONT_SIZE"];
  if (/line-height$/.test(name)) return ["LINE_HEIGHT"];
  if (/weight$/.test(name)) return ["FONT_WEIGHT"];
  if (/tracking$/.test(name)) return ["LETTER_SPACING"];
  if (/radius|^radius\//.test(name)) return ["CORNER_RADIUS"];
  if (/^space\/|density\/page$/.test(name)) return ["GAP"];
  return ["WIDTH_HEIGHT"];
}
const v = (cssVar, type, scopes, valuesByMode) => ({ name: figmaName(cssVar), type, scopes, codeSyntax: codeSyntax(cssVar), valuesByMode });

const collections = [
  {
    name: "Primitives", modes: ["Value"], hidden: true,
    variables: [...prims.values()].map((p) => ({ name: `${p.name}`, type: "COLOR", scopes: [], valuesByMode: { Value: p.value } })),
  },
  {
    name: "Color", modes: ["Light", "Dark"], hidden: false,
    variables: colorVars.map((k) => {
      const group = k.replace("--ds-color-", "").split("-")[0];
      return v(k, "COLOR", scope[group] ?? ["FRAME_FILL", "SHAPE_FILL"], { Light: colorValue(light[k]), Dark: colorValue(dark[k]) });
    }),
  },
  {
    name: "Density", modes: ["Admin", "Contractor"], hidden: false,
    variables: Object.keys(admin).map((k) => v(k, "FLOAT", numberScopes(figmaName(k)), { Admin: px(admin[k]), Contractor: px(contractor[k]) })),
  },
  ...[["Space", "--ds-space-"], ["Radius", "--ds-radius-"], ["Type", "--ds-type-"], ["Motion", "--ds-motion-"]].map(([name, prefix]) => ({
    name, modes: ["Value"], hidden: false,
    variables: Object.entries(scales).filter(([k]) => k.startsWith(prefix)).map(([k, raw]) => {
      if (k === "--ds-type-family") return v(k, "STRING", ["FONT_FAMILY"], { Value: raw.replace(/"/g, "") });
      if (k.startsWith("--ds-motion-duration")) return v(k, "TIMING", undefined, { Value: ms(raw) }); // TIMING/EASING reject scopes
      if (k.startsWith("--ds-motion-ease")) return v(k, "EASING", undefined, { Value: easing(raw) });
      if (k.endsWith("-tracking")) {
        // Figma letter spacing variables are pixels; CSS is em. Convert at the role's size.
        const size = px(scales[k.replace("-tracking", "-size")]);
        return v(k, "FLOAT", ["LETTER_SPACING"], { Value: r4(parseFloat(raw) * size) });
      }
      return v(k, "FLOAT", numberScopes(figmaName(k)), { Value: px(raw) });
    }),
  })),
];

// ---------- Text styles: composite roles bound to variables (density roles resolve per frame mode) ----------
const ROLES = ["caption", "label", "body", "heading", "title", "figure"];
const DENSITY_ROLES = new Set(["label", "body"]);
const textStyles = ROLES.map((role) => {
  const sizeSrc = DENSITY_ROLES.has(role) ? `density/${role}-size` : `type/${role}/size`;
  const lhSrc = DENSITY_ROLES.has(role) ? `density/${role}-line-height` : `type/${role}/line-height`;
  return {
    name: role,
    bind: {
      fontFamily: "type/family", fontSize: sizeSrc, lineHeight: lhSrc, fontWeight: `type/${role}/weight`,
      ...(scales[`--ds-type-${role}-tracking`] ? { letterSpacing: `type/${role}/tracking` } : {}),
    },
  };
});

// ---------- Effect styles: light theme only (a style can't vary by mode; dark uses a ring) ----------
function shadows(value) {
  return value.split(/,(?![^(]*\))/).map((part) => {
    const m = part.trim().match(/^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)?(?: (-?[\d.]+)(?:px)?)? (oklch\([^)]*\))$/);
    const [, x, y, blur, spread = "0", color] = m;
    return { type: "DROP_SHADOW", offset: { x: +x, y: +y }, radius: +blur, spread: +spread, color: rgba(color) };
  });
}
const effectStyles = Object.keys(light).filter((k) => k.startsWith("--ds-shadow-")).map((k) => ({
  name: `shadow/${k.replace("--ds-shadow-", "")}`, effects: shadows(light[k]),
}));

if (outOfGamut.size) console.error(`out of sRGB gamut (clamped): ${[...outOfGamut].join(", ")}`);
process.stdout.write(JSON.stringify({ collections, textStyles, effectStyles }, null, 2) + "\n");
