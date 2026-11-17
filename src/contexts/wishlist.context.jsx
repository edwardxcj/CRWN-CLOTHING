import { createContext, useContext, useEffect, useRef, useState } from "react";

import { UserContext } from "./user.context";
import { removeWishlistProduct, saveWishlistProduct, subscribeWishlist } from "../utils/wishlist/wishlist.utils";

export const WishlistContext = createContext({
  productIds: [],
  status: "loading",
  pendingIds: [],
  retry: () => {},
  toggleProduct: async () => { throw new Error("Wishlist unavailable"); },
});

export const WishlistProvider = ({ children }) => {
  const { currentUser, isAuthReady } = useContext(UserContext);
  const userId = currentUser?.uid;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({});
  const [pending, setPending] = useState({});
  const activeUser = useRef(userId);
  const inFlight = useRef(new Set());
  activeUser.current = userId;
  const current = result.userId === userId ? result : {};
  const productIds = current.productIds ?? [];
  const status = !isAuthReady ? "loading" : !userId ? "guest" : current.status ?? "loading";

  useEffect(() => {
    inFlight.current = new Set();
    setPending({});
    if (!userId || !isAuthReady) return;

    let active = true;
    const fail = () => {
      if (active) setResult((previous) => ({
        userId,
        productIds: previous.userId === userId ? previous.productIds ?? [] : [],
        status: "error",
      }));
    };
    let unsubscribe;
    try {
      unsubscribe = subscribeWishlist(userId,
        (ids) => { if (active) setResult({ userId, productIds: ids, status: "ready" }); },
        fail);
    } catch {
      fail();
    }
    return () => { active = false; unsubscribe?.(); };
  }, [userId, isAuthReady, attempt]);

  const toggleProduct = async (productId) => {
    if (!userId || status !== "ready") throw new Error("Wishlist unavailable");
    const id = Number(productId);
    const key = `${userId}:${id}`;
    if (inFlight.current.has(key)) return;
    const saved = productIds.includes(id);
    inFlight.current.add(key);
    setPending((previous) => ({ ...previous, [id]: userId }));
    try {
      if (saved) await removeWishlistProduct(userId, id);
      else await saveWishlistProduct(userId, id);
    } finally {
      inFlight.current.delete(key);
      if (activeUser.current === userId) setPending((previous) => ({ ...previous, [id]: null }));
    }
  };

  const retry = () => {
    setResult({ userId, productIds, status: "loading" });
    setAttempt((previous) => previous + 1);
  };

  return <WishlistContext.Provider value={{
    productIds,
    status,
    pendingIds: Object.keys(pending).filter((id) => pending[id] === userId).map(Number),
    toggleProduct,
    retry,
  }}>{children}</WishlistContext.Provider>;
};
