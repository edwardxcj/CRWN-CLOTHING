import { useContext, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { CartContext, CartProvider } from "./contexts/cart.context";
import { UserContext, UserProvider } from "./contexts/user.context";
import { CategoriesContext } from "./contexts/categories.context";
import { loadAddressBook } from "./utils/addresses/addresses.utils";
import { loadOrderStates } from "./utils/demo-orders/order-center.utils";
import { loadUploadedAvatar, saveUploadedAvatar } from "./utils/profile/profile.utils";
import {
  loadAccountDemoOrder,
  loadAccountDemoOrders,
  saveAccountDemoOrder,
} from "./utils/demo-orders/account-demo-orders.utils";
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

jest.mock("./utils/admin/catalog-admin.utils", () => ({
  subscribeCatalogOverrides: (change) => { change({}, { ready: true }); return () => {}; },
  isCatalogAdmin: () => false,
}));

jest.mock("./utils/demo-orders/account-demo-orders.utils", () => ({
  loadAccountDemoOrder: jest.fn(),
  loadAccountDemoOrders: jest.fn(),
  saveAccountDemoOrder: jest.fn(),
}));

jest.mock("./utils/demo-orders/order-center.utils", () => ({
  ...jest.requireActual("./utils/demo-orders/order-center.utils"),
  loadOrderStates: jest.fn().mockResolvedValue({}),
}));
jest.mock("./utils/addresses/addresses.utils", () => ({
  ...jest.requireActual("./utils/addresses/addresses.utils"),
  loadAddressBook: jest.fn().mockResolvedValue({ addresses: [], defaultAddressId: "" }),
}));
jest.mock("./utils/profile/profile.utils", () => ({
  ...jest.requireActual("./utils/profile/profile.utils"),
  loadUploadedAvatar: jest.fn().mockResolvedValue(""),
  saveUploadedAvatar: jest.fn().mockResolvedValue(undefined),
}));

const fillDelivery = () => {
  for (const [name, value] of [["Full name", "Test shopper"], ["Street address", "1 Test Street"], ["City", "Sydney"], ["Postal code", "2000"], ["Country", "Australia"]]) {
    fireEvent.change(screen.getByLabelText(name), { target: { value } });
  }
};

const AccountCartHarness = ({ uid, children, initialItems = [] }) => {
  const [items, setItems] = useState(initialItems);
  return <CartContext.Provider value={{
    cartItems: items, cartCount: items.reduce((sum, item) => sum + item.quantity, 0),
    cartTotal: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    isCartOpen: false, setIsCartOpen: () => {}, isCartReady: true,
    cartSyncStatus: "ready", setIsCheckoutSaving: () => {},
    completeAccountCheckout: async (order) => { await saveAccountDemoOrder(order, uid); setItems([]); },
  }}>{children}</CartContext.Provider>;
};

const ReadyCatalogHarness = ({ children }) => {
  const catalog = useContext(CategoriesContext);
  return <CategoriesContext.Provider value={{ ...catalog, catalogReady: true }}>{children}</CategoriesContext.Provider>;
};

beforeEach(() => {
  window.localStorage.clear();
  loadAccountDemoOrders.mockResolvedValue([]);
  loadAddressBook.mockResolvedValue({ addresses: [], defaultAddressId: "" });
  loadOrderStates.mockResolvedValue({});
  loadUploadedAvatar.mockResolvedValue("");
  saveUploadedAvatar.mockResolvedValue(undefined);
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
    <ReadyCatalogHarness><CartProvider>{app}</CartProvider></ReadyCatalogHarness>
  </MemoryRouter>
);

test("a shared search URL leads to the matching product detail", () => {
  openStore("/shop?q=converse");

  expect(screen.getByRole("heading", { name: "Search results" })).toBeInTheDocument();
  expect(screen.getByText("1 product")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /Black Converse/ }));

  expect(screen.getByRole("heading", { name: "Black Converse" })).toBeInTheDocument();
  expect(document.title).toBe("Black Converse | CRWN Clothing");
  expect(screen.getByRole("button", { name: "Add to bag", exact: true })).toBeInTheDocument();
});

test("an unknown URL has a recovery page", () => {
  openStore("/a-page-that-does-not-exist");
  expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explore the shop" })).toHaveAttribute("href", "/shop");
});

test("sorting an existing category keeps the selected collection", () => {
  openStore("/shop/jackets");

  fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price-desc" } });

  expect(screen.getByRole("heading", { name: "Jackets" })).toBeInTheDocument();
  expect(screen.getByText("5 products")).toBeInTheDocument();
  const products = screen.getAllByRole("article");
  expect(within(products[0]).getByRole("link", { name: /Tan Trench/ })).toBeInTheDocument();
});

test("demo payment confirms delivery details and clears the saved bag", async () => {
  const key = "crwn-shopping-bag";
  window.localStorage.setItem(key, JSON.stringify([
    { id: 12, name: "Black Converse", price: 110, quantity: 2, variantKey: "12::black::US 6", size: "US 6", color: "Black" },
  ]));

  const { unmount } = openStore("/checkout");
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));

  expect(await screen.findByRole("heading", { name: "Demo payment successful" })).toHaveFocus();
  expect(screen.getByText(/\$220\.00/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Shopping bag, 0 items" })).toBeInTheDocument();

  unmount();
  openStore("/checkout");
  expect(screen.getByRole("heading", { name: "Your bag is empty" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Simulate payment" })).not.toBeInTheDocument();
});

test("a signed-in customer can reopen their demo receipt with fresh browser storage", async () => {
  const savedOrders = new Map();
  saveAccountDemoOrder.mockImplementation(async (order, uid) => {
    savedOrders.set(uid, order);
    return order;
  });
  loadAccountDemoOrders.mockImplementation(async (uid) => (
    savedOrders.has(uid) ? [savedOrders.get(uid)] : []
  ));
  loadAccountDemoOrder.mockImplementation(async (id, uid) => {
    const order = savedOrders.get(uid);
    return order?.id === id ? order : null;
  });

  const signedInApp = (uid, initialItems = []) => (
    <UserContext.Provider value={{
      currentUser: { uid, displayName: "Demo shopper", providerData: [] },
      isAuthReady: true,
    }}>
      <AccountCartHarness uid={uid} initialItems={initialItems}><App /></AccountCartHarness>
    </UserContext.Provider>
  );
  window.localStorage.setItem("crwn-shopping-bag", JSON.stringify([
    { id: 12, name: "Black Converse", price: 110, quantity: 2, variantKey: "12::black::US 6", size: "US 6", color: "Black" },
  ]));

  const checkout = openStore("/checkout", signedInApp("demo-shopper-1", [{ id: 12, name: "Black Converse", price: 110, quantity: 2, variantKey: "12::black::US 6", size: "US 6", color: "Black" }]));
  fillDelivery();
  fireEvent.click(screen.getByRole("button", { name: "Simulate payment" }));
  expect(await screen.findByText("Saved to your account. No money was charged.")).toBeInTheDocument();
  checkout.unmount();
  window.localStorage.clear();

  const account = openStore("/auth", signedInApp("demo-shopper-1"));
  const receipt = await screen.findByRole("link", { name: /View receipt for DEMO-/ });
  const receiptUrl = receipt.getAttribute("href");
  fireEvent.click(receipt);
  expect(await screen.findByText("Black Converse · Black / US 6")).toBeInTheDocument();
  expect(screen.getByText(/\$220\.00/)).toBeInTheDocument();
  account.unmount();

  openStore(receiptUrl, signedInApp("demo-shopper-2"));
  expect(await screen.findByRole("heading", { name: "Demo receipt unavailable" })).toBeInTheDocument();
  expect(screen.queryByText("Black Converse")).not.toBeInTheDocument();
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
