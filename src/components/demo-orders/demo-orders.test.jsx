import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { loadAccountDemoOrders } from "../../utils/demo-orders/account-demo-orders.utils";
import DemoOrders from "./demo-orders.component";

jest.mock("../../utils/demo-orders/account-demo-orders.utils", () => ({
  loadAccountDemoOrders: jest.fn(),
}));

const order = (id) => ({ id, placedAt: "2026-11-11T12:00:00.000Z", count: 1, total: 160 });

const history = (userId) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <DemoOrders userId={userId} />
  </MemoryRouter>
);

beforeEach(() => loadAccountDemoOrders.mockReset());

test("a late order history response cannot replace another account's orders", async () => {
  let resolveFirstAccount;
  loadAccountDemoOrders.mockReturnValueOnce(new Promise((resolve) => {
    resolveFirstAccount = resolve;
  })).mockResolvedValueOnce([order("DEMO-0000-0000-0002")]);

  const view = render(history("first-account"));
  expect(screen.getByRole("status")).toHaveTextContent("Loading demo orders…");
  view.rerender(history("second-account"));

  await screen.findByRole("link", { name: "View receipt for DEMO-0000-0000-0002" });
  await act(async () => {
    resolveFirstAccount([order("DEMO-0000-0000-0001")]);
  });

  expect(screen.queryByText("DEMO-0000-0000-0001")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View receipt for DEMO-0000-0000-0002" })).toBeInTheDocument();
});

test("retrying a failed order history load preserves receipt links", async () => {
  loadAccountDemoOrders
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce([order("DEMO-0000-0000-0001")]);

  render(history("demo-account"));
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

  const receipt = await screen.findByRole("link", { name: "View receipt for DEMO-0000-0000-0001" });
  expect(receipt).toHaveAttribute("href", "/checkout?receipt=DEMO-0000-0000-0001");
});
