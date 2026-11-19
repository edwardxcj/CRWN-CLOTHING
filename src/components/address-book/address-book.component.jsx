import { useContext, useEffect, useRef, useState } from "react";

import { UserContext } from "../../contexts/user.context";
import { addressError, addressSnapshot, createAddressId, deleteAddress, emptyAddress, loadAddressBook, saveAddress, setDefaultAddress } from "../../utils/addresses/addresses.utils";
import AddressForm from "./address-form.component";

import "./address-book.styles.scss";

const AccountAddresses = ({ userId }) => {
  const [book, setBook] = useState(null);
  const [draft, setDraft] = useState(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const draftId = useRef(null);
  const loadSequence = useRef(0);

  useEffect(() => {
    let active = true;
    const sequence = ++loadSequence.current;
    loadAddressBook(userId).then((result) => {
      if (active && sequence === loadSequence.current) { setBook(result); setRefreshFailed(false); setError(""); }
    }, () => {
      if (active && sequence === loadSequence.current) setError("We couldn’t load your addresses. Please retry.");
    });
    return () => { active = false; };
  }, [userId, attempt]);

  const edit = (address) => {
    draftId.current = address?.id || null;
    setDraft(address || { ...emptyAddress });
    setMakeDefault(!book?.addresses.length || address?.id === book?.defaultAddressId);
    setError("");
  };
  const perform = async (operation, confirmed) => {
    if (busy) return;
    const sequence = ++loadSequence.current;
    setBusy(true);
    setError("");
    setRefreshFailed(false);
    try {
      const result = await operation();
      confirmed?.(result);
      setDraft(null);
      try {
        const result = await loadAddressBook(userId);
        if (sequence === loadSequence.current) setBook(result);
      }
      catch { if (sequence === loadSequence.current) setRefreshFailed(true); }
    } catch (failure) { setError(failure.message || "We couldn’t save your addresses. Please retry."); }
    finally { setBusy(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    const message = addressError(draft);
    if (message) { setError(message); return; }
    const snapshot = addressSnapshot(draft);
    perform(() => {
      if (!draftId.current) draftId.current = createAddressId(userId);
      return saveAddress(userId, snapshot, { id: draftId.current, makeDefault });
    }, (id) => setBook((previous) => ({
      addresses: [...(previous?.addresses || []).filter((entry) => entry.id !== id), { id, ...snapshot }],
      defaultAddressId: makeDefault || !previous?.defaultAddressId ? id : previous.defaultAddressId,
    })));
  };

  return <>
    {error && <p role="alert">{error}</p>}
    {refreshFailed && <div>
      <p role="status">Your address change is saved. We couldn’t refresh the address list.</p>
      <button type="button" className="store-text-link" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Refresh addresses</button>
    </div>}
    {!book && !error ? <p role="status">Loading your addresses…</p> : !book ? (
      <button type="button" className="store-button" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry</button>
    ) : <>
      {book.addresses.length ? <ul className="address-book__list">{book.addresses.map((address) => (
        <li key={address.id}>
          <div><strong>{address.recipient}</strong>{address.id === book.defaultAddressId && <span className="address-book__default">Default</span>}</div>
          <p>{[address.line1, address.line2, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(", ")}</p>
          <div className="address-book__actions">
            <button type="button" disabled={busy} onClick={() => edit(address)} aria-label={`Edit address for ${address.recipient}`}>Edit</button>
            {address.id !== book.defaultAddressId && <button type="button" disabled={busy} onClick={() => perform(
              () => setDefaultAddress(userId, address.id),
              () => setBook((previous) => ({ ...previous, defaultAddressId: address.id }))
            )}>Use as default</button>}
            <button type="button" disabled={busy} onClick={() => perform(
              () => deleteAddress(userId, address.id),
              () => setBook((previous) => {
                const addresses = previous.addresses.filter((entry) => entry.id !== address.id);
                return { addresses, defaultAddressId: previous.defaultAddressId === address.id ? addresses[0]?.id || "" : previous.defaultAddressId };
              })
            )} aria-label={`Remove address for ${address.recipient}`}>Remove</button>
          </div>
        </li>
      ))}</ul> : <p>No saved addresses yet.</p>}
      {!draft && <button type="button" className="store-button store-button--outline" onClick={() => edit()}>Add an address</button>}
      {draft && <form onSubmit={submit} className="address-book__form">
        <h3>{draft.id ? "Edit address" : "Add an address"}</h3>
        <AddressForm value={draft} onChange={setDraft} disabled={busy} prefix="saved-address" />
        <label className="address-book__checkbox"><input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} disabled={busy} />Use as my default address</label>
        <div className="address-book__actions">
          <button type="submit" className="store-button" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
          <button type="button" className="store-text-link" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
        </div>
      </form>}
    </>}
  </>;
};

const AddressBook = ({ className = "" }) => {
  const { currentUser } = useContext(UserContext);
  return <section id="address-book" className={`address-book ${className}`} aria-labelledby="address-book-title">
    <h2 id="address-book-title">Your addresses</h2>
    {currentUser ? <AccountAddresses key={currentUser.uid} userId={currentUser.uid} /> : <p>Sign in to save delivery addresses.</p>}
  </section>;
};

export default AddressBook;
