import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

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
    <App />
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
