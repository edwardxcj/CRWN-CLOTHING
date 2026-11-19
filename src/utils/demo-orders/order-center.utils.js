import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";
import { isDemoOrderId } from "./demo-orders.utils";

export const orderStatusLabels = {
  processing: "Processing",
  shipped: "Demo dispatched",
  delivered: "Demo delivered",
  cancelled: "Cancelled",
};

export const processingOrderState = { status: "processing", shippedAt: null, deliveredAt: null, cancelledAt: null };

const requireAccount = (userId) => {
  if (!userId || auth.currentUser?.uid !== userId) throw new Error("Sign in to the account that owns this order.");
};

const stateReference = (userId, orderId) => doc(db, "users", userId, "orderStates", orderId);

export const loadOrderStates = async (userId) => {
  requireAccount(userId);
  const result = await getDocsFromServer(collection(db, "users", userId, "orderStates"));
  requireAccount(userId);
  return Object.fromEntries(result.docs.map((entry) => [entry.id, entry.data()]));
};

export const loadOrderState = async (userId, orderId) => {
  requireAccount(userId);
  if (!isDemoOrderId(orderId)) throw new Error("Invalid demo order.");
  const result = await getDocFromServer(stateReference(userId, orderId));
  requireAccount(userId);
  return result.exists() ? result.data() : processingOrderState;
};

export const canTransitionOrder = (currentStatus, nextStatus) => (
  currentStatus === "processing" && ["shipped", "cancelled"].includes(nextStatus)
) || (currentStatus === "shipped" && nextStatus === "delivered");

export const transitionDemoOrder = async (userId, orderId, nextStatus) => {
  requireAccount(userId);
  if (!isDemoOrderId(orderId)) throw new Error("Invalid demo order.");
  const reference = stateReference(userId, orderId);
  await runTransaction(db, async (transaction) => {
    const receipt = await transaction.get(doc(db, "users", userId, "demoOrders", orderId));
    const current = await transaction.get(reference);
    requireAccount(userId);
    if (!receipt.exists()) throw new Error("Demo order unavailable.");
    const state = current.exists() ? current.data() : processingOrderState;
    if (state.status === nextStatus) return;
    if (!canTransitionOrder(state.status, nextStatus)) throw new Error("This order has changed. Refresh its status and try again.");
    const timestamp = serverTimestamp();
    transaction.set(reference, {
      status: nextStatus,
      updatedAt: timestamp,
      shippedAt: state.shippedAt ?? null,
      deliveredAt: state.deliveredAt ?? null,
      cancelledAt: state.cancelledAt ?? null,
      [nextStatus === "shipped" ? "shippedAt" : nextStatus === "delivered" ? "deliveredAt" : "cancelledAt"]: timestamp,
    });
  });
  requireAccount(userId);
};

export const formatActivityDate = (value) => {
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "";
};
