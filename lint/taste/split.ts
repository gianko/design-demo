// Splits text on a separator outside brackets and parentheses: a class's
// variants on `:` (`a:[&:hover]:b`), a CSS value's layers on `,`
// (`opacity var(--a), transform cubic-bezier(0, 0, 1, 1)`).

export function splitOutsideBrackets(
  text: string,
  separator: string
): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}
