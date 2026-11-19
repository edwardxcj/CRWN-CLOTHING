import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CartContext, CartProvider } from "../../contexts/cart.context";
import { CategoriesContext } from "../../contexts/categories.context";
import { UserContext } from "../../contexts/user.context";
import {
  loadAccountDemoOrder,
} from "../../utils/demo-orders/account-demo-orders.utils";
import { commitAccountCheckout } from "../../utils/cart/cart.utils";
import { loadAddressBook } from "../../utils/addresses/addresses.utils";
import Checkout from "./checkout.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));
jest.mock("../../utils/demo-orders/account-demo-orders.utils", () => ({
  loadAccountDemoOrder: jest.fn(),
}));

jest.mock("../../utils/cart/cart.utils", () => ({
  ...jest.requireActual("../../utils/cart/cart.utils"),
  subscribeAccountCart: (_uid, change) => {
    change([{ id: 12, name: "Black Converse", price: 110, quantity: 2, variantKey: "12::black::US 6", size: "US 6", color: "Black" }], 1);
    return () => {};
  },
  commitAccountCheckout: jest.fn(),
}));
jest.mock("../../utils/addresses/addresses.utils", () => ({
  ...jest.requireActual("../../utils/addresses/addresses.utils"),
  loadAddressBook: jest.fn().mockResolvedValue({ addresses: [], defaultAddressId: "" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  loadAddressBook.mockResolvedValue({ addresses: [], defaultAddressId: "" });
});
afterEach(() => jest.restoreAllMocks());

test("an unconfirmed account save preserves the bag and retries the same order", async () => {
  const cartKey = "crwn-shopping-bag";
  const userId = "retry-shopper";

  commitAccountCheckout
    .mockRejectedValueOnce(new Error("No response from Firestore"))
    .mockImplementationOnce(async (_uid, order) => {
      loadAccountDemoOrder.mockResolvedValue(order);
      return { items: [], revision: 2 };
    });

  render(
    <MemoryRouter initialEntries={["/checkout"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserContext.Provider value={{ currentUser: { uid: userId }, isAuthReady: true }}>
        <CategoriesContext.Provider value={{ catalogReady: true }}><CartProvider><Checkout /></CartProvider></CategoriesContext.Provider>
      </UserContext.Provider>
    </MemoryRouter>
  );

  for (const [name, value] of [["Full name", "Test shopper"], ["Street address", "1 Test Street"], ["City", "Sydney"], ["Postal code", "2000"], ["Country", "Australia"]]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }

  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(screen.getByRole("button", { name: "Saving demo order…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Increase quantity for Black Converse, Black, US 6" })).toBeDisabled();
  expect(screen.getByLabelText("Size for Black Converse, US 6")).toBeDisabled();
  expect(screen.getByRole("heading", { name: "2 items" })).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Your bag is still here.");
  expect(screen.getByRole("heading", { name: "2 items" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Increase quantity for Black Converse, Black, US 6" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(await screen.findByRole("heading", { name: "Demo payment successful" })).toBeInTheDocument();
  expect(window.localStorage.getItem(cartKey)).toBe("[]");
  expect(commitAccountCheckout).toHaveBeenCalledTimes(2);
  expect(commitAccountCheckout.mock.calls[1][1]).toBe(commitAccountCheckout.mock.calls[0][1]);
});

test("checkout waits for server-confirmed catalog data and can retry a failed product check", () => {
  const complete = jest.fn();
  const retry = jest.fn();
  const cartItem = { id: 12, name: "Black Converse", price: 110, quantity: 2, variantKey: "12::black::US 6", size: "US 6", color: "Black" };
  const checkout = (catalogReady, catalogAdminError = "") => <MemoryRouter initialEntries={["/checkout"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <UserContext.Provider value={{ currentUser: { uid: "shopper" }, isAuthReady: true }}>
      <CategoriesContext.Provider value={{ catalogReady, catalogAdminError, retryCatalogOverrides: retry }}>
        <CartContext.Provider value={{ cartItems: [cartItem], cartCount: 2, cartTotal: 220, isCartReady: true, completeAccountCheckout: complete, setIsCheckoutSaving: () => {} }}><Checkout /></CartContext.Provider>
      </CategoriesContext.Provider>
    </UserContext.Provider>
  </MemoryRouter>;
  const view = render(checkout(false));
  for (const [name, value] of [["Full name", "Test shopper"], ["Street address", "1 Test Street"], ["City", "Sydney"], ["Postal code", "2000"], ["Country", "Australia"]]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }
  expect(screen.getByText("Checking current prices and stock…")).toBeInTheDocument();
  const payment = screen.getByRole("button", { name: "Simulate payment" });
  expect(payment).toBeDisabled();
  fireEvent.click(payment);
  expect(complete).not.toHaveBeenCalled();
  view.rerender(checkout(false, "Offline"));
  fireEvent.click(screen.getByRole("button", { name: "Retry product check" }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(payment).toBeDisabled();
  view.rerender(checkout(true));
  expect(payment).toBeEnabled();
  expect(screen.queryByText("Checking current prices and stock…")).not.toBeInTheDocument();
});
