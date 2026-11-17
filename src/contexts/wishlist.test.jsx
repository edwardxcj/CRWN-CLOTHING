import { act, fireEvent, render, screen } from "@testing-library/react";

import { UserContext } from "./user.context";
import { WishlistContext, WishlistProvider } from "./wishlist.context";
import { saveWishlistProduct, subscribeWishlist } from "../utils/wishlist/wishlist.utils";

jest.mock("../utils/firebase/firebase.utils", () => ({}));
jest.mock("../utils/wishlist/wishlist.utils", () => ({
  subscribeWishlist: jest.fn(), saveWishlistProduct: jest.fn(), removeWishlistProduct: jest.fn(),
}));

const readWishlist = (value) => <>
  <p>{value.status}</p><p data-testid="ids">{value.productIds.join(",")}</p>
  <button onClick={() => value.toggleProduct(13)}>Save product</button>
  <button onClick={value.retry}>Retry wishlist</button>
</>;
const account = (uid) => <UserContext.Provider value={{ currentUser: { uid }, isAuthReady: true }}>
  <WishlistProvider><WishlistContext.Consumer>{readWishlist}</WishlistContext.Consumer></WishlistProvider>
</UserContext.Provider>;

beforeEach(() => {
  jest.clearAllMocks();
  subscribeWishlist.mockReturnValue(jest.fn());
});

test("switching accounts immediately hides saved products and ignores the old listener", () => {
  const view = render(account("first"));
  const firstChange = subscribeWishlist.mock.calls[0][1];
  act(() => firstChange([13]));
  expect(screen.getByTestId("ids")).toHaveTextContent("13");
  view.rerender(account("second"));
  expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
  act(() => firstChange([12, 13]));
  expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
  act(() => subscribeWishlist.mock.calls[1][1]([22]));
  expect(screen.getByTestId("ids")).toHaveTextContent("22");
});

test("saved hearts follow server snapshots and a failed load can be retried", async () => {
  let acknowledge;
  saveWishlistProduct.mockReturnValue(new Promise((resolve) => { acknowledge = resolve; }));
  render(account("first"));
  act(() => subscribeWishlist.mock.calls[0][1]([]));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
  await act(async () => acknowledge());
  act(() => subscribeWishlist.mock.calls[0][1]([13]));
  expect(screen.getByTestId("ids")).toHaveTextContent("13");
  act(() => subscribeWishlist.mock.calls[0][2](new Error("Connection lost")));
  expect(screen.getByText("error")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry wishlist" }));
  expect(screen.getByText("loading")).toBeInTheDocument();
  expect(subscribeWishlist).toHaveBeenCalledTimes(2);
});

test("a delayed write acknowledgement cannot overwrite a newer cross-device removal", async () => {
  let acknowledge;
  saveWishlistProduct.mockReturnValue(new Promise((resolve) => { acknowledge = resolve; }));
  render(account("first"));
  const receive = subscribeWishlist.mock.calls[0][1];
  act(() => receive([]));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  act(() => receive([13]));
  act(() => receive([]));
  await act(async () => acknowledge());
  expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
});
