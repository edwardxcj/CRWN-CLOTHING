import { useContext, useState } from "react";
import { Link } from "react-router-dom";

import { WishlistContext } from "../../contexts/wishlist.context";
import { UserContext } from "../../contexts/user.context";
import { productPath } from "../../utils/catalog/catalog.utils";
import StoreIcon from "../store-icon/store-icon";

import "./wishlist-button.styles.scss";

const WishlistButton = ({ product, className = "" }) => {
  const { currentUser, isAuthReady } = useContext(UserContext);
  const { productIds, pendingIds, toggleProduct, status, retry } = useContext(WishlistContext);
  const [message, setMessage] = useState("");
  const saved = productIds.includes(Number(product.id));
  const pending = pendingIds.includes(Number(product.id));
  const returnTo = productPath(product);

  const toggle = async () => {
    setMessage("");
    if (!currentUser) { setMessage("signin"); return; }
    if (status === "error") { retry(); return; }
    try {
      await toggleProduct(product.id);
    } catch {
      setMessage("We couldn’t update your wishlist. Please try again.");
    }
  };

  return (
    <div className={`wishlist-button ${className}`.trim()}>
      <button
        className="wishlist-button__control"
        type="button"
        aria-label={`${saved ? "Remove from" : "Save to"} wishlist, ${product.name}`}
        aria-pressed={saved}
        disabled={!isAuthReady || pending || (Boolean(currentUser) && status === "loading")}
        onClick={toggle}
      >
        <StoreIcon name="heart" size={20} fill={saved ? "currentColor" : "none"} />
        <span className="sr-only">{pending ? "Saving…" : saved ? "Saved" : "Save"}</span>
      </button>
      {message === "signin" ? (
        <p className="wishlist-button__message" role="status">
          <Link to={`/auth?${new URLSearchParams({ returnTo })}`}>Sign in to save this item</Link>
        </p>
      ) : message ? <p className="wishlist-button__message" role="alert">{message}</p> : null}
      {status === "error" && currentUser && <span className="sr-only">Select to retry loading your wishlist.</span>}
    </div>
  );
};

export default WishlistButton;
