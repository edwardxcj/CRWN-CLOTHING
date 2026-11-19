import { collection, doc, getDocsFromServer, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";
import { isDemoOrderId } from "../demo-orders/demo-orders.utils";

const requireAccount = (userId) => {
  if (!userId || auth.currentUser?.uid !== userId) throw new Error("Sign in to manage your support requests.");
};

export const createSupportRequestId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `SUP-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

export const loadSupportRequests = async (userId) => {
  requireAccount(userId);
  const result = await getDocsFromServer(collection(db, "users", userId, "supportRequests"));
  requireAccount(userId);
  return result.docs.map((entry) => entry.data()).sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
};

export const submitSupportRequest = async (userId, draft) => {
  requireAccount(userId);
  const type = draft.type;
  const orderId = draft.orderId ?? "";
  const subject = draft.subject?.trim() ?? "";
  const message = draft.message?.trim() ?? "";
  const id = type === "return" ? `return-${orderId}` : draft.id;
  if (!["contact", "return"].includes(type) || subject.length < 1 || subject.length > 120 || message.length < 10 || message.length > 2000) {
    throw new Error("Enter a subject and a message between 10 and 2,000 characters.");
  }
  if (type === "return" ? !isDemoOrderId(orderId) : orderId !== "" || !/^SUP-[0-9A-F]{16}$/.test(id ?? "")) {
    throw new Error("Invalid support request.");
  }
  const reference = doc(db, "users", userId, "supportRequests", id);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    const orderState = type === "return"
      ? await transaction.get(doc(db, "users", userId, "orderStates", orderId))
      : null;
    requireAccount(userId);
    if (existing.exists()) {
      const record = existing.data();
      if (record.type !== type || record.orderId !== orderId || record.subject !== subject || record.message !== message) {
        throw new Error("This request was already submitted. Open your existing request to review it.");
      }
      return;
    }
    if (type === "return" && orderState?.data()?.status !== "delivered") throw new Error("Returns are available after demo delivery.");
    transaction.set(reference, { id, orderId, type, subject, message, createdAt: serverTimestamp(), status: "submitted" });
  });
  requireAccount(userId);
  return id;
};
