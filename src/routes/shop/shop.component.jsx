import { useContext } from "react";
import { Link, Route, Routes, useParams, useSearchParams } from "react-router-dom";

import ProductCard, { CatalogImage } from "../../components/product-card/product-card.component";
import { CartContext } from "../../contexts/cart.context";
import { CategoriesContext } from "../../contexts/categories.context";
import { catalogProducts, categoryLabel, formatPrice } from "../../utils/catalog/catalog.utils";

import "./shop.styles.scss";

const categoryOrder = ["womens", "mens", "jackets", "sneakers", "hats"];
const collectionCopy = {
  womens: "Explore tops, knits and dresses.",
  mens: "Explore tees, shirts and casual layers.",
  jackets: "Explore denim, shearling and classic outerwear.",
  sneakers: "Explore sneakers and boots.",
  hats: "Explore caps, beanies and brimmed hats.",
};

const featuredIds = ["22", "27", "12", "5"];
const featuredPosition = (product) => {
  const index = featuredIds.indexOf(String(product.id));
  return index === -1 ? featuredIds.length : index;
};

const sortOptions = {
  featured: { label: "Featured", compare: (a, b) => featuredPosition(a) - featuredPosition(b) },
  "price-asc": { label: "Price: low to high", compare: (a, b) => a.price - b.price },
  "price-desc": { label: "Price: high to low", compare: (a, b) => b.price - a.price },
  name: { label: "Name: A to Z", compare: (a, b) => a.name.localeCompare(b.name, "en") },
};

const shopPath = (category) => (category ? `/shop/${encodeURIComponent(category)}` : "/shop");

const searchWords = (text) =>
  text.toLowerCase().replace(/['’]/g, "").match(/[a-z0-9]+/g) ?? [];

const filterCatalog = (products, category, query, sort) => {
  const terms = searchWords(query);
  if (query && terms.length === 0) return [];

  return products
    .filter((product) => {
      if (category && product.category !== category) return false;
      const words = searchWords(`${product.name} ${categoryLabel(product.category)} ${product.category}`);
      return terms.every((term) => words.some((word) => word.startsWith(term)));
    })
    .sort(sortOptions[sort].compare);
};

const ShopBreadcrumbs = ({ category, productName, search }) => (
  <nav className="shop-breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><Link to="/">Home</Link></li>
      <li>
        {category || search ? <Link to="/shop">Shop</Link> : <span aria-current="page">Shop</span>}
      </li>
      {category && (
        <li>
          {productName || search ? (
            <Link to={shopPath(category)}>{categoryLabel(category)}</Link>
          ) : (
            <span aria-current="page">{categoryLabel(category)}</span>
          )}
        </li>
      )}
      {productName && <li><span aria-current="page">{productName}</span></li>}
      {search && <li><span aria-current="page">Search</span></li>}
    </ol>
  </nav>
);

const CatalogNotice = ({
  title,
  description,
  to = "/shop",
  action = "Shop all products",
  heading: Heading = "h2",
}) => (
  <div className="catalog-notice">
    <Heading>{title}</Heading>
    <p>{description}</p>
    <Link className="store-button" to={to}>{action}</Link>
  </div>
);

const CatalogListing = () => {
  const { category: categoryParam } = useParams();
  const category = categoryParam?.toLowerCase();
  const { categoriesMap, catalogLoading } = useContext(CategoriesContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const requestedSort = searchParams.get("sort");
  const sort = Object.keys(sortOptions).includes(requestedSort) ? requestedSort : "featured";
  const availableCategories = Object.keys(categoriesMap);
  const categories = [
    ...categoryOrder.filter((key) => availableCategories.includes(key)),
    ...availableCategories.filter((key) => !categoryOrder.includes(key)),
  ];
  const knownCategory = !category || categories.includes(category);
  const products = filterCatalog(catalogProducts(categoriesMap), category, query, sort);
  const title = query ? "Search results" : category ? categoryLabel(category) : "Shop all";
  const description = query
    ? `“${query}”`
    : categoryOrder.includes(category) && collectionCopy[category];
  const clearSearchParams = new URLSearchParams(searchParams);
  clearSearchParams.delete("q");

  const changeSort = (event) => {
    const nextParams = new URLSearchParams(searchParams);
    if (event.target.value === "featured") nextParams.delete("sort");
    else nextParams.set("sort", event.target.value);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <section className="shop-catalog">
      <header className="shop-catalog__heading">
        <div className="container">
          <ShopBreadcrumbs category={knownCategory ? category : undefined} search={Boolean(query)} />
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </header>

      <div className="container shop-catalog__body">
        <nav className="shop-catalog__categories" aria-label="Shop categories">
          {[undefined, ...categories].map((key) => (
            <Link
              key={key ?? "all"}
              to={{ pathname: shopPath(key), search: searchParams.toString() }}
              aria-current={category === key ? "page" : undefined}
            >
              {key ? categoryLabel(key) : "All products"}
            </Link>
          ))}
        </nav>

        <div className="shop-catalog__toolbar">
          <p aria-live="polite">{products.length} {products.length === 1 ? "product" : "products"}</p>
          <label className="shop-catalog__sort">
            <span>Sort by</span>
            <select value={sort} onChange={changeSort}>
              {Object.entries(sortOptions).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {products.length > 0 ? (
          <div className="shop-product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : !knownCategory && catalogLoading ? (
          <p className="catalog-loading" role="status">Loading collection…</p>
        ) : query ? (
          <CatalogNotice
            title="No matching products"
            description="Try a different search or browse the collection."
            to={{ pathname: shopPath(knownCategory ? category : undefined), search: clearSearchParams.toString() }}
            action="Clear search"
          />
        ) : (
          <CatalogNotice
            title={knownCategory ? "This collection is empty" : "Collection not found"}
            description="Explore the rest of the shop."
          />
        )}
      </div>
    </section>
  );
};

const ProductDetail = () => {
  const { productId } = useParams();
  const { categoriesMap, catalogLoading } = useContext(CategoriesContext);
  const { addItemToCart } = useContext(CartContext);
  const products = catalogProducts(categoriesMap);
  const product = products.find(({ id }) => String(id) === productId);

  if (!product) {
    return (
      <section className="container shop-detail">
        <ShopBreadcrumbs />
        {catalogLoading ? (
          <p className="catalog-loading" role="status">Loading product…</p>
        ) : (
          <CatalogNotice heading="h1" title="Product not found" description="Browse the shop to discover other pieces." />
        )}
      </section>
    );
  }

  const { name, price, category, description } = product;
  const relatedProducts = products
    .filter((item) => item.category === category && item.id !== product.id)
    .slice(0, 4);

  return (
    <section className="container shop-detail">
      <ShopBreadcrumbs category={category} productName={name} />
      <div className="shop-detail__main">
        <div className="shop-detail__media">
          <CatalogImage product={product} className="shop-detail__image" loading="eager" />
        </div>
        <div className="shop-detail__summary">
          <h1>{name}</h1>
          <p className="shop-detail__price">{formatPrice(price)}</p>
          {typeof description === "string" && <p className="shop-detail__description">{description}</p>}
          <button type="button" className="store-button shop-detail__add" onClick={() => addItemToCart(product)}>
            Add to bag <span aria-hidden="true">+</span>
          </button>
          <Link className="shop-detail__back" to={shopPath(category)}>
            <span aria-hidden="true">←</span> Back to {categoryLabel(category)}
          </Link>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="shop-detail__related" aria-labelledby="related-products-title">
          <h2 id="related-products-title">More from {categoryLabel(category)}</h2>
          <div className="shop-product-grid">
            {relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </section>
  );
};

const Shop = () => (
  <Routes>
    <Route index element={<CatalogListing />} />
    <Route path="product/:productId" element={<ProductDetail />} />
    <Route path=":category" element={<CatalogListing />} />
    <Route path="*" element={(
      <section className="container shop-detail">
        <CatalogNotice heading="h1" title="Page not found" description="Explore the available collections." />
      </section>
    )} />
  </Routes>
);

export default Shop;
