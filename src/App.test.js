import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { CartProvider } from "./contexts/cart.context";
import { UserProvider } from "./contexts/user.context";
import {
  createUserDocumentFromAuth,
  onAuthStateChangedListener,
  updateUserProfile,
} from "./utils/firebase/firebase.utils";

jest.mock("./utils/firebase/firebase.utils", () => ({
  getCategoriesAndDocuments: jest.fn(),
  createUserDocumentFromAuth: jest.fn(),
  onAuthStateChangedListener: jest.fn(),
  updateUserProfile: jest.fn(),
  signOutUser: jest.fn(),
}));

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openStore = (url, app = <App />) => render(
  <MemoryRouter
    initialEntries={[url]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <CartProvider>{app}</CartProvider>
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

test("a signed-in customer can save their profile without changing their login email", async () => {
  const user = {
    uid: "customer-1",
    displayName: "Alex",
    email: "alex@example.test",
    photoURL: "https://example.test/old-avatar.jpg",
    providerData: [{ providerId: "google.com" }],
  };
  createUserDocumentFromAuth.mockResolvedValue(undefined);
  onAuthStateChangedListener.mockImplementation((listener) => {
    listener(user);
    return () => {};
  });
  updateUserProfile
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockImplementation(async (currentUser, changes) => {
      Object.assign(currentUser, changes);
    });

  openStore("/auth", <UserProvider><App /></UserProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: " Alex Lee " } });
  fireEvent.change(screen.getByLabelText(/Profile photo link/), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t save your profile.");
  expect(screen.getByLabelText("Display name")).toHaveValue(" Alex Lee ");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
  expect(updateUserProfile).toHaveBeenCalledWith(user, { displayName: "Alex Lee", photoURL: null });
  expect(screen.getAllByText("Alex Lee").length).toBeGreaterThan(0);
  expect(screen.getByText("alex@example.test")).toBeInTheDocument();
});
