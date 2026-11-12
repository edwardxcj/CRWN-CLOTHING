import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  setDoc,
  terminate,
  updateDoc,
} from "firebase/firestore";

const emulatorAddress = (name) => {
  const address = process.env[name];
  if (!/^127[.]0[.]0[.]1:[0-9]+$/.test(address ?? "")) {
    throw new Error(`Run these tests with the local Firebase emulators (${name} is required).`);
  }
  return address;
};

const authAddress = emulatorAddress("FIREBASE_AUTH_EMULATOR_HOST");
const [firestoreHost, firestorePort] = emulatorAddress("FIRESTORE_EMULATOR_HOST").split(":");
const projectId = process.env.GCLOUD_PROJECT;
if (!/^demo-[a-z0-9-]+$/.test(projectId ?? "")) {
  throw new Error("Run these tests with a Firebase demo project (GCLOUD_PROJECT must start with demo-).");
}

const makeClient = (name) => {
  const app = initializeApp({ projectId, apiKey: "emulator-only" }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authAddress}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  return { app, auth, db };
};

const deny = (action) => assert.rejects(action, { code: "permission-denied" });
const profile = (client, uid) => doc(client.db, "users", uid);
const orders = (client, uid) => collection(profile(client, uid), "demoOrders");
const receipt = (client, uid, orderId) => doc(orders(client, uid), orderId);

test("Firestore rules isolate demo orders while preserving catalog and profile access", { timeout: 30000 }, async (t) => {
  const guest = makeClient("guest");
  const owner = makeClient("owner");
  const secondBrowser = makeClient("second-browser");
  const other = makeClient("other");

  t.after(async () => {
    await Promise.all([guest, owner, secondBrowser, other].map(async ({ app, db }) => {
      await terminate(db);
      await deleteApp(app);
    }));
  });

  const testRun = randomUUID();
  const ownerEmail = `demo-owner-${testRun}@example.test`;
  const otherEmail = `demo-other-${testRun}@example.test`;
  const testPassword = "emulator-test-only";
  const { user: { uid } } = await createUserWithEmailAndPassword(owner.auth, ownerEmail, testPassword);
  const { user: { uid: otherUid } } = await createUserWithEmailAndPassword(other.auth, otherEmail, testPassword);
  await signInWithEmailAndPassword(secondBrowser.auth, ownerEmail, testPassword);

  const firstOrder = {
    id: "DEMO-0000-0000-0001",
    placedAt: "2026-11-12T01:00:00.000Z",
    items: [{ id: 13, name: "Nike White AirForce", quantity: 1, price: 160 }],
    count: 1,
    total: 160,
  };

  await t.test("public catalog reads stay available and catalog writes stay restricted", async () => {
    const categories = collection(guest.db, "categories");
    const category = doc(categories, "sneakers");
    await getDocsFromServer(categories);
    await getDocFromServer(category);
    await deny(setDoc(category, { title: "Sneakers", items: [] }));
    await deny(setDoc(doc(owner.db, "categories", "sneakers"), { title: "Sneakers" }));
  });

  await t.test("existing profile create and update only work for the account owner", async () => {
    const ownerProfile = profile(owner, uid);
    await setDoc(ownerProfile, { displayName: "Demo User", email: ownerEmail, createdAt: new Date() });
    await updateDoc(ownerProfile, { displayName: "Updated Demo User" });
    assert.equal((await getDocFromServer(ownerProfile)).data().displayName, "Updated Demo User");
    await deny(getDocFromServer(profile(guest, uid)));
    await deny(getDocFromServer(profile(other, uid)));
    await deny(getDocsFromServer(collection(owner.db, "users")));
    await deny(setDoc(profile(other, uid), { displayName: "Incorrect Owner" }));
  });

  await t.test("two authenticated sessions with the same UID share the exact order snapshot", async () => {
    await setDoc(receipt(owner, uid, firstOrder.id), firstOrder);
    assert.deepEqual((await getDocFromServer(receipt(secondBrowser, uid, firstOrder.id))).data(), firstOrder);
    const result = await getDocsFromServer(orders(secondBrowser, uid));
    assert.deepEqual(result.docs.map((snapshot) => snapshot.data()), [firstOrder]);
  });

  await t.test("guests and other users cannot read, list or create this owner's receipts", async () => {
    const secondOrder = { ...firstOrder, id: "DEMO-0000-0000-0002" };
    for (const client of [guest, other]) {
      await deny(getDocFromServer(receipt(client, uid, firstOrder.id)));
      await deny(getDocsFromServer(orders(client, uid)));
      await deny(setDoc(receipt(client, uid, secondOrder.id), secondOrder));
    }
    assert.equal((await getDocsFromServer(orders(other, otherUid))).size, 0);
  });

  await t.test("receipt snapshots are immutable even for their owner", async () => {
    const saved = receipt(owner, uid, firstOrder.id);
    await deny(setDoc(saved, firstOrder));
    await deny(updateDoc(saved, { total: 1 }));
    await deny(deleteDoc(saved));
    assert.deepEqual((await getDocFromServer(saved)).data(), firstOrder);
  });

  await t.test("order references and the receipt envelope must match the supported format", async () => {
    const id = "DEMO-0000-0000-0003";
    const valid = { ...firstOrder, id };
    const invalidOrders = [
      { ...valid, id: "DEMO-0000-0000-0004" },
      { ...valid, placedAt: "11/12/2026" },
      { ...valid, items: [] },
      { ...valid, count: 0 },
      { ...valid, total: -1 },
      { ...valid, email: ownerEmail },
    ];
    for (const invalid of invalidOrders) await deny(setDoc(receipt(owner, uid, id), invalid));
    await deny(setDoc(receipt(owner, uid, "bad-order-id"), { ...valid, id: "bad-order-id" }));
  });

  await t.test("an order can include the whole catalog, multiple quantities and decimal prices", async () => {
    const items = Array.from({ length: 35 }, (_, index) => ({
      id: String(index + 1),
      name: `Catalog product ${index + 1}`,
      quantity: 2,
      price: 19.99,
    }));
    const order = {
      ...firstOrder,
      id: "DEMO-0000-0000-0005",
      items,
      count: 70,
      total: 1399.3,
    };
    await setDoc(receipt(owner, uid, order.id), order);
    assert.deepEqual((await getDocFromServer(receipt(secondBrowser, uid, order.id))).data(), order);
  });
});
