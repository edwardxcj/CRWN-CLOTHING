import { getDocFromServer, runTransaction } from "firebase/firestore";

import { auth } from "../firebase/firebase.utils";
import { getProductVariants, selectedVariantItem } from "../catalog/product-variants";
import { applyCartOperation, commitAccountCheckout, updateAccountCart } from "./cart.utils";
import { buildDemoOrder } from "../demo-orders/demo-orders.utils";

jest.mock("firebase/firestore", () => ({
  doc: (_db, ...parts) => parts.join("/"),
  runTransaction: jest.fn(), serverTimestamp: () => "server-time", onSnapshot: jest.fn(), getDocFromServer: jest.fn(),
}));
jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: null }, db: {} }));

const product = { id: 13, name: "Nike White AirForce", price: 160 };
const options = getProductVariants(product).filter((variant) => variant.stock > 2);
const first = { ...selectedVariantItem(product, options[0]), quantity: 1 };
const second = { ...selectedVariantItem(product, options[1]), quantity: 1 };
const records = new Map();
const cartPath = "users/owner/cart/current";

beforeEach(() => {
  records.clear();
  auth.currentUser = { uid: "owner" };
  getDocFromServer.mockImplementation(async (path) => ({ data: () => records.get(path) }));
  runTransaction.mockImplementation(async (_db, operation) => operation({
    get: async (path) => ({ exists: () => records.has(path), data: () => records.get(path) }),
    set: (path, data) => records.set(path, data),
  }));
});

test("guest merge and checkout consumption are idempotent, preserving concurrent additions", async () => {
  const merge = { id: "guest-browser", type: "merge", items: [first, second] };
  await updateAccountCart("owner", merge);
  await updateAccountCart("owner", merge);
  expect(records.get(cartPath).items).toHaveLength(2);
  expect(records.get(cartPath).items[0].quantity).toBe(1);

  await updateAccountCart("owner", { id: "new-addition", type: "add", items: [first] });
  const consume = { id: "receipt-1", type: "checkout", items: [first] };
  await updateAccountCart("owner", consume);
  await updateAccountCart("owner", consume);
  expect(records.get(cartPath).items).toEqual([first, second]);
});

test("a checkout writes its receipt and consumes only purchased quantities once", async () => {
  records.set(cartPath, { items: [{ ...first, quantity: 3 }, second] });
  const order = buildDemoOrder([first]);
  await commitAccountCheckout("owner", order);
  expect(records.get(`users/owner/demoOrders/${order.id}`)).toEqual(order);
  expect(records.get(cartPath).items).toEqual([{ ...first, quantity: 2 }, second]);

  await commitAccountCheckout("owner", order);
  expect(records.get(cartPath).items).toEqual([{ ...first, quantity: 2 }, second]);
  await expect(commitAccountCheckout("owner", { ...order, total: 1 })).rejects.toThrow("reference already used");
  expect(records.get(`users/owner/demoOrders/${order.id}`)).toEqual(order);
});

test("a failed checkout transaction preserves the cart and creates no receipt", async () => {
  records.set(cartPath, { items: [first, second] });
  const order = buildDemoOrder([first]);
  runTransaction.mockRejectedValueOnce(new Error("Unable to commit"));
  await expect(commitAccountCheckout("owner", order)).rejects.toThrow("Unable to commit");
  expect(records.get(cartPath).items).toEqual([first, second]);
  expect(records.has(`users/owner/demoOrders/${order.id}`)).toBe(false);
});

test("mutations work from the current server cart and keep variants independent", async () => {
  await updateAccountCart("owner", { id: "device-a", type: "add", items: [first] });
  await updateAccountCart("owner", { id: "device-b", type: "add", items: [second] });
  await updateAccountCart("owner", { id: "device-a-more", type: "add", items: [first] });
  expect(records.get(cartPath).items.map((item) => item.quantity)).toEqual([2, 1]);
  expect(() => applyCartOperation(records.get(cartPath).items, {
    type: "add", items: [{ ...first, quantity: options[0].stock }],
  })).toThrow("demo stock");
});

test("an account switch during a transaction prevents the cart write", async () => {
  runTransaction.mockImplementationOnce(async (_db, operation) => operation({
    get: async () => {
      auth.currentUser = { uid: "other" };
      return { exists: () => false, data: () => undefined };
    },
    set: jest.fn(),
  }));
  await expect(updateAccountCart("owner", { id: "pending", type: "add", items: [first] })).rejects.toThrow("owns this bag");
  expect(records.size).toBe(0);
});

test("a failed post-commit refresh still reports the acknowledged checkout as successful", async () => {
  records.set(cartPath, { items: [first, second] });
  const order = buildDemoOrder([first]);
  getDocFromServer.mockRejectedValueOnce(new Error("Network interrupted after commit"));
  await expect(commitAccountCheckout("owner", order)).resolves.toEqual({ items: [second], revision: 0 });
  expect(records.get(`users/owner/demoOrders/${order.id}`)).toEqual(order);
});
