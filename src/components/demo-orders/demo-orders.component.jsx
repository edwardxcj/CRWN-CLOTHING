import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "../../utils/catalog/catalog.utils";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { loadOrderStates, orderStatusLabels } from "../../utils/demo-orders/order-center.utils";
import { loadAccountDemoOrders } from "../../utils/demo-orders/account-demo-orders.utils";
import {
  demoReceiptPath,
  formatDemoOrderDate,
} from "../../utils/demo-orders/demo-orders.utils";
import StoreIcon from "../store-icon/store-icon";
import CatalogImage from "../catalog-image/catalog-image.component";

import "./demo-orders.styles.scss";

const DemoOrderHistory = ({ userId }) => {
  const [result, setResult] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let active = true;

    Promise.all([loadAccountDemoOrders(userId), loadOrderStates(userId)]).then(
      ([orders, states]) => {
        if (active) setResult({ status: "ready", orders, states });
      },
      () => {
        if (active) setResult({ status: "error" });
      }
    );

    return () => { active = false; };
  }, [userId, attempt]);

  const retry = () => {
    setResult({ status: "loading" });
    setAttempt((previous) => previous + 1);
  };

  if (result.status === "loading") {
    return <p className="demo-orders__note" role="status">Loading demo orders…</p>;
  }

  if (result.status === "error") {
    return (
      <>
        <p className="demo-orders__note" role="status">We couldn’t load your demo orders.</p>
        <button className="store-button store-button--outline demo-orders__retry" type="button" onClick={retry}>
          Retry
        </button>
      </>
    );
  }

  const filteredOrders = result.orders.filter((order) => (
    (status === "all" || (result.states[order.id]?.status ?? "processing") === status) &&
    `${order.id} ${order.items.map((item) => item.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
  ));

  return (
    <>
      <p className="demo-orders__note">Your demo orders are saved to this account.</p>
      {result.orders.length > 0 && <div className="demo-orders__filters">
        <label>Find an order<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order reference or product" /></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All orders</option>
          {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>}
      {result.orders.length === 0 ? (
        <p className="demo-orders__empty">No demo orders yet.</p>
      ) : (
        <ul className="demo-orders__list">
          {filteredOrders.map((order) => (
            <li key={order.id}>
              <Link className="demo-orders__image" to={`/orders/${order.id}`} aria-label={`Manage order ${order.id}`}>
                <CatalogImage photo={catalogPhoto(order.items[0])} alt="" sizes="72px" />
              </Link>
              <div>
                <p className="demo-orders__reference">{order.id}</p>
                <p className="demo-orders__product">{order.items[0].name}{order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}</p>
                <p className="demo-orders__details">{[order.items[0].color, order.items[0].size].filter(Boolean).join(" · ")}</p>
                <p className="demo-orders__status">{orderStatusLabels[result.states[order.id]?.status ?? "processing"]}</p>
                <p className="demo-orders__details">
                  <time dateTime={order.placedAt}>{formatDemoOrderDate(order.placedAt)}</time>
                  {` · ${order.count} ${order.count === 1 ? "item" : "items"}`}
                </p>
              </div>
              <strong>{formatPrice(order.total)} <small>USD</small></strong>
              <Link
                className="store-text-link"
                to={demoReceiptPath(order.id)}
                aria-label={`View receipt for ${order.id}`}
              >
                View receipt <StoreIcon name="arrow" size={15} />
              </Link>
              <Link className="store-text-link demo-orders__manage" to={`/orders/${order.id}`}>Manage order</Link>
            </li>
          ))}
          {filteredOrders.length === 0 && <li>No orders match your search.</li>}
        </ul>
      )}
    </>
  );
};

const DemoOrders = ({ userId, className = "" }) => (
  <section id="demo-orders" className={`demo-orders ${className}`.trim()} aria-labelledby="demo-orders-title">
    <h2 id="demo-orders-title">Demo orders</h2>
    <DemoOrderHistory key={userId} userId={userId} />
  </section>
);

export default DemoOrders;
