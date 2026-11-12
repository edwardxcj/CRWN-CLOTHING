import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";
import { getDemoOrder, isDemoOrderId, listDemoOrders, readDemoOrder } from "./demo-orders.utils";

const requireAccount = (userId) => {
  if (!userId || auth.currentUser?.uid !== userId) {
    throw new Error("Sign in to the account that owns these demo orders");
  }
};

const accountOrders = (userId) => collection(db, "users", userId, "demoOrders");

const readLegacyOrders = (userId) => {
  try {
    return listDemoOrders(userId);
  } catch {
    // Orders already in the account are still available when browser storage is blocked.
    return [];
  }
};

const readLegacyOrder = (orderId, userId) => {
  try {
    return getDemoOrder(orderId, userId);
  } catch {
    return null;
  }
};

export const saveAccountDemoOrder = async (order, userId) => {
  requireAccount(userId);
  const record = readDemoOrder(order, order?.id);
  if (!record) throw new Error("Invalid demo order");
  const reference = doc(accountOrders(userId), record.id);

  // Keep the original reference on retry or when migrating from another browser.
  await runTransaction(db, async (transaction) => {
    requireAccount(userId);
    const snapshot = await transaction.get(reference);
    requireAccount(userId);

    if (!snapshot.exists()) {
      transaction.set(reference, record);
    } else if (JSON.stringify(readDemoOrder(snapshot.data(), snapshot.id)) !== JSON.stringify(record)) {
      throw new Error("Demo order reference already used");
    }
  });
  requireAccount(userId);
  return record;
};

export const loadAccountDemoOrder = async (orderId, userId) => {
  requireAccount(userId);
  if (!isDemoOrderId(orderId)) return null;

  const snapshot = await getDocFromServer(doc(accountOrders(userId), orderId));
  requireAccount(userId);
  if (snapshot.exists()) return readDemoOrder(snapshot.data(), snapshot.id);

  const legacyOrder = readLegacyOrder(orderId, userId);
  return legacyOrder ? saveAccountDemoOrder(legacyOrder, userId) : null;
};

export const loadAccountDemoOrders = async (userId) => {
  requireAccount(userId);
  const snapshots = await getDocsFromServer(accountOrders(userId));
  requireAccount(userId);
  const orders = new Map();
  snapshots.forEach((snapshot) => {
    const order = readDemoOrder(snapshot.data(), snapshot.id);
    if (order) orders.set(order.id, order);
  });

  // Legacy receipts remain in their original browser so a failed migration can be retried.
  for (const legacyOrder of readLegacyOrders(userId)) {
    const savedOrder = orders.get(legacyOrder.id);
    if (JSON.stringify(savedOrder) === JSON.stringify(legacyOrder)) continue;
    const migrated = await saveAccountDemoOrder(legacyOrder, userId);
    orders.set(migrated.id, migrated);
  }

  return Array.from(orders.values()).sort((first, second) => Date.parse(second.placedAt) - Date.parse(first.placedAt));
};
