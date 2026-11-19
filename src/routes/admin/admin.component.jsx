import { useContext, useState } from "react";
import { Link } from "react-router-dom";

import { CategoriesContext } from "../../contexts/categories.context";
import { UserContext } from "../../contexts/user.context";
import { catalogProducts, categoryLabel, formatPrice, productPath } from "../../utils/catalog/catalog.utils";
import { getProductOptions } from "../../utils/catalog/product-variants";
import { isCatalogAdmin, saveCatalogOverride } from "../../utils/admin/catalog-admin.utils";
import CatalogImage from "../../components/catalog-image/catalog-image.component";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { getProductDetailCopy } from "../../components/product-details/product-details.copy";

import "./admin.styles.scss";

const ProductEditor = ({ product, user }) => {
  const options = getProductOptions(product);
  const [draft, setDraft] = useState({
    productId: Number(product.id),
    name: product.name,
    description: product.description || getProductDetailCopy(product).description || "",
    price: String(product.price),
    active: product.active !== false,
    stock: Object.fromEntries(options.variants.map((variant) => [variant.size, String(product.stockBySize?.[variant.size] ?? variant.stock)])),
    images: (product.images || []).join("\n"),
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const update = (name, value) => {
    setDraft((previous) => ({ ...previous, [name]: value }));
    setMessage("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const stock = Object.fromEntries(Object.entries(draft.stock).map(([size, value]) => [size, Number(value)]));
      if (!draft.price.trim() || Object.values(draft.stock).some((value) => !/^[0-9]+$/.test(value))) throw new Error("Enter a price and whole-number stock quantities.");
      const images = draft.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
      if (images.length > 6) throw new Error("Add at most six image links.");
      await saveCatalogOverride(user, {
        productId: draft.productId,
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        active: draft.active,
        stock,
        images,
      });
      setMessage("Product updated. The storefront will refresh automatically.");
    } catch (error) {
      setFailed(true);
      setMessage(error.code ? "We couldn’t save this product. Check your administrator sign-in and connection, then try again." : error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-editor" onSubmit={save}>
      <div className="admin-editor__heading">
        <div><p className="eyebrow">Product {product.id}</p><h2>{product.name}</h2></div>
        <Link className="store-text-link" to={productPath(product)}>View product</Link>
      </div>
      <fieldset disabled={busy}>
        <label>Product name<input maxLength={120} required value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Price · USD<input type="number" min="0" max="10000" step="0.01" required value={draft.price} onChange={(event) => update("price", event.target.value)} /></label>
        <label className="admin-editor__wide">Description<textarea rows={4} maxLength={2000} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
        <label className="admin-editor__check admin-editor__wide"><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)} />Published in the shop</label>
      </fieldset>
      <fieldset className="admin-editor__stock" disabled={busy}>
        <legend>Demo inventory</legend>
        <p>Set the available quantity for each size. Zero marks that size as unavailable.</p>
        <div>{options.sizes.map((size) => (
          <label key={size}>{size}<input aria-label={`Demo stock ${size}`} type="number" min="0" max="999" step="1" required value={draft.stock[size]} onChange={(event) => update("stock", { ...draft.stock, [size]: event.target.value })} /></label>
        ))}</div>
      </fieldset>
      <label className="admin-editor__images">Image links<textarea rows={3} maxLength={12300} placeholder="https://example.com/product-photo.webp" value={draft.images} disabled={busy} onChange={(event) => update("images", event.target.value)} /><small>One HTTPS link per line, up to six. Leave empty to use the campaign photos.</small></label>
      {message && <p className={failed ? "admin-editor__error" : "admin-editor__success"} role={failed ? "alert" : "status"}>{message}</p>}
      <button className="store-button" disabled={busy}>{busy ? "Saving product…" : "Save product"}</button>
    </form>
  );
};

const Admin = () => {
  const { currentUser, isAuthReady } = useContext(UserContext);
  const { allCategoriesMap, catalogAdminLoading, catalogAdminError, retryCatalogOverrides } = useContext(CategoriesContext);
  const [selectedId, setSelectedId] = useState("1");
  const [query, setQuery] = useState("");

  if (!isAuthReady) return <section className="container admin-page"><p role="status">Loading your account…</p></section>;
  if (!isCatalogAdmin(currentUser)) return (
    <section className="container admin-page admin-page__access">
      <h1>Store management</h1><p>Sign in with the store owner’s verified Google account to manage products.</p>
      <Link className="store-button" to="/auth?returnTo=%2Fadmin">Sign in</Link>
      <Link className="store-text-link" to="/shop">Back to the shop</Link>
    </section>
  );
  if (catalogAdminLoading) return <section className="container admin-page"><p role="status">Loading store management…</p></section>;
  if (catalogAdminError) return <section className="container admin-page"><p role="alert">{catalogAdminError}</p><button className="store-button" onClick={retryCatalogOverrides}>Retry</button></section>;

  const products = catalogProducts(allCategoriesMap);
  const selected = products.find((product) => String(product.id) === selectedId) || products[0];
  const results = products.filter((product) => `${product.id} ${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <section className="container admin-page">
      <header className="admin-page__heading"><div><p className="eyebrow">CRWN Clothing</p><h1>Store management</h1><p>Manage product details, campaign images and demo availability.</p></div><Link className="store-text-link" to="/shop">Visit the shop</Link></header>
      <div className="admin-layout">
        <aside className="admin-products" aria-label="Product management list">
          <label>Find a product<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, category or ID" /></label>
          <p>{results.length} products</p>
          <ul>{results.map((product) => <li key={product.id}><button className={String(product.id) === String(selected?.id) ? "is-selected" : ""} aria-pressed={String(product.id) === String(selected?.id)} onClick={() => setSelectedId(String(product.id))}>
            <CatalogImage photo={catalogPhoto(product)} alt="" sizes="52px" />
            <span><strong>{product.name}</strong><small>{categoryLabel(product.category)} · {formatPrice(product.price)} · {product.active === false ? "Unpublished" : "Published"}</small></span>
          </button></li>)}</ul>
        </aside>
        {selected && <ProductEditor key={selected.id} product={selected} user={currentUser} />}
      </div>
    </section>
  );
};

export default Admin;
