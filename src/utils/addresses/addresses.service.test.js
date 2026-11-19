import { getDocFromServer, getDocsFromServer, runTransaction } from "firebase/firestore";

import { auth } from "../firebase/firebase.utils";
import { deleteAddress, loadAddressBook, saveAddress, setDefaultAddress } from "./addresses.utils";

jest.mock("firebase/firestore", () => ({
  collection: (_db, ...parts) => parts.join("/"),
  doc: (parent, ...parts) => {
    const path = typeof parent === "string" ? [parent, ...parts] : parts;
    if (path.length === 1) path.push("savedaddress000000001");
    return { path: path.join("/"), id: path[path.length - 1] };
  },
  getDocFromServer: jest.fn(), getDocsFromServer: jest.fn(), runTransaction: jest.fn(), serverTimestamp: () => "server-time",
}));
jest.mock("../firebase/firebase.utils", () => ({ auth: { currentUser: null }, db: {} }));

const records = new Map();
const address = { recipient: " Test shopper ", line1: "1 Example Street", line2: "", city: "Sydney", region: "NSW", postalCode: "2000", country: "Australia", phone: "" };
const snapshot = (reference) => ({ id: reference.id, exists: () => records.has(reference.path), data: () => records.get(reference.path) });

beforeEach(() => {
  records.clear();
  auth.currentUser = { uid: "owner" };
  getDocFromServer.mockImplementation(async (reference) => snapshot(reference));
  getDocsFromServer.mockImplementation(async (collection) => ({ docs: [...records.keys()].filter((path) => path.startsWith(collection + "/")).map((path) => snapshot({ path, id: path.split("/").pop() })) }));
  runTransaction.mockImplementation(async (_db, operation) => operation({
    get: async (reference) => snapshot(reference),
    set: (reference, data, options) => records.set(reference.path, { ...(options?.merge ? records.get(reference.path) : {}), ...data }),
    delete: (reference) => records.delete(reference.path),
  }));
});

test("address CRUD preserves one default pointer and returns order-safe snapshots", async () => {
  const firstId = await saveAddress("owner", address);
  expect(records.get("users/owner").defaultAddressId).toBe(firstId);
  expect((await loadAddressBook("owner")).addresses[0]).toEqual({ id: firstId, ...address, recipient: "Test shopper" });

  const secondId = "secondaddress00000001";
  await saveAddress("owner", { ...address, line1: "2 Example Street" }, { id: secondId });
  await setDefaultAddress("owner", secondId);
  expect((await loadAddressBook("owner")).defaultAddressId).toBe(secondId);
  await deleteAddress("owner", secondId);
  expect((await loadAddressBook("owner")).defaultAddressId).toBe(firstId);
});

test("address mutations require the owning session and reject invalid drafts", async () => {
  await expect(saveAddress("other", address)).rejects.toThrow("Sign in");
  await expect(saveAddress("owner", { recipient: "Test" })).rejects.toThrow("Complete");
  await expect(setDefaultAddress("owner", "missing-address")).rejects.toThrow("no longer available");
  expect(records.size).toBe(0);
});
