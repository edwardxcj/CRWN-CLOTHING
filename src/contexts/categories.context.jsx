import { createContext, useEffect, useState } from "react";

import SHOP_DATA from "../shop-data";
import { getCategoriesAndDocuments } from "../utils/firebase/firebase.utils";
import { subscribeCatalogOverrides } from "../utils/admin/catalog-admin.utils";
import { getCurrentProduct, registerCatalogOverrides } from "../utils/catalog/catalog-overrides";

const bundledCatalog = Object.fromEntries(
  SHOP_DATA.map(({ title, items }) => [title.toLowerCase(), items])
);

export const CategoriesContext = createContext({
  categoriesMap: bundledCatalog,
  allCategoriesMap: bundledCatalog,
  catalogLoading: false,
  catalogReady: false,
  catalogAdminLoading: true,
  catalogAdminError: "",
  retryCatalogOverrides: () => {},
});

export const CategoriesProvider = ({ children }) => {
  const [baseCatalog, setBaseCatalog] = useState(bundledCatalog);
  const [overrides, setOverrides] = useState({});
  const [catalogAdminLoading, setCatalogAdminLoading] = useState(true);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogAdminError, setCatalogAdminError] = useState("");
  const [overrideAttempt, setOverrideAttempt] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        const remoteCatalog = await getCategoriesAndDocuments();
        if (active && Object.values(remoteCatalog).some((items) => items.length > 0)) {
          setBaseCatalog(remoteCatalog);
        }
      } catch {
        // The bundled catalog keeps the shop browsable if Firestore is unavailable.
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCatalogReady(false);
    setCatalogAdminLoading(true);
    setCatalogAdminError("");
    return subscribeCatalogOverrides((values, { ready }) => {
      registerCatalogOverrides(values);
      setOverrides(values);
      setCatalogReady(ready);
      setCatalogAdminLoading(!ready);
      if (ready) setCatalogAdminError("");
    }, () => {
      setCatalogReady(false);
      setCatalogAdminError("We couldn’t load the latest product updates.");
      setCatalogAdminLoading(false);
    });
  }, [overrideAttempt]);

  const allCategoriesMap = Object.fromEntries(Object.entries(baseCatalog).map(([category, items]) => [
    category,
    items.map((product) => getCurrentProduct(product)),
  ]));
  const categoriesMap = Object.fromEntries(Object.entries(allCategoriesMap).map(([category, items]) => [
    category,
    items.filter((product) => product.active !== false),
  ]));

  return (
    <CategoriesContext.Provider value={{
      categoriesMap,
      allCategoriesMap,
      catalogLoading,
      catalogReady,
      catalogAdminLoading,
      catalogAdminError,
      retryCatalogOverrides: () => setOverrideAttempt((value) => value + 1),
      catalogVersion: overrides,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
};
