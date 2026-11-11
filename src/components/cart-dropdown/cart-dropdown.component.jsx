import { useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import CheckoutItem from "../checkout-item/checkout-item.component";
import StoreIcon from "../store-icon/store-icon";

import "./cart-dropdown.styles.scss";

const CartDropdown = () => {
  const { cartItems, cartCount, cartTotal, isCartOpen, setIsCartOpen } =
    useContext(CartContext);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeDrawer = () => setIsCartOpen(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isCartOpen) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isCartOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog.open && !dialog.contains(document.activeElement)) {
      closeButtonRef.current.focus();
    }
  }, [cartItems.length]);

  return (
    <dialog
      ref={dialogRef}
      id="shopping-bag"
      className="bag-drawer"
      aria-labelledby="shopping-bag-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDrawer();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDrawer();
      }}
    >
      <div className="bag-drawer__panel">
        <header className="bag-drawer__header">
          <div>
            <h2 id="shopping-bag-title">Your bag</h2>
            <p>{cartCount} {cartCount === 1 ? "item" : "items"}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="bag-drawer__close"
            aria-label="Close shopping bag"
            onClick={closeDrawer}
          >
            <StoreIcon name="close" />
          </button>
        </header>

        {cartItems.length > 0 ? (
          <>
            <ul className="bag-drawer__items">
              {cartItems.map((item) => (
                <CheckoutItem
                  key={item.id}
                  cartItem={item}
                  compact
                  onNavigate={closeDrawer}
                />
              ))}
            </ul>
            <div className="bag-drawer__footer">
              <div className="bag-drawer__subtotal">
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <Link
                className="store-button bag-drawer__action"
                to="/checkout"
                onClick={closeDrawer}
              >
                Review bag <StoreIcon name="arrow" size={17} />
              </Link>
              <button
                type="button"
                className="bag-drawer__continue"
                onClick={closeDrawer}
              >
                Continue shopping
              </button>
            </div>
          </>
        ) : (
          <div className="bag-drawer__empty">
            <StoreIcon name="bag" size={36} />
            <p>Your bag is empty.</p>
            <Link
              className="store-button bag-drawer__action"
              to="/shop"
              onClick={closeDrawer}
            >
              Explore the shop <StoreIcon name="arrow" size={17} />
            </Link>
          </div>
        )}
      </div>
    </dialog>
  );
};

export default CartDropdown;
