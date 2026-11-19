import { doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";
import { getCartItemError, getCartItemKey, getProductVariants, getSelectedVariant, selectedVariantItem } from "../catalog/product-variants";
import { readDemoOrder } from "../demo-orders/demo-orders.utils";

export const makeCartOperationId = (prefix = "change") => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export const normaliseCartItems = (items) => Array.isArray(items) ? items.filter((item) => (
  item && (typeof item.id === "string" || Number.isFinite(item.id)) &&
  typeof item.name === "string" && item.name.length > 0 &&
  Number.isFinite(item.price) && item.price >= 0 &&
  Number.isSafeInteger(item.quantity) && item.quantity > 0
)).slice(0, 200).map(({ id, name, price, quantity, imageUrl, variantKey, size, color }) => ({
  id, name, price, quantity,
  ...(typeof imageUrl === "string" ? { imageUrl } : {}),
  ...(typeof variantKey === "string" ? { variantKey } : {}),
  ...(typeof size === "string" ? { size } : {}),
  ...(typeof color === "string" ? { color } : {}),
})) : [];

const selectedItem = (item) => {
  const variant = getSelectedVariant(item);
  if (getProductVariants(item).length && !variant) throw new Error(`Choose a size for ${item.name}.`);
  return variant ? selectedVariantItem(item, variant) : item;
};

const addItems = (current, requested, merge) => {
  const next = [...current];
  for (const item of requested) {
    const selected = merge ? item : selectedItem(item);
    const key = getCartItemKey(selected);
    const index = next.findIndex((entry) => getCartItemKey(entry) === key);
    const quantity = (index === -1 ? 0 : next[index].quantity) + item.quantity;
    const stock = getSelectedVariant(selected)?.stock;
    if (!merge && stock !== undefined && quantity > stock) {
      throw new Error(`${item.name} exceeds the available demo stock. Reduce the quantity and try again.`);
    }
    const mergedQuantity = merge && stock > 0 ? Math.min(quantity, stock) : quantity;
    const updated = { ...selected, quantity: mergedQuantity };
    if (index === -1) next.push(updated);
    else next[index] = updated;
  }
  if (next.length > 200) throw new Error("Your bag has too many different items.");
  return normaliseCartItems(next);
};

export const applyCartOperation = (currentItems, operation) => {
  const items = normaliseCartItems(currentItems);
  const key = operation.item && getCartItemKey(operation.item);
  if (operation.type === "add" || operation.type === "merge") {
    const requested = normaliseCartItems(operation.items);
    if (requested.length !== operation.items?.length) throw new Error("Invalid bag item.");
    return addItems(items, requested, operation.type === "merge");
  }
  if (operation.type === "decrement") {
    return items.flatMap((item) => getCartItemKey(item) !== key ? [item]
      : item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []);
  }
  if (operation.type === "remove") return items.filter((item) => getCartItemKey(item) !== key);
  if (operation.type === "clear") return [];
  if (operation.type === "choose") {
    const variant = getProductVariants(operation.item).find((entry) => entry.key === operation.variant?.key);
    const source = items.find((item) => getCartItemKey(item) === key);
    if (!source || !variant || variant.stock < 1) throw new Error("That size is unavailable.");
    const other = items.find((item) => getCartItemKey(item) === variant.key && getCartItemKey(item) !== key);
    const quantity = source.quantity + (other?.quantity || 0);
    if (quantity > variant.stock) throw new Error("The selected size has insufficient demo stock.");
    return [...items.filter((item) => ![key, variant.key].includes(getCartItemKey(item))), {
      ...selectedVariantItem(source, variant), quantity,
    }];
  }
  if (operation.type === "checkout") {
    const purchased = new Map(normaliseCartItems(operation.items).map((item) => [getCartItemKey(item), item.quantity]));
    return items.flatMap((item) => {
      const quantity = item.quantity - (purchased.get(getCartItemKey(item)) || 0);
      return quantity > 0 ? [{ ...item, quantity }] : [];
    });
  }
  throw new Error("Unknown bag action.");
};

const requireAccount = (userId) => {
  if (!userId || auth?.currentUser?.uid !== userId) throw new Error("Sign in to the account that owns this bag.");
};
const accountCart = (userId) => doc(db, "users", userId, "cart", "current");
const readCartSnapshot = (snapshot) => ({
  items: normaliseCartItems(snapshot.data()?.items),
  revision: snapshot.data()?.updatedAt?.toMillis?.() || 0,
});

export const updateAccountCart = async (userId, operation) => {
  requireAccount(userId);
  const cartRef = accountCart(userId);
  const operationRef = doc(db, "users", userId, "cartOperations", operation.id);
  await runTransaction(db, async (transaction) => {
    requireAccount(userId);
    const [cart, previousOperation] = await Promise.all([transaction.get(cartRef), transaction.get(operationRef)]);
    requireAccount(userId);
    if (previousOperation.exists()) return;
    const items = applyCartOperation(cart.data()?.items, operation);
    transaction.set(cartRef, { items, updatedAt: serverTimestamp() });
    transaction.set(operationRef, { kind: operation.type, createdAt: serverTimestamp() });
  });
  requireAccount(userId);
  const snapshot = await getDocFromServer(cartRef);
  requireAccount(userId);
  return readCartSnapshot(snapshot);
};

export const commitAccountCheckout = async (userId, order) => {
  requireAccount(userId);
  const validated = readDemoOrder(order, order?.id);
  if (!validated) throw new Error("Invalid demo order.");
  const receiptRef = doc(db, "users", userId, "demoOrders", order.id);
  const cartRef = accountCart(userId);
  const operationRef = doc(db, "users", userId, "cartOperations", `checkout-${order.id}`);

  const committedCart = await runTransaction(db, async (transaction) => {
    requireAccount(userId);
    const [receipt, cart, operation] = await Promise.all([
      transaction.get(receiptRef), transaction.get(cartRef), transaction.get(operationRef),
    ]);
    requireAccount(userId);
    if (receipt.exists() && JSON.stringify(readDemoOrder(receipt.data(), order.id)) !== JSON.stringify(validated)) {
      throw new Error("Demo order reference already used.");
    }
    if (!receipt.exists()) {
      const stockError = order.items.map(getCartItemError).find(Boolean);
      if (stockError) throw new Error(stockError);
    }
    const current = readCartSnapshot(cart);
    const items = operation.exists() ? current.items : applyCartOperation(current.items, { type: "checkout", items: order.items });
    if (!receipt.exists()) transaction.set(receiptRef, order);
    if (!operation.exists()) {
      transaction.set(cartRef, { items, updatedAt: serverTimestamp() });
      transaction.set(operationRef, { kind: "checkout", createdAt: serverTimestamp() });
    }
    return { items, revision: current.revision };
  });
  requireAccount(userId);
  try {
    const snapshot = await getDocFromServer(cartRef);
    requireAccount(userId);
    return readCartSnapshot(snapshot);
  } catch {
    requireAccount(userId);
    // The transaction acknowledgement already confirms the receipt and bag update.
    // A failed refresh must not turn a completed checkout into another order attempt.
    return committedCart;
  }
};

export const subscribeAccountCart = (userId, onChange, onError) => {
  requireAccount(userId);
  let active = true;
  let serverReceived = false;
  const reference = accountCart(userId);
  const report = (snapshot) => {
    if (!active || auth?.currentUser?.uid !== userId || snapshot.metadata.hasPendingWrites) return;
    const { items, revision } = readCartSnapshot(snapshot);
    onChange(items, revision);
  };
  const fail = (error) => { if (active && auth?.currentUser?.uid === userId) onError(error); };
  const unsubscribe = onSnapshot(reference, { includeMetadataChanges: true }, (snapshot) => {
    if (!snapshot.metadata.fromCache) { serverReceived = true; report(snapshot); }
  }, fail);
  getDocFromServer(reference).then((snapshot) => { if (!serverReceived) report(snapshot); }, (error) => {
    if (!serverReceived) fail(error);
  });
  return () => { active = false; unsubscribe(); };
};
