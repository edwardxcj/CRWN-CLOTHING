import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CartProvider } from "../../contexts/cart.context";
import { UserContext } from "../../contexts/user.context";
import { listDemoOrders } from "../../utils/demo-orders/demo-orders.utils";
import Checkout from "./checkout.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("a failed demo order save preserves the bag and can be retried", () => {
  const cartKey = "crwn-shopping-bag";
  const userId = "retry-shopper";
  const savedBag = JSON.stringify([{ id: 12, name: "Black Converse", price: 110, quantity: 2 }]);
  window.localStorage.setItem(cartKey, savedBag);

  const write = Storage.prototype.setItem;
  const save = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
    if (key !== cartKey) throw new Error("Demo order storage unavailable");
    write.call(this, key, value);
  });

  render(
    <MemoryRouter initialEntries={["/checkout"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserContext.Provider value={{ currentUser: { uid: userId }, isAuthReady: true }}>
        <CartProvider><Checkout /></CartProvider>
      </UserContext.Provider>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Your bag is still here.");
  expect(window.localStorage.getItem(cartKey)).toBe(savedBag);
  expect(listDemoOrders(userId)).toHaveLength(0);

  save.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(screen.getByRole("heading", { name: "Demo payment successful" })).toBeInTheDocument();
  expect(window.localStorage.getItem(cartKey)).toBe("[]");
  expect(listDemoOrders(userId)).toHaveLength(1);
});
