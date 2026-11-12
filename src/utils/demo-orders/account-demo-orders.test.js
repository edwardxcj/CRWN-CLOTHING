import { getDocFromServer, getDocsFromServer, runTransaction } from "firebase/firestore";
import { auth } from "../firebase/firebase.utils";
import { buildDemoOrder, createDemoOrder } from "./demo-orders.utils";
import { loadAccountDemoOrder, loadAccountDemoOrders, saveAccountDemoOrder } from "./account-demo-orders.utils";

jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => path.join("/"),
  doc: (parent, id) => `${parent}/${id}`,
  getDocFromServer: jest.fn(),
  getDocsFromServer: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: null }, db: {} }));

const uid = "google-owner";
const accountPath = `users/${uid}/demoOrders`;
const cart = [{ id: 13, name: "Nike White AirForce", price: 160, quantity: 2 }];

const storedOrders = new Map();
const snapshot = (path) => ({
  id: path.split("/").pop(),
  exists: () => storedOrders.has(path),
  data: () => storedOrders.get(path),
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  storedOrders.clear();
  auth.currentUser = { uid };

  getDocFromServer.mockImplementation(async (path) => snapshot(path));
  getDocsFromServer.mockImplementation(async (collection) => Array.from(storedOrders.keys())
    .filter((path) => path.startsWith(`${collection}/`))
    .map(snapshot));
  runTransaction.mockImplementation(async (_db, operation) => operation({
    get: async (path) => snapshot(path),
    set: (path, order) => storedOrders.set(path, order),
  }));
});

it("migrates only legacy orders belonging to the signed-in account and reopens them with empty browser storage", async () => {
  const ownerOrder = createDemoOrder(cart, uid);
  createDemoOrder(cart, "another-user");
  createDemoOrder(cart);

  await expect(loadAccountDemoOrders(uid)).resolves.toEqual([ownerOrder]);
  expect([...storedOrders]).toEqual([[`${accountPath}/${ownerOrder.id}`, ownerOrder]]);

  await expect(loadAccountDemoOrders(uid)).resolves.toEqual([ownerOrder]);
  expect(runTransaction).toHaveBeenCalledTimes(1);

  localStorage.clear();
  await expect(loadAccountDemoOrders(uid)).resolves.toEqual([ownerOrder]);
  await expect(loadAccountDemoOrder(ownerOrder.id, uid)).resolves.toEqual(ownerOrder);
});

it("reuses the reference for a checkout retry and protects a different receipt with that reference", async () => {
  const order = buildDemoOrder(cart);
  await expect(saveAccountDemoOrder(order, uid)).resolves.toEqual(order);
  await expect(saveAccountDemoOrder(order, uid)).resolves.toEqual(order);
  await expect(saveAccountDemoOrder({ ...order, total: 12 }, uid)).rejects.toThrow("reference already used");
  expect(storedOrders.get(`${accountPath}/${order.id}`)).toEqual(order);
});

it("imports an owned legacy receipt opened directly, and never imports a guest receipt", async () => {
  const order = createDemoOrder(cart, uid);
  const guestOrder = createDemoOrder(cart);

  await expect(loadAccountDemoOrder(guestOrder.id, uid)).resolves.toBeNull();
  await expect(loadAccountDemoOrder(order.id, uid)).resolves.toEqual(order);
  expect([...storedOrders]).toEqual([[`${accountPath}/${order.id}`, order]]);
});

it("stops a pending migration when the user switches accounts during the cloud read", async () => {
  createDemoOrder(cart, uid);
  getDocsFromServer.mockImplementationOnce(async () => {
    auth.currentUser = { uid: "another-user" };
    return [];
  });

  await expect(loadAccountDemoOrders(uid)).rejects.toThrow("Sign in to the account");
  expect(runTransaction).not.toHaveBeenCalled();
});
