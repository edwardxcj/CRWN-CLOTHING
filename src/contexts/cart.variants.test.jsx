import { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { CartContext, CartProvider } from "./cart.context";
import { getCartItemError, getProductVariants, selectedVariantItem } from "../utils/catalog/product-variants";
import { buildDemoOrder, readDemoOrder } from "../utils/demo-orders/demo-orders.utils";

const product = { id: 13, name: "Nike White AirForce", price: 160 };
const available = getProductVariants(product).filter((variant) => variant.stock > 0);
const first = selectedVariantItem(product, available[0]);
const second = selectedVariantItem(product, available[1]);

const BagHarness = () => {
  const bag = useContext(CartContext);
  return (
    <>
      <button onClick={() => bag.addItemToCart(first)}>Add first</button>
      <button onClick={() => bag.addItemToCart(second)}>Add second</button>
      <button onClick={() => bag.addItemToCart(product)}>Add missing size</button>
      <button onClick={() => bag.chooseItemVariant(bag.cartItems[0], available[0])}>Choose first size</button>
      <button onClick={() => { bag.setIsCheckoutSaving(true); bag.addItemToCart(second); }}>Save and add</button>
      <button onClick={() => bag.setIsCheckoutSaving(false)}>Finish saving</button>
      <output data-testid="bag">{JSON.stringify(bag.cartItems)}</output>
    </>
  );
};

const readBag = () => JSON.parse(screen.getByTestId("bag").textContent);

beforeEach(() => localStorage.clear());

test("sizes remain separate, quantity cannot exceed demo stock, and a receipt preserves both variants", () => {
  render(<CartProvider><BagHarness /></CartProvider>);
  fireEvent.click(screen.getByText("Add missing size"));
  expect(readBag()).toHaveLength(0);

  for (let count = 0; count < available[0].stock + 2; count += 1) {
    fireEvent.click(screen.getByText("Add first"));
  }
  fireEvent.click(screen.getByText("Add second"));
  const items = readBag();
  expect(items).toHaveLength(2);
  expect(items[0].quantity).toBe(available[0].stock);
  expect(items[1].quantity).toBe(1);
  expect(items[0].variantKey).not.toBe(items[1].variantKey);
  const receipt = buildDemoOrder(items);
  expect(readDemoOrder(receipt, receipt.id).items).toEqual(items);
});

test("a legacy bag remains until the shopper explicitly selects a size", () => {
  localStorage.setItem("crwn-shopping-bag", JSON.stringify([{ ...product, quantity: 2 }]));
  render(<CartProvider><BagHarness /></CartProvider>);
  expect(getCartItemError(readBag()[0])).toBe("Choose a size for Nike White AirForce.");
  fireEvent.click(screen.getByText("Choose first size"));
  expect(readBag()).toEqual([{ ...first, quantity: 2 }]);
  expect(getCartItemError(readBag()[0])).toBe("");
});

test("starting checkout blocks synchronous and subsequent bag edits until saving finishes", () => {
  render(<CartProvider><BagHarness /></CartProvider>);
  fireEvent.click(screen.getByText("Add first"));
  fireEvent.click(screen.getByText("Save and add"));
  fireEvent.click(screen.getByText("Add first"));
  expect(readBag()).toEqual([{ ...first, quantity: 1 }]);
  fireEvent.click(screen.getByText("Finish saving"));
  fireEvent.click(screen.getByText("Add second"));
  expect(readBag()).toHaveLength(2);
});
