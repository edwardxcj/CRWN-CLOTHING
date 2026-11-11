import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import CheckoutItem from "../../components/checkout-item/checkout-item.component";
import StoreIcon from "../../components/store-icon/store-icon";

import "./checkout.styles.scss";

const Checkout = () => {
  const { cartItems, cartCount, cartTotal, clearCart } = useContext(CartContext);
  const [receipt, setReceipt] = useState(null);
  const headingRef = useRef(null);
  const previousLength = useRef(cartItems.length);

  useEffect(() => {
    if (
      receipt ||
      (cartItems.length < previousLength.current &&
        document.activeElement === document.body)
    ) {
      headingRef.current.focus();
    }
    previousLength.current = cartItems.length;
  }, [cartItems.length, receipt]);

  const simulatePayment = () => {
    if (cartCount === 0 || receipt) return;
    setReceipt({ count: cartCount, total: cartTotal });
    clearCart();
  };

  return (
    <section className="checkout container" aria-labelledby="checkout-title">
      <nav className="checkout__breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{receipt ? "Confirmation" : "Shopping bag"}</span>
      </nav>
      <h1 id="checkout-title" ref={headingRef} tabIndex={-1}>
        {receipt ? "Demo payment successful" : "Shopping bag"}
      </h1>
      {receipt ? (
        <div className="checkout__receipt">
          <div className="checkout__receipt-icon"><StoreIcon name="check" size={24} /></div>
          <p>Your demo order is complete. No money was charged.</p>
          <div className="checkout__subtotal">
            <span>{receipt.count} {receipt.count === 1 ? "item" : "items"}</span>
            <strong>{formatPrice(receipt.total)} <small>USD</small></strong>
          </div>
          <Link className="store-button" to="/shop">
            Continue shopping <StoreIcon name="arrow" size={17} />
          </Link>
        </div>
      ) : cartItems.length > 0 ? (
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
            <div className="checkout__method">
              <StoreIcon name="card" size={22} />
              <div>
                <strong>Test card ···· 4242</strong>
                <p>Demo payment only. No charge will be made.</p>
              </div>
            </div>
            <button className="store-button" type="button" onClick={simulatePayment}>
              Simulate payment <StoreIcon name="arrow" size={17} />
            </button>
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
