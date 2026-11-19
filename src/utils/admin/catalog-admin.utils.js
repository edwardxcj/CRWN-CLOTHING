import { collection, doc, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase.utils";
import { readCatalogOverride } from "../catalog/catalog-overrides";

export const isCatalogAdmin = (user) => Boolean(
  user?.emailVerified && user.email?.toLowerCase() === "edwardxcj@gmail.com" &&
  user.providerData?.some((provider) => provider.providerId === "google.com")
);

export const subscribeCatalogOverrides = (onChange, onError) => {
  let active = true;
  let receivedServerSnapshot = false;
  const reference = collection(db, "catalogOverrides");
  const report = (snapshot) => {
    if (!active) return;
    const overrides = {};
    snapshot.docs.forEach((document) => {
      const override = readCatalogOverride(document.data(), document.id);
      if (override) overrides[document.id] = override;
    });
    const ready = snapshot.metadata.fromCache === false && snapshot.metadata.hasPendingWrites === false;
    if (ready) receivedServerSnapshot = true;
    // Cached data may keep browsing useful, but cannot authorize a checkout.
    onChange(overrides, { ready });
  };
  const fail = (error) => { if (active) onError(error); };
  const unsubscribe = onSnapshot(reference, { includeMetadataChanges: true }, report, fail);
  // Surface an offline retry state even when the listener only returns its cache.
  getDocsFromServer(reference).then((snapshot) => {
    if (!receivedServerSnapshot) report(snapshot);
  }, (error) => { if (!receivedServerSnapshot) fail(error); });
  return () => { active = false; unsubscribe(); };
};

export const saveCatalogOverride = async (user, values) => {
  if (!isCatalogAdmin(user) || auth.currentUser?.uid !== user.uid) throw new Error("Administrator sign-in required");
  const product = readCatalogOverride(values, String(values.productId));
  if (!product) throw new Error("Check the product details, stock and image links");
  const reference = doc(db, "catalogOverrides", String(product.productId));
  await runTransaction(db, async (transaction) => {
    await transaction.get(reference);
    if (auth.currentUser?.uid !== user.uid) throw new Error("Administrator sign-in changed");
    transaction.set(reference, { ...product, updatedAt: serverTimestamp() });
  });
  if (auth.currentUser?.uid !== user.uid) throw new Error("Administrator sign-in changed");
};
