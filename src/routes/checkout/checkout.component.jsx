import { useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import CheckoutItem from "../../components/checkout-item/checkout-item.component";
import StoreIcon from "../../components/store-icon/store-icon";

import "./checkout.styles.scss";

const Checkout = () => {
  const { cartItems, cartCount, cartTotal } = useContext(CartContext);
  const headingRef = useRef(null);
  const previousLength = useRef(cartItems.length);

  useEffect(() => {
    if (
      cartItems.length < previousLength.current &&
      document.activeElement === document.body
    ) {
      headingRef.current.focus();
    }
    previousLength.current = cartItems.length;
  }, [cartItems.length]);

  return (
    <section className="checkout container" aria-labelledby="checkout-title">
      <nav className="checkout__breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Shopping bag</span>
      </nav>
      <h1 id="checkout-title" ref={headingRef} tabIndex={-1}>
        Shopping bag
      </h1>
      {cartItems.length > 0 ? (
        <div className="checkout__layout">
          <section aria-labelledby="checkout-items">
            <h2 id="checkout-items" className="checkout__items-heading">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </h2>
            <ul className="checkout__items">
              {cartItems.map((item) => (
                <CheckoutItem key={item.id} cartItem={item} />
              ))}
            </ul>
          </section>
          <aside className="checkout__summary" aria-labelledby="order-summary">
            <h2 id="order-summary">Order summary</h2>
            <div className="checkout__subtotal">
              <span>Subtotal <small>USD</small></span>
              <strong aria-live="polite">{formatPrice(cartTotal)}</strong>
            </div>
            <p>Online payment isn’t available yet.</p>
            <Link className="store-button store-button--outline" to="/shop">
              Continue shopping <StoreIcon name="arrow" size={17} />
            </Link>
          </aside>
        </div>
      ) : (
        <div className="checkout__empty">
          <StoreIcon name="bag" size={38} />
          <h2>Your bag is empty</h2>
          <Link className="store-button" to="/shop">
            Explore the shop <StoreIcon name="arrow" size={17} />
          </Link>
        </div>
      )}
    </section>
  );
};

export default Checkout;
