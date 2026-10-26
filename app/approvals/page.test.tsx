import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { button, expense, page, renderPage } from "@/tests/render";
import ApprovalsPage from "./page";

const list = vi.mocked(api.list);
const transition = vi.mocked(api.transition);

const submitted = (overrides = {}) => expense({ id: "s1", title: "Team offsite", status: "submitted", ...overrides });
const lastListed = (q: string, cursor?: string) =>
  expect(list).toHaveBeenLastCalledWith({ status: "submitted", q, minTotal: "", maxTotal: "", cursor }, expect.anything());
const reasonBox = () => screen.getByLabelText("Reason for rejection") as HTMLInputElement;

describe("approval queue", () => {
  it("lists only submitted expenses, each with approve and reject actions", async () => {
    list.mockResolvedValue(page([submitted(), submitted({ id: "s2", title: "Client dinner" })]));
    renderPage(<ApprovalsPage />);

    await screen.findByText("Team offsite");
    expect(screen.getByText("Client dinner")).toBeTruthy();
    expect(list).toHaveBeenCalledWith({ status: "submitted", q: "", minTotal: "", maxTotal: "", cursor: undefined }, expect.anything());
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Reject" })).toHaveLength(2);
  });

  it("shows an empty state when nothing is waiting", async () => {
    list.mockResolvedValue(page([]));
    renderPage(<ApprovalsPage />);

    expect(await screen.findByText("Nothing waiting for approval.")).toBeTruthy();
  });

  it("shows an error and retries loading", async () => {
    list.mockRejectedValueOnce(new ApiError("Database is down", 500)).mockResolvedValue(page([submitted()]));
    const { user } = renderPage(<ApprovalsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to load approval queue");

    await user.click(button("Retry"));
    expect(await screen.findByText("Team offsite")).toBeTruthy();
  });
});

describe("price filter", () => {
  const minBox = () => screen.getByLabelText("Minimum price");
  const maxBox = () => screen.getByLabelText("Maximum price");
  const listedWith = (expected: object) =>
    waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining(expected), expect.anything()));

  it("refetches from the first page as the min and max price change", async () => {
    list.mockResolvedValue(page([submitted()], "cursor-2"));
    const { user } = renderPage(<ApprovalsPage />);
    await user.click(await screen.findByRole("button", { name: "Next" }));
    await listedWith({ cursor: "cursor-2" });

    await user.type(minBox(), "20");
    await listedWith({ minTotal: "20", maxTotal: "", cursor: undefined });
    await user.type(maxBox(), "50.5");
    await listedWith({ minTotal: "20", maxTotal: "50.5" });
  });

  it("ignores characters that are not digits or a decimal point", async () => {
    list.mockResolvedValue(page([submitted()]));
    const { user } = renderPage(<ApprovalsPage />);
    await screen.findByText("Team offsite");

    await user.type(minBox(), "-+e1a.5.2");
    expect((minBox() as HTMLInputElement).value).toBe("1.52");
    await listedWith({ minTotal: "1.52" });
  });

  it("blocks a max price lower than the min price until it is fixed", async () => {
    list.mockResolvedValue(page([submitted()]));
    const { user } = renderPage(<ApprovalsPage />);
    await screen.findByText("Team offsite");
    await user.type(minBox(), "50");
    await listedWith({ minTotal: "50" });
    const calls = list.mock.calls.length;

    await user.type(maxBox(), "10");
    expect((await screen.findByRole("alert")).textContent).toContain("Max price cannot be lower than min price");
    expect(maxBox().getAttribute("aria-invalid")).toBe("true");
    expect(list.mock.calls.length).toBe(calls);
    expect(screen.queryByText("Team offsite")).toBeNull(); // no results from a different filter
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    await user.type(maxBox(), "0");
    await listedWith({ minTotal: "50", maxTotal: "100" });
    expect(await screen.findByText("Team offsite")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("approving and rejecting", () => {
  it("approves an expense and removes it from the queue", async () => {
    list.mockResolvedValueOnce(page([submitted()])).mockResolvedValue(page([]));
    transition.mockResolvedValue(submitted({ status: "approved" }));
    const { user } = renderPage(<ApprovalsPage />);

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(transition).toHaveBeenCalledWith("s1", "approve", undefined);
    expect(await screen.findByText("Nothing waiting for approval.")).toBeTruthy();
  });

  it("requires a reason before rejecting, then sends it and closes the form", async () => {
    list.mockResolvedValueOnce(page([submitted()])).mockResolvedValue(page([]));
    transition.mockResolvedValue(submitted({ status: "rejected" }));
    const { user } = renderPage(<ApprovalsPage />);

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    expect(button("Confirm rejection")).toHaveProperty("disabled", true);

    await user.type(reasonBox(), "   ");
    expect(button("Confirm rejection")).toHaveProperty("disabled", true);

    await user.type(reasonBox(), "Too expensive");
    await user.click(button("Confirm rejection"));

    expect(transition).toHaveBeenCalledWith("s1", "reject", "Too expensive");
    await waitFor(() => expect(screen.queryByLabelText("Reason for rejection")).toBeNull());
    expect(await screen.findByText("Nothing waiting for approval.")).toBeTruthy();
  });

  it("cancels a rejection without calling the API", async () => {
    list.mockResolvedValue(page([submitted()]));
    const { user } = renderPage(<ApprovalsPage />);

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.type(reasonBox(), "Not sure");
    await user.click(button("Cancel"));

    expect(screen.queryByLabelText("Reason for rejection")).toBeNull();
    expect(button("Approve")).toBeTruthy();
    expect(transition).not.toHaveBeenCalled();
  });

  it("reports a failed decision and refreshes the stale queue", async () => {
    list.mockResolvedValueOnce(page([submitted()])).mockResolvedValue(page([]));
    transition.mockRejectedValue(new ApiError("Expense is no longer submitted", 409));
    const { user } = renderPage(<ApprovalsPage />);

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to update expense");
    expect(alert.textContent).toContain("Expense is no longer submitted");
    await waitFor(() => expect(screen.queryByText("Team offsite")).toBeNull());
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe("search", () => {
  it("searches submitted expenses once typing pauses", async () => {
    list.mockImplementation(async (params) =>
      params?.q ? page([submitted({ id: "t", title: "Taxi to airport" })]) : page([submitted()]),
    );
    const { user } = renderPage(<ApprovalsPage />);
    await screen.findByText("Team offsite");

    await user.type(screen.getByLabelText("Search expenses"), "taxi");

    expect(await screen.findByText("Taxi to airport")).toBeTruthy();
    expect(screen.queryByText("Team offsite")).toBeNull();
    lastListed("taxi");
    expect(list.mock.calls.filter(([params]) => params?.q)).toHaveLength(1); // debounced, not one call per key
  });

  it("explains when a search has no matches", async () => {
    list.mockImplementation(async (params) => (params?.q ? page([]) : page([submitted()])));
    const { user } = renderPage(<ApprovalsPage />);
    await screen.findByText("Team offsite");

    await user.type(screen.getByLabelText("Search expenses"), "zzz");

    expect(await screen.findByText(/No submitted expenses match/)).toBeTruthy();
  });
});

describe("pagination", () => {
  const first = () => page([submitted({ id: "a", title: "First page" })], "c1");
  const second = () => page([submitted({ id: "b", title: "Second page" })]);

  it("moves forward with the server cursor and back again", async () => {
    list.mockImplementation(async (params) => (params?.cursor === "c1" ? second() : first()));
    const { user } = renderPage(<ApprovalsPage />);

    await screen.findByText("First page");
    expect(button("Previous")).toHaveProperty("disabled", true);

    await user.click(button("Next"));
    expect(await screen.findByText("Second page")).toBeTruthy();
    lastListed("", "c1");
    expect(button("Next")).toHaveProperty("disabled", true);

    await user.click(button("Previous"));
    expect(await screen.findByText("First page")).toBeTruthy();
  });

  it("starts over from the first page when the search changes", async () => {
    list.mockImplementation(async (params) =>
      params?.q ? page([submitted({ id: "t", title: "Taxi to airport" })]) : params?.cursor === "c1" ? second() : first(),
    );
    const { user } = renderPage(<ApprovalsPage />);

    await screen.findByText("First page");
    await user.click(button("Next"));
    await screen.findByText("Second page");

    await user.type(screen.getByLabelText("Search expenses"), "taxi");

    expect(await screen.findByText("Taxi to airport")).toBeTruthy();
    lastListed("taxi");
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("keeps the same page after a decision so the next items can be handled", async () => {
    list.mockImplementation(async (params) => (params?.cursor === "c1" ? second() : first()));
    transition.mockResolvedValue(submitted({ status: "approved" }));
    const { user } = renderPage(<ApprovalsPage />);

    await screen.findByText("First page");
    await user.click(button("Next"));
    await screen.findByText("Second page");
    await user.click(button("Approve"));

    await waitFor(() => expect(transition).toHaveBeenCalledWith("b", "approve", undefined));
    expect(await screen.findByText("Second page")).toBeTruthy();
    lastListed("", "c1");
  });
});
