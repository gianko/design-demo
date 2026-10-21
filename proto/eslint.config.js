// Gate 2 (token lint) + the static half of gate 7 (taste lint), PROTOTYPE subset.
import tseslint from "typescript-eslint";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["storybook-static", "node_modules", "gates-out"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "better-tailwindcss": betterTailwind, "react-hooks": reactHooks },
    settings: { "better-tailwindcss": { entryPoint: "src/styles.css" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "better-tailwindcss/no-unknown-classes": ["error", { ignore: ["^group$", "^peer$"] }],
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-concatenated-classes": "error",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            { pattern: "\\[", message: "Arbitrary values are banned; use a token class." },
            { pattern: "\\(--", message: "Raw CSS variable shorthand is banned; use a token class." },
            { pattern: "^opacity-", message: "opacity-* is banned; disabled states use colour roles." },
            { pattern: "^font-(thin|light|normal|medium|semibold|bold|black)", message: "Weights come from the composite type roles." },
            { pattern: "^(uppercase|tracking-)", message: "Taste: no all-caps labels; tracking comes from type roles." },
            { pattern: "^(bg-gradient|bg-linear|bg-radial|bg-conic)", message: "Taste: no gradient decoration." },
            { pattern: "^(animate-bounce|animate-ping|animate-pulse|animate-spin)$", message: "Taste: nothing loops." },
            { pattern: "^hover:(-?translate|scale|shadow)", message: "Taste: no hover lift." },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='style']", message: "Inline styles are banned (gate 2)." },
        { selector: "TSPropertySignature[key.name='className']", message: "Library components take no className (ADR 0002)." },
        { selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]", message: "Raw colour values are banned; use a colour role." },
      ],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["tailwind-merge", "clsx", "class-variance-authority"], message: "Variants use tailwind-variants/lite only (ADR 0002)." }] },
      ],
    },
  },
);
