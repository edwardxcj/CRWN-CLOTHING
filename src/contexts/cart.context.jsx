import { createContext, useContext, useEffect, useRef, useState } from "react";

import { UserContext } from "./user.context";
import { applyCartOperation, commitAccountCheckout, makeCartOperationId, normaliseCartItems, subscribeAccountCart, updateAccountCart } from "../utils/cart/cart.utils";

const STORAGE_KEY = "crwn-shopping-bag";
const TOKEN_KEY = "crwn-guest-bag-token";
const pendingKey = (userId) => `crwn-cart-transfer:${userId}`;
const readTransferQueue = (userId) => {
  const saved = JSON.parse(localStorage.getItem(pendingKey(userId)) || "null");
  return !saved ? [] : Array.isArray(saved) ? saved : [saved];
};
const writeTransferQueue = (userId, transfers) => {
  if (transfers.length) localStorage.setItem(pendingKey(userId), JSON.stringify(transfers));
  else localStorage.removeItem(pendingKey(userId));
};
const readGuest = () => {
  try { return normaliseCartItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return []; }
};
const readGuestToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    const created = makeCartOperationId("merge");
    localStorage.setItem(TOKEN_KEY, created);
    return created;
  } catch { return makeCartOperationId("merge"); }
};

export const CartContext = createContext({
  isCartOpen: false, setIsCartOpen: () => {}, cartItems: [], cartCount: 0, cartTotal: 0,
  addItemToCart: () => {}, addItemsToCart: async () => {}, removeItemFromCart: () => {},
  clearItemFromCart: () => {}, chooseItemVariant: () => {}, clearCart: async () => {},
  consumePurchasedItems: async () => {}, isCheckoutSaving: false, setIsCheckoutSaving: () => {},
  completeAccountCheckout: async () => {},
  cartSyncStatus: "guest", cartSyncError: "", isCartReady: true, retryCartSync: () => {},
});

export const CartProvider = ({ children }) => {
  const { currentUser, isAuthReady } = useContext(UserContext);
  const userId = currentUser?.uid;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [guestItems, setGuestItems] = useState(readGuest);
  const guestItemsRef = useRef(guestItems);
  guestItemsRef.current = guestItems;
  const consumedGuestReceipts = useRef(new Set());
  const guestToken = useRef(null);
  if (!guestToken.current) guestToken.current = readGuestToken();
  const [remote, setRemote] = useState({});
  const [syncError, setSyncError] = useState({});
  const [pending, setPending] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [isCheckoutSaving, updateSaving] = useState(false);
  const savingRef = useRef(false);
  const activeUser = useRef(userId);
  const queue = useRef(Promise.resolve());
  const failures = useRef(new Map());
  activeUser.current = userId;

  const cartItems = userId ? remote.userId === userId ? remote.items ?? [] : [] : guestItems;
  const accountError = syncError.userId === userId ? syncError.message : "";
  const isPending = pending.userId === userId && pending.count > 0;
  const cartSyncStatus = !isAuthReady ? "loading" : !userId ? "guest" : accountError ? "error"
    : remote.userId !== userId || !remote.ready ? "loading" : isPending ? "saving" : "ready";

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(guestItemsRef.current)); }
    catch { /* The guest bag remains available during this visit. */ }
  }, [guestItems]);

  useEffect(() => {
    if (!userId || !isAuthReady) return;
    let active = true;
    let merging = true;
    let serverLoaded = false;
    setSyncError({ userId, message: "" });
    setRemote((previous) => ({ userId, items: previous.userId === userId ? previous.items : [], ready: false }));
    const fail = (error) => { if (active) setSyncError({ userId, message: error.message || "We couldn’t sync your bag." }); };
    let unsubscribe;
    try {
      unsubscribe = subscribeAccountCart(userId, (items, revision) => {
        serverLoaded = true;
        if (active) setRemote((previous) => previous.userId === userId && previous.revision > revision
          ? previous : { userId, items, revision, ready: !merging });
      }, fail);
    } catch (error) { fail(error); }

    const mergeGuest = async () => {
      try {
        const transfers = readTransferQueue(userId);
        if (guestItemsRef.current.length) {
          const transfer = { id: guestToken.current, items: guestItemsRef.current };
          if (!transfers.some((entry) => entry.id === transfer.id)) transfers.push(transfer);
          // Claim the guest bag for this UID before any network operation. A later account
          // can never inherit a pending or previously signed-in customer's shopping bag.
          writeTransferQueue(userId, transfers);
          localStorage.setItem(STORAGE_KEY, "[]");
          localStorage.removeItem(TOKEN_KEY);
          guestToken.current = readGuestToken();
          guestItemsRef.current = [];
          if (active) setGuestItems([]);
        }
        for (const transfer of transfers) {
          const result = await updateAccountCart(userId, { ...transfer, type: "merge" });
          serverLoaded = true;
          if (active) setRemote((previous) => previous.userId === userId && previous.revision > result.revision
            ? previous : { userId, ...result, ready: false });
          // Another tab may have added a new transfer while this one was saving.
          writeTransferQueue(userId, readTransferQueue(userId).filter((entry) => entry.id !== transfer.id));
        }
      } catch (error) { fail(error); }
      finally {
        merging = false;
        if (active && serverLoaded) setRemote((previous) => ({ ...previous, ready: true }));
      }
    };
    mergeGuest();
    return () => { active = false; unsubscribe?.(); };
    // A guest bag is claimed once when the authenticated account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAuthReady, attempt]);

  const setIsCheckoutSaving = (saving) => { savingRef.current = saving; updateSaving(saving); };

  const accountOperation = (operation, { retryInBagSync = true } = {}) => {
    const owner = userId;
    setPending((previous) => ({ userId: owner, count: (previous.userId === owner ? previous.count : 0) + 1 }));
    const run = queue.current.then(async () => {
      if (activeUser.current !== owner) throw new Error("Your signed-in account changed. Retry from the correct account.");
      const result = operation.type === "checkoutOrder"
        ? await commitAccountCheckout(owner, operation.order)
        : await updateAccountCart(owner, operation);
      if (activeUser.current === owner) setRemote((previous) => previous.userId === owner && previous.revision > result.revision
        ? previous : { userId: owner, ...result, ready: true });
      failures.current.delete(operation.id);
    });
    queue.current = run.catch(() => {});
    return run.catch((error) => {
      if (retryInBagSync) {
        failures.current.set(operation.id, { userId: owner, operation });
        if (activeUser.current === owner) setSyncError({ userId: owner, message: error.message });
      }
      throw error;
    }).finally(() => {
      if (activeUser.current === owner) setPending((previous) => ({ userId: owner, count: Math.max(0, (previous.count || 1) - 1) }));
    });
  };

  const change = (operation, { allowSaving = false, rethrow = false } = {}) => {
    if (savingRef.current && !allowSaving) return rethrow ? Promise.reject(new Error("Your demo order is still saving.")) : undefined;
    const action = { ...operation, id: operation.id || makeCartOperationId() };
    if (!userId) {
      if (action.type === "checkout" && consumedGuestReceipts.current.has(action.id)) return Promise.resolve();
      try {
        const next = applyCartOperation(guestItemsRef.current, action);
        guestItemsRef.current = next;
        setGuestItems(next);
        if (action.type === "checkout") consumedGuestReceipts.current.add(action.id);
        return Promise.resolve();
      } catch (error) { return rethrow ? Promise.reject(error) : undefined; }
    }
    if (!allowSaving && (cartSyncStatus === "loading" || accountError)) {
      const error = new Error("Wait for your bag to sync, or retry the failed sync first.");
      return rethrow ? Promise.reject(error) : undefined;
    }
    const result = accountOperation(action);
    return rethrow ? result : result.catch(() => {});
  };

  const addItemToCart = (product, { openDrawer = true } = {}) => {
    const result = change({ type: "add", items: [{ ...product, quantity: 1 }] });
    if (openDrawer && !savingRef.current) setIsCartOpen(true);
    return result;
  };
  const addItemsToCart = (items) => {
    const result = change({ type: "add", items }, { rethrow: true });
    setIsCartOpen(true);
    return result;
  };
  const consumePurchasedItems = (items, receiptId) => change({
    type: "checkout", items, id: receiptId ? `checkout-${receiptId}` : undefined,
  }, { allowSaving: true, rethrow: true });
  const completeAccountCheckout = (order) => {
    if (!userId) return Promise.reject(new Error("Sign in before saving this account order."));
    return accountOperation({ id: `checkout-${order.id}`, type: "checkoutOrder", order }, { retryInBagSync: false });
  };
  const retryCartSync = async () => {
    setSyncError({ userId, message: "" });
    for (const failure of failures.current.values()) {
      if (failure.userId === userId) {
        try { await accountOperation(failure.operation); } catch { return; }
      }
    }
    setAttempt((previous) => previous + 1);
  };

  return <CartContext.Provider value={{
    isCartOpen, setIsCartOpen, cartItems,
    cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    cartTotal: cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0),
    addItemToCart, addItemsToCart,
    removeItemFromCart: (item) => change({ type: "decrement", item }),
    clearItemFromCart: (item) => change({ type: "remove", item }),
    chooseItemVariant: (item, variant) => change({ type: "choose", item, variant }),
    clearCart: (items, receiptId) => items ? consumePurchasedItems(items, receiptId) : change({ type: "clear" }, { allowSaving: true, rethrow: true }),
    consumePurchasedItems, completeAccountCheckout, isCheckoutSaving, setIsCheckoutSaving,
    cartSyncStatus, cartSyncError: accountError, isCartReady: ["guest", "ready"].includes(cartSyncStatus), retryCartSync,
  }}>{children}</CartContext.Provider>;
};
