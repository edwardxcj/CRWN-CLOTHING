import { fireEvent, render, screen } from "@testing-library/react";

import { getProductVariants } from "../../utils/catalog/product-variants";
import ProductDetails from "./product-details.component";

jest.mock("../wishlist-button/wishlist-button.component", () => () => <button>Save product</button>);
jest.mock("../../utils/firebase/firebase.utils", () => ({}));

test("a shopper must choose an available size and the selected color and size accompany the product", () => {
  const product = { id: 13, name: "Nike White AirForce", price: 160, category: "sneakers" };
  const onAdd = jest.fn();
  render(<ProductDetails product={product} onAddToCart={onAdd} />);
  const add = screen.getByRole("button", { name: "Add to bag" });
  expect(add).toBeDisabled();
  const variants = getProductVariants(product);
  const soldOut = variants.find((variant) => variant.stock === 0);
  expect(screen.getByRole("radio", { name: `${soldOut.size} — out of stock` })).toBeDisabled();
  const available = variants.find((variant) => variant.stock > 0);
  fireEvent.click(screen.getByRole("radio", { name: available.size, exact: true }));
  expect(add).toBeEnabled();
  fireEvent.click(add);
  expect(onAdd).toHaveBeenCalledWith({
    ...product,
    color: "White",
    size: available.size,
    variantKey: available.key,
  });
});

test("the product gallery switches from the campaign photo to the detail view", () => {
  const product = { id: 13, name: "Nike White AirForce", price: 160, category: "sneakers" };
  render(<ProductDetails product={product} onAddToCart={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Show detail view of Nike White AirForce" }));
  expect(screen.getByRole("img", { name: product.name })).toHaveAttribute("src", "/media/catalog/detail/white-nike-high-tops-detail.webp");
  fireEvent.click(screen.getByRole("button", { name: "Show campaign view of Nike White AirForce" }));
  expect(screen.getByRole("img", { name: product.name })).toHaveAttribute("src", "/media/catalog/studio/white-nike-high-tops.webp");
});
