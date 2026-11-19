import { StrictMode, useContext, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CartContext, CartProvider } from "./cart.context";
import { UserContext } from "./user.context";
import { applyCartOperation, commitAccountCheckout, subscribeAccountCart, updateAccountCart } from "../utils/cart/cart.utils";
import { buildDemoOrder } from "../utils/demo-orders/demo-orders.utils";
import { getProductVariants, selectedVariantItem } from "../utils/catalog/product-variants";

jest.mock("../utils/firebase/firebase.utils", () => ({}));
jest.mock("../utils/cart/cart.utils", () => ({
  ...jest.requireActual("../utils/cart/cart.utils"),
  subscribeAccountCart: jest.fn(), updateAccountCart: jest.fn(), commitAccountCheckout: jest.fn(),
}));

const product = { id: 13, name: "Nike White AirForce", price: 160 };
const chosen = { ...selectedVariantItem(product, getProductVariants(product).find((option) => option.stock > 2)), quantity: 1 };
const records = new Map();
const listeners = new Map();
const processed = new Set();
let revision = 0;

const Bag = () => {
  const bag = useContext(CartContext);
  const [checkoutError, setCheckoutError] = useState("");
  return <>
    <output data-testid="items">{JSON.stringify(bag.cartItems)}</output>
    <output data-testid="sync">{bag.cartSyncStatus}</output>
    <button onClick={() => bag.addItemToCart(chosen)}>Add shoes</button>
    <button onClick={() => bag.completeAccountCheckout(buildDemoOrder([chosen])).catch((error) => setCheckoutError(error.message))}>Checkout</button>
    <button onClick={bag.retryCartSync}>Retry bag sync</button>
    <output data-testid="checkout-error">{checkoutError}</output>
  </>;
};
const store = (uid) => <StrictMode><UserContext.Provider value={{ currentUser: uid ? { uid } : null, isAuthReady: true }}><CartProvider><Bag /></CartProvider></UserContext.Provider></StrictMode>;
const items = () => JSON.parse(screen.getByTestId("items").textContent);

beforeEach(() => {
  localStorage.clear(); records.clear(); listeners.clear(); processed.clear(); revision = 0;
  commitAccountCheckout.mockReset();
  subscribeAccountCart.mockImplementation((uid, onChange) => {
    listeners.set(uid, onChange);
    onChange(records.get(uid) || [], revision);
    return () => { if (listeners.get(uid) === onChange) listeners.delete(uid); };
  });
  updateAccountCart.mockImplementation(async (uid, operation) => {
    const key = uid + operation.id;
    if (!processed.has(key)) {
      records.set(uid, applyCartOperation(records.get(uid), operation));
      processed.add(key);
      revision += 1;
      listeners.get(uid)?.(records.get(uid), revision);
    }
    return { items: records.get(uid) || [], revision };
  });
});

test("guest transfer survives StrictMode and reload without duplicating quantities", async () => {
  localStorage.setItem("crwn-shopping-bag", JSON.stringify([chosen]));
  const first = render(store("owner"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  expect(items()).toEqual([chosen]);
  expect(localStorage.getItem("crwn-shopping-bag")).toBe("[]");
  first.unmount();

  render(store("owner"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  expect(items()).toEqual([chosen]);
  expect(records.get("owner")).toEqual([chosen]);
});

test("switching accounts shows separate server carts and never imports another account's bag", async () => {
  const view = render(store("owner"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  fireEvent.click(screen.getByText("Add shoes"));
  await waitFor(() => expect(items()).toHaveLength(1));

  view.rerender(store("other"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  expect(items()).toEqual([]);
  fireEvent.click(screen.getByText("Add shoes"));
  await waitFor(() => expect(items()).toHaveLength(1));
  view.rerender(store("owner"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  expect(items()[0].quantity).toBe(1);
  expect(records.get("other")[0].quantity).toBe(1);
});

test("retrying an older transfer also preserves a newly added guest bag", async () => {
  const another = { ...chosen, quantity: 1, size: "US 7", variantKey: "13::white::US 7" };
  localStorage.setItem("crwn-cart-transfer:owner", JSON.stringify({ id: "older-transfer", items: [chosen] }));
  localStorage.setItem("crwn-shopping-bag", JSON.stringify([another]));
  render(store("owner"));
  await waitFor(() => expect(items()).toHaveLength(2));
  expect(records.get("owner").map((item) => item.size).sort()).toEqual([chosen.size, "US 7"].sort());
  await waitFor(() => expect(localStorage.getItem("crwn-cart-transfer:owner")).toBeNull());
  expect(localStorage.getItem("crwn-shopping-bag")).toBe("[]");
});

test("checkout failures stay in the checkout flow and are never replayed by bag sync retry", async () => {
  records.set("owner", [chosen]);
  commitAccountCheckout.mockRejectedValueOnce(new Error("Order save interrupted"));
  render(store("owner"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  fireEvent.click(screen.getByText("Checkout"));
  await waitFor(() => expect(screen.getByTestId("checkout-error")).toHaveTextContent("Order save interrupted"));
  expect(screen.getByTestId("sync")).toHaveTextContent("ready");
  expect(items()).toEqual([chosen]);

  fireEvent.click(screen.getByText("Retry bag sync"));
  await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
  expect(commitAccountCheckout).toHaveBeenCalledTimes(1);
  expect(items()).toEqual([chosen]);
});
