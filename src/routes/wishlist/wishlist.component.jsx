import { useContext } from "react";
import { Link } from "react-router-dom";

import { CategoriesContext } from "../../contexts/categories.context";
import { WishlistContext } from "../../contexts/wishlist.context";
import { catalogProducts } from "../../utils/catalog/catalog.utils";
import ProductCard from "../../components/product-card/product-card.component";
import StoreIcon from "../../components/store-icon/store-icon";

import "./wishlist.styles.scss";

const Wishlist = () => {
  const { categoriesMap } = useContext(CategoriesContext);
  const { productIds, status, retry } = useContext(WishlistContext);
  const products = catalogProducts(categoriesMap).filter((product) => productIds.includes(Number(product.id)));

  return (
    <section className="container wishlist-page" aria-labelledby="wishlist-title">
      <nav className="wishlist-page__breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Wishlist</span>
      </nav>
      <header className="wishlist-page__heading">
        <div><h1 id="wishlist-title">Your wishlist</h1><p>Save your favourites and find them on any device.</p></div>
        <Link className="store-text-link" to="/shop">Explore the shop <StoreIcon name="arrow" size={16} /></Link>
      </header>
      {status === "loading" ? <p role="status">Loading your wishlist…</p> : status === "guest" ? (
        <div className="wishlist-page__empty">
          <StoreIcon name="heart" size={36} />
          <h2>Keep your favourites together</h2>
          <p>Sign in to save products to your account.</p>
          <Link className="store-button" to="/auth?returnTo=%2Fwishlist">Sign in</Link>
        </div>
      ) : status === "error" ? (
        <div className="wishlist-page__empty">
          <p role="alert">We couldn’t load your wishlist. Check your connection and try again.</p>
          <button type="button" className="store-button" onClick={retry}>Retry</button>
        </div>
      ) : products.length ? (
        <>
          <p className="wishlist-page__count">{products.length} saved {products.length === 1 ? "item" : "items"}</p>
          <div className="wishlist-page__grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </>
      ) : (
        <div className="wishlist-page__empty">
          <StoreIcon name="heart" size={36} />
          <h2>Your wishlist is waiting</h2>
          <p>Select the heart on a product to save it here.</p>
          <Link className="store-button" to="/shop">Find your favourites</Link>
        </div>
      )}
    </section>
  );
};

export default Wishlist;
