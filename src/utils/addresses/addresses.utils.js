import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";

export const emptyAddress = { recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "", phone: "" };
const limits = { recipient: 100, line1: 150, line2: 150, city: 100, region: 100, postalCode: 24, country: 80, phone: 30 };
const required = ["recipient", "line1", "city", "postalCode", "country"];

export const addressSnapshot = (address) => Object.fromEntries(
  Object.keys(emptyAddress).map((field) => [field, typeof address?.[field] === "string" ? address[field].trim() : ""])
);

export const addressError = (address) => {
  const snapshot = addressSnapshot(address);
  if (required.some((field) => !snapshot[field])) return "Complete the name, street address, city, postal code and country.";
  if (Object.entries(snapshot).some(([field, value]) => value.length > limits[field])) return "Shorten the address fields to fit the allowed length.";
  return "";
};

const requireAccount = (userId) => {
  if (!userId || auth?.currentUser?.uid !== userId) throw new Error("Sign in to manage these addresses.");
};
const addressCollection = (userId) => collection(db, "users", userId, "addresses");
const profile = (userId) => doc(db, "users", userId);

export const createAddressId = (userId) => {
  requireAccount(userId);
  return doc(addressCollection(userId)).id;
};

export const loadAddressBook = async (userId) => {
  requireAccount(userId);
  const [saved, user] = await Promise.all([getDocsFromServer(addressCollection(userId)), getDocFromServer(profile(userId))]);
  requireAccount(userId);
  const addresses = saved.docs.flatMap((entry) => addressError(entry.data()) ? [] : [{ id: entry.id, ...addressSnapshot(entry.data()) }]);
  const savedDefault = user.data()?.defaultAddressId;
  const defaultAddressId = addresses.some((entry) => entry.id === savedDefault) ? savedDefault : addresses[0]?.id || "";
  return { addresses, defaultAddressId };
};

export const saveAddress = async (userId, address, { id, makeDefault = false } = {}) => {
  requireAccount(userId);
  const message = addressError(address);
  if (message) throw new Error(message);
  const reference = id ? doc(addressCollection(userId), id) : doc(addressCollection(userId));
  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(profile(userId));
    requireAccount(userId);
    transaction.set(reference, { ...addressSnapshot(address), updatedAt: serverTimestamp() });
    if (makeDefault || !user.data()?.defaultAddressId) transaction.set(profile(userId), { defaultAddressId: reference.id }, { merge: true });
  });
  requireAccount(userId);
  return reference.id;
};

export const setDefaultAddress = async (userId, addressId) => {
  requireAccount(userId);
  await runTransaction(db, async (transaction) => {
    const address = await transaction.get(doc(addressCollection(userId), addressId));
    requireAccount(userId);
    if (!address.exists()) throw new Error("This address is no longer available. Reload your addresses.");
    transaction.set(profile(userId), { defaultAddressId: addressId }, { merge: true });
  });
  requireAccount(userId);
};

export const deleteAddress = async (userId, addressId) => {
  requireAccount(userId);
  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(profile(userId));
    requireAccount(userId);
    transaction.delete(doc(addressCollection(userId), addressId));
    if (user.data()?.defaultAddressId === addressId) transaction.set(profile(userId), { defaultAddressId: "" }, { merge: true });
  });
  requireAccount(userId);
};

export const deliveryOptions = [
  { method: "standard", label: "Standard delivery", fee: 0, estimate: "Demo delivery in 3–5 business days" },
  { method: "express", label: "Express delivery", fee: 12, estimate: "Demo delivery in 1–2 business days" },
];

export const deliverySnapshot = (value) => {
  const option = deliveryOptions.find((entry) => entry.method === value?.method);
  if (!option || addressError(value?.address)) return null;
  return { address: addressSnapshot(value.address), ...option };
};
