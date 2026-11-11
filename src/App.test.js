import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { CartProvider } from "./contexts/cart.context";

jest.mock("./utils/firebase/firebase.utils", () => ({
  getCategoriesAndDocuments: jest.fn(),
  signOutUser: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openStore = (url) => render(
  <MemoryRouter
    initialEntries={[url]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <CartProvider><App /></CartProvider>
  </MemoryRouter>
);

test("a shared search URL leads to the matching product detail", () => {
  openStore("/shop?q=converse");

  expect(screen.getByRole("heading", { name: "Search results" })).toBeInTheDocument();
  expect(screen.getByText("1 product")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /Black Converse/ }));

  expect(screen.getByRole("heading", { name: "Black Converse" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add to bag", exact: true })).toBeInTheDocument();
});

test("sorting an existing category keeps the selected collection", () => {
  openStore("/shop/jackets");

  fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price-desc" } });

  expect(screen.getByRole("heading", { name: "Jackets" })).toBeInTheDocument();
  expect(screen.getByText("5 products")).toBeInTheDocument();
  const products = screen.getAllByRole("article");
  expect(within(products[0]).getByRole("link", { name: /Tan Trench/ })).toBeInTheDocument();
});

test("demo payment confirms the bag total and clears the saved bag", () => {
  const key = "crwn-shopping-bag";
  window.localStorage.setItem(key, JSON.stringify([
    { id: 12, name: "Black Converse", price: 110, quantity: 2 },
  ]));

  const { unmount } = openStore("/checkout");
  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));

  expect(screen.getByRole("heading", { name: "Demo payment successful" })).toHaveFocus();
  expect(screen.getByText(/\$220\.00/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Shopping bag, 0 items" })).toBeInTheDocument();

  unmount();
  openStore("/checkout");
  expect(screen.getByRole("heading", { name: "Your bag is empty" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Simulate payment" })).not.toBeInTheDocument();
});
