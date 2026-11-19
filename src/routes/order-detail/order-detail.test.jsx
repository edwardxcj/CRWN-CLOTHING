import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { UserContext } from "../../contexts/user.context";
import { CartContext } from "../../contexts/cart.context";
import { loadAccountDemoOrder } from "../../utils/demo-orders/account-demo-orders.utils";
import { loadOrderState, transitionDemoOrder } from "../../utils/demo-orders/order-center.utils";
import { loadSupportRequests, submitSupportRequest } from "../../utils/support/support.utils";
import OrderDetail from "./order-detail.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));
jest.mock("../../utils/demo-orders/account-demo-orders.utils", () => ({ loadAccountDemoOrder: jest.fn() }));
jest.mock("../../utils/demo-orders/order-center.utils", () => ({
  loadOrderState: jest.fn(), transitionDemoOrder: jest.fn(), formatActivityDate: () => "19 Nov 2026",
  orderStatusLabels: { processing: "Processing", shipped: "Demo dispatched", delivered: "Demo delivered", cancelled: "Cancelled" },
}));
jest.mock("../../utils/support/support.utils", () => ({ loadSupportRequests: jest.fn(), submitSupportRequest: jest.fn() }));

const orderId = "DEMO-0000-0000-0001";
const order = {
  id: orderId, placedAt: "2026-11-19T00:00:00.000Z", total: 160, count: 1,
  items: [{ id: 13, name: "Nike White AirForce", color: "White", size: "US 9", quantity: 1, price: 160 }],
  shippingAddress: { recipient: "Test recipient", line1: "1 Example Street", line2: "", city: "Example city", region: "Example region", postalCode: "2000", country: "Australia" },
};
const renderOrder = (addItemsToCart = jest.fn(async () => {})) => render(
  <MemoryRouter initialEntries={[`/orders/${orderId}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <UserContext.Provider value={{ currentUser: { uid: "owner" }, isAuthReady: true }}>
      <CartContext.Provider value={{ cartItems: [], addItemsToCart }}>
        <Routes><Route path="/orders/:orderId" element={<OrderDetail />} /></Routes>
      </CartContext.Provider>
    </UserContext.Provider>
  </MemoryRouter>
);

beforeEach(() => {
  loadAccountDemoOrder.mockResolvedValue(order);
  loadSupportRequests.mockResolvedValue([]);
  loadOrderState.mockResolvedValue({ status: "processing" });
  transitionDemoOrder.mockImplementation(async (_uid, _id, status) => { loadOrderState.mockResolvedValue({ status }); });
  submitSupportRequest.mockResolvedValue(`return-${orderId}`);
});

test("demo dispatch and delivery reveal an order-linked return form and preserve delivery address", async () => {
  renderOrder();
  fireEvent.click(await screen.findByRole("button", { name: "Simulate dispatch" }));
  fireEvent.click(await screen.findByRole("button", { name: "Simulate delivery" }));
  const reason = await screen.findByLabelText("Reason for return");
  fireEvent.change(reason, { target: { value: "I would like a different size." } });
  fireEvent.click(screen.getByRole("button", { name: "Submit demo return request" }));
  expect(await screen.findByText(/Your demo return request has been saved/)).toBeInTheDocument();
  expect(submitSupportRequest).toHaveBeenCalledWith("owner", {
    type: "return", orderId, subject: `Return for ${orderId}`, message: "I would like a different size.",
  });
  expect(screen.getByText(/Test recipient/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel demo order" })).not.toBeInTheDocument();
});

test("buy again adds current available variants and reports a missing old size", async () => {
  loadAccountDemoOrder.mockResolvedValue({ ...order, items: [...order.items, { id: 12, name: "Black Converse", price: 110, quantity: 1 }] });
  const addItemsToCart = jest.fn(async () => {});
  renderOrder(addItemsToCart);
  fireEvent.click(await screen.findByRole("button", { name: "Buy again" }));
  expect(await screen.findByText(/Available items were added to your bag at current prices/)).toHaveTextContent("Black Converse — choose a size");
  expect(addItemsToCart).toHaveBeenCalledWith([expect.objectContaining({ id: 13, quantity: 1, size: "US 9", color: "White" })]);
});
