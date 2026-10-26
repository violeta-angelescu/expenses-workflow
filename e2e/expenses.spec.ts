import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { resetExpenses } from "./db";

const PAGE_SIZE = 20; // mirrors PAGE_SIZE in lib/store.ts

test.beforeEach(resetExpenses);

async function seed(request: APIRequestContext, titles: string[], submit = false, amounts: number[] = []) {
  for (const [i, title] of titles.entries()) {
    const created = await request.post("/api/expenses", {
      data: { title, lineItems: [{ description: "Item", amount: amounts[i] ?? 10 }] },
    });
    expect(created.ok()).toBeTruthy();
    if (submit) {
      const { id } = await created.json();
      const res = await request.post(`/api/expenses/${id}/transition`, { data: { event: "submit" } });
      expect(res.ok()).toBeTruthy();
    }
  }
}

const numbered = (count: number, prefix = "Expense") =>
  Array.from({ length: count }, (_, i) => `${prefix} ${String(i + 1).padStart(2, "0")}`);

const titlesOnPage = (page: Page, prefix = "Expense") =>
  page.locator("strong", { hasText: new RegExp(`^${prefix} \\d{2}$`) });

async function createExpense(page: Page, title: string, description = "Taxi", amount = "12.50") {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("button", { name: "Create draft" }).click();
}

test("an expense goes from draft to approved", async ({ page }) => {
  await page.goto("/requests");
  await expect(page.getByText(/No expenses yet/)).toBeVisible();

  await createExpense(page, "Conference travel");
  const card = page.locator(".card", { hasText: "Conference travel" });
  await expect(card.getByText("draft")).toBeVisible();
  await expect(card.getByText("Taxi — $12.50")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("");

  await card.getByRole("button", { name: "Submit for approval" }).click();
  await expect(card.getByText("submitted")).toBeVisible();
  await expect(card.getByRole("button", { name: "Submit for approval" })).toHaveCount(0);

  await page.goto("/approvals");
  await page.locator(".card", { hasText: "Conference travel" }).getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Nothing waiting for approval.")).toBeVisible();

  await page.goto("/requests");
  await expect(page.locator(".card", { hasText: "Conference travel" }).getByText("approved")).toBeVisible();
});

test("a rejection needs a reason and the reason is shown to the requester", async ({ page, request }) => {
  await seed(request, ["Team lunch"], true);
  await page.goto("/approvals");

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("button", { name: "Confirm rejection" })).toBeDisabled();

  await page.getByLabel("Reason for rejection").fill("Over budget");
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(page.getByText("Nothing waiting for approval.")).toBeVisible();

  await page.goto("/requests");
  const card = page.locator(".card", { hasText: "Team lunch" });
  await expect(card.getByText("rejected", { exact: true })).toBeVisible();
  await expect(card.getByText("Rejected: Over budget")).toBeVisible();
});

test("the approval queue only shows submitted expenses and can be searched", async ({ page, request }) => {
  await seed(request, ["Airport taxi", "Hotel stay"], true);
  await seed(request, ["Still a draft"]);
  await page.goto("/approvals");

  await expect(page.getByText("Airport taxi")).toBeVisible();
  await expect(page.getByText("Hotel stay")).toBeVisible();
  await expect(page.getByText("Still a draft")).toHaveCount(0);

  await page.getByLabel("Search expenses").fill("airport");
  await expect(page.getByText("Hotel stay")).toHaveCount(0);
  await expect(page.getByText("Airport taxi")).toBeVisible();

  await page.getByLabel("Search expenses").fill("nothing like this");
  await expect(page.getByText(/No submitted expenses match/)).toBeVisible();
});

test("the approval queue can be filtered by min and max price", async ({ page, request }) => {
  await seed(request, ["Cheap snack", "Team lunch", "Conference trip"], true, [5, 50, 500]);
  await page.goto("/approvals");
  await expect(page.getByText("Conference trip")).toBeVisible();

  await page.getByLabel("Minimum price").fill("20");
  await expect(page.getByText("Cheap snack")).toHaveCount(0);
  await expect(page.getByText("Team lunch")).toBeVisible();
  await expect(page.getByText("Conference trip")).toBeVisible();

  await page.getByLabel("Maximum price").fill("100");
  await expect(page.getByText("Conference trip")).toHaveCount(0);
  await expect(page.getByText("Team lunch")).toBeVisible();

  const listRequests: string[] = [];
  page.on("request", (req) => req.url().includes("/api/expenses?") && listRequests.push(req.url()));

  await page.getByLabel("Maximum price").fill("10");
  const rangeError = page.getByText("Max price cannot be lower than min price");
  await expect(rangeError).toBeVisible();
  await page.waitForTimeout(500); // longer than any debounce, so a stray request would have been sent
  expect(listRequests).toEqual([]);

  await page.getByLabel("Minimum price").fill("");
  await expect(rangeError).toHaveCount(0);
  await expect(page.getByText("Cheap snack")).toBeVisible();
  await expect(page.getByText("Team lunch")).toHaveCount(0);
});

test("the expenses API rejects invalid price filters", async ({ request }) => {
  for (const query of ["minTotal=abc", "maxTotal=-1", "minTotal=10&maxTotal=5"]) {
    const res = await request.get(`/api/expenses?${query}`);
    expect(res.status(), query).toBe(400);
  }
});

test("long lists are split into pages without repeating or skipping an expense", async ({ page, request }) => {
  await seed(request, numbered(PAGE_SIZE + 5));
  await page.goto("/requests");

  await expect(titlesOnPage(page)).toHaveCount(PAGE_SIZE);
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  const firstPage = await titlesOnPage(page).allTextContents();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(titlesOnPage(page)).toHaveCount(5);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  const secondPage = await titlesOnPage(page).allTextContents();

  expect([...firstPage, ...secondPage].sort()).toEqual(numbered(PAGE_SIZE + 5));

  await page.getByRole("button", { name: "Previous" }).click();
  await expect(titlesOnPage(page)).toHaveCount(PAGE_SIZE);
});

test("creating an expense from a later page brings the user back to see it", async ({ page, request }) => {
  await seed(request, numbered(PAGE_SIZE + 5));
  await page.goto("/requests");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(titlesOnPage(page)).toHaveCount(5);

  await createExpense(page, "Brand new trip");

  await expect(page.getByText("Brand new trip")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await expect(titlesOnPage(page)).toHaveCount(PAGE_SIZE - 1); // page one: the new expense pushed the oldest onto page two
});
