import { createContext, useEffect, useState } from "react";

import SHOP_DATA from "../shop-data";
import { getCategoriesAndDocuments } from "../utils/firebase/firebase.utils";

const bundledCatalog = Object.fromEntries(
  SHOP_DATA.map(({ title, items }) => [title.toLowerCase(), items])
);

export const CategoriesContext = createContext({
  categoriesMap: bundledCatalog,
  catalogLoading: false,
});

export const CategoriesProvider = ({ children }) => {
  const [categoriesMap, setCategoriesMap] = useState(bundledCatalog);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        const remoteCatalog = await getCategoriesAndDocuments();
        if (active && Object.values(remoteCatalog).some((items) => items.length > 0)) {
          setCategoriesMap(remoteCatalog);
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

  return (
    <CategoriesContext.Provider value={{ categoriesMap, catalogLoading }}>
      {children}
    </CategoriesContext.Provider>
  );
};
