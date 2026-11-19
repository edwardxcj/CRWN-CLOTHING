import { useContext, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { UserContext } from "../../contexts/user.context";
import { CartContext } from "../../contexts/cart.context";
import { CategoriesContext } from "../../contexts/categories.context";
import { catalogProducts, formatPrice, productPath } from "../../utils/catalog/catalog.utils";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { getCartItemKey, getProductVariants, selectedVariantItem } from "../../utils/catalog/product-variants";
import { loadAccountDemoOrder } from "../../utils/demo-orders/account-demo-orders.utils";
import { demoReceiptPath, formatDemoOrderDate } from "../../utils/demo-orders/demo-orders.utils";
import { formatActivityDate, loadOrderState, orderStatusLabels, transitionDemoOrder } from "../../utils/demo-orders/order-center.utils";
import { loadSupportRequests, submitSupportRequest } from "../../utils/support/support.utils";
import CatalogImage from "../../components/catalog-image/catalog-image.component";

import "./order-detail.styles.scss";

const OrderContent = ({ userId, orderId }) => {
  const { categoriesMap } = useContext(CategoriesContext);
  const { cartItems, addItemsToCart } = useContext(CartContext);
  const [result, setResult] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setResult({ status: "loading" });
    loadAccountDemoOrder(orderId, userId).then(async (order) => {
      if (!order) { if (active) setResult({ status: "missing" }); return; }
      const [state, requests] = await Promise.all([loadOrderState(userId, orderId), loadSupportRequests(userId)]);
      if (active) setResult({ status: "ready", order, state, returnRequest: requests.find((request) => request.type === "return" && request.orderId === orderId) });
    }).catch(() => { if (active) setResult({ status: "error" }); });
    return () => { active = false; };
  }, [userId, orderId, attempt]);

  const updateStatus = async (nextStatus) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await transitionDemoOrder(userId, orderId, nextStatus);
      const state = await loadOrderState(userId, orderId);
      if (mounted.current) setResult((previous) => ({ ...previous, state }));
    } catch (failure) {
      if (mounted.current) setError(failure.message || "We couldn’t update this demo order. Please retry.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const buyAgain = async () => {
    if (busy || result.status !== "ready") return;
    setBusy(true);
    setError("");
    setNotice("");
    const products = catalogProducts(categoriesMap);
    const available = [];
    const unavailable = [];
    result.order.items.forEach((item) => {
      const product = products.find((entry) => String(entry.id) === String(item.id));
      const variant = product && getProductVariants(product).find((entry) => entry.size === item.size && entry.color === item.color);
      const existing = variant ? cartItems.find((entry) => getCartItemKey(entry) === variant.key)?.quantity ?? 0 : 0;
      if (!variant || item.quantity + existing > variant.stock) unavailable.push(`${item.name}${item.size ? ` (${item.size})` : " — choose a size"}`);
      else available.push({ ...selectedVariantItem(product, variant), quantity: item.quantity });
    });
    try {
      if (available.length) await addItemsToCart(available);
      if (mounted.current) setNotice([
        available.length ? "Available items were added to your bag at current prices." : "No items were added to your bag.",
        unavailable.length ? `Check availability or choose options for: ${unavailable.join(", ")}.` : "",
      ].filter(Boolean).join(" "));
    } catch {
      if (mounted.current) setError("We couldn’t add these items. Check your bag and current availability before trying again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const requestReturn = async (event) => {
    event.preventDefault();
    if (busy || result.status !== "ready") return;
    setBusy(true);
    setError("");
    try {
      const id = await submitSupportRequest(userId, { type: "return", orderId, subject: `Return for ${orderId}`, message: reason });
      if (mounted.current) {
        setResult((previous) => ({ ...previous, returnRequest: { id, status: "submitted", message: reason } }));
        setNotice("Your demo return request has been saved. View it in Help & support.");
      }
    } catch (failure) {
      if (mounted.current) setError(failure.message || "We couldn’t save your return request. Please retry.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (result.status === "loading") return <p role="status">Loading your order…</p>;
  if (result.status === "error") return <div className="order-detail__panel"><p role="alert">We couldn’t load this order.</p><button className="store-button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>;
  if (result.status === "missing") return <div className="order-detail__panel"><h2>Order unavailable</h2><p>Open an order saved to this account.</p><Link className="store-button" to="/auth#demo-orders">My orders</Link></div>;

  const { order, state, returnRequest } = result;
  const timeline = [
    ["Order placed", order.placedAt],
    ["Demo dispatched", state.shippedAt],
    ["Demo delivered", state.deliveredAt],
    ["Cancelled", state.cancelledAt],
  ].filter(([, date]) => date);
  const address = order.shippingAddress;

  return <>
    <header className="order-detail__heading"><div><p className="eyebrow">Demo order</p><h1>{order.id}</h1><p>Placed {formatDemoOrderDate(order.placedAt)}</p></div><span className="order-detail__status">{orderStatusLabels[state.status]}</span></header>
    <p className="order-detail__notice">Demo checkout and fulfilment. No payment or physical shipment is made.</p>
    {error && <p className="order-detail__feedback" role="alert">{error}</p>}
    {notice && <p className="order-detail__feedback" role="status">{notice}</p>}
    <div className="order-detail__layout">
      <section className="order-detail__panel" aria-labelledby="order-items-title">
        <h2 id="order-items-title">Items in your order</h2>
        <ul className="order-detail__items">{order.items.map((item) => <li key={getCartItemKey(item)}>
          <Link to={productPath(item)} className="order-detail__image" aria-label={`View ${item.name}`}><CatalogImage photo={catalogPhoto(item)} alt="" sizes="80px" /></Link>
          <div><Link to={productPath(item)}>{item.name}</Link><p>{[item.color, item.size].filter(Boolean).join(" · ")}</p><p>{item.quantity} × {formatPrice(item.price)}</p></div>
          <strong>{formatPrice(item.price * item.quantity)}</strong>
        </li>)}</ul>
        <p className="order-detail__total"><span>Demo total · USD</span><strong>{formatPrice(order.total)}</strong></p>
        {order.delivery && <p className="order-detail__delivery">{order.delivery.label} · {order.delivery.estimate}{Number.isFinite(order.delivery.fee) ? ` · ${formatPrice(order.delivery.fee)}` : ""}</p>}
        <div className="order-detail__actions"><button className="store-button" disabled={busy} onClick={buyAgain}>Buy again</button><Link className="store-text-link" to={demoReceiptPath(order.id)}>View original receipt</Link></div>
      </section>
      <aside className="order-detail__panel" aria-labelledby="order-progress-title">
        <h2 id="order-progress-title">Order progress</h2>
        <ol className="order-detail__timeline">{timeline.map(([label, date]) => <li key={label}><strong>{label}</strong><span>{formatActivityDate(date)}</span></li>)}</ol>
        <div className="order-detail__actions">
          {state.status === "processing" && <><button className="store-button" disabled={busy} onClick={() => updateStatus("shipped")}>Simulate dispatch</button><button className="store-button store-button--outline" disabled={busy} onClick={() => updateStatus("cancelled")}>Cancel demo order</button></>}
          {state.status === "shipped" && <button className="store-button" disabled={busy} onClick={() => updateStatus("delivered")}>Simulate delivery</button>}
        </div>
        {address && <div className="order-detail__address"><h3>Delivery address</h3><address>{address.recipient}<br />{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}<br />{address.country}</address></div>}
      </aside>
    </div>
    {state.status === "delivered" && <section className="order-detail__panel order-detail__return" aria-labelledby="order-return-title"><h2 id="order-return-title">Request a demo return</h2>{returnRequest ? <p>Your request is {returnRequest.status}. Reference <strong>{returnRequest.id}</strong>. <Link to="/help">View support requests</Link></p> : <form onSubmit={requestReturn}><label>Reason for return<textarea required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} /></label><button className="store-button" disabled={busy || reason.trim().length < 10}>Submit demo return request</button></form>}</section>}
    <Link className="store-text-link" to="/help">Need help with this order?</Link>
  </>;
};

const OrderDetail = () => {
  const { orderId } = useParams();
  const { currentUser, isAuthReady } = useContext(UserContext);
  if (!isAuthReady) return <section className="container order-detail"><p role="status">Loading your account…</p></section>;
  if (!currentUser) return <section className="container order-detail"><h1>Your order</h1><p>Sign in to the account used for this demo order.</p><Link className="store-button" to={`/auth?${new URLSearchParams({ returnTo: `/orders/${orderId}` })}`}>Sign in</Link></section>;
  return <section className="container order-detail"><nav className="order-detail__breadcrumb" aria-label="Breadcrumb"><Link to="/auth#demo-orders">My orders</Link><span aria-hidden="true">/</span><span>Order details</span></nav><OrderContent key={`${currentUser.uid}:${orderId}`} userId={currentUser.uid} orderId={orderId} /></section>;
};

export default OrderDetail;
