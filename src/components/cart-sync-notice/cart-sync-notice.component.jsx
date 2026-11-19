import { useContext } from "react";

import { CartContext } from "../../contexts/cart.context";

const CartSyncNotice = () => {
  const { cartSyncStatus, cartSyncError, retryCartSync } = useContext(CartContext);
  if (cartSyncStatus === "guest" || cartSyncStatus === "ready") return null;
  return <div className="cart-sync-notice" style={{ padding: "1rem", fontSize: ".85rem", lineHeight: 1.5 }}>
    {cartSyncStatus === "error" ? <>
      <p role="alert">{cartSyncError || "We couldn’t sync your shopping bag. Your saved bag is still in your account."}</p>
      <button type="button" className="store-text-link" onClick={retryCartSync}>Retry bag sync</button>
    </> : <p role="status">{cartSyncStatus === "saving" ? "Saving your bag to your account…" : "Loading your account’s bag…"}</p>}
  </div>;
};

export default CartSyncNotice;
