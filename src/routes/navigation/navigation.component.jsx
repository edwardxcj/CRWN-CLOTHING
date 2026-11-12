import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";

import CartDropdown from "../../components/cart-dropdown/cart-dropdown.component";
import StoreIcon from "../../components/store-icon/store-icon";
import { UserContext } from "../../contexts/user.context";
import { CartContext } from "../../contexts/cart.context";

import "./navigation.styles.scss";

const links = [
  { label: "Shop all", path: "/shop" },
  { label: "Women", path: "/shop/womens" },
  { label: "Men", path: "/shop/mens" },
  { label: "Jackets", path: "/shop/jackets" },
  { label: "Sneakers", path: "/shop/sneakers" },
  { label: "Hats", path: "/shop/hats" },
];

const Wordmark = () => (
  <Link to="/" className="wordmark" aria-label="CRWN Clothing home">
    <StoreIcon name="crown" size={28} />
    <span>CRWN<small>CLOTHING</small></span>
  </Link>
);

const ShopNav = ({ onSelect }) => links.map(({ label, path }) => (
  <NavLink end key={path} to={path} onClick={onSelect}>{label}</NavLink>
));

const HeaderSearch = ({ dialogRef }) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get("q") || "");
  }, [location.search]);

  const submit = (event) => {
    event.preventDefault();
    const term = query.trim();
    dialogRef.current.close();
    navigate(term ? `/shop?${new URLSearchParams({ q: term })}` : "/shop");
  };

  return (
    <dialog
      ref={dialogRef}
      id="store-search"
      className="header-search"
      aria-labelledby="store-search-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="header-search__surface">
        <div className="header-search__title">
          <h2 id="store-search-title">Search the shop</h2>
          <button type="button" className="header-icon" aria-label="Close search" onClick={() => dialogRef.current.close()}>
            <StoreIcon name="close" />
          </button>
        </div>
        <form className="header-search__form" role="search" onSubmit={submit}>
          <label htmlFor="search-products" className="sr-only">Search products</label>
          <input id="search-products" type="search" autoComplete="off" maxLength={100} placeholder="Try “jacket” or “Converse”" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="store-button" type="submit">Search <StoreIcon name="arrow" size={17} /></button>
        </form>
        <div className="header-search__suggestions">
          <span className="eyebrow">Explore</span>
          {links.filter(({ label }) => ["Jackets", "Sneakers", "Hats"].includes(label)).map(({ label, path }) => (
            <Link key={path} to={path} onClick={() => dialogRef.current.close()}>{label}</Link>
          ))}
        </div>
      </div>
    </dialog>
  );
};

const SiteFooter = ({ signedIn, openBag }) => (
  <footer className="site-footer">
    <div className="container">
      <div className="site-footer__main">
        <div className="site-footer__brand">
          <Wordmark />
          <p>Clothing, footwear and finishing touches for the everyday wardrobe.</p>
        </div>
        <nav aria-label="Shop footer" className="site-footer__links">
          <h2 className="eyebrow">Explore</h2>
          <div><ShopNav /></div>
        </nav>
        <nav aria-label="Account footer" className="site-footer__links">
          <h2 className="eyebrow">Your CRWN</h2>
          <Link to="/auth">{signedIn ? "My account" : "Sign in"}</Link>
          <button type="button" onClick={openBag}>Shopping bag</button>
        </nav>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} CRWN Clothing</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </div>
  </footer>
);

const Navigation = () => {
  const { currentUser } = useContext(UserContext);
  const { cartCount, setIsCartOpen } = useContext(CartContext);
  const location = useLocation();
  const navigationType = useNavigationType();
  const searchTerm = new URLSearchParams(location.search).get("q");
  const previousLocation = useRef(null);
  const catalogPositions = useRef(new Map());
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const openBag = () => setIsCartOpen(true);

  const rememberCatalogPosition = () => {
    catalogPositions.current.set(location.key, window.scrollY);
  };

  const { hash, key, pathname } = location;
  useLayoutEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { hash, pathname, searchTerm };

    if (navigationType === "POP") {
      const position = catalogPositions.current.get(key);
      if (position !== undefined) {
        window.scrollTo(0, position);
        catalogPositions.current.delete(key);
      }
      return;
    }

    if (!hash && (!previous || previous.pathname !== pathname || previous.hash !== hash || previous.searchTerm !== searchTerm)) {
      window.scrollTo(0, 0);
    }
  }, [hash, key, navigationType, pathname, searchTerm]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header" id="top">
        <div className="site-header__strip">
          <StoreIcon name="crown" size={14} />
          <span>The everyday wardrobe, by CRWN</span>
        </div>
        <div className="site-header__bar container">
          <button type="button" className="header-icon site-header__menu" aria-label="Open menu" aria-haspopup="dialog" aria-controls="store-menu" onClick={() => menuRef.current.showModal()}>
            <StoreIcon name="menu" />
          </button>
          <Wordmark />
          <nav className="site-header__nav" aria-label="Main navigation"><ShopNav /></nav>
          <div className="site-header__actions">
            <button type="button" className="header-icon" aria-label="Search the shop" aria-haspopup="dialog" aria-controls="store-search" onClick={() => {
              searchRef.current.showModal();
              searchRef.current.querySelector("input").focus();
            }}>
              <StoreIcon name="search" />
            </button>
            <Link to="/auth" className="header-icon site-header__account" aria-label={currentUser ? "My account" : "Sign in"}><StoreIcon name="user" /></Link>
            <button type="button" className="header-icon header-icon--bag" aria-label={`Shopping bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} aria-haspopup="dialog" aria-controls="shopping-bag" onClick={openBag}>
              <StoreIcon name="bag" />
              <span className="header-bag-count" aria-hidden="true">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>
      <dialog ref={menuRef} id="store-menu" className="mobile-menu" aria-labelledby="store-menu-title" onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}>
        <div className="mobile-menu__surface">
          <div className="header-search__title">
            <h2 id="store-menu-title">Explore CRWN</h2>
            <button type="button" className="header-icon" aria-label="Close menu" onClick={() => menuRef.current.close()}><StoreIcon name="close" /></button>
          </div>
          <nav aria-label="Mobile navigation">
            <ShopNav onSelect={() => menuRef.current.close()} />
            <Link to="/auth" onClick={() => menuRef.current.close()}>{currentUser ? "My account" : "Sign in"}</Link>
          </nav>
        </div>
      </dialog>
      <HeaderSearch dialogRef={searchRef} />
      <main id="main-content" className="site-main" tabIndex={-1}>
        <Outlet context={{ rememberCatalogPosition }} />
      </main>
      <SiteFooter signedIn={Boolean(currentUser)} openBag={openBag} />
      <CartDropdown />
    </>
  );
};

export default Navigation;
