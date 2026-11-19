import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

import App from "../../App";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));

const BrowserHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output aria-label="Current URL">{location.pathname + location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>Browser Back</button>
    </>
  );
};

const openShop = (url) => render(
  <MemoryRouter
    initialEntries={[url]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <BrowserHistory />
    <App />
  </MemoryRouter>
);

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation((_, top) => {
    window.scrollY = top;
  });
});

afterEach(() => {
  window.scrollY = 0;
  jest.restoreAllMocks();
});

test.each(["air force", "airforce", "Níké white air-force"])(
  "finds the same sneaker for %s and respects the selected collection",
  (query) => {
    openShop(`/shop/sneakers?${new URLSearchParams({ q: query })}`);

    expect(screen.getByText("1 product")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Sneakers Nike White AirForce/ })).toBeInTheDocument();

    const categories = within(screen.getByRole("navigation", { name: "Shop categories" }));
    fireEvent.click(categories.getByRole("link", { name: "Hats" }));
    expect(screen.getByRole("heading", { name: "No matching products" })).toBeInTheDocument();
  }
);

test.each(["Back to search results", "Browser Back"])(
  "%s restores the category, query, sort, and scroll position",
  (backAction) => {
    const catalogUrl = "/shop/sneakers?q=nike&sort=price-desc";
    openShop(catalogUrl);
    window.scrollY = 420;

    fireEvent.click(screen.getByRole("link", { name: /^Sneakers Nike White AirForce/ }));
    expect(screen.getByRole("heading", { name: "Nike White AirForce" })).toBeInTheDocument();
    const returnLink = screen.getByRole("link", { name: "Back to search results" });
    expect(returnLink).toHaveAttribute("href", catalogUrl);
    expect(window.scrollY).toBe(0);

    fireEvent.click(
      backAction === "Browser Back" ? screen.getByRole("button", { name: backAction }) : returnLink
    );
    expect(screen.getByLabelText("Current URL")).toHaveTextContent(catalogUrl);
    expect(screen.getByLabelText("Sort by")).toHaveValue("price-desc");
    expect(window.scrollY).toBe(420);
  }
);

test("a directly opened product offers a link to its collection", () => {
  openShop("/shop/product/13");
  fireEvent.click(screen.getByRole("link", { name: "Back to Sneakers" }));

  expect(screen.getByLabelText("Current URL")).toHaveTextContent("/shop/sneakers");
  expect(screen.getByRole("heading", { name: "Sneakers" })).toBeInTheDocument();
});

test("related products keep the original list return and one-step browser history", () => {
  const catalogUrl = "/shop/sneakers?q=nike&sort=price-desc";
  openShop(catalogUrl);
  window.scrollY = 420;

  fireEvent.click(screen.getByRole("link", { name: /^Sneakers Nike White AirForce/ }));
  fireEvent.click(within(screen.getByRole("region", { name: "More from Sneakers" })).getByRole("link", { name: /^Sneakers Nike Red High Tops/ }));
  expect(screen.getByRole("heading", { name: "Nike Red High Tops" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Browser Back" }));
  expect(screen.getByRole("heading", { name: "Nike White AirForce" })).toBeInTheDocument();

  fireEvent.click(within(screen.getByRole("region", { name: "More from Sneakers" })).getByRole("link", { name: /^Sneakers Nike Red High Tops/ }));
  const returnLink = screen.getByRole("link", { name: "Back to search results" });
  expect(returnLink).toHaveAttribute("href", catalogUrl);
  fireEvent.click(returnLink);

  expect(screen.getByLabelText("Current URL")).toHaveTextContent(catalogUrl);
  expect(window.scrollY).toBe(420);
});

test("shared URLs combine price, size, colour, brand and stock on the same product variant", () => {
  const params = new URLSearchParams({ min: "150", max: "170", size: "US 9", color: "white", brand: "Nike", inStock: "1" });
  openShop(`/shop/sneakers?${params}`);

  expect(screen.getByText("1 product")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Sneakers Nike White AirForce/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Sneakers Nike Red High Tops/ })).not.toBeInTheDocument();
});

test("stock filtering applies to the selected size, not another size on the product", () => {
  const params = new URLSearchParams({ size: "US 7", color: "red-and-white", brand: "Nike", inStock: "1" });
  openShop(`/shop/sneakers?${params}`);

  expect(screen.getByRole("heading", { name: "No matching products" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove In stock only filter" }));
  expect(screen.getByRole("link", { name: /^Sneakers Nike Red High Tops/ })).toBeInTheDocument();
});

test("filter controls support multiple choices and clear all while retaining the collection and sort", () => {
  openShop("/shop/sneakers?sort=price-desc&q=nike");
  fireEvent.click(screen.getByText("Filters", { exact: true }));
  fireEvent.change(screen.getByLabelText("Minimum price in USD"), { target: { value: "150" } });
  fireEvent.change(screen.getByLabelText("Maximum price in USD"), { target: { value: "170" } });
  const colour = screen.getByRole("group", { name: "Colour" });
  fireEvent.click(within(colour).getByLabelText("White", { exact: true }));
  fireEvent.click(within(colour).getByLabelText("Red and white", { exact: true }));

  expect(screen.getByText("2 products")).toBeInTheDocument();
  expect(screen.getByLabelText("Current URL").textContent).toContain("color=white&color=red-and-white");
  fireEvent.click(screen.getByRole("button", { name: "Remove Colour: White filter" }));
  expect(screen.getByText("1 product")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear all", exact: true }));
  expect(screen.getByLabelText("Current URL")).toHaveTextContent("/shop/sneakers?sort=price-desc");
  expect(screen.getByText("8 products")).toBeInTheDocument();
});

test("the product breadcrumb restores all filters and scroll position", () => {
  const catalogUrl = "/shop/sneakers?sort=price-desc&min=150&max=170&color=white&size=US+9&brand=Nike&inStock=1";
  openShop(catalogUrl);
  window.scrollY = 360;
  fireEvent.click(screen.getByRole("link", { name: /^Sneakers Nike White AirForce/ }));
  const breadcrumbs = within(screen.getByRole("navigation", { name: "Breadcrumb" }));
  fireEvent.click(breadcrumbs.getByRole("link", { name: "Sneakers", exact: true }));

  expect(screen.getByLabelText("Current URL")).toHaveTextContent(catalogUrl);
  expect(window.scrollY).toBe(360);
  expect(screen.getByText("1 product")).toBeInTheDocument();
});
