import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["", "exceptions", "payments", "cash", "forecast", "fx", "agents", "sources", "audit"];

for (const route of ROUTES) {
  test(`no serious or critical axe violations on /${route}`, async ({ page }) => {
    await page.goto(`#/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} nodes, e.g. ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
}

test("every route has a unique title and one h1", async ({ page }) => {
  const titles = new Set<string>();
  let previous = "";
  for (const route of ROUTES) {
    await page.goto(`#/${route}`);
    if (previous) await expect(page).not.toHaveTitle(previous);
    await expect(page.locator("h1")).toHaveCount(1);
    previous = await page.title();
    await expect(page.locator("h1")).toHaveText(previous.replace(" · Treasury Command Center", ""));
    titles.add(previous);
  }
  expect(titles.size).toBe(ROUTES.length);
});
