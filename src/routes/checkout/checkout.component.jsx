import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { UserContext } from "../../contexts/user.context";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import {
  loadAccountDemoOrder,
  saveAccountDemoOrder,
} from "../../utils/demo-orders/account-demo-orders.utils";
import {
  buildDemoOrder,
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
    <p>{signedIn ? "Saved to your account. No money was charged." : "Saved in this browser. No money was charged."}</p>
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
  const [isSaving, setIsSaving] = useState(false);
  const [accountReceipt, setAccountReceipt] = useState(null);
  const [receiptAttempt, setReceiptAttempt] = useState(0);
  const headingRef = useRef(null);
  const previousLength = useRef(cartItems.length);
  const paidCart = useRef(null);
  const pendingPayment = useRef(null);
  const savingPayment = useRef(false);
  const isMounted = useRef(false);
  const userId = currentUser?.uid;
  const receiptId = searchParams.get("receipt");
  const receiptRequested = receiptId !== null;
  const accountReceiptKey = receiptRequested && isAuthReady && userId
    ? JSON.stringify([userId, receiptId, receiptAttempt])
    : null;
  const currentReceipt = accountReceipt?.key === accountReceiptKey ? accountReceipt : null;
  const receiptLoading = receiptRequested && (!isAuthReady || (accountReceiptKey && !currentReceipt));

  let receipt = currentReceipt?.order ?? null;
  if (receiptRequested && isAuthReady && !userId) {
    try {
      receipt = getDemoOrder(receiptId);
    } catch {
      // The unavailable receipt state also handles browsers that deny access to local storage.
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!accountReceiptKey) return;

    let active = true;
    loadAccountDemoOrder(receiptId, userId).then(
      (order) => { if (active) setAccountReceipt({ key: accountReceiptKey, order }); },
      () => { if (active) setAccountReceipt({ key: accountReceiptKey, failed: true }); }
    );

    return () => { active = false; };
  }, [accountReceiptKey, receiptId, userId]);

  useEffect(() => {
    if (
      receiptRequested ||
      (cartItems.length < previousLength.current &&
        document.activeElement === document.body)
    ) {
      headingRef.current.focus();
    }
    previousLength.current = cartItems.length;
  }, [cartItems.length, receiptRequested, receiptId, receiptLoading]);

  const simulatePayment = async () => {
    if (!isAuthReady || !cartCount || receiptRequested || savingPayment.current || paidCart.current === cartItems) return;

    setPaymentError("");
    savingPayment.current = true;
    let order;
    try {
      if (userId) {
        setIsSaving(true);
        const pending = pendingPayment.current;
        order = pending?.items === cartItems && pending.userId === userId
          ? pending.order
          : buildDemoOrder(cartItems);
        pendingPayment.current = { items: cartItems, userId, order };
        await saveAccountDemoOrder(order, userId);
      } else {
        order = createDemoOrder(cartItems);
      }
    } catch {
      if (isMounted.current) setPaymentError("We couldn’t save the demo order. Your bag is still here. Please try again.");
      return;
    } finally {
      savingPayment.current = false;
      if (userId && isMounted.current) setIsSaving(false);
    }

    paidCart.current = cartItems;
    pendingPayment.current = null;
    clearCart(cartItems);
    if (isMounted.current) navigate(demoReceiptPath(order.id), { replace: true });
  };

  let title = "Shopping bag";
  if (receipt) title = "Demo payment successful";
  else if (receiptRequested) title = receiptLoading ? "Demo receipt" : "Demo receipt unavailable";

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
          {receiptLoading ? (
            <p role="status">Loading your receipt…</p>
          ) : currentReceipt?.failed ? (
            <>
              <p role="alert">We couldn’t load your demo receipt. Please try again.</p>
              <button className="store-button" type="button" onClick={() => setReceiptAttempt((attempt) => attempt + 1)}>
                Retry <StoreIcon name="arrow" size={17} />
              </button>
            </>
          ) : (
            <>
              <p>{userId
                ? "Open a receipt from the Demo orders section of your account."
                : "Sign in to the account you used at checkout, or open a guest receipt in its original browser."}</p>
              <div className="checkout__receipt-actions">
                <Link className="store-button" to="/checkout">
                  Back to shopping bag <StoreIcon name="arrow" size={17} />
                </Link>
                <Link className="store-text-link" to="/auth#demo-orders">
                  {userId ? "My account" : "Sign in"}
                </Link>
              </div>
            </>
          )}
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
            <button className="store-button" type="button" onClick={simulatePayment} disabled={!isAuthReady || isSaving}>
              {isSaving ? "Saving demo order…" : isAuthReady ? "Simulate payment" : "Preparing checkout…"} <StoreIcon name="arrow" size={17} />
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
