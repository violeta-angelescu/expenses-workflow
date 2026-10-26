import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { button, expense, page, renderPage } from "@/tests/render";
import RequestsPage from "./page";

const list = vi.mocked(api.list);
const create = vi.mocked(api.create);
const transition = vi.mocked(api.transition);

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function fillForm(user: UserEvent, title = "Trip", description = "Taxi", amount = "12.5") {
  await user.type(field("Title"), title);
  await user.type(field("Description"), description);
  await user.type(field("Amount"), amount);
}

describe("requests list", () => {
  it("shows a spinner, then the expenses, offering submission only for drafts", async () => {
    list.mockResolvedValue(
      page([expense({ id: "d", title: "Draft one" }), expense({ id: "a", title: "Approved one", status: "approved" })]),
    );
    renderPage(<RequestsPage />);

    expect(screen.getByRole("status")).toBeTruthy();
    await screen.findByText("Draft one");
    expect(screen.getByText("Approved one")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Submit for approval" })).toHaveLength(1);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull(); // everything fits on one page
  });

  it("shows an empty state when there are no expenses", async () => {
    list.mockResolvedValue(page([]));
    renderPage(<RequestsPage />);

    expect(await screen.findByText(/No expenses yet/)).toBeTruthy();
  });

  it("shows an error and retries loading", async () => {
    list.mockRejectedValueOnce(new ApiError("Database is down", 500)).mockResolvedValue(page([expense()]));
    const { user } = renderPage(<RequestsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to load requests");
    expect(alert.textContent).toContain("Database is down");

    await user.click(button("Retry"));
    expect(await screen.findByText("Conference travel")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("submitting an expense", () => {
  it("sends the submit event and refreshes the list", async () => {
    list
      .mockResolvedValueOnce(page([expense({ id: "d1" })]))
      .mockResolvedValue(page([expense({ id: "d1", status: "submitted" })]));
    transition.mockResolvedValue(expense({ id: "d1", status: "submitted" }));
    const { user } = renderPage(<RequestsPage />);

    await user.click(await screen.findByRole("button", { name: "Submit for approval" }));

    expect(transition).toHaveBeenCalledWith("d1", "submit");
    expect(await screen.findByText("submitted")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit for approval" })).toBeNull();
  });

  it("refreshes a stale card and reports the error when submission fails", async () => {
    list
      .mockResolvedValueOnce(page([expense({ id: "d1" })]))
      .mockResolvedValue(page([expense({ id: "d1", status: "approved" })]));
    transition.mockRejectedValue(new ApiError("Expense cannot be submitted", 409));
    const { user } = renderPage(<RequestsPage />);

    await user.click(await screen.findByRole("button", { name: "Submit for approval" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Expense cannot be submitted");
    expect(await screen.findByText("approved")).toBeTruthy();
  });
});

describe("creating an expense", () => {
  it("sends the form as a draft with numeric amounts, then clears the form", async () => {
    list.mockResolvedValue(page([]));
    create.mockResolvedValue(expense());
    const { user } = renderPage(<RequestsPage />);
    await screen.findByText(/No expenses yet/);

    await fillForm(user);
    await user.click(button("Create draft"));

    expect(create).toHaveBeenCalledWith("Trip", [{ description: "Taxi", amount: 12.5 }]);
    await waitFor(() => expect(field("Title").value).toBe(""));
    expect(field("Description").value).toBe("");
    expect(list).toHaveBeenCalledTimes(2); // initial load + refresh after creating
  });

  it("shows the error and keeps the draft so it can be retried", async () => {
    list.mockResolvedValue(page([]));
    create.mockRejectedValue(new ApiError("Title is too long", 400));
    const { user } = renderPage(<RequestsPage />);
    await screen.findByText(/No expenses yet/);

    await fillForm(user);
    await user.click(button("Create draft"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to create expense");
    expect(alert.textContent).toContain("Title is too long");
    expect(field("Title").value).toBe("Trip");

    await user.click(screen.getByRole("button", { name: "Dismiss error" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("pagination", () => {
  const first = () => page([expense({ id: "a", title: "First page" })], "c1");
  const second = () => page([expense({ id: "b", title: "Second page" })]);

  it("moves forward with the server cursor and back again", async () => {
    list.mockImplementation(async (params) => (params?.cursor === "c1" ? second() : first()));
    const { user } = renderPage(<RequestsPage />);

    await screen.findByText("First page");
    expect(button("Previous")).toHaveProperty("disabled", true);

    await user.click(button("Next"));
    expect(await screen.findByText("Second page")).toBeTruthy();
    expect(list).toHaveBeenLastCalledWith({ cursor: "c1" }, expect.anything());
    expect(button("Next")).toHaveProperty("disabled", true);

    await user.click(button("Previous"));
    expect(await screen.findByText("First page")).toBeTruthy();
    expect(button("Previous")).toHaveProperty("disabled", true);
  });

  it("returns to the first page after creating an expense so it is visible", async () => {
    let firstPage = first();
    list.mockImplementation(async (params) => (params?.cursor === "c1" ? second() : firstPage));
    create.mockImplementation(async (title) => {
      const created = expense({ id: "new", title });
      firstPage = page([created, ...firstPage.items], "c1");
      return created;
    });
    const { user } = renderPage(<RequestsPage />);

    await screen.findByText("First page");
    await user.click(button("Next"));
    await screen.findByText("Second page");

    await fillForm(user, "Brand new trip");
    await user.click(button("Create draft"));

    expect(await screen.findByText("Brand new trip")).toBeTruthy();
    expect(screen.queryByText("Second page")).toBeNull();
    expect(button("Previous")).toHaveProperty("disabled", true);
  });
});
