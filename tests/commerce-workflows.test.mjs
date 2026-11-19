import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, getIdTokenResult, GoogleAuthProvider, reload, signInWithCredential } from "firebase/auth";
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDocFromServer,
  getDocsFromServer, getFirestore, serverTimestamp, setDoc, terminate, updateDoc, writeBatch,
} from "firebase/firestore";

const loopbackAddress = (name) => {
  const value = process.env[name];
  if (!/^127[.]0[.]0[.]1:[0-9]+$/.test(value ?? "")) throw new Error(`${name} must point to a local Firebase emulator.`);
  return value;
};
const projectId = process.env.GCLOUD_PROJECT;
if (!/^demo-[a-z0-9-]+$/.test(projectId ?? "")) throw new Error("Use a Firebase demo project for these tests.");
const authAddress = loopbackAddress("FIREBASE_AUTH_EMULATOR_HOST");
const [firestoreHost, firestorePort] = loopbackAddress("FIRESTORE_EMULATOR_HOST").split(":");

const makeClient = (name) => {
  const app = initializeApp({ projectId, apiKey: "emulator-only" }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authAddress}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  return { app, auth, db };
};
const googleSignIn = (client, claims) => signInWithCredential(client.auth, GoogleAuthProvider.credential(JSON.stringify(claims)));
const existingCatalogAdminSubject = async () => {
  const response = await fetch(`http://${authAddress}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ email: ["edwardxcj@gmail.com"] }),
  });
  assert.equal(response.status, 200, "The local Auth emulator must expose the test account lookup.");
  const result = await response.json();
  if (!result.users?.length) return "commerce-catalog-owner";
  const googleProvider = result.users[0].providerUserInfo?.find((provider) => provider.providerId === "google.com");
  assert.ok(googleProvider?.rawId, "An existing catalog admin fixture must have a Google identity.");
  return googleProvider.rawId;
};
const setEmulatedEmailVerification = async (client, emailVerified) => {
  // This privileged endpoint is emulator-only, guarded by the loopback and demo-project checks above.
  const response = await fetch(`http://${authAddress}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ localId: client.auth.currentUser.uid, emailVerified }),
  });
  assert.equal(response.status, 200, "The local Auth emulator must update its test account verification state.");
  await reload(client.auth.currentUser);
  return getIdTokenResult(client.auth.currentUser, true);
};
const deny = (operation) => assert.rejects(operation, { code: "permission-denied" });
const own = (client, uid, ...path) => doc(client.db, "users", uid, ...path);
const orderReference = () => {
  const hex = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  return `DEMO-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8)}`;
};
const requestReference = () => `SUP-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;

const address = {
  recipient: "Test shopper", line1: "1 Example Street", line2: "Unit 2", city: "Sydney",
  region: "NSW", postalCode: "2000", country: "Australia", phone: "",
};
const cartItem = { id: 13, name: "Nike White AirForce", price: 160, quantity: 1, size: "US 9", color: "White", variantKey: "13::white::US 9" };
const demoOrder = (id) => ({
  id, placedAt: new Date().toISOString(), items: [cartItem], count: 1, total: 172,
  shippingAddress: address,
  delivery: { method: "express", label: "Express delivery", fee: 12, estimate: "Demo delivery in 1–2 business days" },
});
const orderState = (status) => ({
  status, updatedAt: serverTimestamp(), shippedAt: status === "shipped" ? serverTimestamp() : null,
  deliveredAt: null, cancelledAt: status === "cancelled" ? serverTimestamp() : null,
});

test("complete commerce rules protect account data and demo workflows", { timeout: 45000 }, async (t) => {
  const guest = makeClient("commerce-guest");
  const owner = makeClient("commerce-owner");
  const sameAccount = makeClient("commerce-second-device");
  const other = makeClient("commerce-other");
  const unverifiedAdmin = makeClient("commerce-unverified-admin");
  const admin = makeClient("commerce-admin");
  const clients = [guest, owner, sameAccount, other, unverifiedAdmin, admin];
  t.after(async () => {
    await Promise.all(clients.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
  });

  const run = randomUUID();
  const ownerClaims = { sub: `commerce-owner-${run}`, email: `commerce-owner-${run}@example.test`, email_verified: true };
  const { user: { uid } } = await googleSignIn(owner, ownerClaims);
  await googleSignIn(sameAccount, ownerClaims);
  const { user: { uid: otherUid } } = await googleSignIn(other, { sub: `commerce-other-${run}`, email: `commerce-other-${run}@example.test`, email_verified: true });

  await t.test("cart changes and immutable operation markers sync only within their owning account", async () => {
    const cart = own(owner, uid, "cart", "current");
    await setDoc(cart, { items: [cartItem], updatedAt: serverTimestamp() });
    assert.deepEqual((await getDocFromServer(own(sameAccount, uid, "cart", "current"))).data().items, [cartItem]);
    await updateDoc(own(sameAccount, uid, "cart", "current"), { items: [{ ...cartItem, quantity: 2 }], updatedAt: serverTimestamp() });
    assert.equal((await getDocFromServer(cart)).data().items[0].quantity, 2);
    const markerId = `merge-${run}`;
    const marker = own(owner, uid, "cartOperations", markerId);
    await setDoc(marker, { kind: "merge", createdAt: serverTimestamp() });
    assert.equal((await getDocFromServer(own(sameAccount, uid, "cartOperations", markerId))).data().kind, "merge");
    await deny(updateDoc(marker, { kind: "clear", createdAt: serverTimestamp() }));
    await deny(deleteDoc(marker));
    await deny(setDoc(own(owner, uid, "cart", "unexpected"), { items: [], updatedAt: serverTimestamp() }));
    await deny(setDoc(cart, { items: "invalid", updatedAt: serverTimestamp() }));
    await deny(setDoc(cart, { items: Array(201).fill(cartItem), updatedAt: serverTimestamp() }));
    await deny(setDoc(cart, { items: [], updatedAt: new Date(0) }));
    await deny(setDoc(cart, { items: [], updatedAt: serverTimestamp(), extra: true }));
    for (const client of [guest, other]) {
      await deny(getDocFromServer(own(client, uid, "cart", "current")));
      await deny(setDoc(own(client, uid, "cart", "current"), { items: [], updatedAt: serverTimestamp() }));
      await deny(getDocFromServer(own(client, uid, "cartOperations", markerId)));
      await deny(setDoc(own(client, uid, "cartOperations", `foreign-${run}`), { kind: "add", createdAt: serverTimestamp() }));
    }
  });

  await t.test("address create, edit, default selection and removal are owner-only", async () => {
    const reference = own(owner, uid, "addresses", "home");
    await setDoc(reference, { ...address, updatedAt: serverTimestamp() });
    await setDoc(own(owner, uid), { defaultAddressId: "home" }, { merge: true });
    assert.equal((await getDocFromServer(own(sameAccount, uid))).data().defaultAddressId, "home");
    await updateDoc(own(sameAccount, uid, "addresses", "home"), { line2: "Unit 3", updatedAt: serverTimestamp() });
    assert.equal((await getDocFromServer(reference)).data().line2, "Unit 3");
    assert.equal((await getDocsFromServer(collection(sameAccount.db, "users", uid, "addresses"))).size, 1);
    await deny(setDoc(reference, { ...address, recipient: "", updatedAt: serverTimestamp() }));
    await deny(setDoc(reference, { ...address, updatedAt: serverTimestamp(), privateExtra: "invalid" }));
    for (const client of [guest, other]) {
      await deny(getDocFromServer(own(client, uid, "addresses", "home")));
      await deny(getDocsFromServer(collection(client.db, "users", uid, "addresses")));
      await deny(setDoc(own(client, uid, "addresses", "home"), { ...address, updatedAt: serverTimestamp() }));
      await deny(deleteDoc(own(client, uid, "addresses", "home")));
    }
    await deleteDoc(own(sameAccount, uid, "addresses", "home"));
    assert.equal((await getDocFromServer(reference)).exists(), false);
  });

  await t.test("checkout atomically saves shipping, consumes the bag and records its operation", async () => {
    const id = orderReference();
    const order = demoOrder(id);
    const cart = own(owner, uid, "cart", "current");
    await setDoc(cart, { items: [cartItem], updatedAt: serverTimestamp() });
    const checkout = writeBatch(owner.db);
    checkout.set(own(owner, uid, "demoOrders", id), order);
    checkout.set(cart, { items: [], updatedAt: serverTimestamp() });
    checkout.set(own(owner, uid, "cartOperations", `checkout-${id}`), { kind: "checkout", createdAt: serverTimestamp() });
    await checkout.commit();
    assert.deepEqual((await getDocFromServer(own(sameAccount, uid, "demoOrders", id))).data(), order);
    assert.deepEqual((await getDocFromServer(cart)).data().items, []);
    assert.equal((await getDocFromServer(own(sameAccount, uid, "cartOperations", `checkout-${id}`))).data().kind, "checkout");
    await deny(updateDoc(own(owner, uid, "demoOrders", id), { shippingAddress: { ...address, line1: "Changed after checkout" } }));

    const invalidId = orderReference();
    await setDoc(cart, { items: [cartItem], updatedAt: serverTimestamp() });
    const invalid = writeBatch(owner.db);
    invalid.set(own(owner, uid, "demoOrders", invalidId), { ...demoOrder(invalidId), delivery: { ...order.delivery, fee: 0 } });
    invalid.set(cart, { items: [], updatedAt: serverTimestamp() });
    invalid.set(own(owner, uid, "cartOperations", `checkout-${invalidId}`), { kind: "checkout", createdAt: serverTimestamp() });
    await deny(invalid.commit());
    assert.equal((await getDocFromServer(own(owner, uid, "demoOrders", invalidId))).exists(), false);
    assert.equal((await getDocFromServer(own(owner, uid, "cartOperations", `checkout-${invalidId}`))).exists(), false);
    assert.deepEqual((await getDocFromServer(cart)).data().items, [cartItem]);
    await deny(setDoc(own(owner, uid, "demoOrders", invalidId), { ...demoOrder(invalidId), shippingAddress: { ...address, phone: 123 } }));
    await deny(setDoc(own(owner, uid, "demoOrders", invalidId), { ...demoOrder(invalidId), shippingAddress: { ...address, updatedAt: new Date() } }));
    for (const client of [guest, other]) await deny(getDocFromServer(own(client, uid, "demoOrders", id)));
  });

  await t.test("demo order fulfilment permits only dispatch then delivery or cancellation before dispatch", async () => {
    const id = orderReference();
    await setDoc(own(owner, uid, "demoOrders", id), demoOrder(id));
    const state = own(owner, uid, "orderStates", id);
    await deny(setDoc(state, { ...orderState("delivered"), deliveredAt: serverTimestamp() }));
    await setDoc(state, orderState("shipped"));
    const dispatched = (await getDocFromServer(state)).data();
    await deny(setDoc(state, orderState("cancelled")));
    await setDoc(own(sameAccount, uid, "orderStates", id), {
      ...dispatched, status: "delivered", deliveredAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    assert.equal((await getDocFromServer(state)).data().status, "delivered");
    await deny(setDoc(state, orderState("shipped")));
    await deny(deleteDoc(state));
    const cancelledId = orderReference();
    await setDoc(own(owner, uid, "demoOrders", cancelledId), demoOrder(cancelledId));
    await setDoc(own(owner, uid, "orderStates", cancelledId), orderState("cancelled"));
    await deny(setDoc(own(owner, uid, "orderStates", cancelledId), orderState("shipped")));
    await deny(setDoc(own(owner, uid, "orderStates", orderReference()), orderState("shipped")));
    for (const client of [guest, other]) {
      await deny(getDocFromServer(own(client, uid, "orderStates", id)));
      await deny(getDocsFromServer(collection(client.db, "users", uid, "orderStates")));
      await deny(setDoc(own(client, uid, "orderStates", id), orderState("cancelled")));
    }
  });

  await t.test("contact requests and delivered-order return requests are private and immutable", async () => {
    const id = requestReference();
    const contact = { id, type: "contact", orderId: "", subject: "Sizing question", message: "Please explain the demonstration size guide.", status: "submitted", createdAt: serverTimestamp() };
    const reference = own(owner, uid, "supportRequests", id);
    await setDoc(reference, contact);
    assert.equal((await getDocFromServer(own(sameAccount, uid, "supportRequests", id))).data().subject, contact.subject);
    await deny(updateDoc(reference, { message: "Changed after submission" }));
    await deny(deleteDoc(reference));
    const shortId = requestReference();
    await deny(setDoc(own(owner, uid, "supportRequests", shortId), { ...contact, id: shortId, message: "short" }));
    const orderId = orderReference();
    const returnId = `return-${orderId}`;
    const returnRequest = { ...contact, id: returnId, type: "return", orderId, subject: "Return request" };
    await setDoc(own(owner, uid, "demoOrders", orderId), demoOrder(orderId));
    await deny(setDoc(own(owner, uid, "supportRequests", returnId), returnRequest));
    const state = own(owner, uid, "orderStates", orderId);
    await setDoc(state, orderState("shipped"));
    const dispatched = (await getDocFromServer(state)).data();
    await setDoc(state, { ...dispatched, status: "delivered", deliveredAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await setDoc(own(owner, uid, "supportRequests", returnId), returnRequest);
    assert.equal((await getDocsFromServer(collection(sameAccount.db, "users", uid, "supportRequests"))).size, 2);
    for (const client of [guest, other]) {
      await deny(getDocFromServer(own(client, uid, "supportRequests", id)));
      await deny(getDocsFromServer(collection(client.db, "users", uid, "supportRequests")));
      await deny(setDoc(own(client, uid, "supportRequests", requestReference()), contact));
    }
  });

  await t.test("catalog overrides are public to read and writable only by the verified Google owner", async () => {
    const claims = { sub: await existingCatalogAdminSubject(), email: "edwardxcj@gmail.com", email_verified: false };
    await googleSignIn(unverifiedAdmin, claims);
    assert.equal((await setEmulatedEmailVerification(unverifiedAdmin, false)).claims.email_verified, false);
    const override = {
      productId: 35, name: "Burgundy T-shirt", description: "", price: 25, active: true,
      stock: { S: 4, M: 5 }, images: [], updatedAt: serverTimestamp(),
    };
    const reference = (client) => doc(client.db, "catalogOverrides", "35");
    for (const client of [guest, owner, other, unverifiedAdmin]) await deny(setDoc(reference(client), override));
    await googleSignIn(admin, { ...claims, email_verified: true });
    assert.equal((await setEmulatedEmailVerification(admin, true)).claims.email_verified, true);
    await setDoc(reference(admin), override);
    assert.equal((await getDocFromServer(reference(guest))).data().productId, 35);
    assert.equal((await getDocsFromServer(collection(guest.db, "catalogOverrides"))).size >= 1, true);
    await updateDoc(reference(admin), { active: false, updatedAt: serverTimestamp() });
    assert.equal((await getDocFromServer(reference(guest))).data().active, false);
    await deny(setDoc(reference(admin), { ...override, stock: { M: -1 } }));
    await deny(setDoc(reference(admin), { ...override, images: ["http://example.test/photo.jpg"] }));
    await deny(setDoc(reference(admin), { ...override, price: -1 }));
    await deny(setDoc(reference(admin), { ...override, updatedAt: new Date(0) }));
    await setDoc(reference(admin), { ...override, stock: {} });
  });

  assert.notEqual(uid, otherUid);
});
