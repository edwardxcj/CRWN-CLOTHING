import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { formatPrice } from "../../utils/catalog/catalog.utils";
import { loadAccountDemoOrders } from "../../utils/demo-orders/account-demo-orders.utils";
import {
  demoReceiptPath,
  formatDemoOrderDate,
} from "../../utils/demo-orders/demo-orders.utils";
import StoreIcon from "../store-icon/store-icon";

import "./demo-orders.styles.scss";

const DemoOrderHistory = ({ userId }) => {
  const [result, setResult] = useState({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    loadAccountDemoOrders(userId).then(
      (orders) => {
        if (active) setResult({ status: "ready", orders });
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

  return (
    <>
      <p className="demo-orders__note">Your demo orders are saved to this account.</p>
      {result.orders.length === 0 ? (
        <p className="demo-orders__empty">No demo orders yet.</p>
      ) : (
        <ul className="demo-orders__list">
          {result.orders.map((order) => (
            <li key={order.id}>
              <div>
                <p className="demo-orders__reference">{order.id}</p>
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
            </li>
          ))}
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
