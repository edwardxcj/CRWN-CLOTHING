import { useContext, useEffect, useId, useRef, useState } from "react";

import CatalogImage from "../catalog-image/catalog-image.component";
import StoreIcon from "../store-icon/store-icon";
import WishlistButton from "../wishlist-button/wishlist-button.component";
import { CartContext } from "../../contexts/cart.context";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import { getCartItemKey, getProductOptions, selectedVariantItem } from "../../utils/catalog/product-variants";
import { getProductDetailCopy } from "./product-details.copy";

import "./product-details.styles.scss";

const detailPhotoSizes = "(max-width: 700px) 94vw, (max-width: 1510px) 49vw, 725px";

const ProductPhoto = ({ photo, name }) => {
  const dialogId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  const photoClass = photo.width
    ? "product-details__photo product-details__photo--studio"
    : "product-details__photo";

  if (!photo.src || unavailable) {
    return (
      <div className={`${photoClass} product-details__photo--unavailable`}>
        Image unavailable
      </div>
    );
  }

  const openPhoto = () => {
    dialogRef.current.showModal();
    closeButtonRef.current.focus();
  };

  return (
    <div className="product-details__gallery">
      <button
        className={photoClass}
        type="button"
        aria-label={`Enlarge photo of ${name}`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={openPhoto}
      >
        <CatalogImage
          photo={photo}
          alt={name}
          sizes={detailPhotoSizes}
          loading="eager"
          onUnavailable={() => setUnavailable(true)}
        />
        <span className="product-details__enlarge" aria-hidden="true">
          <StoreIcon name="search" size={16} />
          Enlarge
        </span>
      </button>

      <dialog
        id={dialogId}
        ref={dialogRef}
        className="product-details__viewer"
        aria-label={`Photo of ${name}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close();
        }}
      >
        <div className="product-details__viewer-content">
          <button
            className="product-details__close"
            type="button"
            ref={closeButtonRef}
            onClick={() => dialogRef.current.close()}
          >
            <StoreIcon name="close" size={20} />
            Close photo
          </button>
          <CatalogImage photo={photo} alt={name} />
        </div>
      </dialog>
    </div>
  );
};

const ProductDetails = ({ product, onAddToCart, backLink }) => {
  const { name, price } = product;
  const { cartItems, isCheckoutSaving } = useContext(CartContext);
  const [size, setSize] = useState("");
  const options = getProductOptions(product);
  const selectedVariant = options.variants.find((variant) => variant.size === size);
  const inBag = selectedVariant
    ? cartItems.find((item) => getCartItemKey(item) === selectedVariant.key)?.quantity || 0
    : 0;
  const hasStock = options.variants.some((variant) => variant.stock > 0);
  const canAdd = selectedVariant?.stock > inBag && !isCheckoutSaving;
  const photo = catalogPhoto(product);
  const { description, details, sizing } = getProductDetailCopy(product);

  useEffect(() => { setSize(""); }, [product.id]);

  return (
    <div className="product-details">
      <ProductPhoto key={photo.src || name} photo={photo} name={name} />
      <div className="product-details__summary">
        <h1>{name}</h1>
        <p className="product-details__price">{formatPrice(price)}</p>
        {description && <p className="product-details__description">{description}</p>}

        <div className="product-details__options">
          <fieldset className="product-details__colour-options">
            <legend>Colour</legend>
            {options.colors.map((color) => (
              <label key={color.value}>
                <input type="radio" name={`colour-${product.id}`} value={color.value} checked readOnly />
                <span className="product-details__swatch" style={{ backgroundColor: color.swatch }} aria-hidden="true" />
                {color.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="product-details__size-options" disabled={isCheckoutSaving}>
            <legend>Size</legend>
            <div>
              {options.variants.map((variant) => (
                <label key={variant.key} className={variant.stock === 0 ? "is-unavailable" : ""}>
                  <input
                    type="radio"
                    name={`size-${product.id}`}
                    value={variant.size}
                    checked={size === variant.size}
                    disabled={variant.stock === 0}
                    onChange={() => setSize(variant.size)}
                    aria-label={`${variant.size}${variant.stock === 0 ? " — out of stock" : ""}`}
                  />
                  <span>{variant.size}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="product-details__availability" role="status">
            {!hasStock ? "Out of demo stock" : selectedVariant
              ? `${selectedVariant.stock} available in demo stock${inBag ? ` · ${inBag} in your bag` : ""}`
              : "Choose a size to see demo availability."}
          </p>
        </div>

        <div className="product-details__actions">
          <button
            type="button"
            className="store-button product-details__add"
            disabled={!canAdd}
            onClick={() => onAddToCart(selectedVariantItem(product, selectedVariant))}
          >
            {!hasStock ? "Out of stock" : selectedVariant && inBag >= selectedVariant.stock ? "Demo stock limit reached" : "Add to bag"}
            <StoreIcon name="bag" size={18} />
          </button>
          <WishlistButton product={product} />
          {backLink}
        </div>

        {details && (
          <dl className="product-details__specs">
            <div>
              <dt>Colour</dt>
              <dd>{details.colour}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{details.style}</dd>
            </div>
          </dl>
        )}

        {sizing && (
          <details className="product-details__sizing">
            <summary>Fit &amp; sizing tips</summary>
            <p>{sizing}</p>
          </details>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
