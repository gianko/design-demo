// Drives the spike in Chromium and WebKit; reports whether the shared-element
// transition actually ran, focus moved into the sheet, and Esc reversed it.
import { chromium, webkit } from "@playwright/test";
const url = "http://localhost:5199/";
for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  for (const reduced of [false, true]) {
    let browser;
    try { browser = await type.launch(); } catch (e) { console.log(name, "launch failed:", String(e).split("\n")[0]); continue; }
    const page = await browser.newPage({ viewport: { width: 900, height: 500 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await page.goto(url);
    await page.getByTestId("row-INV-1042").click();
    await page.waitForTimeout(100);
    const mid = await page.evaluate(() => document.getAnimations().map((a) => a.effect?.pseudoElement ?? "").filter(Boolean));
    if (!reduced) await page.screenshot({ path: `spikes/view-transition/${name}-mid-open.png` });
    await page.waitForTimeout(500);
    const focusInSheet = await page.evaluate(() => !!document.activeElement?.closest("[data-testid=sheet]"));
    const sheetVisible = await page.getByTestId("sheet").isVisible();
    if (!reduced) await page.screenshot({ path: `spikes/view-transition/${name}-open.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
    const midClose = await page.evaluate(() => document.getAnimations().map((a) => a.effect?.pseudoElement ?? "").filter(Boolean));
    await page.waitForTimeout(500);
    const closed = (await page.getByTestId("sheet").count()) === 0;
    const focusBack = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    const log = await page.evaluate(() => window.vtLog);
    console.log(JSON.stringify({ browser: name, reduced, midOpenPseudos: [...new Set(mid)], sheetVisible, focusInSheet, midClosePseudos: [...new Set(midClose)], closed, focusBack, log }));
    await browser.close();
  }
}
