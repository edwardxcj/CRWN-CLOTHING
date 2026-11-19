import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { UserContext } from "../../contexts/user.context";
import { createSupportRequestId, loadSupportRequests, submitSupportRequest } from "../../utils/support/support.utils";
import { formatActivityDate } from "../../utils/demo-orders/order-center.utils";

import "./help.styles.scss";

const faq = [
  ["How do delivery options work?", "Choose Standard or Express during checkout. The estimated delivery window and delivery fee appear before you confirm. Orders, dispatch and delivery are simulated in this store."],
  ["Where can I track my order?", "Open My account, find the order under Demo orders, and select Manage order. The order timeline records when you simulate dispatch and delivery."],
  ["Can I cancel an order?", "You can cancel a demo order while its status is Processing. After dispatch, continue to simulate delivery and then open a demo return request."],
  ["How do I request a return?", "Open a delivered demo order and enter a reason in Request a demo return. Your request is saved to this account and can be reviewed here. No parcel needs to be posted for a demo return."],
  ["How do I find the right size?", "Use each product’s size guide and measuring instructions. Choose a size and pictured colour before adding the product. Out-of-stock demo options are disabled."],
  ["Will my saved items follow me to another device?", "Sign in with the same account to view your wishlist, account shopping bag, addresses and demo orders on another device. Guest purchases stay in their original browser."],
];

const SupportPanel = ({ userId }) => {
  const [requests, setRequests] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [subject, setSubject] = useState("Product information");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const draftId = useRef(createSupportRequestId());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(false);
    loadSupportRequests(userId).then(
      (result) => { if (active) setRequests(result); },
      () => { if (active) setLoadError(true); }
    );
    return () => { active = false; };
  }, [userId, attempt]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const id = await submitSupportRequest(userId, { id: draftId.current, type: "contact", subject, message });
      if (!mounted.current) return;
      setNotice(`Request ${id} has been saved to your account.`);
      setMessage("");
      draftId.current = createSupportRequestId();
      setAttempt((value) => value + 1);
    } catch (failure) {
      if (mounted.current) setError(failure.message || "We couldn’t save your request. Please retry.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return <div className="help-page__support-layout">
    <section className="help-page__panel" aria-labelledby="contact-title">
      <h2 id="contact-title">Contact us</h2>
      <p>Send a question about the collection or a demo order. Your request is saved here for follow-up.</p>
      <form onSubmit={submit}>
        <label>Topic<select value={subject} onChange={(event) => { setSubject(event.target.value); draftId.current = createSupportRequestId(); }} disabled={busy}>
          {["Product information", "Sizing and fit", "Order help", "Account help", "Other question"].map((topic) => <option key={topic}>{topic}</option>)}
        </select></label>
        <label>Your message<textarea required minLength={10} maxLength={2000} value={message} onChange={(event) => { setMessage(event.target.value); draftId.current = createSupportRequestId(); }} disabled={busy} /></label>
        <span className="help-page__hint">10–2,000 characters. Include an order reference if your question concerns an order.</span>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button className="store-button" disabled={busy || message.trim().length < 10}>{busy ? "Saving request…" : "Submit request"}</button>
      </form>
    </section>
    <section className="help-page__panel" aria-labelledby="support-requests-title">
      <h2 id="support-requests-title">Your requests</h2>
      {loadError ? <><p role="alert">We couldn’t load your requests.</p><button className="store-button store-button--outline" onClick={() => setAttempt((value) => value + 1)}>Retry</button></>
        : requests === null ? <p role="status">Loading support requests…</p>
        : requests.length === 0 ? <p>No requests yet.</p>
        : <ul className="help-page__requests">{requests.map((request) => <li key={request.id}>
          <div><strong>{request.subject}</strong><span>{request.status.replace(/_/g, " ")}</span></div>
          <p>{request.id} · {request.createdAt ? formatActivityDate(request.createdAt) : "Submitted"}</p>
          <p className="help-page__message">{request.message}</p>
          {request.orderId && <Link className="store-text-link" to={`/orders/${request.orderId}`}>View order</Link>}
        </li>)}</ul>}
    </section>
  </div>;
};

const Help = () => {
  const { currentUser, isAuthReady } = useContext(UserContext);
  return <section className="container help-page">
    <header className="help-page__heading"><p className="eyebrow">Customer care</p><h1>Help &amp; support</h1><p>Product guidance, delivery information and support for your demo orders.</p></header>
    <nav className="help-page__navigation" aria-label="Help sections"><a href="#help-faq">Common questions</a><a href="#help-delivery">Delivery &amp; returns</a><a href="#help-contact">Contact &amp; requests</a></nav>
    <section id="help-faq" className="help-page__faq" aria-labelledby="faq-title"><h2 id="faq-title">Common questions</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section id="help-delivery" className="help-page__panel help-page__delivery" aria-labelledby="delivery-help-title"><h2 id="delivery-help-title">Delivery &amp; returns</h2><p>Review the delivery method, fee and estimate before confirming checkout. Your selected address is saved with the order so later address edits keep your order record consistent.</p><p>Use the simulation controls in an order to move it from Processing to Demo dispatched and Demo delivered. You can cancel during Processing, or submit a demo return after delivery. Return requests remain visible in your support history.</p><Link className="store-text-link" to="/auth#demo-orders">Open my orders</Link></section>
    <div id="help-contact">{!isAuthReady ? <p role="status">Loading your account…</p> : currentUser ? <SupportPanel key={currentUser.uid} userId={currentUser.uid} /> : <section className="help-page__panel"><h2>Contact &amp; requests</h2><p>Sign in to submit a request and follow its status in your account.</p><Link className="store-button" to="/auth?returnTo=%2Fhelp">Sign in</Link></section>}</div>
  </section>;
};

export default Help;
