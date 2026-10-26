// Formatting the tooling's CLIs and HTML pages share: the generate and eval
// CLIs, the eval report and the contact sheet.

// USD, to the cent unless asked for more places.
export function dollars(usd: number, places = 2) {
  return `$${usd.toFixed(places)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Local date, YYYY-MM-DD.
export function day(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local time, YYYYMMDD-HHMMSS.
export function stamp(date: Date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// Text made safe inside an HTML element or a double-quoted attribute.
export function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
