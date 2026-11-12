import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CartProvider } from "../../contexts/cart.context";
import { UserContext } from "../../contexts/user.context";
import {
  loadAccountDemoOrder,
  saveAccountDemoOrder,
} from "../../utils/demo-orders/account-demo-orders.utils";
import Checkout from "./checkout.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));
jest.mock("../../utils/demo-orders/account-demo-orders.utils", () => ({
  loadAccountDemoOrder: jest.fn(),
  saveAccountDemoOrder: jest.fn(),
}));

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("an unconfirmed account save preserves the bag and retries the same order", async () => {
  const cartKey = "crwn-shopping-bag";
  const userId = "retry-shopper";
  const savedBag = JSON.stringify([{ id: 12, name: "Black Converse", price: 110, quantity: 2 }]);
  window.localStorage.setItem(cartKey, savedBag);

  saveAccountDemoOrder
    .mockRejectedValueOnce(new Error("No response from Firestore"))
    .mockImplementationOnce(async (order) => {
      loadAccountDemoOrder.mockResolvedValue(order);
      return order;
    });

  render(
    <MemoryRouter initialEntries={["/checkout"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserContext.Provider value={{ currentUser: { uid: userId }, isAuthReady: true }}>
        <CartProvider><Checkout /></CartProvider>
      </UserContext.Provider>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(screen.getByRole("button", { name: "Saving demo order…" })).toBeDisabled();
  expect(window.localStorage.getItem(cartKey)).toBe(savedBag);
  expect(await screen.findByRole("alert")).toHaveTextContent("Your bag is still here.");
  expect(window.localStorage.getItem(cartKey)).toBe(savedBag);

  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(await screen.findByRole("heading", { name: "Demo payment successful" })).toBeInTheDocument();
  expect(window.localStorage.getItem(cartKey)).toBe("[]");
  expect(saveAccountDemoOrder).toHaveBeenCalledTimes(2);
  expect(saveAccountDemoOrder.mock.calls[1][0]).toBe(saveAccountDemoOrder.mock.calls[0][0]);
});
