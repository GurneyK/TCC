import { expect, test, type Page } from "@playwright/test";

const NAMES = { analyst: "Priya Shah", treasurer: "Daniel Okafor", auditor: "Mei Lin" } as const;

/** Switch user from the menu in the bottom left of the sidebar. */
async function signInAs(page: Page, role: keyof typeof NAMES) {
  await page.getByRole("button", { name: /Switch user$/ }).click();
  await page.getByRole("group", { name: "Switch user" }).getByRole("button", { name: new RegExp(NAMES[role]) }).click();
  await expect(page.getByRole("button", { name: new RegExp(`Signed in as ${NAMES[role]}`) })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("#/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("S1: callback not confirmed rejects the payment and the trail shows it", async ({ page }) => {
  await page.goto("#/exceptions?f=pr-pay-s1-orchard");
  await expect(page.getByRole("heading", { name: /Bank details changed 2 days before/ })).toBeVisible();

  // Daniel can't approve it while the critical finding is open.
  await signInAs(page, "treasurer");
  await page.goto("#/payments?p=pay-s1-orchard");
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await expect(page.getByText(/Open critical finding/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Priya records the callback.
  await signInAs(page, "analyst");
  await page.goto("#/exceptions?f=pr-pay-s1-orchard");
  await page.getByRole("button", { name: "Record callback result" }).click();
  await page.getByRole("radio", { name: /Not confirmed/ }).check();
  await page.getByRole("button", { name: "Save result" }).click();
  await expect(page.getByText(/Payment pay-s1-orchard is now rejected/)).toBeVisible();

  // Mei sees it in the audit log.
  await signInAs(page, "auditor");
  await page.goto("#/audit?q=orchard");
  await expect(page.getByRole("cell", { name: "Auto rejected payment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run now" })).toHaveCount(0);
});

test("S6: accepting the funding recommendation creates a draft payment", async ({ page }) => {
  await page.goto("#/forecast?entity=ent-br");
  await page.getByRole("button", { name: /Fund with BRL/ }).click();
  await page.getByRole("button", { name: /Open payment pay-fund-br/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Intercompany funding");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByRole("dialog")).toContainText(/Waiting for the Group Treasurer/);
});

test("S8: retry sync clears the stale warning and CSV import reconciles", async ({ page }) => {
  await page.goto("#/sources");
  await page.getByRole("button", { name: "Use the Crestwood sample" }).click();
  await expect(page.getByText(/20 rows ready/)).toBeVisible();
  await page.getByRole("button", { name: /Import 20 rows/ }).click();
  await expect(page.getByRole("heading", { name: "Imported 20 bank lines" })).toBeVisible();
  await expect(page.getByText(/15 matched to open invoices, 3 bank fees grouped, 2 left as exceptions/)).toBeVisible();
  await page.getByRole("button", { name: "Retry sync" }).click();
  await page.goto("#/");
  await expect(page.getByText(/Every feed is current/)).toBeVisible();
});

test("guided demo walks all 6 steps", async ({ page }) => {
  await page.getByRole("button", { name: "Start tour" }).click();
  for (let i = 1; i <= 6; i += 1) {
    await expect(page.getByRole("complementary", { name: `Guided demo, step ${i} of 6` })).toBeVisible();
    await page.getByRole("button", { name: i === 6 ? "Finish" : "Next" }).click();
  }
  await expect(page.getByRole("complementary", { name: /Guided demo/ })).toHaveCount(0);
});
