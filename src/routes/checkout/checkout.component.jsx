import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { UserContext } from "../../contexts/user.context";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import {
  createDemoOrder,
  demoReceiptPath,
  formatDemoOrderDate,
  getDemoOrder,
} from "../../utils/demo-orders/demo-orders.utils";
import CheckoutItem from "../../components/checkout-item/checkout-item.component";
import StoreIcon from "../../components/store-icon/store-icon";

import "./checkout.styles.scss";

const DemoReceipt = ({ order, signedIn }) => (
  <div className="checkout__receipt">
    <div className="checkout__receipt-icon"><StoreIcon name="check" size={24} /></div>
    <p>This demo order is saved in this browser. No money was charged.</p>
    <dl className="checkout__receipt-meta">
      <div>
        <dt>Demo order reference</dt>
        <dd>{order.id}</dd>
      </div>
      <div>
        <dt>Order date</dt>
        <dd><time dateTime={order.placedAt}>{formatDemoOrderDate(order.placedAt)}</time></dd>
      </div>
    </dl>
    <h2 className="checkout__items-heading">Items in this order</h2>
    <ul className="checkout__receipt-items">
      {order.items.map((item) => (
        <li key={item.id}>
          <span>{item.name}</span>
          <span>{item.quantity} × {formatPrice(item.price)}</span>
        </li>
      ))}
    </ul>
    <div className="checkout__subtotal">
      <span>Demo total · {order.count} {order.count === 1 ? "item" : "items"}</span>
      <strong>{formatPrice(order.total)} <small>USD</small></strong>
    </div>
    <div className="checkout__receipt-actions">
      <Link className="store-button" to="/shop">
        Continue shopping <StoreIcon name="arrow" size={17} />
      </Link>
      {signedIn && <Link className="store-text-link" to="/auth">My account</Link>}
    </div>
  </div>
);

const Checkout = () => {
  const { cartItems, cartCount, cartTotal, clearCart } = useContext(CartContext);
  const { currentUser, isAuthReady } = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentError, setPaymentError] = useState("");
  const headingRef = useRef(null);
  const previousLength = useRef(cartItems.length);
  const paidCart = useRef(null);
  const userId = currentUser?.uid;
  const receiptId = searchParams.get("receipt");
  const receiptRequested = receiptId !== null;
  const receiptReady = receiptRequested && isAuthReady;

  let receipt = null;
  if (receiptReady) {
    try {
      receipt = getDemoOrder(receiptId, userId);
    } catch {
      // The unavailable receipt state also handles browsers that deny access to local storage.
    }
  }

  useEffect(() => {
    if (
      receiptReady ||
      (cartItems.length < previousLength.current &&
        document.activeElement === document.body)
    ) {
      headingRef.current.focus();
    }
    previousLength.current = cartItems.length;
  }, [cartItems.length, receiptReady, receiptId]);

  const simulatePayment = () => {
    if (!isAuthReady || cartCount === 0 || receiptRequested || paidCart.current === cartItems) return;

    setPaymentError("");
    let order;
    try {
      order = createDemoOrder(cartItems, userId);
    } catch {
      setPaymentError("We couldn’t save the demo order in this browser. Your bag is still here. Please try again.");
      return;
    }

    paidCart.current = cartItems;
    clearCart();
    navigate(demoReceiptPath(order.id), { replace: true });
  };

  let title = "Shopping bag";
  if (receipt) title = "Demo payment successful";
  else if (receiptRequested) title = receiptReady ? "Demo receipt unavailable" : "Demo receipt";

  return (
    <section className="checkout container" aria-labelledby="checkout-title">
      <nav className="checkout__breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{receiptRequested ? "Demo receipt" : "Shopping bag"}</span>
      </nav>
      <h1 id="checkout-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {receipt ? (
        <DemoReceipt order={receipt} signedIn={Boolean(userId)} />
      ) : receiptRequested ? (
        <div className="checkout__receipt">
          {receiptReady ? (
            <>
              <p>Open this demo receipt in the browser and account you used at checkout.</p>
              <Link className="store-button" to="/checkout">
                Back to shopping bag <StoreIcon name="arrow" size={17} />
              </Link>
            </>
          ) : <p role="status">Loading your receipt…</p>}
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
            {paymentError && <p className="checkout__payment-error" role="alert">{paymentError}</p>}
            <button className="store-button" type="button" onClick={simulatePayment} disabled={!isAuthReady}>
              {isAuthReady ? "Simulate payment" : "Preparing checkout…"} <StoreIcon name="arrow" size={17} />
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
