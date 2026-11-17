import { useContext } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";

import ProductCard from "../../components/product-card/product-card.component";
import ProductDetails from "../../components/product-details/product-details.component";
import { CartContext } from "../../contexts/cart.context";
import { CategoriesContext } from "../../contexts/categories.context";
import { catalogProducts, categoryLabel, isSameTabLinkClick } from "../../utils/catalog/catalog.utils";
import { getProductOptions } from "../../utils/catalog/product-variants";

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

const isCatalogPath = (pathname) =>
  typeof pathname === "string" && /^\/shop(?:\/[^/]+)?\/?$/i.test(pathname);

const searchWords = (text) =>
  text
    .normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .replace(/['’]/g, "")
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .toLowerCase()
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];

const filterKeys = ["min", "max", "size", "color", "brand", "inStock"];
const selectedValues = (params, name) => [...new Set(params.getAll(name).filter(Boolean))];
const priceFilter = (value) => {
  if (value === null || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const filterCatalog = (products, category, query, sort, params) => {
  const terms = searchWords(query);
  if (query && terms.length === 0) return [];
  const sizes = selectedValues(params, "size");
  const colors = selectedValues(params, "color");
  const brands = selectedValues(params, "brand");
  const minimum = priceFilter(params.get("min"));
  const maximum = priceFilter(params.get("max"));
  const inStock = params.get("inStock") === "1";

  return products
    .filter((product) => {
      if (category && product.category !== category) return false;
      if (minimum !== null && product.price < minimum) return false;
      if (maximum !== null && product.price > maximum) return false;
      const options = getProductOptions(product);
      if (brands.length && !brands.includes(options.brand)) return false;
      if ((sizes.length || colors.length || inStock) && !options.variants.some((variant) => (
        (!sizes.length || sizes.includes(variant.size)) &&
        (!colors.length || colors.includes(variant.colorValue)) &&
        (!inStock || variant.stock > 0)
      ))) return false;
      if (terms.length === 0) return true;

      const nameWords = searchWords(product.name);
      const words = [
        ...nameWords,
        ...nameWords.slice(1).map((word, index) => nameWords[index] + word),
        ...searchWords(categoryLabel(product.category)),
        ...searchWords(product.category),
      ];
      const matchesPrefix = (term) => words.some((word) => word.startsWith(term));

      // Match spaced and joined spellings such as "Air Force" and "AirForce".
      return terms.every((term, index) =>
        matchesPrefix(term) || (index > 0 && matchesPrefix(terms[index - 1] + term))
      );
    })
    .sort(sortOptions[sort].compare);
};

const sameCatalogPath = (first, second) => first?.replace(/\/$/, "") === second;

const ShopBreadcrumbs = ({ category, productName, search, catalogReturn, onReturn }) => (
  <nav className="shop-breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><Link to="/">Home</Link></li>
      <li>
        {category || search ? (
          <Link
            to={sameCatalogPath(catalogReturn?.pathname, "/shop") ? catalogReturn : "/shop"}
            onClick={sameCatalogPath(catalogReturn?.pathname, "/shop") ? onReturn : undefined}
          >Shop</Link>
        ) : <span aria-current="page">Shop</span>}
      </li>
      {category && (
        <li>
          {productName || search ? (
            <Link
              to={sameCatalogPath(catalogReturn?.pathname, shopPath(category)) ? catalogReturn : { pathname: shopPath(category), search: catalogReturn?.search }}
              onClick={sameCatalogPath(catalogReturn?.pathname, shopPath(category)) ? onReturn : undefined}
            >{categoryLabel(category)}</Link>
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

const CatalogFilters = ({ products, params, onChange, onToggle, onClear }) => {
  const options = products.map(getProductOptions);
  const sizeOrder = ["XS", "S", "M", "L", "XL", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "One size", "S/M", "L/XL"];
  const sizes = [...new Set(options.flatMap((option) => option.sizes))]
    .sort((first, second) => sizeOrder.indexOf(first) - sizeOrder.indexOf(second));
  const colors = new Map(options.flatMap((option) => option.colors).map((color) => [color.value, color.name]));
  const brands = [...new Set(options.map((option) => option.brand))].sort();
  const count = filterKeys.reduce((sum, key) => sum + selectedValues(params, key).length, 0);
  const minimum = priceFilter(params.get("min"));
  const maximum = priceFilter(params.get("max"));
  const rangeError = minimum !== null && maximum !== null && minimum > maximum;
  const invalidPrice = ["min", "max"].some((key) => params.get(key) && priceFilter(params.get(key)) === null);
  const priceError = invalidPrice ? "Enter a price of zero or more, with up to two decimal places."
    : rangeError ? "The maximum price must be at least the minimum." : "";
  const checkbox = (name, value, label) => (
    <label className="catalog-filters__choice" key={value}>
      <input type="checkbox" name={name} checked={params.getAll(name).includes(value)} onChange={() => onToggle(name, value)} />
      <span>{label}</span>
    </label>
  );

  return (
    <details className="catalog-filters">
      <summary>
        Filters{count > 0 ? ` (${count})` : ""}
        <span aria-hidden="true">+</span>
      </summary>
      <div className="catalog-filters__body">
        <fieldset>
          <legend>Price · USD</legend>
          <div className="catalog-filters__price">
            {[["min", "From", "Minimum"], ["max", "To", "Maximum"]].map(([name, label, accessibleLabel]) => (
              <label key={name}>
                {label}
                <input
                  aria-label={`${accessibleLabel} price in USD`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={params.get(name) ?? ""}
                  onChange={(event) => onChange(name, event.target.value)}
                  aria-invalid={Boolean(priceError) || undefined}
                  aria-describedby={priceError ? "price-filter-error" : undefined}
                />
              </label>
            ))}
          </div>
          {priceError && <p id="price-filter-error" className="catalog-filters__error" role="alert">{priceError}</p>}
        </fieldset>
        <fieldset>
          <legend>Size</legend>
          <div className="catalog-filters__choices">{sizes.map((size) => checkbox("size", size, size))}</div>
        </fieldset>
        <fieldset>
          <legend>Colour</legend>
          <div className="catalog-filters__choices">{Array.from(colors, ([value, name]) => checkbox("color", value, name))}</div>
        </fieldset>
        <fieldset>
          <legend>Brand</legend>
          <div className="catalog-filters__choices">{brands.map((brand) => checkbox("brand", brand, brand))}</div>
        </fieldset>
        <div className="catalog-filters__availability">
          <label className="catalog-filters__stock">
            <input type="checkbox" checked={params.get("inStock") === "1"} onChange={(event) => onChange("inStock", event.target.checked ? "1" : "")} />
            In stock only
          </label>
          {count > 0 && <button className="store-text-link" type="button" onClick={onClear}>Clear filters</button>}
        </div>
      </div>
    </details>
  );
};

const ActiveFilters = ({ params, onRemove, onClear, colorNames }) => {
  const labels = { size: "Size", color: "Colour", brand: "Brand", min: "From", max: "To", q: "Search", inStock: "Availability" };
  const active = ["q", ...filterKeys].flatMap((key) => selectedValues(params, key).map((value) => ({ key, value })));
  if (!active.length) return null;

  return (
    <div className="catalog-active-filters" aria-label="Active filters">
      {active.map(({ key, value }) => {
        const label = key === "inStock" ? "In stock only" : `${labels[key]}: ${key === "color" ? colorNames.get(value) ?? value : ["min", "max"].includes(key) ? `$${value}` : value}`;
        return (
          <button key={`${key}-${value}`} type="button" onClick={() => onRemove(key, value)} aria-label={`Remove ${label} filter`}>
            {label}<span aria-hidden="true">×</span>
          </button>
        );
      })}
      <button className="catalog-active-filters__clear" type="button" onClick={onClear}>Clear all</button>
    </div>
  );
};

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
  const { pathname, search, hash } = useLocation();
  const { rememberCatalogPosition } = useOutletContext() ?? {};
  const catalogReturn = { to: { pathname, search, hash }, steps: 1 };
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
  const allProducts = catalogProducts(categoriesMap);
  const products = filterCatalog(allProducts, category, query, sort, searchParams);
  const filterCount = filterKeys.reduce((count, key) => count + searchParams.getAll(key).filter(Boolean).length, 0);
  const title = query ? "Search results" : category ? categoryLabel(category) : "Shop all";
  const description = query
    ? `“${query}”`
    : categoryOrder.includes(category) && collectionCopy[category];

  const updateFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    next.delete(name);
    if (value) next.set(name, value);
    setSearchParams(next, { replace: true });
  };

  const toggleFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    const selected = selectedValues(next, name);
    const values = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    next.delete(name);
    values.forEach((item) => next.append(name, item));
    setSearchParams(next, { replace: true });
  };

  const removeFilter = (name, value) => {
    const next = new URLSearchParams(searchParams);
    const remaining = next.getAll(name).filter((item) => item !== value);
    next.delete(name);
    remaining.forEach((item) => next.append(name, item));
    setSearchParams(next, { replace: true });
  };

  const clearFilters = (includeSearch = false) => {
    const next = new URLSearchParams(searchParams);
    [...filterKeys, ...(includeSearch ? ["q"] : [])].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

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

        <CatalogFilters products={allProducts} params={searchParams} onChange={updateFilter} onToggle={toggleFilter} onClear={() => clearFilters()} />
        <ActiveFilters params={searchParams} colorNames={new Map(allProducts.flatMap((product) => getProductOptions(product).colors).map((color) => [color.value, color.name]))} onRemove={removeFilter} onClear={() => clearFilters(true)} />

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
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                catalogReturn={catalogReturn}
                rememberCatalogPosition={rememberCatalogPosition}
              />
            ))}
          </div>
        ) : !knownCategory && catalogLoading ? (
          <p className="catalog-loading" role="status">Loading collection…</p>
        ) : query || filterCount ? (
          <div className="catalog-notice">
            <h2>No matching products</h2>
            <p>Try a wider price range or remove some filters.</p>
            <button type="button" className="store-button" onClick={() => clearFilters(true)}>Clear search and filters</button>
          </div>
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
  const { state } = useLocation();
  const navigate = useNavigate();
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

  const { name, category } = product;
  const catalogReturn = state?.catalogReturn;
  const hasCatalogReturn = isCatalogPath(catalogReturn?.to?.pathname) &&
    Number.isSafeInteger(catalogReturn.steps) && catalogReturn.steps > 0;
  const backTo = hasCatalogReturn ? catalogReturn.to : shopPath(category);
  const relatedCatalogReturn = hasCatalogReturn
    ? { to: catalogReturn.to, steps: catalogReturn.steps + 1 }
    : undefined;
  let backLabel = `Back to ${categoryLabel(category)}`;
  if (hasCatalogReturn) {
    if (new URLSearchParams(backTo.search).get("q")) backLabel = "Back to search results";
    else if (/^\/shop\/?$/i.test(backTo.pathname)) backLabel = "Back to shop";
  }

  const returnToCatalog = (event) => {
    if (!hasCatalogReturn || !isSameTabLinkClick(event)) return;
    event.preventDefault();
    navigate(-catalogReturn.steps);
  };

  const relatedProducts = products
    .filter((item) => item.category === category && String(item.id) !== productId)
    .slice(0, 4);

  return (
    <section className="container shop-detail">
      <ShopBreadcrumbs category={category} productName={name} catalogReturn={hasCatalogReturn ? backTo : undefined} onReturn={returnToCatalog} />
      <ProductDetails
        product={product}
        onAddToCart={addItemToCart}
        backLink={(
          <Link className="shop-detail__back" to={backTo} onClick={returnToCatalog}>
            <span aria-hidden="true">←</span> {backLabel}
          </Link>
        )}
      />
      {relatedProducts.length > 0 && (
        <section className="shop-detail__related" aria-labelledby="related-products-title">
          <h2 id="related-products-title">More from {categoryLabel(category)}</h2>
          <div className="shop-product-grid">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} catalogReturn={relatedCatalogReturn} />
            ))}
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
