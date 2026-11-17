import { collection, doc, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";

const requireAccount = (userId) => {
  if (!userId || auth?.currentUser?.uid !== userId) {
    throw new Error("Sign in to manage this wishlist");
  }
};

export const wishlistProductId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 35) throw new Error("Invalid product");
  return id;
};

const wishlistCollection = (userId) => collection(db, "users", userId, "wishlist");

const savedProductIds = (snapshot) => snapshot.docs.flatMap((item) => {
  const id = item.data().productId;
  return Number.isInteger(id) && id >= 1 && id <= 35 && item.id === String(id) ? [id] : [];
});

export const subscribeWishlist = (userId, onChange, onError) => {
  requireAccount(userId);
  let active = true;
  let receivedSnapshot = false;
  const reference = wishlistCollection(userId);
  const report = (snapshot) => {
    if (!active || auth?.currentUser?.uid !== userId || snapshot.metadata.hasPendingWrites) return;
    onChange(savedProductIds(snapshot));
  };
  const fail = (error) => {
    if (active && auth?.currentUser?.uid === userId) onError(error);
  };
  const unsubscribe = onSnapshot(reference, { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache) {
      receivedSnapshot = true;
      report(snapshot);
    }
  }, fail);

  // A server read gives offline visits a retry state instead of an endless cache-only load.
  getDocsFromServer(reference).then((snapshot) => {
    if (!receivedSnapshot) report(snapshot);
  }, (error) => { if (!receivedSnapshot) fail(error); });
  return () => { active = false; unsubscribe(); };
};

export const saveWishlistProduct = async (userId, productId) => {
  requireAccount(userId);
  const id = wishlistProductId(productId);
  const reference = doc(wishlistCollection(userId), String(id));
  await runTransaction(db, async (transaction) => {
    await transaction.get(reference);
    requireAccount(userId);
    transaction.set(reference, { productId: id, savedAt: serverTimestamp() });
  });
  requireAccount(userId);
};

export const removeWishlistProduct = async (userId, productId) => {
  requireAccount(userId);
  const id = wishlistProductId(productId);
  const reference = doc(wishlistCollection(userId), String(id));
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    requireAccount(userId);
    if (snapshot.exists()) transaction.delete(reference);
  });
  requireAccount(userId);
};
