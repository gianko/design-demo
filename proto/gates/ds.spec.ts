// Gates 4 (a11y), 6 (visual regression) and the render half of 7 (taste lint),
// run over every story of one component, in every theme × density. PROTOTYPE.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync } from "node:fs";

const component = process.env.COMPONENT ?? "";
const index = JSON.parse(readFileSync("storybook-static/index.json", "utf8"));
const stories = Object.values(index.entries as Record<string, { id: string; title: string; type: string; tags?: string[] }>)
  .filter((e) => e.type === "story" && e.title.split("/").pop() === component);

const modes = [
  { theme: "light", density: "admin", target: 24 },
  { theme: "dark", density: "admin", target: 24 },
  { theme: "light", density: "contractor", target: 44 },
  { theme: "dark", density: "contractor", target: 44 },
];
const MOTION_MS = new Set([0, 84, 120, 168, 224, 240, 320]);
mkdirSync("gates-out/shots", { recursive: true });

test("component has stories", () => {
  expect(stories.length, `no stories titled */${component}`).toBeGreaterThan(0);
});

for (const story of stories) {
  for (const m of modes) {
    const name = `${story.id}--${m.theme}-${m.density}`;
    test(name, async ({ page }) => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${m.theme};density:${m.density}`);
      await page.locator("#storybook-root > *").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const root = page.locator("#storybook-root");

      await root.screenshot({ path: `gates-out/shots/${name}.png`, animations: "disabled" });

      const failures: string[] = [];

      // Gate 4: axe, serious/critical fail.
      const axe = await new AxeBuilder({ page }).include("#storybook-root").analyze();
      for (const v of axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
        failures.push(`[gate4 a11y] ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
      }

      // Gate 7 (render): taste rules on computed styles.
      failures.push(...(await tasteRules(page, m.target)));

      // Focus ring must not show on click (design brief: :focus-visible only).
      const clickable = page.locator("#storybook-root button:not([disabled]):not([aria-disabled=true]):not([aria-busy=true]), #storybook-root a[href]").first();
      if (await clickable.count()) {
        await clickable.click();
        const outline = await clickable.evaluate((el) => getComputedStyle(el).outlineStyle);
        if (outline !== "none") failures.push(`[gate7 taste] focus-on-click: outline "${outline}" shows after a mouse click; use focus-visible only`);
        await page.mouse.click(1, 1);
        await page.keyboard.press("Tab");
      }

      // Interaction shots for the critique (not baselines): hover, pressed, keyboard focus.
      const target = page.locator("#storybook-root button, #storybook-root a[href]").first();
      if (await target.count()) {
        await target.hover();
        await page.waitForTimeout(400);
        await root.screenshot({ path: `gates-out/shots/${name}--hover.png` });
        await page.mouse.down();
        await page.waitForTimeout(400);
        await root.screenshot({ path: `gates-out/shots/${name}--pressed.png` });
        await page.mouse.up();
        await page.mouse.move(0, 0);
        await page.mouse.click(1, 1);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(400);
        await page.screenshot({ path: `gates-out/shots/${name}--focus.png`, clip: (await root.boundingBox())! });
      }

      expect(failures, failures.join("\n")).toEqual([]);

      // Gate 6: visual regression against the committed baseline.
      await page.mouse.move(0, 0);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await expect(root).toHaveScreenshot(`${name}.png`);
    });
  }
}

async function tasteRules(page: Page, target: number): Promise<string[]> {
  return page.evaluate(
    ({ target, motion }) => {
      const out: string[] = [];
      const els = Array.from(document.querySelectorAll<HTMLElement>("#storybook-root *"));
      const label = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""} "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      const ctx = document.createElement("canvas").getContext("2d")!;
      const rgb = (c: string) => { ctx.fillStyle = "#000"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); };
      for (const el of els) {
        const cs = getComputedStyle(el);
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (hasText) {
          const [r, g, b] = rgb(cs.color);
          if (r === g && g === b && r! < 250) out.push(`[gate7 taste] pure-gray-text: ${label(el)} uses untinted ${cs.color}; neutrals are plum-tinted`);
        }
        const w = Number(cs.fontWeight);
        if (hasText && w !== 400 && w !== 600) out.push(`[gate7 taste] weights: ${label(el)} uses weight ${w}; only 400 and 600`);
        if (hasText && cs.textTransform === "uppercase") out.push(`[gate7 taste] all-caps: ${label(el)}`);
        const durations = cs.transitionDuration.split(",").map((d) => Math.round(parseFloat(d) * (d.includes("ms") ? 1 : 1000)));
        if (cs.transitionProperty !== "none" && durations.some((d) => !motion.includes(d))) out.push(`[gate7 taste] motion-token: ${label(el)} transition-duration ${cs.transitionDuration} is not a motion token`);
        for (const m of cs.transitionTimingFunction.matchAll(/cubic-bezier\(([^)]+)\)/g)) {
          const [, y1, , y2] = m[1]!.split(",").map(Number);
          if (y1! > 1.2 || y2! > 1.2 || y1! < -0.2 || y2! < -0.2) out.push(`[gate7 taste] bounce: ${label(el)} easing ${m[0]} overshoots more than settle`);
        }
        const interactive = el.matches("button, a[href], input, select, textarea, [role=button], [role=checkbox], [role=tab]");
        if (interactive && el.getClientRects().length) {
          const r = el.getBoundingClientRect();
          if (r.width < target || r.height < target) out.push(`[gate7 taste] target-size: ${label(el)} is ${Math.round(r.width)}×${Math.round(r.height)}px; minimum target is ${target}px`);
        }
      }
      return out;
    },
    { target, motion: [...MOTION_MS] },
  );
}
