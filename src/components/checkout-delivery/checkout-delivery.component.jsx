import { useContext, useEffect, useRef, useState } from "react";

import { UserContext } from "../../contexts/user.context";
import { addressError, addressSnapshot, createAddressId, deliveryOptions, deliverySnapshot, emptyAddress, loadAddressBook, saveAddress } from "../../utils/addresses/addresses.utils";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import AddressForm from "../address-book/address-form.component";

import "../address-book/address-book.styles.scss";
import "./checkout-delivery.styles.scss";

const DeliveryForm = ({ userId, value, onChange, disabled }) => {
  const [book, setBook] = useState(userId ? null : { addresses: [], defaultAddressId: "" });
  const [selected, setSelected] = useState("__new__");
  const [address, setAddress] = useState(value?.address || { ...emptyAddress });
  const [method, setMethod] = useState(value?.method || "standard");
  const [error, setError] = useState("");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const changeRef = useRef(onChange);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const dirtyAddress = useRef(false);
  const draftId = useRef(null);
  const loadSequence = useRef(0);
  changeRef.current = onChange;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const sequence = ++loadSequence.current;
    setError("");
    loadAddressBook(userId).then((result) => {
      if (!active || sequence !== loadSequence.current) return;
      setBook(result);
      setRefreshFailed(false);
      const saved = result.addresses.find((entry) => entry.id === selectedRef.current)
        || result.addresses.find((entry) => entry.id === result.defaultAddressId);
      if (saved && !dirtyAddress.current) { setSelected(saved.id); setAddress(addressSnapshot(saved)); }
    }, () => { if (active && sequence === loadSequence.current) setError("We couldn’t load your saved addresses. Retry, or enter an address below."); });
    return () => { active = false; };
  }, [userId, attempt]);

  useEffect(() => {
    changeRef.current(deliverySnapshot({ address, method }));
  }, [address, method]);

  const chooseAddress = (id) => {
    draftId.current = null;
    dirtyAddress.current = false;
    setSelected(id);
    const saved = book?.addresses.find((entry) => entry.id === id);
    setAddress(saved ? addressSnapshot(saved) : { ...emptyAddress });
  };
  const save = async () => {
    if (busy || disabled) return;
    const validation = addressError(address);
    if (validation) { setError(validation); return; }
    const sequence = ++loadSequence.current;
    setError("");
    setRefreshFailed(false);
    setBusy(true);
    try {
      if (!draftId.current) draftId.current = createAddressId(userId);
      const snapshot = addressSnapshot(address);
      const makeDefault = Boolean(book && !book.addresses.length);
      const id = await saveAddress(userId, snapshot, { id: draftId.current, makeDefault });
      setBook((previous) => ({
        addresses: [...(previous?.addresses || []).filter((entry) => entry.id !== id), { id, ...snapshot }],
        defaultAddressId: makeDefault ? id : previous?.defaultAddressId || "",
      }));
      setSelected(id);
      dirtyAddress.current = false;
      try {
        const result = await loadAddressBook(userId);
        if (sequence === loadSequence.current) setBook(result);
      }
      catch { if (sequence === loadSequence.current) setRefreshFailed(true); }
    } catch { setError("We couldn’t save this address. Your entered address is still available for this order."); }
    finally { setBusy(false); }
  };

  return <section className="checkout-delivery" aria-labelledby="delivery-title">
    <h2 id="delivery-title">Delivery details</h2>
    {userId && !book && !error && <p role="status">Loading your saved addresses…</p>}
    {error && <div className="checkout-delivery__error"><p role="alert">{error}</p>{!book && <button type="button" className="store-text-link" disabled={disabled || busy} onClick={() => setAttempt((previous) => previous + 1)}>Retry</button>}</div>}
    {refreshFailed && <div>
      <p role="status">This address is saved to your account. We couldn’t refresh your other addresses.</p>
      <button type="button" className="store-text-link" disabled={disabled || busy} onClick={() => setAttempt((previous) => previous + 1)}>Refresh addresses</button>
    </div>}
    {userId && book?.addresses.length > 0 && <label className="checkout-delivery__saved">
      Deliver to
      <select value={selected} disabled={disabled || busy} onChange={(event) => chooseAddress(event.target.value)}>
        {book.addresses.map((entry) => <option key={entry.id} value={entry.id}>{entry.recipient} · {entry.line1}{entry.id === book.defaultAddressId ? " · Default" : ""}</option>)}
        <option value="__new__">Use a different address</option>
      </select>
    </label>}
    {selected !== "__new__" ? <div className="checkout-delivery__address">
      <strong>{address.recipient}</strong>
      <p>{[address.line1, address.line2, address.city, address.region, address.postalCode, address.country].filter(Boolean).join(", ")}</p>
    </div> : <>
      <AddressForm value={address} onChange={(next) => { dirtyAddress.current = true; setAddress(next); }} disabled={disabled || busy} prefix="delivery-address" />
      {userId && <button type="button" className="store-text-link checkout-delivery__save" disabled={disabled || busy || Boolean(addressError(address))} onClick={save}>{busy ? "Saving address…" : "Save this address to my account"}</button>}
    </>}
    <fieldset className="checkout-delivery__methods" disabled={disabled}>
      <legend>Delivery method</legend>
      {deliveryOptions.map((option) => <label key={option.method}>
        <input type="radio" name="delivery-method" value={option.method} checked={method === option.method} onChange={() => setMethod(option.method)} />
        <span><strong>{option.label} · {option.fee ? formatPrice(option.fee) : "Free"}</strong><small>{option.estimate}</small></span>
      </label>)}
    </fieldset>
  </section>;
};

const CheckoutDelivery = (props) => {
  const { currentUser } = useContext(UserContext);
  const owner = currentUser?.uid || "guest";
  const ownedValue = useRef({ owner, value: props.value });
  const onChange = (value) => {
    ownedValue.current = { owner, value };
    props.onChange(value);
  };
  return <DeliveryForm key={owner} userId={currentUser?.uid} {...props}
    value={ownedValue.current.owner === owner ? ownedValue.current.value : null} onChange={onChange} />;
};

export default CheckoutDelivery;
