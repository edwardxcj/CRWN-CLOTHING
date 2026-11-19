import { getDocsFromServer, onSnapshot, runTransaction } from "firebase/firestore";

import { auth } from "../firebase/firebase.utils";
import { saveCatalogOverride, subscribeCatalogOverrides } from "./catalog-admin.utils";

jest.mock("firebase/firestore", () => ({
  collection: (_db, name) => name,
  doc: (_db, ...path) => path.join("/"),
  onSnapshot: jest.fn(),
  getDocsFromServer: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: () => "server-time",
}));
jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: null }, db: {} }));

const owner = { uid: "owner", email: "edwardxcj@gmail.com", emailVerified: true, providerData: [{ providerId: "google.com" }] };
const product = { productId: 13, name: "White High Tops", description: "Updated product", price: 160, active: true, stock: { "US 9": 3 }, images: [] };

beforeEach(() => { jest.clearAllMocks(); auth.currentUser = owner; });

test("product updates wait for a server transaction and use the fixed product document", async () => {
  const write = jest.fn();
  runTransaction.mockImplementation(async (_db, callback) => callback({ get: jest.fn().mockResolvedValue({}), set: write }));
  await saveCatalogOverride(owner, product);
  expect(write).toHaveBeenCalledWith("catalogOverrides/13", { ...product, updatedAt: "server-time" });
});

test("a user switch during the transaction prevents an administrator update", async () => {
  const write = jest.fn();
  runTransaction.mockImplementation(async (_db, callback) => callback({
    get: async () => { auth.currentUser = { uid: "another-user" }; return {}; }, set: write,
  }));
  await expect(saveCatalogOverride(owner, product)).rejects.toThrow("sign-in changed");
  expect(write).not.toHaveBeenCalled();
});

test("ordinary customers and unsafe images cannot write catalog updates", async () => {
  await expect(saveCatalogOverride({ ...owner, email: "other@example.test" }, product)).rejects.toThrow("Administrator sign-in required");
  await expect(saveCatalogOverride(owner, { ...product, images: ["http://example.test/photo.webp"] })).rejects.toThrow("Check the product");
  expect(runTransaction).not.toHaveBeenCalled();
});

test("cached stock and pending writes do not confirm checkout readiness, including an empty collection", async () => {
  let receive;
  const stop = jest.fn();
  onSnapshot.mockImplementation((_ref, options, callback) => {
    expect(options).toEqual({ includeMetadataChanges: true });
    receive = callback;
    return stop;
  });
  getDocsFromServer.mockReturnValue(new Promise(() => {}));
  const changed = jest.fn();
  const unsubscribe = subscribeCatalogOverrides(changed, jest.fn());
  receive({ docs: [], metadata: { fromCache: true, hasPendingWrites: false } });
  expect(changed).toHaveBeenLastCalledWith({}, { ready: false });
  receive({ docs: [], metadata: { fromCache: false, hasPendingWrites: true } });
  expect(changed).toHaveBeenLastCalledWith({}, { ready: false });
  receive({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } });
  expect(changed).toHaveBeenLastCalledWith({}, { ready: true });
  unsubscribe();
  receive({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } });
  expect(changed).toHaveBeenCalledTimes(3);
  expect(stop).toHaveBeenCalledTimes(1);
});

test("server lookup failure surfaces an offline retry state rather than treating cache as ready", async () => {
  onSnapshot.mockReturnValue(() => {});
  const error = new Error("Offline");
  getDocsFromServer.mockRejectedValue(error);
  const changed = jest.fn();
  const failed = jest.fn();
  const unsubscribe = subscribeCatalogOverrides(changed, failed);
  await Promise.resolve();
  expect(failed).toHaveBeenCalledWith(error);
  expect(changed).not.toHaveBeenCalled();
  unsubscribe();
});

test("a delayed initial server lookup cannot replace a newer live catalog snapshot", async () => {
  let receive;
  let resolveInitial;
  onSnapshot.mockImplementation((_ref, _options, callback) => { receive = callback; return () => {}; });
  getDocsFromServer.mockReturnValue(new Promise((resolve) => { resolveInitial = resolve; }));
  const changed = jest.fn();
  const unsubscribe = subscribeCatalogOverrides(changed, jest.fn());
  const snapshot = (price) => ({ docs: [{ id: "13", data: () => ({ ...product, price }) }], metadata: { fromCache: false, hasPendingWrites: false } });
  receive(snapshot(180));
  resolveInitial(snapshot(160));
  await Promise.resolve();
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenLastCalledWith({ "13": { ...product, price: 180 } }, { ready: true });
  unsubscribe();
});
