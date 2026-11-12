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
    expect(screen.getByRole("link", { name: /Nike White AirForce/ })).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole("link", { name: /Nike White AirForce/ }));
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

  fireEvent.click(screen.getByRole("link", { name: /Nike White AirForce/ }));
  fireEvent.click(screen.getByRole("link", { name: /Black Converse/ }));
  expect(screen.getByRole("heading", { name: "Black Converse" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Browser Back" }));
  expect(screen.getByRole("heading", { name: "Nike White AirForce" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("link", { name: /Black Converse/ }));
  const returnLink = screen.getByRole("link", { name: "Back to search results" });
  expect(returnLink).toHaveAttribute("href", catalogUrl);
  fireEvent.click(returnLink);

  expect(screen.getByLabelText("Current URL")).toHaveTextContent(catalogUrl);
  expect(window.scrollY).toBe(420);
});
