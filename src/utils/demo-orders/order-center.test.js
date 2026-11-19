import { getDocFromServer, getDocsFromServer, runTransaction } from "firebase/firestore";
import { auth } from "../firebase/firebase.utils";
import { canTransitionOrder, loadOrderState, loadOrderStates, transitionDemoOrder } from "./order-center.utils";
import { submitSupportRequest } from "../support/support.utils";

jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => path.join("/"),
  doc: (_db, ...path) => path.join("/"),
  getDocFromServer: jest.fn(),
  getDocsFromServer: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: () => "server-timestamp",
}));
jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: null }, db: {} }));

const uid = "order-owner";
const orderId = "DEMO-0000-0000-0001";
const statePath = `users/${uid}/orderStates/${orderId}`;
const receiptPath = `users/${uid}/demoOrders/${orderId}`;
const records = new Map();
const snapshot = (path) => ({ id: path.split("/").pop(), exists: () => records.has(path), data: () => records.get(path) });

beforeEach(() => {
  jest.clearAllMocks();
  records.clear();
  auth.currentUser = { uid };
  records.set(receiptPath, { id: orderId });
  getDocFromServer.mockImplementation(async (path) => snapshot(path));
  getDocsFromServer.mockImplementation(async (prefix) => ({ docs: [...records.keys()].filter((key) => key.startsWith(`${prefix}/`)).map(snapshot) }));
  runTransaction.mockImplementation(async (_db, operation) => operation({
    get: async (path) => snapshot(path),
    set: (path, value) => records.set(path, value),
  }));
});

test("a receipt moves through demo fulfilment while retaining its original snapshot", async () => {
  expect((await loadOrderState(uid, orderId)).status).toBe("processing");
  expect(canTransitionOrder("processing", "delivered")).toBe(false);
  await transitionDemoOrder(uid, orderId, "shipped");
  await transitionDemoOrder(uid, orderId, "shipped");
  await transitionDemoOrder(uid, orderId, "delivered");
  expect((await loadOrderStates(uid))[orderId]).toEqual({
    status: "delivered", updatedAt: "server-timestamp", shippedAt: "server-timestamp", deliveredAt: "server-timestamp", cancelledAt: null,
  });
  await expect(transitionDemoOrder(uid, orderId, "cancelled")).rejects.toThrow("has changed");
  expect(records.get(receiptPath)).toEqual({ id: orderId });
});

test("only a processing order can be cancelled and another account cannot make changes", async () => {
  await transitionDemoOrder(uid, orderId, "cancelled");
  await expect(transitionDemoOrder(uid, orderId, "shipped")).rejects.toThrow("has changed");
  auth.currentUser = { uid: "someone-else" };
  await expect(loadOrderState(uid, orderId)).rejects.toThrow("Sign in");
  await expect(transitionDemoOrder(uid, orderId, "delivered")).rejects.toThrow("Sign in");
});

test("a return requires demo delivery and retries keep its original reference", async () => {
  const request = { type: "return", orderId, subject: `Return for ${orderId}`, message: "The selected size is not right." };
  await expect(submitSupportRequest(uid, request)).rejects.toThrow("after demo delivery");
  records.set(statePath, { status: "delivered" });
  const id = await submitSupportRequest(uid, request);
  expect(id).toBe(`return-${orderId}`);
  await expect(submitSupportRequest(uid, request)).resolves.toBe(id);
  await expect(submitSupportRequest(uid, { ...request, message: "A changed second submission" })).rejects.toThrow("already submitted");
  expect([...records.keys()].filter((key) => key.includes("supportRequests"))).toHaveLength(1);
});
