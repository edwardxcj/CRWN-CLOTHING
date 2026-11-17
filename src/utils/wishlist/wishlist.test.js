import { collection, doc, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/firebase.utils";
import { removeWishlistProduct, saveWishlistProduct, subscribeWishlist } from "./wishlist.utils";

jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: { uid: "first" } }, db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, ...parts) => parts.join("/")),
  doc: jest.fn((reference, id) => `${reference}/${id}`),
  serverTimestamp: jest.fn(() => "SERVER_TIME"),
  getDocsFromServer: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: "first" };
  collection.mockImplementation((db, ...parts) => parts.join("/"));
  doc.mockImplementation((reference, id) => `${reference}/${id}`);
  serverTimestamp.mockReturnValue("SERVER_TIME");
  getDocsFromServer.mockReturnValue(new Promise(() => {}));
  onSnapshot.mockReturnValue(jest.fn());
});

test("wishlist saves use the account path and wait for server acknowledgement", async () => {
  let acknowledge;
  const set = jest.fn();
  runTransaction.mockImplementation(async (db, update) => {
    await update({ get: async () => ({}), set });
    return new Promise((resolve) => { acknowledge = resolve; });
  });
  const saved = jest.fn();
  const request = saveWishlistProduct("first", "13").then(saved);
  await Promise.resolve();
  expect(set).toHaveBeenCalledWith("users/first/wishlist/13", { productId: 13, savedAt: "SERVER_TIME" });
  expect(saved).not.toHaveBeenCalled();
  await Promise.resolve();
  acknowledge();
  await request;
  expect(saved).toHaveBeenCalled();
  await expect(removeWishlistProduct("other", 13)).rejects.toThrow("Sign in");
  expect(runTransaction).toHaveBeenCalledTimes(1);
});

test("wishlist subscriptions ignore optimistic cache data and previous account responses", () => {
  const changed = jest.fn();
  const failed = jest.fn();
  const unsubscribe = subscribeWishlist("first", changed, failed);
  const receive = onSnapshot.mock.calls[0][2];
  const snapshot = {
    docs: [{ id: "13", data: () => ({ productId: 13 }) }],
    metadata: { fromCache: true, hasPendingWrites: true },
  };
  receive(snapshot);
  expect(changed).not.toHaveBeenCalled();
  receive({ ...snapshot, metadata: { fromCache: false, hasPendingWrites: false } });
  expect(changed).toHaveBeenLastCalledWith([13]);
  auth.currentUser = { uid: "other" };
  changed.mockClear();
  receive({ ...snapshot, metadata: { fromCache: false, hasPendingWrites: false } });
  expect(changed).not.toHaveBeenCalled();
  unsubscribe();
  expect(onSnapshot.mock.results[0].value).toHaveBeenCalled();
});
